import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/clerk-sdk-node";
import db from "@/lib/db";
import { env } from "@/env";

const clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
const intToBool = (val) => (val === 1 ? true : false);
const boolToInt = (val) => (val === true ? 1 : 0);

async function promoteFromWaitlist(eventId) {
	const waitingListUsersStmt = db.prepare(
		"SELECT user_id FROM EventAttendees WHERE event_id = ? AND waiting = 1 ORDER BY attended_at ASC",
	);
	const waitingListUserIds = waitingListUsersStmt
		.all(eventId)
		.map((u) => u.user_id);

	if (waitingListUserIds.length === 0) {
		return;
	}

	const waitingUserDetailsResponse = await clerkClient.users.getUserList({
		userId: waitingListUserIds,
		limit: waitingListUserIds.length,
	});
	const waitingUserDetails = waitingUserDetailsResponse.data || [];
	const waitingUsersWithFreeze = waitingListUserIds.map((id) => {
		const clerkUser = waitingUserDetails.find((u) => u.id === id);
		return {
			userId: id,
			isFreezed: clerkUser?.publicMetadata?.freezed === true,
		};
	});

	const nonFrozenToPromote = waitingUsersWithFreeze.find((u) => !u.isFreezed);
	let userToPromoteId = null;

	if (nonFrozenToPromote) {
		userToPromoteId = nonFrozenToPromote.userId;
	} else {
		userToPromoteId = waitingUsersWithFreeze[0].userId;
	}

	if (userToPromoteId) {
		const promoteStmt = db.prepare(
			"UPDATE EventAttendees SET waiting = 0, verified = 0, attended_at = CURRENT_TIMESTAMP WHERE event_id = ? AND user_id = ?",
		);
		promoteStmt.run(eventId, userToPromoteId);
		console.log(`Promoted user ${userToPromoteId} for event ${eventId}`);
	}
}

async function fetchAndMergeUserDetails(attendeesRaw) {
	if (!Array.isArray(attendeesRaw)) {
		return { attendees: [], attendeeDetails: [] };
	}
	const attendeeUserIds = attendeesRaw.map((a) => a.user_id).filter(Boolean);
	const userDetailsMap = new Map();
	if (attendeeUserIds.length > 0) {
		try {
			const userListResponse = await clerkClient.users.getUserList({
				userId: attendeeUserIds,
				limit: attendeeUserIds.length,
			});
			if (userListResponse && Array.isArray(userListResponse.data)) {
				userListResponse.data.forEach((user) => {
					const primaryEmail = user.emailAddresses.find(
						(email) => email.id === user.primaryEmailAddressId,
					)?.emailAddress;
					userDetailsMap.set(user.id, {
						fullName:
							[user.firstName, user.lastName].filter(Boolean).join(" ") ||
							primaryEmail ||
							user.id,
						primaryEmailAddress: primaryEmail || null,
						isFreezed: user.publicMetadata?.freezed === true,
					});
				});
			}
		} catch (clerkError) {
			console.error("Clerk API Error in fetchAndMergeUserDetails:", clerkError);
			attendeeUserIds.forEach((id) => {
				if (!userDetailsMap.has(id)) {
					userDetailsMap.set(id, {
						fullName: `User (${id.substring(5)})`,
						primaryEmailAddress: null,
						isFreezed: false,
					});
				}
			});
		}
	}
	const attendees = attendeesRaw.map((att) => ({
		userID: att.user_id,
		waiting: intToBool(att.waiting),
		verified: intToBool(att.verified),
	}));
	const attendeeDetails = attendees.map((att) => ({
		...att,
		...(userDetailsMap.get(att.userID) || {
			fullName: `User (${att.userID.substring(5)})`,
			primaryEmailAddress: null,
			isFreezed: false,
		}),
	}));
	return { attendees, attendeeDetails };
}

export async function GET(request) {
	if (!db)
		return NextResponse.json(
			{ message: "Database connection failed." },
			{ status: 500 },
		);
	try {
		const eventsStmt = db.prepare(`SELECT * FROM Events ORDER BY date DESC`);
		const events = eventsStmt.all();
		const eventIds = events.map((e) => e.id);
		const attendeesByEvent = {};
		let allAttendeesRaw = [];
		if (eventIds.length > 0) {
			const placeholders = eventIds.map(() => "?").join(",");
			const attendeesStmt = db.prepare(
				`SELECT event_id, user_id, waiting, verified FROM EventAttendees WHERE event_id IN (${placeholders}) ORDER BY attended_at ASC`,
			);
			const attendeesFromDb = attendeesStmt.all(...eventIds);
			if (Array.isArray(attendeesFromDb)) {
				allAttendeesRaw = attendeesFromDb;
				attendeesFromDb.forEach((att) => {
					if (!attendeesByEvent[att.event_id])
						attendeesByEvent[att.event_id] = [];
					attendeesByEvent[att.event_id].push(att);
				});
			}
		}
		const { attendeeDetails: allAttendeeDetailsMapped } =
			await fetchAndMergeUserDetails(allAttendeesRaw);

		const attendeeDetailsMap = new Map();
		allAttendeeDetailsMapped.forEach((ad) => {
			attendeeDetailsMap.set(ad.userID, {
				fullName: ad.fullName,
				primaryEmailAddress: ad.primaryEmailAddress,
				isFreezed: ad.isFreezed,
			});
		});

		const results = events.map((event) => {
			const rawAttendeesForEvent = attendeesByEvent[event.id] || [];
			const attendeesCounter = rawAttendeesForEvent.map((att) => ({
				userID: att.user_id,
				waiting: intToBool(att.waiting),
				verified: intToBool(att.verified),
			}));
			const attendeeDetails = rawAttendeesForEvent.map((att) => {
				const userDetails = attendeeDetailsMap.get(att.user_id) || {
					fullName: `User (${att.user_id.substring(5)})`,
					primaryEmailAddress: null,
					isFreezed: false,
				};
				return {
					userID: att.user_id,
					waiting: intToBool(att.waiting),
					verified: intToBool(att.verified),
					fullName: userDetails.fullName,
					primaryEmailAddress: userDetails.primaryEmailAddress,
					isFreezed: userDetails.isFreezed,
				};
			});
			let inDescriptionParsed = [];
			try {
				if (event.inDescription)
					inDescriptionParsed = JSON.parse(event.inDescription);
			} catch (e) {}
			return {
				...event,
				attendees: intToBool(event.attendees),
				isLimitEnabled: intToBool(event.isLimitEnabled),
				cardEnabled: intToBool(event.cardEnabled),
				freezenotallow: intToBool(event.freezenotallow),
				closed: intToBool(event.closed),
				inDescription: inDescriptionParsed,
				attendeesCounter: attendeesCounter,
				attendeeDetails: attendeeDetails,
			};
		});
		return NextResponse.json(results);
	} catch (error) {
		console.error("GET /api/events Error:", error);
		return NextResponse.json(
			{ message: error.message || "Failed to load events." },
			{ status: 500 },
		);
	}
}

export async function POST(request) {
	const { userId } = getAuth(request);
	if (!userId)
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	if (!db)
		return NextResponse.json(
			{ message: "Database connection failed." },
			{ status: 500 },
		);

	try {
		const user = await clerkClient.users.getUser(userId);
		const isAdmin = user.publicMetadata?.admin === true;
		const isCommittee = user.publicMetadata?.committee === true;
		if (!isAdmin && !isCommittee)
			return NextResponse.json(
				{ message: "Forbidden: User cannot create events." },
				{ status: 403 },
			);

		let body;
		try {
			body = await request.json();
			if (
				!body.title?.trim() ||
				!body.date ||
				!body.description?.trim() ||
				!body.location?.trim()
			) {
				throw new Error(
					"Missing required fields: title, date, description, location",
				);
			}
			if (isNaN(new Date(body.date).getTime())) {
				throw new Error("Invalid date format provided.");
			}
		} catch (error) {
			return NextResponse.json(
				{ message: "Invalid request body", error: error.message },
				{ status: 400 },
			);
		}

		const newEventId = `evt_${Date.now()}_${Math.random()
			.toString(36)
			.substring(2, 7)}`;
		const inDescriptionString = JSON.stringify(body.inDescription || []);
		const attendanceLimit = body.isLimitEnabled
			? parseInt(body.attendanceLimit, 10) || null
			: null;
		const stmt = db.prepare(`
            INSERT INTO Events (
                id, title, date, description, location, imageUrl, attendees, cardColor,
                isLimitEnabled, attendanceLimit, cardEnabled, inDescription, freezenotallow, closed
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
		stmt.run(
			newEventId,
			body.title.trim(),
			new Date(body.date).toISOString(),
			body.description.trim(),
			body.location.trim(),
			body.imageUrl || null,
			boolToInt(body.attendees),
			body.cardColor || "bg-white",
			boolToInt(body.isLimitEnabled),
			attendanceLimit,
			boolToInt(body.cardEnabled),
			inDescriptionString,
			boolToInt(body.freezenotallow),
			boolToInt(body.closed),
		);
		const selectStmt = db.prepare("SELECT * FROM Events WHERE id = ?");
		const newEventData = selectStmt.get(newEventId);
		let inDescParsed = [];
		try {
			if (newEventData.inDescription)
				inDescParsed = JSON.parse(newEventData.inDescription);
		} catch (e) {}
		const responseData = {
			...newEventData,
			attendees: intToBool(newEventData.attendees),
			isLimitEnabled: intToBool(newEventData.isLimitEnabled),
			cardEnabled: intToBool(newEventData.cardEnabled),
			freezenotallow: intToBool(newEventData.freezenotallow),
			closed: intToBool(newEventData.closed),
			inDescription: inDescParsed,
			attendeesCounter: [],
			attendeeDetails: [],
		};
		return NextResponse.json(responseData, { status: 201 });
	} catch (error) {
		console.error("POST /api/events Error:", error);
		return NextResponse.json(
			{ message: error.message || "Failed to create event" },
			{ status: 500 },
		);
	}
}

export async function PUT(request) {
	const { userId } = getAuth(request);
	if (!userId)
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	if (!db)
		return NextResponse.json(
			{ message: "Database connection failed." },
			{ status: 500 },
		);

	try {
		const user = await clerkClient.users.getUser(userId);
		const isAdmin = user.publicMetadata?.admin === true;
		const isCommittee = user.publicMetadata?.committee === true;
		if (!isAdmin && !isCommittee)
			return NextResponse.json(
				{ message: "Forbidden: User cannot edit events." },
				{ status: 403 },
			);

		let body;
		try {
			body = await request.json();
			if (
				!body.id ||
				!body.title?.trim() ||
				!body.date ||
				!body.description?.trim() ||
				!body.location?.trim()
			) {
				throw new Error(
					"Missing required fields: id, title, date, description, location",
				);
			}
			if (isNaN(new Date(body.date).getTime())) {
				throw new Error("Invalid date format provided.");
			}
		} catch (error) {
			return NextResponse.json(
				{ message: "Invalid request body", error: error.message },
				{ status: 400 },
			);
		}

		db.transaction(() => {
			const inDescriptionString = JSON.stringify(body.inDescription || []);
			const attendanceLimit = body.isLimitEnabled
				? parseInt(body.attendanceLimit, 10) || null
				: null;
			const updateStmt = db.prepare(`
                UPDATE Events SET
                    title = ?, date = ?, description = ?, location = ?, imageUrl = ?, attendees = ?,
                    cardColor = ?, isLimitEnabled = ?, attendanceLimit = ?, cardEnabled = ?,
                    inDescription = ?, freezenotallow = ?, closed = ?, updatedAt = CURRENT_TIMESTAMP
                WHERE id = ?
            `);
			const info = updateStmt.run(
				body.title.trim(),
				new Date(body.date).toISOString(),
				body.description.trim(),
				body.location.trim(),
				body.imageUrl || null,
				boolToInt(body.attendees),
				body.cardColor || "bg-white",
				boolToInt(body.isLimitEnabled),
				attendanceLimit,
				boolToInt(body.cardEnabled),
				inDescriptionString,
				boolToInt(body.freezenotallow),
				boolToInt(body.closed),
				body.id,
			);
			if (info.changes === 0)
				throw { status: 404, message: "Event not found or no changes made." };
			if (body.resetAttendees === true) {
				const deleteAttendeesStmt = db.prepare(
					"DELETE FROM EventAttendees WHERE event_id = ?",
				);
				deleteAttendeesStmt.run(body.id);
			}
		})();
		const selectStmt = db.prepare("SELECT * FROM Events WHERE id = ?");
		const updatedEventData = selectStmt.get(body.id);
		if (!updatedEventData)
			throw { status: 404, message: "Event not found after update." };
		const attendeesStmt = db.prepare(
			"SELECT user_id, waiting, verified FROM EventAttendees WHERE event_id = ? ORDER BY attended_at ASC",
		);
		const attendeesRaw = attendeesStmt.all(body.id);
		const { attendees, attendeeDetails } =
			await fetchAndMergeUserDetails(attendeesRaw);
		let inDescParsed = [];
		try {
			if (updatedEventData.inDescription)
				inDescParsed = JSON.parse(updatedEventData.inDescription);
		} catch (e) {}
		const responseData = {
			...updatedEventData,
			attendees: intToBool(updatedEventData.attendees),
			isLimitEnabled: intToBool(updatedEventData.isLimitEnabled),
			cardEnabled: intToBool(updatedEventData.cardEnabled),
			freezenotallow: intToBool(updatedEventData.freezenotallow),
			closed: intToBool(updatedEventData.closed),
			inDescription: inDescParsed,
			attendeesCounter: attendees,
			attendeeDetails: attendeeDetails,
		};
		return NextResponse.json(responseData, { status: 200 });
	} catch (error) {
		console.error("PUT /api/events Error:", error);
		const status = error.status || 500;
		return NextResponse.json(
			{ message: error.message || "Failed to update event" },
			{ status },
		);
	}
}

export async function PATCH(request) {
	const { userId } = getAuth(request);
	if (!userId)
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	if (!db)
		return NextResponse.json(
			{ message: "Database connection failed." },
			{ status: 500 },
		);

	let body;
	let action;
	let eventId;
	let targetUserIdForAction;

	try {
		body = await request.json();
		if (!body.eventId || !body.action) {
			throw new Error("Missing required fields: eventId, action");
		}
		if (["verify", "remove"].includes(body.action) && !body.attendeeUserId) {
			throw new Error("Missing attendeeUserId for verify/remove action");
		}
		if (body.action === "verify" && typeof body.verified !== "boolean") {
			throw new Error("Missing verified status for verify action");
		}
		action = body.action;
		eventId = body.eventId;
		targetUserIdForAction =
			action === "attend" || action === "unattend"
				? userId
				: body.attendeeUserId;

		const user = await clerkClient.users.getUser(userId);
		const isAdmin = user.publicMetadata?.admin === true;
		const isCommittee = user.publicMetadata?.committee === true;

		if (["verify", "remove"].includes(action) && !isAdmin && !isCommittee) {
			return NextResponse.json(
				{ message: "Forbidden: Only admins/committee can manage attendees." },
				{ status: 403 },
			);
		}

		let allCurrentAttendeeUserDetails = [];
		if (action === "attend") {
			const allAttendeesForEventStmt = db.prepare(
				"SELECT user_id FROM EventAttendees WHERE event_id = ? AND waiting = 0",
			);
			const allCurrentAttendeeUserIds = allAttendeesForEventStmt
				.all(eventId)
				.map((a) => a.user_id);

			if (allCurrentAttendeeUserIds.length > 0) {
				const userListResponse = await clerkClient.users.getUserList({
					userId: allCurrentAttendeeUserIds,
					limit: allCurrentAttendeeUserIds.length,
				});
				allCurrentAttendeeUserDetails = (userListResponse.data || []).map(
					(u) => ({
						userID: u.id,
						isFreezed: u.publicMetadata?.freezed === true,
					}),
				);
			}
		}

		const transaction = db.transaction(() => {
			const eventStmt = db.prepare(
				"SELECT id, title, attendees, isLimitEnabled, attendanceLimit, freezenotallow, closed FROM Events WHERE id = ?",
			);
			const event = eventStmt.get(eventId);

			if (!event) throw { status: 404, message: "Event not found." };
			if (
				!intToBool(event.attendees) &&
				(action === "attend" || action === "unattend")
			) {
				throw {
					status: 400,
					message: "Attendance tracking is not enabled for this event.",
				};
			}
			if (
				intToBool(event.closed) &&
				(action === "attend" || action === "unattend")
			) {
				throw {
					status: 400,
					message:
						"This event is closed for new registrations or unregistrations.",
				};
			}

			const userStatusStmt = db.prepare(
				"SELECT waiting, verified FROM EventAttendees WHERE event_id = ? AND user_id = ?",
			);
			const currentUserStatusForEvent = userStatusStmt.get(
				eventId,
				targetUserIdForAction,
			);
			const isUserCurrentlyRegistered = !!currentUserStatusForEvent;
			const isUserCurrentlyWaiting =
				isUserCurrentlyRegistered &&
				intToBool(currentUserStatusForEvent.waiting);
			const isUserCurrentlyConfirmed =
				isUserCurrentlyRegistered &&
				!intToBool(currentUserStatusForEvent.waiting);

			if (action === "attend") {
				if (isUserCurrentlyConfirmed)
					throw {
						status: 400,
						message: "You are already attending this event.",
					};
				if (isUserCurrentlyWaiting)
					throw {
						status: 400,
						message: "You are already on the waitlist for this event.",
					};

				const allCurrentAttendeesRaw = db
					.prepare(
						"SELECT user_id, waiting FROM EventAttendees WHERE event_id = ?",
					)
					.all(eventId);

				const allCurrentAttendeesWithFreezeStatus = allCurrentAttendeesRaw.map(
					(rawAtt) => {
						const detail = allCurrentAttendeeUserDetails.find(
							(d) => d.userID === rawAtt.user_id,
						);
						return { ...rawAtt, isFreezed: detail?.isFreezed || false };
					},
				);

				const currentConfirmedNonFrozenCount =
					allCurrentAttendeesWithFreezeStatus.filter(
						(a) => !intToBool(a.waiting) && !a.isFreezed,
					).length;
				const currentConfirmedFrozenCount =
					allCurrentAttendeesWithFreezeStatus.filter(
						(a) => !intToBool(a.waiting) && a.isFreezed,
					).length;
				const totalConfirmedCount =
					currentConfirmedNonFrozenCount + currentConfirmedFrozenCount;

				let userShouldBeOnWaitlist = false;
				let bumpedFrozenUserId = null;

				if (
					intToBool(event.isLimitEnabled) &&
					event.attendanceLimit != null &&
					event.attendanceLimit > 0
				) {
					const isCurrentUserFreezed = user.publicMetadata?.freezed === true;
					if (totalConfirmedCount >= event.attendanceLimit) {
						if (isCurrentUserFreezed) {
							userShouldBeOnWaitlist = true;
						} else {
							if (currentConfirmedFrozenCount > 0) {
								const frozenConfirmedUsers =
									allCurrentAttendeesWithFreezeStatus.filter(
										(a) => !intToBool(a.waiting) && a.isFreezed,
									);
								bumpedFrozenUserId = frozenConfirmedUsers[0].user_id;
								userShouldBeOnWaitlist = false;
							} else {
								userShouldBeOnWaitlist = true;
							}
						}
					}
				}

				if (bumpedFrozenUserId) {
					const moveToWaitlistStmt = db.prepare(
						"UPDATE EventAttendees SET waiting = 1 WHERE event_id = ? AND user_id = ?",
					);
					moveToWaitlistStmt.run(eventId, bumpedFrozenUserId);
				}

				const upsertStmt = db.prepare(`
              INSERT INTO EventAttendees (event_id, user_id, waiting, verified, attended_at)
              VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP)
              ON CONFLICT(event_id, user_id) DO UPDATE SET
                  waiting = excluded.waiting,
                  verified = 0, 
                  attended_at = CASE 
                                  WHEN waiting = 1 AND excluded.waiting = 0 THEN CURRENT_TIMESTAMP 
                                  ELSE attended_at 
                                END;
          `);
				upsertStmt.run(
					eventId,
					targetUserIdForAction,
					boolToInt(userShouldBeOnWaitlist),
				);
			} else if (action === "unattend") {
				if (!isUserCurrentlyRegistered)
					throw {
						status: 400,
						message: "You are not currently registered for this event.",
					};

				const deleteStmt = db.prepare(
					"DELETE FROM EventAttendees WHERE event_id = ? AND user_id = ?",
				);
				deleteStmt.run(eventId, targetUserIdForAction);
			} else if (action === "verify") {
				if (!isUserCurrentlyRegistered)
					throw { status: 404, message: "Attendee not found for this event." };
				const verifyStmt = db.prepare(
					"UPDATE EventAttendees SET verified = ? WHERE event_id = ? AND user_id = ?",
				);
				verifyStmt.run(
					boolToInt(body.verified),
					eventId,
					targetUserIdForAction,
				);
			} else if (action === "remove") {
				const userToRemoveStatus = userStatusStmt.get(
					eventId,
					targetUserIdForAction,
				);
				if (!userToRemoveStatus)
					throw {
						status: 404,
						message: "Attendee to remove not found for this event.",
					};
				const deleteStmt = db.prepare(
					"DELETE FROM EventAttendees WHERE event_id = ? AND user_id = ?",
				);
				deleteStmt.run(eventId, targetUserIdForAction);
			} else {
				throw { status: 400, message: "Invalid action specified." };
			}
		});

		transaction();

		if (action === "unattend" || action === "remove") {
			const event = db
				.prepare("SELECT isLimitEnabled FROM Events WHERE id = ?")
				.get(eventId);
			if (intToBool(event.isLimitEnabled)) {
				await promoteFromWaitlist(eventId);
			}
		}

		const finalEventDataStmt = db.prepare("SELECT * FROM Events WHERE id = ?");
		const updatedEventData = finalEventDataStmt.get(eventId);
		const finalAttendeesStmt = db.prepare(
			"SELECT user_id, waiting, verified FROM EventAttendees WHERE event_id = ? ORDER BY attended_at ASC",
		);
		const attendeesRaw = finalAttendeesStmt.all(eventId);

		const { attendees, attendeeDetails } =
			await fetchAndMergeUserDetails(attendeesRaw);
		let inDescParsed = [];
		try {
			if (updatedEventData.inDescription)
				inDescParsed = JSON.parse(updatedEventData.inDescription);
		} catch (e) {}
		const responseData = {
			...updatedEventData,
			attendees: intToBool(updatedEventData.attendees),
			isLimitEnabled: intToBool(updatedEventData.isLimitEnabled),
			cardEnabled: intToBool(updatedEventData.cardEnabled),
			freezenotallow: intToBool(updatedEventData.freezenotallow),
			closed: intToBool(updatedEventData.closed),
			inDescription: inDescParsed,
			attendeesCounter: attendees,
			attendeeDetails: attendeeDetails,
		};
		return NextResponse.json(responseData, { status: 200 });
	} catch (error) {
		console.error(
			`PATCH /api/events (Action: ${action}, Event: ${eventId}, User: ${targetUserIdForAction}) Error:`,
			error,
		);
		const status = error.status || 500;
		return NextResponse.json(
			{ message: error.message || `Failed to ${action}` },
			{ status },
		);
	}
}

export async function DELETE(request) {
	const { userId } = getAuth(request);
	if (!userId)
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	if (!db)
		return NextResponse.json(
			{ message: "Database connection failed." },
			{ status: 500 },
		);

	try {
		const user = await clerkClient.users.getUser(userId);
		const isAdmin = user.publicMetadata?.admin === true;
		const isCommittee = user.publicMetadata?.committee === true;
		if (!isAdmin && !isCommittee)
			return NextResponse.json(
				{ message: "Forbidden: User cannot delete events." },
				{ status: 403 },
			);

		const { searchParams } = new URL(request.url);
		const eventId = searchParams.get("id");
		if (!eventId)
			return NextResponse.json(
				{ message: "Missing required query parameter: id" },
				{ status: 400 },
			);

		db.transaction(() => {
			const deleteAttendeesStmt = db.prepare(
				"DELETE FROM EventAttendees WHERE event_id = ?",
			);
			deleteAttendeesStmt.run(eventId);
			const deleteEventStmt = db.prepare("DELETE FROM Events WHERE id = ?");
			const info = deleteEventStmt.run(eventId);
			if (info.changes === 0) throw { status: 404, message: "Event not found" };
		})();
		return NextResponse.json(
			{ message: `Event ${eventId} deleted successfully.` },
			{ status: 200 },
		);
	} catch (error) {
		console.error("DELETE /api/events Error:", error);
		const status = error.status || 500;
		return NextResponse.json(
			{ message: error.message || "Failed to delete event" },
			{ status },
		);
	}
}
