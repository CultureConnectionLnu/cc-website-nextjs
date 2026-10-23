import { createClerkClient } from "@clerk/clerk-sdk-node";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { env } from "@/env";
import db from "@/lib/db";

const clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

export async function POST(request) {
	const { userId } = getAuth(request);

	if (!userId) {
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	}

	if (!db) {
		return NextResponse.json(
			{ message: "Database connection failed." },
			{ status: 500 },
		);
	}

	let body;
	try {
		body = await request.json();
	} catch (error) {
		return NextResponse.json(
			{ message: "Invalid request body" },
			{ status: 400 },
		);
	}

	const { achievementIdForSkin } = body; // Can be null or an achievement ID

	try {
		let skinUrlToSet = null;

		if (achievementIdForSkin) {
			const achievementStmt = db.prepare(`
        SELECT card_skin_image_url FROM Achievements WHERE id = ?
      `);
			const achievement = achievementStmt.get(achievementIdForSkin);

			if (!achievement?.card_skin_image_url) {
				return NextResponse.json(
					{ message: "Selected achievement does not grant a skin." },
					{ status: 400 },
				);
			}

			const userAchievedStmt = db.prepare(`
        SELECT achieved FROM UserAchievementStatus
        WHERE user_id = ? AND achievement_id = ? AND achieved = 1
      `);
			const userHasAchieved = userAchievedStmt.get(
				userId,
				achievementIdForSkin,
			);

			if (!userHasAchieved) {
				return NextResponse.json(
					{ message: "User has not achieved the badge for this skin." },
					{ status: 403 },
				);
			}
			skinUrlToSet = achievement.card_skin_image_url;
		}

		await clerkClient.users.updateUserMetadata(userId, {
			publicMetadata: {
				selectedCardSkinUrl: skinUrlToSet,
			},
		});

		return NextResponse.json(
			{ message: "Card skin updated successfully." },
			{ status: 200 },
		);
	} catch (error) {
		console.error("POST /api/user/card-skin Error:", error);
		let errorMessage = "Failed to update card skin.";
		if (error.errors && error.errors.length > 0) {
			errorMessage = error.errors[0].message;
		} else if (error.message) {
			errorMessage = error.message;
		}
		return NextResponse.json({ message: errorMessage }, { status: 500 });
	}
}
