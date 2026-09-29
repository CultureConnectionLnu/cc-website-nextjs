import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/clerk-sdk-node";
import { env } from "@/env";

const clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

export async function GET(request) {
  const { userId } = getAuth(request);

  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await clerkClient.users.getUser(userId);

    const isAdmin = user.publicMetadata?.admin === true;
    const isCommittee = user.publicMetadata?.committee === true;

    if (!isAdmin && !isCommittee) {
      return NextResponse.json(
        { message: "Forbidden: User cannot fetch user list." },
        { status: 403 },
      );
    }

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
}
