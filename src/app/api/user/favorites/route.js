import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import db from "@/lib/db";

const intToBool = (val) => (val === 1 ? true : false);

// Helper: Ensure the table supports storing specific levels
const ensureSchema = () => {
	try {
		// Check if column exists, if not, simple error will trigger catch, or we can just try adding it
		// SQLite doesn't support "IF NOT EXISTS" for columns in older versions, but duplicates throw safe error
		db.prepare(
			"ALTER TABLE UserFavoriteAchievements ADD COLUMN level_order INTEGER DEFAULT NULL",
		).run();
	} catch (e) {
		// Column likely already exists, ignore
	}
};

const getLevelDetailsForFavoriteDisplay = (
	baseAchievement,
	userProgress,
	savedLevelOrder,
) => {
	let displayTitle = baseAchievement.title;
	let displayImgUrl = baseAchievement.imgurl;

	if (
		baseAchievement.level_config &&
		intToBool(baseAchievement.attendanceCounter)
	) {
		try {
			const parsedLevels = JSON.parse(baseAchievement.level_config);
			if (parsedLevels.length > 0) {
				const sortedLevels = [...parsedLevels].sort(
					(a, b) => a.progressNeeded - b.progressNeeded,
				);

				let targetLevel = null;

				if (savedLevelOrder) {
					// A. User specifically chose a level (e.g., Bronze)
					targetLevel = sortedLevels.find(
						(l) => l.levelOrder === savedLevelOrder,
					);
				} else {
					// B. Legacy/Default: Show Highest Achieved
					for (let i = sortedLevels.length - 1; i >= 0; i--) {
						if (userProgress >= sortedLevels[i].progressNeeded) {
							targetLevel = sortedLevels[i];
							break;
						}
					}
				}

				if (targetLevel) {
					displayTitle = targetLevel.levelTitle || baseAchievement.title;
					displayImgUrl = targetLevel.levelImgUrl || baseAchievement.imgurl;
				}
			}
		} catch (e) {
			console.error(
				`Error parsing level_config for favorite ${baseAchievement.id}:`,
				e,
			);
		}
	}
	return { displayTitle, displayImgUrl };
};

export async function GET(request) {
	const { userId } = getAuth(request);
	if (!userId)
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	if (!db)
		return NextResponse.json(
			{ message: "Database connection failed." },
			{ status: 500 },
		);

	ensureSchema(); // Ensure column exists for read

	try {
		const stmt = db.prepare(`
      SELECT
        ufa.slot_position,
        ufa.level_order, -- Fetch the specific chosen level
        a.id,
        a.title AS base_title,
        a.category,
        a.imgurl AS base_imgurl,
        a.description,
        a.achiveDescription,
        a.silhouetteColor,
        a.isEnabled,
        a.attendanceCounter,
        a.attendanceNeed AS base_attendanceNeed,
        a.onScore,
        a.level_config,
        uas.attendanceCount AS currentUserProgress,
        uas.achieved AS currentUserAchieved_raw
      FROM UserFavoriteAchievements ufa
      JOIN Achievements a ON ufa.achievement_id = a.id
      LEFT JOIN UserAchievementStatus uas ON ufa.achievement_id = uas.achievement_id AND uas.user_id = ?
      WHERE ufa.user_id = ?
      ORDER BY ufa.slot_position ASC
    `);
		const favoriteBadgesData = stmt.all(userId, userId);

		const favorites = favoriteBadgesData.map((fav) => {
			const { displayTitle, displayImgUrl } = getLevelDetailsForFavoriteDisplay(
				{
					id: fav.id,
					title: fav.base_title,
					imgurl: fav.base_imgurl,
					level_config: fav.level_config,
					attendanceCounter: fav.attendanceCounter,
				},
				fav.currentUserProgress ?? 0,
				fav.level_order, // Pass the saved specific level
			);

			let isActuallyAchieved = intToBool(fav.currentUserAchieved_raw);

			// Fallback check for levels if main flag isn't set
			if (
				!isActuallyAchieved &&
				intToBool(fav.attendanceCounter) &&
				fav.level_config
			) {
				try {
					const levels = JSON.parse(fav.level_config);
					if (levels.length > 0) {
						const firstLevelNeeded = levels.sort(
							(a, b) => a.progressNeeded - b.progressNeeded,
						)[0].progressNeeded;
						if ((fav.currentUserProgress ?? 0) >= firstLevelNeeded) {
							isActuallyAchieved = true;
						}
					}
				} catch (e) {}
			}

			return {
				slot_position: fav.slot_position,
				id: fav.id,
				title: displayTitle,
				category: fav.category,
				imgurl: displayImgUrl,
				description: fav.description,
				achiveDescription: fav.achiveDescription,
				silhouetteColor: fav.silhouetteColor,
				isEnabled: intToBool(fav.isEnabled),
				attendanceCounter: intToBool(fav.attendanceCounter),
				attendanceNeed: fav.base_attendanceNeed,
				onScore: intToBool(fav.onScore),
				currentUserAchieved: isActuallyAchieved,
			};
		});

		return NextResponse.json(favorites);
	} catch (error) {
		console.error("GET /api/user/favorites Error:", error);
		return NextResponse.json(
			{ message: "Failed to load favorites." },
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

	ensureSchema(); // Ensure column exists for write

	let body;
	try {
		body = await request.json();
		if (
			!body.achievementId ||
			!body.slotPosition ||
			![1, 2, 3].includes(body.slotPosition)
		) {
			throw new Error("Missing or invalid fields");
		}
	} catch (error) {
		return NextResponse.json(
			{ message: "Invalid request body", error: error.message },
			{ status: 400 },
		);
	}

	const { achievementId, slotPosition } = body;

	// --- LOGIC: Handle "Exploded" IDs (e.g. ach_123_lvl_2) ---
	let realAchievementId = achievementId;
	let levelOrderToSave = null;

	if (achievementId.includes("_lvl_")) {
		const parts = achievementId.split("_lvl_");
		realAchievementId = parts[0]; // "ach_123"
		levelOrderToSave = parseInt(parts[1], 10); // 2
	}

	try {
		const transaction = db.transaction(() => {
			// 1. Verify User owns this badge (and level)
			const achDetailsStmt = db.prepare(`
        SELECT 
          a.attendanceCounter, 
          a.level_config,
          a.attendanceNeed AS base_attendanceNeed,
          uas.achieved AS rawAchieved,
          uas.attendanceCount
        FROM Achievements a
        LEFT JOIN UserAchievementStatus uas ON a.id = uas.achievement_id AND uas.user_id = ?
        WHERE a.id = ?
      `);
			const achInfo = achDetailsStmt.get(userId, realAchievementId);

			if (!achInfo) throw { status: 404, message: "Achievement not found." };

			// 2. Validate Achievement Status
			let isConsideredAchieved = intToBool(achInfo.rawAchieved);

			// If choosing a specific level, verify they reached THAT level
			if (
				levelOrderToSave !== null &&
				intToBool(achInfo.attendanceCounter) &&
				achInfo.level_config
			) {
				const levels = JSON.parse(achInfo.level_config);
				const targetLevel = levels.find(
					(l) => l.levelOrder === levelOrderToSave,
				);
				if (targetLevel) {
					if ((achInfo.attendanceCount ?? 0) < targetLevel.progressNeeded) {
						throw {
							status: 403,
							message: `You have not reached level ${levelOrderToSave} yet.`,
						};
					}
					isConsideredAchieved = true; // They reached this specific level, so they "have" the badge in this context
				}
			} else if (
				!isConsideredAchieved &&
				intToBool(achInfo.attendanceCounter)
			) {
				// Fallback legacy check
				if (achInfo.level_config) {
					const levels = JSON.parse(achInfo.level_config);
					const sorted = levels.sort(
						(a, b) => a.progressNeeded - b.progressNeeded,
					);
					if (
						sorted.length > 0 &&
						(achInfo.attendanceCount ?? 0) >= sorted[0].progressNeeded
					) {
						isConsideredAchieved = true;
					}
				} else if (
					(achInfo.attendanceCount ?? 0) >= achInfo.base_attendanceNeed
				) {
					isConsideredAchieved = true;
				}
			}

			if (!isConsideredAchieved)
				throw { status: 403, message: "User has not achieved this badge." };

			// 3. Save to DB
			db.prepare(
				"DELETE FROM UserFavoriteAchievements WHERE user_id = ? AND achievement_id = ? AND slot_position != ?",
			).run(userId, realAchievementId, slotPosition);

			const upsertStmt = db.prepare(`
        INSERT INTO UserFavoriteAchievements
          (user_id, achievement_id, slot_position, level_order)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, slot_position) DO UPDATE SET
          achievement_id = excluded.achievement_id,
          level_order = excluded.level_order
      `);
			upsertStmt.run(userId, realAchievementId, slotPosition, levelOrderToSave);

			return { success: true };
		});

		const result = transaction();
		return NextResponse.json(
			{ message: "Favorite badge updated." },
			{ status: 200 },
		);
	} catch (error) {
		console.error("PUT /api/user/favorites Error:", error);
		return NextResponse.json(
			{ message: error.message || "Failed to update." },
			{ status: error.status || 500 },
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

	let body;
	try {
		body = await request.json();
		if (!body.slotPosition || ![1, 2, 3].includes(body.slotPosition))
			throw new Error("Invalid slotPosition");
	} catch (error) {
		return NextResponse.json(
			{ message: "Invalid request body" },
			{ status: 400 },
		);
	}

	try {
		const info = db
			.prepare(
				"DELETE FROM UserFavoriteAchievements WHERE user_id = ? AND slot_position = ?",
			)
			.run(userId, body.slotPosition);
		if (info.changes > 0)
			return NextResponse.json(
				{ message: "Removed successfully." },
				{ status: 200 },
			);
		return NextResponse.json({ message: "Slot empty." }, { status: 404 });
	} catch (error) {
		return NextResponse.json({ message: "Failed to remove." }, { status: 500 });
	}
}
