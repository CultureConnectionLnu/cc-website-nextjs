import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import db from "@/lib/db";

const intToBool = (val) => (val === 1 ? true : false);
const boolToInt = (val) => (val === true ? 1 : 0);

export async function POST(request) {
	const { userId, sessionClaims } = getAuth(request);
	if (!userId)
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	if (!db)
		return NextResponse.json(
			{ message: "Database connection failed." },
			{ status: 500 },
		);

	const isUserFreezed = sessionClaims?.metadata?.freezed === true;

	let body;
	let scannedData;
	try {
		body = await request.json();
		if (!body.scannedData)
			throw new Error("Missing required field: scannedData");

		scannedData = JSON.parse(body.scannedData);
		if (scannedData.type !== "event_checkin" || !scannedData.eventId) {
			throw new Error("Invalid QR code content or type for event check-in.");
		}
	} catch (error) {
		console.error("Event QR Scan Request Body/Parse Error:", error);
		return NextResponse.json(
			{ message: "Invalid request or QR code data", error: error.message },
			{ status: 400 },
		);
	}

	const { eventId } = scannedData;
	const currentDate = new Date().toISOString();

	const checkinTransaction = db.transaction(() => {
		const eventStmt = db.prepare(
			"SELECT id, title, attendees, isLimitEnabled, attendanceLimit, freezenotallow, closed FROM Events WHERE id = ?",
		);
		const event = eventStmt.get(eventId);
		if (!event) throw { status: 404, message: "Event not found." };
		if (!intToBool(event.attendees))
			throw {
				status: 400,
				message: "Attendance tracking is not enabled for this event.",
			};
		if (intToBool(event.closed))
			throw { status: 400, message: "This event is closed for check-in." };
		if (intToBool(event.freezenotallow) && isUserFreezed)
			throw {
				status: 403,
				message: "Your account is frozen and cannot check-in to this event.",
			};

		const userStatusStmt = db.prepare(
			"SELECT waiting, verified FROM EventAttendees WHERE event_id = ? AND user_id = ?",
		);
		const userStatus = userStatusStmt.get(eventId, userId);

		let message = "";
		let alreadyVerified = false;
		let needsUpsert = false;
		let waitingList = false;

		if (userStatus) {
			if (intToBool(userStatus.verified)) {
				alreadyVerified = true;
				message = `Already checked in for '${event.title}'.`;
			} else {
				needsUpsert = true;
				waitingList = intToBool(userStatus.waiting);
				message = `Checked in successfully for '${event.title}'${waitingList ? " (from waitlist)" : ""}.`;
				console.log(
					`User ${userId} checked into event ${eventId} (was already registered${waitingList ? " - waiting" : ""}).`,
				);
			}
		} else {
			needsUpsert = true;
			if (intToBool(event.isLimitEnabled) && event.attendanceLimit > 0) {
				const countStmt = db.prepare(
					"SELECT COUNT(*) as count FROM EventAttendees WHERE event_id = ? AND waiting = 0",
				);
				const { count } = countStmt.get(eventId);
				if (count >= event.attendanceLimit) {
					waitingList = true;
					message = `Event '${event.title}' is full. You've been added to the waitlist and checked in.`;
					console.log(
						`User ${userId} added to waitlist and checked into event ${eventId} via QR scan.`,
					);
				} else {
					message = `Checked in successfully for '${event.title}'.`;
					console.log(
						`User ${userId} attended and checked into event ${eventId} via QR scan.`,
					);
				}
			} else {
				message = `Checked in successfully for '${event.title}'.`;
				console.log(
					`User ${userId} attended and checked into event ${eventId} via QR scan.`,
				);
			}
		}

		if (needsUpsert && !alreadyVerified) {
			const upsertStmt = db.prepare(`
            INSERT INTO EventAttendees (event_id, user_id, waiting, verified, attended_at)
            VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
            ON CONFLICT(event_id, user_id) DO UPDATE SET
                verified = 1,
                waiting = CASE WHEN excluded.waiting = 1 THEN 1 ELSE 0 END,
                attended_at = CASE
                    WHEN EventAttendees.verified = 0 THEN CURRENT_TIMESTAMP
                    WHEN EventAttendees.waiting = 1 AND excluded.waiting = 0 THEN CURRENT_TIMESTAMP
                    ELSE EventAttendees.attended_at
                END;
        `);
			upsertStmt.run(eventId, userId, boolToInt(waitingList));
		}

		return {
			success: true,
			message: message,
			eventId: event.id,
			eventTitle: event.title,
			wasWaiting: waitingList && !alreadyVerified,
			alreadyCheckedIn: alreadyVerified,
		};
	});

	try {
		const result = checkinTransaction();
		return NextResponse.json(result, { status: 200 });
	} catch (error) {
		console.error(`Event QR Scan Error for user ${userId}:`, error);
		const status = error.status || 500;
		const message = error.message || "Failed to process event check-in scan.";
		return NextResponse.json({ success: false, message }, { status });
	}
}
