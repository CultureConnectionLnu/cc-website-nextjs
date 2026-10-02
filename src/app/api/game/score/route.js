import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import db from "@/lib/db";
import { decryptScore } from "@/lib/secure-score";

const ACHIEVEMENT_IDS = {
	CLASSIC: "ach_1768975584162_mim40",
	BLITZ: "ach_1768978249619_dbo96",
};

const MAX_CLASSIC_DURATION = 18000;
const BLITZ_TIME_PER_QUESTION = 1000;
const BLITZ_BASE_TIME = 5000;

// Helper to update badge progress
function updateAchievement(userId, achievementId, value) {
	try {
		// Check if achievement exists to avoid foreign key errors
		const check = db
			.prepare("SELECT 1 FROM Achievements WHERE id = ?")
			.get(achievementId);
		if (!check) return;

		// Insert or Update progress
		// Note: We map 'score' (value) to 'attendanceCount' based on your previous schema usage for these specific badges
		const stmt = db.prepare(`
      INSERT INTO UserAchievementStatus (achievement_id, user_id, attendanceCount, achieved, achieved_date)
      VALUES (?, ?, ?, 1, STRFTIME('%Y-%m-%d %H:%M:%f', 'now', 'localtime'))
      ON CONFLICT(achievement_id, user_id) DO UPDATE SET
        attendanceCount = MAX(UserAchievementStatus.attendanceCount, excluded.attendanceCount),
        achieved = 1,
        achieved_date = STRFTIME('%Y-%m-%d %H:%M:%f', 'now', 'localtime');
    `);
		stmt.run(achievementId, userId, value);
	} catch (error) {
		console.error(
			`Error updating achievement ${achievementId}:`,
			error.message,
		);
	}
}

export async function POST(request) {
	if (!db) {
		return NextResponse.json(
			{ message: "Database unavailable" },
			{ status: 500 },
		);
	}

	// 1. AUTHENTICATION
	const user = await currentUser();
	if (!user) {
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	}

	try {
		const body = await request.json();
		// We now expect 'data' (encrypted score) and metadata
		const { data, gameName, duration } = body;
		const userId = user.id; // Always use the authenticated user ID

		if (!data || !gameName) {
			return NextResponse.json(
				{ message: "Missing required data" },
				{ status: 400 },
			);
		}

		// 2. DECRYPTION & VALIDATION
		const decrypted = decryptScore(data);

		// Check integrity
		if (!decrypted || typeof decrypted.s !== "number") {
			return NextResponse.json(
				{ message: "Invalid score data (Tampering detected)" },
				{ status: 400 },
			);
		}

		const { s: score, t: timestamp } = decrypted;

		// Check 3: Replay Attack (Score must be generated within last 60s)
		const now = Date.now();
		if (now - timestamp > 60000) {
			return NextResponse.json(
				{ message: "Score submission expired" },
				{ status: 400 },
			);
		}

		// Check 4: Duration / Speed Logic (Preserved from your original code)
		if (duration) {
			if (gameName === "flag_flipper") {
				if (duration > MAX_CLASSIC_DURATION) {
					return NextResponse.json(
						{ message: "Score rejected: Time anomaly detected." },
						{ status: 400 },
					);
				}
			} else if (gameName === "flag_flipper_blitz") {
				const estimatedQuestions = Math.ceil(score / 100);
				const maxAllowedTime =
					(BLITZ_BASE_TIME + estimatedQuestions * BLITZ_TIME_PER_QUESTION) *
					1.2;

				if (duration > maxAllowedTime) {
					return NextResponse.json(
						{ message: "Score rejected: Time anomaly detected." },
						{ status: 400 },
					);
				}
			}
		}

		// 5. DATABASE UPDATE
		const stmt = db.prepare(`
       INSERT INTO GameScores (user_id, game_name, score, played_at)
       VALUES (?, ?, ?, STRFTIME('%Y-%m-%d %H:%M:%f', 'now', 'localtime'))
       ON CONFLICT(user_id, game_name) DO UPDATE SET
         score = MAX(GameScores.score, excluded.score),
         played_at = CASE WHEN excluded.score > GameScores.score THEN excluded.played_at ELSE GameScores.played_at END
    `);

		const info = stmt.run(userId, gameName, score);

		// 6. UPDATE ACHIEVEMENTS
		if (gameName === "flag_flipper") {
			updateAchievement(userId, ACHIEVEMENT_IDS.CLASSIC, score);
		} else if (gameName === "flag_flipper_blitz") {
			updateAchievement(userId, ACHIEVEMENT_IDS.BLITZ, score);
		}

		return NextResponse.json(
			{ success: true, savedScore: score },
			{ status: 200 },
		);
	} catch (error) {
		console.error("API POST /api/game/score: Error:", error.message);
		return NextResponse.json(
			{ message: "Internal Server Error" },
			{ status: 500 },
		);
	}
}

// --- GET and DELETE handlers remain unchanged ---

export async function GET(request) {
	if (!db)
		return NextResponse.json(
			{ message: "Database unavailable" },
			{ status: 500 },
		);

	try {
		const { searchParams } = new URL(request.url);
		const gameNameParam = searchParams.get("gameName");
		const limitParam = parseInt(searchParams.get("limit") || "10", 10);
		const targetUserId = searchParams.get("targetUserId");

		// Feature: Get Rank for specific User
		if (targetUserId && gameNameParam) {
			const userScoreStmt = db.prepare(
				"SELECT score, played_at FROM GameScores WHERE user_id = ? AND game_name = ?",
			);
			const userScoreData = userScoreStmt.get(targetUserId, gameNameParam);

			if (!userScoreData) {
				return NextResponse.json({ found: false }, { status: 200 });
			}

			const rankStmt = db.prepare(`
        SELECT COUNT(*) as count 
        FROM GameScores 
        WHERE game_name = ? 
        AND (score > ? OR (score = ? AND played_at > ?))
      `);

			const rankResult = rankStmt.get(
				gameNameParam,
				userScoreData.score,
				userScoreData.score,
				userScoreData.played_at,
			);

			const rank = (rankResult?.count || 0) + 1;

			return NextResponse.json(
				{
					found: true,
					user_id: targetUserId,
					score: userScoreData.score,
					rank: rank,
				},
				{ status: 200 },
			);
		}

		// Feature: Get Top Scores
		let scoresFromDb;
		if (gameNameParam) {
			const stmt = db.prepare(
				"SELECT id, user_id, score, played_at FROM GameScores WHERE game_name = ? ORDER BY score DESC, played_at DESC LIMIT ?",
			);
			scoresFromDb = stmt.all(gameNameParam, limitParam);
		} else {
			const stmt = db.prepare(
				"SELECT id, user_id, game_name, score, played_at FROM GameScores ORDER BY score DESC, played_at DESC LIMIT ?",
			);
			scoresFromDb = stmt.all(limitParam);
		}
		return NextResponse.json(scoresFromDb || [], { status: 200 });
	} catch (error) {
		console.error("API GET /api/game/score: Error:", error.message);
		return NextResponse.json(
			{ message: "Internal Server Error" },
			{ status: 500 },
		);
	}
}

export async function DELETE(request) {
	if (!db)
		return NextResponse.json(
			{ message: "Database unavailable" },
			{ status: 500 },
		);

	try {
		const { searchParams } = new URL(request.url);
		const gameName = searchParams.get("gameName");

		if (!gameName) {
			return NextResponse.json(
				{ message: "Missing gameName parameter" },
				{ status: 400 },
			);
		}

		const stmt = db.prepare("DELETE FROM GameScores WHERE game_name = ?");
		const info = stmt.run(gameName);

		if (info.changes > 0) {
			return NextResponse.json(
				{
					message: `Successfully deleted ${info.changes} scores for game: ${gameName}`,
				},
				{ status: 200 },
			);
		} else {
			return NextResponse.json(
				{ message: `No scores found for game: ${gameName}` },
				{ status: 200 },
			);
		}
	} catch (error) {
		console.error("API DELETE /api/game/score: Error:", error.message);
		return NextResponse.json(
			{ message: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
