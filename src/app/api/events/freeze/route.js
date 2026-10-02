import { createClerkClient } from "@clerk/clerk-sdk-node";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { env } from "@/env";
import db from "@/lib/db";

const clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

export async function POST(request) {
	const { userId, sessionClaims } = getAuth(request);
	if (!userId)
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

	const isAdmin = sessionClaims?.metadata?.admin === true;
	const isCommittee = sessionClaims?.metadata?.committee === true;
	if (!isAdmin && !isCommittee)
		return NextResponse.json(
			{ message: "Forbidden: User cannot freeze attendees." },
			{ status: 403 },
		);

	if (!db)
		return NextResponse.json(
			{ message: "Database connection failed." },
			{ status: 500 },
		);

	let body;
	try {
		body = await request.json();
		if (!body.eventId) {
			throw new Error("Missing required field: eventId");
		}
	} catch (error) {
		return NextResponse.json(
			{ message: "Invalid request body", error: error.message },
			{ status: 400 },
		);
	}

	const { eventId } = body;

	try {
		const stmt = db.prepare(
			"SELECT user_id FROM EventAttendees WHERE event_id = ? AND verified = 0",
		);
		const unverifiedUsers = stmt.all(eventId);

		if (unverifiedUsers.length === 0) {
			return NextResponse.json(
				{ message: "No unverified attendees found for this event." },
				{ status: 200 },
			);
		}

		const userIdsToFreeze = unverifiedUsers.map((u) => u.user_id);
		let frozenCount = 0;
		const errors = [];

		for (const targetUserId of userIdsToFreeze) {
			try {
				const userToUpdate = await clerkClient.users.getUser(targetUserId);
				const currentMetadata = userToUpdate.publicMetadata || {};

				if (currentMetadata.freezed === true) {
					continue;
				}

				const newMetadata = {
					...currentMetadata,
					freezed: true,
				};

				await clerkClient.users.updateUserMetadata(targetUserId, {
					publicMetadata: newMetadata,
				});

				frozenCount++;
				console.log(
					`Admin ${userId} froze user ${targetUserId} for not attending event ${eventId}`,
				);
			} catch (clerkError) {
				console.error(`Failed to freeze user ${targetUserId}:`, clerkError);
				errors.push(
					`User ${targetUserId}: ${
						clerkError.errors?.[0]?.message || "Unknown Clerk error"
					}`,
				);
			}
		}

		if (errors.length > 0) {
			return NextResponse.json(
				{
					message: `Processed freeze request. Successfully froze ${frozenCount} user(s). Errors occurred for ${errors.length} user(s).`,
					errors: errors,
				},
				{ status: 207 },
			);
		}

		return NextResponse.json(
			{ message: `Successfully froze ${frozenCount} unverified attendee(s).` },
			{ status: 200 },
		);
	} catch (error) {
		console.error("POST /api/events/freeze Error:", error);
		return NextResponse.json(
			{ message: error.message || "Failed to process freeze request." },
			{ status: 500 },
		);
	}
}
