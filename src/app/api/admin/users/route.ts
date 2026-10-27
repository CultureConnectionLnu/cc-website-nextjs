import { clerkClient, getAuth, type User } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";
import { type NoParams, Role, withAuth } from "@/lib/auth";
import { DataStore } from "@/lib/dataStore";

const VerificationRequest = z.object({
	userID: z.string().trim().min(1),
	requestedAt: z.iso.datetime(),
});

type VerificationRequest = z.infer<typeof VerificationRequest>;

const VerificationRequests = z.array(VerificationRequest);
type VerificationRequests = z.infer<typeof VerificationRequests>;

const verificationFile = new DataStore<VerificationRequests>(
	"MemberVerefication.json",
	VerificationRequests,
	[],
);

async function fetchAllClerkUsers() {
	const pageSize = 500;
	let offset = 0;
	let allUsers: User[] = [];

	while (true) {
		const response = await (await clerkClient()).users.getUserList({
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

async function removeUserFromVerification(userIdToRemove: string) {
	try {
		const currentData = await verificationFile.read();
		const newData = currentData.filter(
			(entry) => entry.userID !== userIdToRemove,
		);

		if (newData.length !== currentData.length) {
			await verificationFile.write(newData);
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

export const GET = withAuth<NoParams>(
	{ roles: [Role.admin] },
	async (_req, _ctx, _user) => {
		try {
			const users = await fetchAllClerkUsers();
			const verificationList = await verificationFile.read();

			const pendingUserIds = new Set(
				verificationList.map((entry) => entry.userID),
			);

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
			return NextResponse.json(
				{ error: "Failed to fetch verification records" },
				{ status: 500 },
			);
		}
	},
);

const PutRequestBody = z.object({
	userId: z.string().trim().min(1),
	metadataKey: z.enum(["admin", "member", "freezed", "committee"]),
	metadataValue: z.boolean(),
});

const UserMetadata = z.object({
    admin: z.boolean().optional(),
    member: z.boolean().optional(),
    freezed: z.boolean().optional(),
    committee: z.boolean().optional(),
}).transform(data => {
    if (data.admin === true) {
        data.member = true;
    }
    return data;
});

export const PUT = withAuth<NoParams>(
	{ roles: "admin" },
	async (req, _ctx, _user) => {
		try {
			const { userId, metadataKey, metadataValue } = PutRequestBody.parse(
				await req.json(),
			);

			const clerk = await clerkClient()
            const targetUser = await clerk.users.getUser(userId);
			
			const existingMetadata = targetUser.publicMetadata;
			const finalMetadata = {
				...existingMetadata,
				[metadataKey]: metadataValue,
			};

			clerk.users.updateUserMetadata(userId, {
				publicMetadata: finalMetadata,
			});

			if (metadataKey === "member" && metadataValue === true) {
                await removeUserFromVerification(targetUser.id);
			}

			return NextResponse.json({
				success: true,
				userId,
				metadataKey,
				metadataValue,
			});
        } catch (error: any) {
            console.error(
				"Error updating user metadata:",
				error,
			);
            if (error instanceof z.ZodError) {
                return NextResponse.json({ error: "Invalid request body" })
            }
			return NextResponse.json(
				{ error: `Failed to update user status` },
				{ status: 500 },
			);
		}
	},
);

const PostRequestBody = z.object({
    action: z.enum(["removeAllMembers"])
})

export const POST = withAuth<NoParams>({ roles: "admin" }, async (req, _ctx, _user) => {
    const { action } = PostRequestBody.parse(await req.json());

	if (action === "removeAllMembers") {
		let updatedCount = 0;
		let errorCount = 0;
		const errors = [];

		try {
			const clerk = await clerkClient();
			const userListResponse = await clerk.users.getUserList({
				limit: 500,
			});
			const users = userListResponse?.data;

			for (const user of users) {
				const existingMetadata = UserMetadata.safeParse(user.publicMetadata).data ?? {};
				if (existingMetadata.member === true && !existingMetadata.admin) {
					try {
						const finalMetadata = UserMetadata.parse({
							...existingMetadata,
							member: false,
						});
						await clerk.users.updateUserMetadata(user.id, {
							publicMetadata: finalMetadata,
						});
						updatedCount++;
					} catch (updateError: any) {
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
        } catch (error: any) {
			console.error(
				"API POST /api/admin/users - General error during 'removeAllMembers':",
				error,
            );
            if (error instanceof z.ZodError) {
                return NextResponse.json(
        			{ error: "Invalid request body or missing action." },
        			{ status: 400 },
        		);
			}
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
})