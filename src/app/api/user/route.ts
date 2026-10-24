import { createClerkClient } from "@clerk/clerk-sdk-node";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { Role, withAuth } from "@/lib/auth";

const clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

type Params = { userId: string };

export const GET = withAuth<Params>(
	{ roles: [Role.admin, Role.committee] },
	async (req, { params }, user) => {
		try {
			const userListResponse = await clerkClient.users.getUserList({
				orderBy: "+created_at",
			});

			const formattedUsers = userListResponse.data.map((u) => {
				const primaryEmail = u.emailAddresses.find(
					(email) => email.id === u.primaryEmailAddressId,
				)?.emailAddress;

				return {
					id: u.id,
					username: u.username ?? null,
					firstName: u.firstName ?? null,
					lastName: u.lastName ?? null,
					primaryEmailAddress: primaryEmail ?? null,
					fullName:
						[u.firstName, u.lastName].filter(Boolean).join(" ") ||
						primaryEmail ||
						u.id,
				};
			});

			return NextResponse.json(formattedUsers);
		} catch (error) {
			console.error("Failed to process user request:", error);
			let errorMessage = "Failed to process request";
			if (error instanceof Error) {
				errorMessage = error.message;
			}
			return NextResponse.json(
				{ message: "Failed to fetch user list", error: errorMessage },
				{ status: 500 },
			);
		}
	},
);
