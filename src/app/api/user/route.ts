import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Role, withAuth } from "@/lib/auth";

type Params = {};

export const GET = withAuth<Params>(
	{ roles: [Role.admin, Role.committee] },
	async (_req, _context, _user) => {
		try {
			const userListResponse = await (await clerkClient()).users.getUserList({
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
			return NextResponse.json(
				{ message: "Failed to fetch user list" },
				{ status: 500 },
			);
		}
	},
);
