import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/clerk-sdk-node";
import { env } from "@/env";
import db from "@/lib/db";
import { generateShortToken } from "@/lib/short-token";

const clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
const BASE_URL =
	process.env.NEXT_PUBLIC_APP_URL || "https://cultureconnection.se";
const intToBool = (val) => (val === 1 ? true : false);

export async function POST(request) {
	const { userId } = getAuth(request);
	if (!userId)
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

	try {
		const user = await clerkClient.users.getUser(userId);
		const isAdmin =
			user.publicMetadata?.admin || user.publicMetadata?.committee;
		if (!isAdmin)
			return NextResponse.json({ message: "Forbidden" }, { status: 403 });

		const body = await request.json();
		if (!body.achievementId) throw new Error("Missing achievementId");

		// --- CRITICAL FIX FOR MULTI-LEVEL 404 ---
		// Frontend sends "ach_123_lvl_2". We must convert to "ach_123"
		let realId = body.achievementId;
		if (realId && realId.includes("_lvl_")) {
			realId = realId.split("_lvl_")[0];
		}
		// ----------------------------------------

		const achievement = db
			.prepare("SELECT id, hasQrCodeExpiry FROM Achievements WHERE id = ?")
			.get(realId);

		if (!achievement)
			return NextResponse.json({ message: "Badge not found" }, { status: 404 });

		// Generate Token
		// intToBool handles SQLite 0/1 conversion safely
		const isStatic = !intToBool(achievement.hasQrCodeExpiry);
		const token = generateShortToken(realId, isStatic);

		return NextResponse.json({
			qrUrl: `${BASE_URL}/claim/${token}`,
		});
	} catch (error) {
		console.error("Generate Token Error:", error);
		return NextResponse.json({ message: "Error" }, { status: 500 });
	}
}
