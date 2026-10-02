import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "achievements.db");

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
	fs.mkdirSync(dbDir, { recursive: true });
}

let db;

try {
	db = new Database(dbPath, {});
	db.pragma("journal_mode = WAL");
	db.pragma("foreign_keys = ON");

	const createAchievementsTable = `
    CREATE TABLE IF NOT EXISTS Achievements (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT,
        imgurl TEXT,
        description TEXT,
        achiveDescription TEXT,
        silhouetteColor TEXT,
        isEnabled INTEGER NOT NULL DEFAULT 1,
        attendanceCounter INTEGER NOT NULL DEFAULT 0,
        attendanceNeed INTEGER,
        onScore INTEGER NOT NULL DEFAULT 0
    );`;

	const createUserStatusTable = `
    CREATE TABLE IF NOT EXISTS UserAchievementStatus (
        achievement_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        achieved INTEGER NOT NULL DEFAULT 0,
        attendanceCount INTEGER DEFAULT 0,
        achieved_date TEXT,
        score INTEGER,
        PRIMARY KEY (achievement_id, user_id),
        FOREIGN KEY (achievement_id) REFERENCES Achievements(id)
            ON DELETE CASCADE
            ON UPDATE CASCADE
    );`;

	const createUserFavoritesTable = `
  CREATE TABLE IF NOT EXISTS UserFavoriteAchievements (
      user_id TEXT NOT NULL,
      achievement_id TEXT NOT NULL,
      slot_position INTEGER NOT NULL,
      PRIMARY KEY (user_id, slot_position),
      FOREIGN KEY (achievement_id) REFERENCES Achievements(id)
          ON DELETE CASCADE
          ON UPDATE CASCADE
  );`;

	const createGameScoresTable = `
    CREATE TABLE IF NOT EXISTS GameScores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        game_name TEXT NOT NULL,
        score INTEGER NOT NULL,
        played_at TEXT DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'now', 'localtime')),
        UNIQUE(user_id, game_name)
    );`;

	const createIndexUserStatus = `CREATE INDEX IF NOT EXISTS idx_user_achievement ON UserAchievementStatus (user_id, achievement_id);`;
	const createIndexAchieved = `CREATE INDEX IF NOT EXISTS idx_achieved ON UserAchievementStatus (achievement_id, achieved);`;
	const createIndexGameScoresUser = `CREATE INDEX IF NOT EXISTS idx_game_scores_user_game ON GameScores (user_id, game_name);`;

	db.exec(createAchievementsTable);
	db.exec(createUserStatusTable);
	db.exec(createGameScoresTable);
	db.exec(createIndexUserStatus);
	db.exec(createIndexAchieved);
	db.exec(createIndexGameScoresUser);
	db.exec(createUserFavoritesTable);
} catch (err) {
	console.error("Error connecting to or initializing SQLite database:", err);
	db = null;
}

process.on("exit", () => {
	if (db && db.open) {
		db.close((err) => {
			if (err) {
				console.error("Error closing SQLite connection:", err.message);
			}
		});
	}
});
process.on("SIGINT", () => process.exit());

export default db;
