import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { processBadgeScan } from "@/lib/badge-service"; // Importing shared logic
import jwt from "jsonwebtoken";

const QR_JWT_SECRET = process.env.QR_JWT_SECRET;

export async function POST(request) {
	const { userId } = getAuth(request);
	if (!userId) {
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	}

	if (!QR_JWT_SECRET) {
		console.error("QR_JWT_SECRET is not defined.");
		return NextResponse.json(
			{ message: "Server configuration error." },
			{ status: 500 },
		);
	}

	try {
		const body = await request.json();
		let scannedToken = body.scannedData;

		if (!scannedToken) {
			throw new Error("Missing required field: scannedData");
		}

		// --- SUPPORT FOR NEW URL FORMAT ---
		// If the scanner picks up a full URL (e.g. "https://site.com/claim?token=XYZ"),
		// extract just the token part.
		if (scannedToken.includes("token=")) {
			scannedToken = scannedToken.split("token=")[1];
			// Remove any subsequent params if they exist (unlikely in this scheme but safe)
			if (scannedToken.includes("&")) {
				scannedToken = scannedToken.split("&")[0];
			}
		}

		// --- VERIFY TOKEN ---
		let achievementId;
		try {
			const decoded = jwt.verify(scannedToken, QR_JWT_SECRET);

			// Ensure it's an achievement grant token ('ag')
			if (decoded.t !== "ag" || !decoded.a) {
				throw new Error("Invalid token type.");
			}
			achievementId = decoded.a;
		} catch (err) {
			if (err.name === "TokenExpiredError") {
				throw new Error("This QR code has expired.");
			}
			throw new Error("Invalid or tampered QR code.");
		}

		// --- PROCESS BADGE (Shared Logic) ---
		// This handles DB transactions, levels, attendance counts, etc.
		const result = processBadgeScan(userId, achievementId);

		// Return format matching what the frontend expects
		return NextResponse.json(
			{
				success: true,
				message: result.message,
				achievementId: result.achievement.id,
				achievementTitle: result.achievement.title,
				achievedNow: result.achievedNow,
				isAchieved: true, // If processed successfully, they have progress or badge
				// Map any extra fields your legacy frontend might look for
				achieveDescription: result.achievedNow
					? result.achievement.achiveDescription ||
						result.achievement.description
					: null,
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("QR Scan API Error:", error.message);
		const status = error.status || 400; // Default to Bad Request for logic errors
		return NextResponse.json(
			{ success: false, message: error.message || "Failed to process scan." },
			{ status },
		);
	}
}
