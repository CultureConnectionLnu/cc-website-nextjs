import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/clerk-sdk-node";
import { env } from "@/env";
import db from "@/lib/db";

const clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

const intToBool = (val) => (val === 1 ? true : false);
const boolToInt = (val) => (val === true ? 1 : 0);

// Helper to construct a specific level's badge object
const createExplodedBadge = (baseAch, level, isAchieved, userProgress) => {
  const title = level ? level.levelTitle || baseAch.title : baseAch.title;
  const imgurl = level ? level.levelImgUrl || baseAch.imgurl : baseAch.imgurl;
  const description = level
    ? level.levelDescription || baseAch.description
    : baseAch.description;
  const achiveDescription = level
    ? level.levelAchiveDescription ||
      level.levelDescription ||
      baseAch.achiveDescription
    : baseAch.achiveDescription;
  const cardSkin = level
    ? level.levelSkinUrl || baseAch.card_skin_image_url
    : baseAch.card_skin_image_url;

  // Create a unique virtual ID for the level (e.g., ach_123_lvl_2)
  const uniqueId = level ? `${baseAch.id}_lvl_${level.levelOrder}` : baseAch.id;
  const progressTarget = level ? level.progressNeeded : baseAch.attendanceNeed;

  // Use the specific level count if available, otherwise fallback to base total
  const specificGlobalCount = level
    ? level.globalCount || 0
    : baseAch.totalAchievedCount;

  return {
    ...baseAch,
    id: uniqueId,
    original_id: baseAch.id,
    title: title,
    imgurl: imgurl,
    description: description,
    achiveDescription: achiveDescription,
    card_skin_image_url: cardSkin,
    currentUserAchieved: isAchieved,
    currentUserProgress: userProgress,
    attendanceNeed: progressTarget,
    totalAchievedCount: specificGlobalCount,
    isMaxLevel: false,
    level_config: baseAch.level_config,
  };
};

export async function GET(request) {
  const { userId } = getAuth(request);

  if (!db) {
    return NextResponse.json(
      { message: "Database connection failed." },
      { status: 500 },
    );
  }

  try {
    // 1. Fetch Base Data
    const stmt = db.prepare(`
      SELECT
        a.*,
        uas_user.achieved AS currentUserAchieved_raw,
        uas_user.attendanceCount AS currentUserProgress,
        uas_user.achieved_date AS currentUserAchievedDate,
        uas_user.score AS currentUserScore,
        (SELECT COUNT(DISTINCT uas_count.user_id) FROM UserAchievementStatus uas_count WHERE uas_count.achievement_id = a.id AND uas_count.achieved = 1) AS totalAchievedCount,
        (SELECT MAX(uas_max_score.score) FROM UserAchievementStatus uas_max_score WHERE uas_max_score.achievement_id = a.id AND uas_max_score.achieved = 1 AND uas_max_score.score IS NOT NULL) AS highestScore,
        (SELECT json_group_array(json_object('userID', uas_all.user_id, 'achived', CASE WHEN uas_all.achieved = 1 THEN json('true') ELSE json('false') END, 'attendanceCount', uas_all.attendanceCount, 'score', uas_all.score, 'date', uas_all.achieved_date))
         FROM UserAchievementStatus uas_all WHERE uas_all.achievement_id = a.id) AS userHasJson
      FROM
        Achievements a
      LEFT JOIN
        UserAchievementStatus uas_user ON a.id = uas_user.achievement_id AND uas_user.user_id = ?
      ORDER BY a.category, a.title;
    `);

    const achievementsData = stmt.all(userId);

    // 2. Fetch ALL user progress stats to calculate global counts per level
    const allStatsStmt = db.prepare(
      "SELECT achievement_id, attendanceCount FROM UserAchievementStatus WHERE achieved = 1",
    );
    const allStats = allStatsStmt.all();

    const statsMap = {};
    allStats.forEach((row) => {
      if (!statsMap[row.achievement_id]) statsMap[row.achievement_id] = [];
      statsMap[row.achievement_id].push(row.attendanceCount || 0);
    });

    const finalDisplayList = [];

    achievementsData.forEach((ach) => {
      let parsedLevelConfig = [];
      if (ach.level_config) {
        try {
          parsedLevelConfig = JSON.parse(ach.level_config);
        } catch (e) {
          console.error(`Failed to parse level_config for ${ach.id}`, e);
        }
      }

      // Enrich Level Config with Global Counts
      if (parsedLevelConfig.length > 0) {
        const achStats = statsMap[ach.id] || [];
        parsedLevelConfig = parsedLevelConfig.map((level) => {
          const levelCount = achStats.filter(
            (p) => p >= level.progressNeeded,
          ).length;
          return { ...level, globalCount: levelCount };
        });
      }

      const baseObj = {
        ...ach,
        level_config: parsedLevelConfig,
        isEnabled: intToBool(ach.isEnabled),
        attendanceCounter: intToBool(ach.attendanceCounter),
        onScore: intToBool(ach.onScore),
        hasQrCodeExpiry: intToBool(ach.hasQrCodeExpiry), // Correctly cast to boolean
        currentUserAchieved: intToBool(ach.currentUserAchieved_raw),
        userHas: ach.userHasJson
          ? JSON.parse(ach.userHasJson).map((u) => ({
              ...u,
              achived: u.achived === true,
            }))
          : [],
      };

      const userProgress = baseObj.currentUserProgress ?? 0;

      // 3. Explode into levels OR Push single badge
      if (baseObj.attendanceCounter && parsedLevelConfig.length > 0) {
        const sortedLevels = [...parsedLevelConfig].sort(
          (a, b) => a.progressNeeded - b.progressNeeded,
        );

        let nextGoalAdded = false;
        let hasAtLeastOneBadge = false;

        sortedLevels.forEach((level) => {
          if (userProgress >= level.progressNeeded) {
            // User has achieved this level -> Show it as "Achieved"
            finalDisplayList.push(
              createExplodedBadge(baseObj, level, true, userProgress),
            );
            hasAtLeastOneBadge = true;
          } else if (!nextGoalAdded) {
            // This is the next unachieved level -> Show it as "Locked/Next Goal"
            finalDisplayList.push(
              createExplodedBadge(baseObj, level, false, userProgress),
            );
            nextGoalAdded = true;
            hasAtLeastOneBadge = true;
          }
        });

        // If user hasn't even reached level 1, make sure we show the first level as the goal
        if (!hasAtLeastOneBadge && sortedLevels.length > 0) {
          finalDisplayList.push(
            createExplodedBadge(baseObj, sortedLevels[0], false, userProgress),
          );
        }
      } else {
        // Standard Badge (No levels)
        finalDisplayList.push({
          ...baseObj,
          id: baseObj.id,
          currentUserAchievedDescription: baseObj.currentUserAchieved
            ? baseObj.achiveDescription || baseObj.description
            : baseObj.description,
          attendanceNeed: baseObj.attendanceNeed,
        });
      }
    });

    return NextResponse.json(finalDisplayList);
  } catch (error) {
    console.error("GET /api/achievements Error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to load achievements data." },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  const { userId } = getAuth(request);
  if (!userId)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  if (!db) {
    return NextResponse.json(
      { message: "Database connection failed." },
      { status: 500 },
    );
  }

  try {
    const user = await clerkClient.users.getUser(userId);

    const isAdmin = user.publicMetadata?.admin === true;
    const isCommittee = user.publicMetadata?.committee === true;
    if (!isAdmin && !isCommittee)
      return NextResponse.json(
        { message: "Forbidden: User cannot create achievements." },
        { status: 403 },
      );

    let body;
    try {
      body = await request.json();
      if (!body.title || !body.imgurl) {
        throw new Error("Missing required fields: title, imgurl");
      }
      if (
        boolToInt(body.attendanceCounter) &&
        body.level_config &&
        body.level_config.length > 0
      ) {
        // Valid configuration
      } else if (!body.description) {
        throw new Error("Missing required field: description");
      }
    } catch (error) {
      return NextResponse.json(
        { message: "Invalid request body", error: error.message },
        { status: 400 },
      );
    }

    const newAchievementId = `ach_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 7)}`;
    const isEnabled = boolToInt(
      body.isEnabled !== undefined ? body.isEnabled : true,
    );
    const attendanceCounter = boolToInt(body.attendanceCounter || false);
    const onScore = boolToInt(body.onScore || false);
    const hasQrCodeExpiry = boolToInt(
      body.hasQrCodeExpiry !== undefined ? body.hasQrCodeExpiry : true,
    );
    const attendanceNeed =
      attendanceCounter &&
      body.attendanceNeed &&
      (!body.level_config || body.level_config.length === 0)
        ? parseInt(body.attendanceNeed, 10) || null
        : null;
    const cardSkinImageUrl = body.card_skin_image_url || null;
    const levelConfig =
      body.level_config && Array.isArray(body.level_config)
        ? JSON.stringify(body.level_config)
        : null;

    const stmt = db.prepare(`
      INSERT INTO Achievements
        (id, title, category, imgurl, description, achiveDescription, silhouetteColor, isEnabled, attendanceCounter, attendanceNeed, onScore, card_skin_image_url, level_config, hasQrCodeExpiry)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      newAchievementId,
      body.title,
      body.category || "Uncategorized",
      body.imgurl,
      body.description || "",
      body.achiveDescription || body.description || "",
      body.silhouetteColor || "bg-gray-400",
      isEnabled,
      attendanceCounter,
      attendanceNeed,
      onScore,
      cardSkinImageUrl,
      levelConfig,
      hasQrCodeExpiry,
    );

    const selectStmt = db.prepare("SELECT * FROM Achievements WHERE id = ?");
    const newAchievementData = selectStmt.get(newAchievementId);
    if (newAchievementData.level_config) {
      newAchievementData.level_config = JSON.parse(
        newAchievementData.level_config,
      );
    }
    newAchievementData.isEnabled = intToBool(newAchievementData.isEnabled);
    newAchievementData.attendanceCounter = intToBool(
      newAchievementData.attendanceCounter,
    );
    newAchievementData.onScore = intToBool(newAchievementData.onScore);
    newAchievementData.hasQrCodeExpiry = intToBool(
      newAchievementData.hasQrCodeExpiry,
    );
    newAchievementData.userHas = [];

    return NextResponse.json(newAchievementData, { status: 201 });
  } catch (error) {
    console.error("POST /api/achievements Error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to create achievement" },
      { status: 500 },
    );
  }
}

export async function PUT(request) {
  const { userId } = getAuth(request);
  if (!userId)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  if (!db) {
    return NextResponse.json(
      { message: "Database connection failed." },
      { status: 500 },
    );
  }

  try {
    const user = await clerkClient.users.getUser(userId);

    const isAdmin = user.publicMetadata?.admin === true;
    const isCommittee = user.publicMetadata?.committee === true;
    if (!isAdmin && !isCommittee)
      return NextResponse.json(
        { message: "Forbidden: User cannot edit achievements." },
        { status: 403 },
      );

    let body;
    try {
      body = await request.json();
      if (!body.id) {
        throw new Error("Missing required field: id");
      }
      if (!body.title || !body.imgurl) {
        throw new Error("Missing required fields: title, imgurl");
      }
    } catch (error) {
      return NextResponse.json(
        { message: "Invalid request body", error: error.message },
        { status: 400 },
      );
    }

    // --- FIX FOR EXPLODED IDs ---
    // If ID looks like "ach_123_lvl_1", strip the "_lvl_1" part
    let realAchievementId = body.id;
    if (realAchievementId && realAchievementId.includes("_lvl_")) {
      realAchievementId = realAchievementId.split("_lvl_")[0];
    }
    // ----------------------------

    const selectStmt = db.prepare("SELECT * FROM Achievements WHERE id = ?");
    const originalAchievement = selectStmt.get(realAchievementId);

    if (!originalAchievement) {
      return NextResponse.json(
        { message: "Achievement not found" },
        { status: 404 },
      );
    }

    const title = body.title ?? originalAchievement.title;
    const category = body.category ?? originalAchievement.category;
    const imgurl = body.imgurl ?? originalAchievement.imgurl;
    const description =
      body.description ?? originalAchievement.description ?? "";
    const achiveDescription =
      body.achiveDescription ??
      originalAchievement.achiveDescription ??
      description;
    const silhouetteColor =
      body.silhouetteColor ?? originalAchievement.silhouetteColor;
    const isEnabled = boolToInt(
      body.isEnabled !== undefined
        ? body.isEnabled
        : intToBool(originalAchievement.isEnabled),
    );
    const attendanceCounter = boolToInt(
      body.attendanceCounter !== undefined
        ? body.attendanceCounter
        : intToBool(originalAchievement.attendanceCounter),
    );
    const onScore = boolToInt(
      body.onScore !== undefined
        ? body.onScore
        : intToBool(originalAchievement.onScore),
    );
    const hasQrCodeExpiry = boolToInt(
      body.hasQrCodeExpiry !== undefined
        ? body.hasQrCodeExpiry
        : intToBool(originalAchievement.hasQrCodeExpiry),
    );
    const attendanceNeed =
      attendanceCounter &&
      body.attendanceNeed &&
      (!body.level_config || body.level_config.length === 0)
        ? parseInt(body.attendanceNeed, 10) || null
        : attendanceCounter &&
            (!body.level_config || body.level_config.length === 0)
          ? originalAchievement.attendanceNeed
          : null;

    const cardSkinImageUrl =
      body.card_skin_image_url !== undefined
        ? body.card_skin_image_url
        : originalAchievement.card_skin_image_url;
    const levelConfig =
      body.level_config && Array.isArray(body.level_config)
        ? JSON.stringify(body.level_config)
        : originalAchievement.level_config;

    const updateStmt = db.prepare(`
      UPDATE Achievements SET
        title = ?, category = ?, imgurl = ?, description = ?, achiveDescription = ?,
        silhouetteColor = ?, isEnabled = ?, attendanceCounter = ?, attendanceNeed = ?, onScore = ?, card_skin_image_url = ?, level_config = ?, hasQrCodeExpiry = ?
      WHERE id = ?
    `);

    updateStmt.run(
      title,
      category,
      imgurl,
      description,
      achiveDescription,
      silhouetteColor,
      isEnabled,
      attendanceCounter,
      attendanceNeed,
      onScore,
      cardSkinImageUrl,
      levelConfig,
      hasQrCodeExpiry,
      realAchievementId, // Use cleaned ID
    );

    const returnStmt = db.prepare(`
      SELECT
        a.*,
        (SELECT json_group_array(json_object('userID', uas_all.user_id, 'achived', CASE WHEN uas_all.achieved = 1 THEN json('true') ELSE json('false') END, 'attendanceCount', uas_all.attendanceCount, 'score', uas_all.score, 'date', uas_all.achieved_date))
         FROM UserAchievementStatus uas_all WHERE uas_all.achievement_id = a.id) AS userHasJson
      FROM Achievements a
      WHERE a.id = ?;
    `);
    const updatedData = returnStmt.get(realAchievementId);

    if (!updatedData) {
      return NextResponse.json(
        { message: "Achievement not found after update" },
        { status: 404 },
      );
    }
    if (updatedData.level_config) {
      updatedData.level_config = JSON.parse(updatedData.level_config);
    }

    const finalResponse = {
      ...updatedData,
      isEnabled: intToBool(updatedData.isEnabled),
      attendanceCounter: intToBool(updatedData.attendanceCounter),
      onScore: intToBool(updatedData.onScore),
      hasQrCodeExpiry: intToBool(updatedData.hasQrCodeExpiry),
      userHas: updatedData.userHasJson
        ? JSON.parse(updatedData.userHasJson).map((u) => ({
            ...u,
            achived: u.achived === true,
          }))
        : [],
      userHasJson: undefined,
    };

    return NextResponse.json(finalResponse, { status: 200 });
  } catch (error) {
    console.error("PUT /api/achievements Error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to update achievement" },
      { status: 500 },
    );
  }
}

export async function PATCH(request) {
  const { userId } = getAuth(request);
  if (!userId)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  if (!db) {
    return NextResponse.json(
      { message: "Database connection failed." },
      { status: 500 },
    );
  }

  let body;
  try {
    body = await request.json();
    if (!body.achievementId || !body.targetUserId || !body.action) {
      throw new Error(
        "Missing required fields: achievementId, targetUserId, action",
      );
    }
  } catch (error) {
    return NextResponse.json(
      { message: "Invalid request body", error: error.message },
      { status: 400 },
    );
  }

  const { achievementId, targetUserId, action } = body;

  try {
    const user = await clerkClient.users.getUser(userId);

    const isAdmin = user.publicMetadata?.admin === true;
    const isCommittee = user.publicMetadata?.committee === true;

    if (action === "setAchieved" && !isAdmin && !isCommittee) {
      return NextResponse.json(
        { message: "Forbidden: Not authorized to grant/revoke achievements." },
        { status: 403 },
      );
    }
    if (
      (action === "updateCount" || action === "updateScore") &&
      !isAdmin &&
      !isCommittee
    ) {
      return NextResponse.json(
        {
          message:
            "Forbidden: User cannot update achievement counts or scores.",
        },
        { status: 403 },
      );
    }

    const patchTransaction = db.transaction(() => {
      // --- FIX FOR PATCH ---
      // Exploded ID stripping just in case
      let realAchievementId = achievementId;
      if (realAchievementId && realAchievementId.includes("_lvl_")) {
        realAchievementId = realAchievementId.split("_lvl_")[0];
      }
      // ---------------------

      const achStmt = db.prepare(
        "SELECT id, title, onScore, attendanceCounter, attendanceNeed, level_config FROM Achievements WHERE id = ?",
      );
      const achievement = achStmt.get(realAchievementId);

      if (!achievement) {
        throw { status: 404, message: "Achievement not found" };
      }

      let parsedLevelConfig = [];
      if (achievement.level_config) {
        try {
          parsedLevelConfig = JSON.parse(achievement.level_config);
        } catch (e) {
          console.error(
            `Failed to parse level_config in PATCH for achievement ${achievement.id}:`,
            e,
          );
        }
      }

      const currentDate = new Date().toISOString();

      if (action === "setAchieved") {
        const { achieved } = body;
        const achievedValue = boolToInt(achieved);
        const dateValue = achieved ? currentDate : null;
        let attendanceCountToSet;

        if (achieved) {
          // If manually granting a badge, set count to the requirement
          if (
            intToBool(achievement.attendanceCounter) &&
            parsedLevelConfig.length > 0
          ) {
            const sortedLevels = [...parsedLevelConfig].sort(
              (a, b) => b.progressNeeded - a.progressNeeded, // Sort Descending to get hardest req if undefined
            );
            // Default to max level req if specifically granting the base badge
            attendanceCountToSet = sortedLevels[0].progressNeeded;
          } else if (intToBool(achievement.attendanceCounter)) {
            attendanceCountToSet = achievement.attendanceNeed || 1;
          } else {
            attendanceCountToSet = 1;
          }
        } else {
          attendanceCountToSet = 0;
        }

        const stmt = db.prepare(`
        INSERT INTO UserAchievementStatus (achievement_id, user_id, achieved, achieved_date, attendanceCount, score)
        VALUES (?, ?, ?, ?, ?, CASE WHEN ? = 0 THEN NULL ELSE (SELECT score FROM UserAchievementStatus WHERE achievement_id = ? AND user_id = ?) END)
        ON CONFLICT(achievement_id, user_id) DO UPDATE SET
          achieved = excluded.achieved,
          achieved_date = excluded.achieved_date,
          attendanceCount = excluded.attendanceCount,
          score = CASE WHEN excluded.achieved = 0 THEN NULL ELSE UserAchievementStatus.score END;
      `);
        stmt.run(
          realAchievementId,
          targetUserId,
          achievedValue,
          dateValue,
          attendanceCountToSet,
          achievedValue,
          realAchievementId,
          targetUserId,
        );
      } else if (action === "updateCount") {
        const { countChange } = body;
        const updateCountStmt = db.prepare(`
          INSERT INTO UserAchievementStatus (achievement_id, user_id, attendanceCount, achieved, achieved_date, score)
          VALUES (?, ?, MAX(0, ?), 0, NULL, NULL)
          ON CONFLICT(achievement_id, user_id) DO UPDATE SET
              attendanceCount = MAX(0, IFNULL(UserAchievementStatus.attendanceCount, 0) + ?);
      `);
        updateCountStmt.run(
          realAchievementId,
          targetUserId,
          countChange,
          countChange,
        );

        const statusCheckStmt = db.prepare(`
          SELECT uas.attendanceCount, uas.achieved as alreadyAchievedDb
          FROM UserAchievementStatus uas
          WHERE uas.achievement_id = ? AND uas.user_id = ?
      `);
        const statusCheck = statusCheckStmt.get(
          realAchievementId,
          targetUserId,
        );

        if (statusCheck && intToBool(achievement.attendanceCounter)) {
          let newAchievedStatusBasedOnLevels = false;
          let oldAchievedStatusDb = intToBool(statusCheck.alreadyAchievedDb);

          if (parsedLevelConfig.length > 0) {
            const sortedLevels = [...parsedLevelConfig].sort(
              (a, b) => a.progressNeeded - b.progressNeeded,
            );
            // Check against lowest level for "Achieved" status on the main record
            if (statusCheck.attendanceCount >= sortedLevels[0].progressNeeded) {
              newAchievedStatusBasedOnLevels = true;
            }
          } else if (
            achievement.attendanceNeed &&
            statusCheck.attendanceCount >= achievement.attendanceNeed
          ) {
            newAchievedStatusBasedOnLevels = true;
          }

          if (newAchievedStatusBasedOnLevels && !oldAchievedStatusDb) {
            const grantStmt = db.prepare(`
                UPDATE UserAchievementStatus
                SET achieved = 1, achieved_date = ?
                WHERE achievement_id = ? AND user_id = ? AND achieved = 0
            `);
            grantStmt.run(currentDate, realAchievementId, targetUserId);
          } else if (!newAchievedStatusBasedOnLevels && oldAchievedStatusDb) {
            // NOTE: We generally don't auto-revoke if they slip below, but here we can if needed
            // For now, let's allow manual revocation only or strictly follow rules
            /*
            const revokeStmt = db.prepare(`
                UPDATE UserAchievementStatus
                SET achieved = 0, achieved_date = NULL
                WHERE achievement_id = ? AND user_id = ? AND achieved = 1
            `);
            revokeStmt.run(realAchievementId, targetUserId);
            */
          }
        }
      } else if (action === "updateScore") {
        if (!intToBool(achievement.onScore)) {
          throw {
            status: 400,
            message: "Scoring is not enabled for this achievement.",
          };
        }
        const { score } = body;
        const scoreValue =
          typeof score === "number" && !isNaN(score) ? score : null;
        const stmt = db.prepare(`
        INSERT INTO UserAchievementStatus (achievement_id, user_id, score, achieved, attendanceCount, achieved_date)
        VALUES (?, ?, ?, (SELECT achieved FROM UserAchievementStatus WHERE achievement_id = ? AND user_id = ?), (SELECT attendanceCount FROM UserAchievementStatus WHERE achievement_id = ? AND user_id = ?), (SELECT achieved_date FROM UserAchievementStatus WHERE achievement_id = ? AND user_id = ?))
        ON CONFLICT(achievement_id, user_id) DO UPDATE SET
          score = excluded.score;
      `);
        stmt.run(
          realAchievementId,
          targetUserId,
          scoreValue,
          realAchievementId,
          targetUserId,
          realAchievementId,
          targetUserId,
          realAchievementId,
          targetUserId,
        );
      }
      return { success: true, message: `Action ${action} processed.` };
    });

    const result = patchTransaction();
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error(`PATCH /api/achievements (Action: ${action}) Error:`, error);
    const status = error.status || 500;
    const message =
      error.message || `Failed to ${action} achievement status/count/score`;
    return NextResponse.json({ message }, { status });
  }
}

export async function DELETE(request) {
  const { userId } = getAuth(request);
  if (!userId)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  if (!db) {
    return NextResponse.json(
      { message: "Database connection failed." },
      { status: 500 },
    );
  }

  try {
    const user = await clerkClient.users.getUser(userId);

    const isAdmin = user.publicMetadata?.admin === true;
    const isCommittee = user.publicMetadata?.committee === true;
    if (!isAdmin && !isCommittee)
      return NextResponse.json(
        { message: "Forbidden: User cannot delete achievements." },
        { status: 403 },
      );

    const { searchParams } = new URL(request.url);
    let achievementId = searchParams.get("id");
    if (!achievementId)
      return NextResponse.json(
        { message: "Missing required query parameter: id" },
        { status: 400 },
      );

    // --- FIX FOR EXPLODED IDs ---
    if (achievementId.includes("_lvl_")) {
      achievementId = achievementId.split("_lvl_")[0];
    }
    // ----------------------------

    const stmt = db.prepare("DELETE FROM Achievements WHERE id = ?");
    const info = stmt.run(achievementId);
    if (info.changes === 0) {
      return NextResponse.json(
        { message: `Achievement ${achievementId} not found.` },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { message: `Achievement ${achievementId} deleted successfully.` },
      { status: 200 },
    );
  } catch (error) {
    console.error("DELETE /api/achievements Error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to delete achievement" },
      { status: 500 },
    );
  }
}
