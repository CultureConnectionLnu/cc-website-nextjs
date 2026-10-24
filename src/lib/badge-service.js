import db from "@/lib/db";

const intToBool = (val) => val === 1;
const COOLDOWN_HOURS = 12;

export function processBadgeScan(userId, achievementId) {
	const currentDate = new Date().toISOString();

	const transaction = db.transaction(() => {
		// 1. Get Badge Rules (FIXED: Added missing fields imgurl, level_config, etc.)
		const achStmt = db.prepare(
			`SELECT id, title, attendanceCounter, attendanceNeed, onScore, imgurl,
              achiveDescription, description, level_config, isEnabled 
       FROM Achievements WHERE id = ?`,
		);
		const achievement = achStmt.get(achievementId);

		if (!achievement) throw { status: 404, message: "Achievement not found." };
		if (!intToBool(achievement.isEnabled))
			throw { status: 403, message: "This badge is disabled." };

		// 2. Get Current Status & Last Scan Time
		const statusStmt = db.prepare(
			`SELECT achieved, attendanceCount, last_scanned_at 
       FROM UserAchievementStatus 
       WHERE achievement_id = ? AND user_id = ?`,
		);
		const userStatus = statusStmt.get(achievementId, userId);

		const alreadyAchievedInDb = userStatus
			? intToBool(userStatus.achieved)
			: false;
		const currentCount = userStatus ? userStatus.attendanceCount || 0 : 0;

		// --- 3. COOLDOWN CHECK ---
		if (userStatus?.last_scanned_at) {
			const lastScan = new Date(userStatus.last_scanned_at).getTime();
			const now = Date.now();
			const diffHours = (now - lastScan) / (1000 * 60 * 60);

			// Only enforce cooldown if it's a progress badge (attendanceCounter = 1)
			// If it's a single-scan badge they already have, the logic below handles "Already achieved" anyway.
			if (
				intToBool(achievement.attendanceCounter) &&
				diffHours < COOLDOWN_HOURS
			) {
				const remaining = Math.ceil(COOLDOWN_HOURS - diffHours);
				throw {
					status: 429,
					message: `Cooldown active. You can scan this again in ${remaining} hours.`,
				};
			}
		}

		let needsUpdate = false;
		let grantAchievementThisScan = false;
		let newCount = currentCount;
		let message = `Scanned '${achievement.title}'.`;

		// 4. Logic
		if (intToBool(achievement.attendanceCounter)) {
			newCount = currentCount + 1;
			needsUpdate = true;

			// Determine Message
			if (achievement.level_config) {
				// It's a leveled badge
				message = "Progress updated!";
			} else {
				// Simple count badge
				message = `Progress: ${newCount} / ${achievement.attendanceNeed ?? "?"}`;
			}

			if (
				!alreadyAchievedInDb &&
				achievement.attendanceNeed !== null &&
				newCount >= achievement.attendanceNeed
			) {
				grantAchievementThisScan = true;
				message = `Unlocked: '${achievement.title}'!`;
			}
		} else {
			// Single Scan Logic
			if (!alreadyAchievedInDb) {
				grantAchievementThisScan = true;
				needsUpdate = true;
				message = `Unlocked: '${achievement.title}'!`;
			} else {
				message = `You already have '${achievement.title}'.`;
			}
		}

		// 5. Update DB
		if (needsUpdate) {
			const upsertStmt = db.prepare(`
        INSERT INTO UserAchievementStatus 
          (achievement_id, user_id, achieved, achieved_date, attendanceCount, last_scanned_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(achievement_id, user_id) DO UPDATE SET
          achieved = CASE WHEN excluded.achieved = 1 THEN 1 ELSE UserAchievementStatus.achieved END,
          achieved_date = CASE WHEN excluded.achieved = 1 THEN excluded.achieved_date ELSE UserAchievementStatus.achieved_date END,
          attendanceCount = excluded.attendanceCount,
          last_scanned_at = excluded.last_scanned_at;
      `);

			upsertStmt.run(
				achievementId,
				userId,
				grantAchievementThisScan ? 1 : alreadyAchievedInDb ? 1 : 0,
				grantAchievementThisScan
					? currentDate
					: userStatus?.achieved_date || null,
				newCount,
				currentDate,
			);
		}

		return {
			success: true,
			message,
			achievement, // Now contains imgurl and level_config!
			achievedNow: grantAchievementThisScan,
			newCount: newCount,
			previousCount: currentCount,
		};
	});

	return transaction();
}
