import { clerkClient, type User } from "@clerk/nextjs/server";
import type { Database } from "better-sqlite3";
import { NextResponse } from "next/server";
import { AuthError, type AuthUser, Role, withAuth } from "@/lib/auth";
import db from "@/lib/db";

type Params = { userId: string };

/**
 * Fetch profile data for a particular user
 */
export const GET = withAuth<Params>(async (req, { params }, user) => {
	const targetUserId = (await params).userId;

	if (user.userId !== targetUserId && !user.roles.includes(Role.admin)) {
		throw new AuthError(
			403,
			"Forbidden: You do not have permission to access this user's profile.",
		);
	}

	if (!db) {
		return NextResponse.json(
			{ message: "Database connection failed." },
			{ status: 500 },
		);
	}

	let targetUser: User;
	try {
		targetUser =
			targetUserId === user.userId
				? user.clerkUser
				: await (await clerkClient()).users.getUser(targetUserId);
	} catch {
		return NextResponse.json({ message: "User not found." }, { status: 404 });
	}

	const userName =
		(`${targetUser.firstName || ""} ${targetUser.lastName || ""}`.trim() ||
			targetUser.username) ??
		"";
	const achievements = getAchievements(db, targetUserId);

	return NextResponse.json({
		userName,
		achievements,
	});
});

function getAchievements(db: Database, userId: string) {
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
	return stmt.all(userId);
}
