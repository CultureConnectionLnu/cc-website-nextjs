import { withAuth } from "@/lib/auth";
import { DataStore } from "@/lib/dataStore";
import { VerificationRequests } from "@/types/user/verification";
import { NextResponse } from "next/server";
import z from "zod";

const verificationFile = new DataStore("MemberVerification.json", VerificationRequests, []);

const verificationRequest = z.object({
    userId: z.string(),
})

export const POST = withAuth(async (req, _ctx, user) => {
    try {

        const { data, success, error } = verificationRequest.safeParse(await req.json());

        if (!success) {
            console.error(`Invalid request body: ${error}`)
            return NextResponse.json(
				{ error: "Invalid request body." },
				{ status: 400 },
			);
        }
        
		if (user.userId !== data.userId) {
			console.warn(
				`Forbidden attempt: Auth user ${user.userId} tried to add user ${data?.userId}`,
			);
			return NextResponse.json(
				{ error: "Forbidden. You can only add yourself." },
				{ status: 403 },
			);
		}

		const verificationList = await verificationFile.read();

		const userExists = verificationList.some(
			(entry) => entry.userID === user.userId,
		);

		if (userExists) {
			console.log(`User ${user.userId} is already in the verification list.`);
			return NextResponse.json(
				{
					message: "User already in verification list.",
					userId: user.userId,
				},
				{ status: 200 },
			);
		}

		const newUserEntry = {
			userID: user.userId,
			requestedAt: new Date().toISOString(),
        };
		
		verificationList.push(newUserEntry);

		await verificationFile.write(verificationList);

		console.log(`User ${user.userId} added to the verification list.`);

		return NextResponse.json(
			{
				message: "User added to verification list successfully.",
				userId: user.userId,
			},
			{ status: 201 },
		);
	} catch (error) {
		console.error("API Error in /api/user/userverification:", error);
		return NextResponse.json(
			{ error: "An internal server error occurred." },
			{ status: 500 },
		);
	}
})