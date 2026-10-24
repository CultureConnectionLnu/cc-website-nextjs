import { createClerkClient } from "@clerk/clerk-sdk-node";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { env } from "@/env";
import db from "@/lib/db";

const clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

export async function GET(request, { params }) {
	const { userId: requestingUserId } = getAuth(request);
	if (!requestingUserId) {
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	}

	const { userId: targetUserId } = params;
	if (!targetUserId) {
		return NextResponse.json(
			{ message: "Target user ID is required." },
			{ status: 400 },
		);
	}

	if (!db) {
		return NextResponse.json(
			{ message: "Database connection failed." },
			{ status: 500 },
		);
	}

	try {
		const targetUser = await clerkClient.users.getUser(targetUserId);
		const userName =
			`${targetUser.firstName || ""} ${targetUser.lastName || ""}`.trim() ||
			targetUser.username;

		const stmt = db.prepare(`
      SELECT
        a.id,
        a.title,
        a.imgurl,
        a.description,
        a.category
      FROM Achievements a
      JOIN UserAchievementStatus uas ON a.id = uas.achievement_id
      WHERE uas.user_id = ? AND uas.achieved = 1 AND a.isEnabled = 1
      ORDER BY a.category, a.title
    `);

		const achievements = stmt.all(targetUserId);

		return NextResponse.json({
			userName,
			achievements,
		});
	} catch (error) {
		console.error(`GET /api/user/${targetUserId}/profile Error:`, error);
		if (error.clerkError) {
			return NextResponse.json({ message: "User not found." }, { status: 404 });
		}
		return NextResponse.json(
			{ message: error.message || "Failed to load user profile." },
			{ status: 500 },
		);
	}
}
