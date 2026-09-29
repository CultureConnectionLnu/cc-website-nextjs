import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/clerk-sdk-node";
import jwt from "jsonwebtoken";
import { env } from "@/env";

const clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
const QR_JWT_SECRET = process.env.QR_JWT_SECRET;

export async function POST(request) {
  const { userId: scanningUserId } = getAuth(request);
  if (!scanningUserId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!QR_JWT_SECRET) {
    console.error("QR_JWT_SECRET is not defined for token verification.");
    return NextResponse.json(
      { message: "Server configuration error." },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();
    const { userToken } = body;

    if (!userToken) {
      return NextResponse.json(
        { message: "User token is required." },
        { status: 400 },
      );
    }

    const decoded = jwt.verify(userToken, QR_JWT_SECRET);
    if (decoded.t !== "ui" || !decoded.u) {
      throw new Error("Invalid token type or payload.");
    }

    const targetUserId = decoded.u;

    const targetUser = await clerkClient.users.getUser(targetUserId);
    const userName =
      `${targetUser.firstName || ""} ${targetUser.lastName || ""}`.trim() ||
      targetUser.username;

    return NextResponse.json({
      success: true,
      userId: targetUserId,
      userName: userName,
    });
  } catch (error) {
    console.error("Error verifying user identity QR token:", error.message);
    if (error.name === "TokenExpiredError") {
      return NextResponse.json(
        { message: "This QR code has expired." },
        { status: 401 },
      );
    }
    if (error.name === "JsonWebTokenError") {
      return NextResponse.json(
        { message: "This QR code is invalid." },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { message: "Failed to verify user identity." },
      { status: 500 },
    );
  }
}
