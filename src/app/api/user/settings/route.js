import { NextResponse } from "next/server";
import { createClerkClient } from "@clerk/clerk-sdk-node";
import { z } from "zod";

const settingsSchemaWithUserId = z.object({
	userId: z.string().min(1),
	showPublicName: z.boolean(),
	displayNameType: z.enum(["fullName", "username"]).optional(),
});

const clerkClient = process.env.CLERK_SECRET_KEY
	? createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
	: null;

export async function POST(request) {
	console.warn(
		"API POST /api/user/settings: RUNNING IN MODE WHERE USERID IS CLIENT-SENT. VERIFY SECURITY IMPLICATIONS.",
	);

	if (!clerkClient) {
		console.error("API POST /api/user/settings: Clerk client not initialized.");
		return NextResponse.json(
			{ message: "Server configuration error" },
			{ status: 500 },
		);
	}

	try {
		const body = await request.json();
		const validation = settingsSchemaWithUserId.safeParse(body);

		if (!validation.success) {
			console.warn(
				"API POST /api/user/settings: Validation failed.",
				validation.error.format(),
			);
			return NextResponse.json(
				{ message: "Invalid input", errors: validation.error.issues },
				{ status: 400 },
			);
		}

		const { userId, showPublicName, displayNameType } = validation.data;

		console.log(
			"API POST /api/user/settings: Processing request for client-sent userId:",
			userId,
			"Body:",
			body,
		);

		const user = await clerkClient.users.getUser(userId);
		const existingPublicMetadata = user.publicMetadata || {};

		const newPublicMetadata = {
			...existingPublicMetadata,
			showPublicName: showPublicName,
		};

		if (displayNameType) {
			newPublicMetadata.displayNameType = displayNameType;
		} else if (!newPublicMetadata.displayNameType) {
			newPublicMetadata.displayNameType = "fullName";
		}

		console.log(
			"API POST /api/user/settings: Updating metadata for userId:",
			userId,
			"New metadata:",
			newPublicMetadata,
		);

		await clerkClient.users.updateUserMetadata(userId, {
			publicMetadata: newPublicMetadata,
		});

		console.log(
			"API POST /api/user/settings: Metadata updated successfully for userId:",
			userId,
		);

		return NextResponse.json({
			message: "Settings updated successfully",
			settings: newPublicMetadata,
		});
	} catch (error) {
		console.error(
			"API POST /api/user/settings: Error updating settings:",
			error.message,
			error.stack,
		);
		if (error.errors)
			console.error("Clerk specific errors:", JSON.stringify(error.errors));
		return NextResponse.json(
			{ message: "Internal Server Error", error: error.message },
			{ status: 500 },
		);
	}
}
