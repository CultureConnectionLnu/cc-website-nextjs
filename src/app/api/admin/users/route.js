// app/api/admin/users/route.js
import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/clerk-sdk-node";
import fs from "fs/promises";
import path from "path";

const initializeClerk = () => {
	const secretKey = process.env.CLERK_SECRET_KEY;
	if (!secretKey) {
		console.error("Clerk Secret Key is missing from environment variables!");
		throw new Error("Server configuration error: Clerk Secret Key missing.");
	}
	try {
		return createClerkClient({ secretKey });
	} catch (error) {
		console.error("Failed to initialize Clerk SDK:", error);
		throw new Error("Failed to initialize Clerk SDK.");
	}
};

async function verifyUserLoggedIn(request) {
	let authResult;
	try {
		authResult = getAuth(request);
		if (!authResult || !authResult.userId) {
			console.error("verifyUserLoggedIn: Failed to get userId from getAuth.");
			return {
				authorized: false,
				error: "Authentication context missing or invalid session.",
				status: 401,
			};
		}
		return { authorized: true, userId: authResult.userId };
	} catch (error) {
		console.error("verifyUserLoggedIn: Error calling getAuth:", error);
		return {
			authorized: false,
			error: "Failed to get authentication context due to server error.",
			status: 500,
		};
	}
}

const verificationFilePath = path.join(
	process.cwd(),
	"public",
	"data",
	"MemberVerefication.json",
);

async function fetchAllClerkUsers(clerk) {
	const pageSize = 500;
	let offset = 0;
	let allUsers = [];

	while (true) {
		const response = await clerk.users.getUserList({
			limit: pageSize,
			offset,
		});

		const pageUsers = Array.isArray(response?.data) ? response.data : [];
		allUsers = allUsers.concat(pageUsers);

		if (pageUsers.length < pageSize) break;
		offset += pageSize;
	}

	return allUsers;
}

async function readVerificationData() {
	try {
		const fileContent = await fs.readFile(verificationFilePath, "utf-8");
		const data = JSON.parse(fileContent);
		if (
			Array.isArray(data) &&
			data.every(
				(item) => typeof item === "object" && item !== null && "userID" in item,
			)
		) {
			return data;
		}
		console.warn(
			"MemberVerefication.json format is invalid. Returning empty array.",
		);
		return [];
	} catch (error) {
		if (error.code === "ENOENT") {
			console.log("MemberVerefication.json not found, returning empty list.");
			return [];
		}
		console.error("Error reading or parsing MemberVerefication.json:", error);
		return [];
	}
}

async function removeUserFromVerification(userIdToRemove) {
	try {
		const currentData = await readVerificationData();
		const newData = currentData.filter(
			(entry) => entry.userID !== userIdToRemove,
		);

		if (newData.length !== currentData.length) {
			await fs.writeFile(
				verificationFilePath,
				JSON.stringify(newData, null, 2),
				"utf-8",
			);
			console.log(
				`Successfully removed user ${userIdToRemove} from MemberVerefication.json`,
			);
		} else {
			console.log(
				`User ${userIdToRemove} not found in MemberVerefication.json, no changes needed.`,
			);
		}
	} catch (error) {
		console.error(
			`Error updating MemberVerefication.json for user ${userIdToRemove}:`,
			error,
		);
	}
}

export async function GET(request) {
	const loggedInCheck = await verifyUserLoggedIn(request);
	if (!loggedInCheck.authorized) {
		return NextResponse.json(
			{ error: loggedInCheck.error },
			{ status: loggedInCheck.status },
		);
	}

	let clerk;
	try {
		clerk = initializeClerk();

		const [users, verificationList] = await Promise.all([
			fetchAllClerkUsers(clerk),
			readVerificationData(),
		]);

		const pendingUserIds = new Set(
			verificationList.map((entry) => entry.userID),
		);

		if (!Array.isArray(users)) {
			throw new Error("Received invalid user list format from Clerk.");
		}

		const userData = users.map((user) => {
			const isActuallyMember = user.publicMetadata?.member === true;
			const isInVerificationFile = pendingUserIds.has(user.id);
			const isPending = isInVerificationFile && !isActuallyMember;

			return {
				id: user.id,
				firstName: user.firstName,
				lastName: user.lastName,
				username: user.username,
				email:
					user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
						?.emailAddress || "No primary email",
				isAdmin: user.publicMetadata?.admin === true,
				isMember: isActuallyMember,
				isCommittee: user.publicMetadata?.committee === true,
				isFreezed: user.publicMetadata?.freezed === true,
				isPending: isPending,
			};
		});

		return NextResponse.json(userData);
	} catch (error) {
		console.error(
			"API GET /api/admin/users - Error during user fetch, verification read, or SDK init:",
			error,
		);
		if (
			error.message.includes("Clerk Secret Key missing") ||
			error.message.includes("Failed to initialize Clerk SDK")
		) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}
		if (error.message.includes("Received invalid user list format")) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}
		return NextResponse.json(
			{ error: `Failed to fetch users: ${error.message}` },
			{ status: 500 },
		);
	}
}

export async function PUT(request) {
	const loggedInCheck = await verifyUserLoggedIn(request);
	if (!loggedInCheck.authorized) {
		return NextResponse.json(
			{ error: loggedInCheck.error },
			{ status: loggedInCheck.status },
		);
	}

	let clerk;
	try {
		clerk = initializeClerk();
		const { userId, metadataKey, metadataValue } = await request.json();

		const validKeys = ["admin", "member", "freezed", "committee"];
		if (
			!userId ||
			!validKeys.includes(metadataKey) ||
			typeof metadataValue !== "boolean"
		) {
			console.error("API PUT /api/admin/users - Invalid request body:", {
				userId,
				metadataKey,
				metadataValue,
			});
			return NextResponse.json(
				{
					error:
						"Invalid input: Missing userId, invalid metadataKey, or metadataValue is not a boolean.",
				},
				{ status: 400 },
			);
		}

		let existingMetadata = {};
		try {
			const user = await clerk.users.getUser(userId);
			existingMetadata = user.publicMetadata || {};
		} catch (fetchError) {
			console.error(
				`API PUT /api/admin/users - Failed to fetch user ${userId} before update:`,
				fetchError,
			);
			return NextResponse.json(
				{ error: `Failed to fetch user ${userId} to get existing metadata.` },
				{ status: 500 },
			);
		}

		const finalMetadata = { ...existingMetadata, [metadataKey]: metadataValue };

		if (metadataKey === "admin" && metadataValue === true) {
			finalMetadata.member = true;
		}

		await clerk.users.updateUserMetadata(userId, {
			publicMetadata: finalMetadata,
		});

		if (metadataKey === "member" && metadataValue === true) {
			removeUserFromVerification(userId).catch((err) => {
				console.error(
					`Unhandled error during removeUserFromVerification for ${userId}:`,
					err,
				);
			});
		}

		return NextResponse.json({
			success: true,
			userId,
			metadataKey,
			metadataValue,
		});
	} catch (error) {
		console.error(
			"API PUT /api/admin/users - Error during user update or SDK init:",
			error,
		);
		if (
			error.message.includes("Clerk Secret Key missing") ||
			error.message.includes("Failed to initialize Clerk SDK")
		) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}
		return NextResponse.json(
			{ error: `Failed to update user status: ${error.message}` },
			{ status: 500 },
		);
	}
}

export async function POST(request) {
	const loggedInCheck = await verifyUserLoggedIn(request);
	if (!loggedInCheck.authorized) {
		return NextResponse.json(
			{ error: loggedInCheck.error },
			{ status: loggedInCheck.status },
		);
	}

	let isAdmin = false;
	let clerkForAdminCheck;
	try {
		clerkForAdminCheck = initializeClerk();
		const requestingUser = await clerkForAdminCheck.users.getUser(
			loggedInCheck.userId,
		);
		isAdmin = requestingUser?.publicMetadata?.admin === true;
	} catch (adminCheckError) {
		console.error(
			"API POST /api/admin/users - Error checking admin status for requesting user:",
			adminCheckError,
		);
		if (
			adminCheckError.message.includes("Clerk Secret Key missing") ||
			adminCheckError.message.includes("Failed to initialize Clerk SDK")
		) {
			return NextResponse.json(
				{ error: adminCheckError.message },
				{ status: 500 },
			);
		}
		return NextResponse.json(
			{ error: "Failed to verify admin privileges." },
			{ status: 500 },
		);
	}

	if (!isAdmin) {
		return NextResponse.json(
			{ error: "Unauthorized: Admin privileges required for this action." },
			{ status: 403 },
		);
	}

	let action;
	try {
		const body = await request.json();
		action = body?.action;
	} catch (e) {
		return NextResponse.json(
			{ error: "Invalid request body or missing action." },
			{ status: 400 },
		);
	}

	if (action === "removeAllMembers") {
		let updatedCount = 0;
		let errorCount = 0;
		const errors = [];

		try {
			const clerk = clerkForAdminCheck || initializeClerk();
			const userListResponse = await clerk.users.getUserList({ limit: 500 });
			const users = userListResponse?.data;

			if (!Array.isArray(users)) {
				throw new Error(
					"Received invalid user list format from server during bulk action.",
				);
			}

			for (const user of users) {
				const existingMetadata = user.publicMetadata || {};
				if (existingMetadata.member === true && !existingMetadata.admin) {
					try {
						const finalMetadata = { ...existingMetadata, member: false };
						await clerk.users.updateUserMetadata(user.id, {
							publicMetadata: finalMetadata,
						});
						updatedCount++;
					} catch (updateError) {
						errorCount++;
						errors.push(
							`Failed to update user ${user.id}: ${updateError.message || updateError}`,
						);
						console.error(
							`API POST /api/admin/users - Failed to update user ${user.id} during bulk remove:`,
							updateError,
						);
					}
				}
			}

			return NextResponse.json({
				success: true,
				message: `Removed member status from ${updatedCount} non-admin user(s). Admins retain member status.`,
				errors: errorCount > 0 ? errors : undefined,
			});
		} catch (error) {
			console.error(
				"API POST /api/admin/users - General error during 'removeAllMembers':",
				error,
			);
			if (
				error.message.includes("Clerk Secret Key missing") ||
				error.message.includes("Failed to initialize Clerk SDK")
			) {
				return NextResponse.json({ error: error.message }, { status: 500 });
			}
			if (error.message.includes("Received invalid user list format")) {
				return NextResponse.json({ error: error.message }, { status: 500 });
			}
			return NextResponse.json(
				{ error: `Failed to process bulk request: ${error.message}` },
				{ status: 500 },
			);
		}
	}
	return NextResponse.json(
		{ error: `Action '${action}' not supported.` },
		{ status: 400 },
	);
}
