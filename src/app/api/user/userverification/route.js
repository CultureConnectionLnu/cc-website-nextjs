import { getAuth } from "@clerk/nextjs/server";
import fs from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";

const dataDir = path.join(process.cwd(), "public", "data");
const verificationFilePath = path.join(dataDir, "MemberVerefication.json");

async function ensureDataDirectoryExists() {
	try {
		await fs.access(dataDir);
	} catch (error) {
		if (error.code === "ENOENT") {
			await fs.mkdir(dataDir, { recursive: true });
			console.log(`Created data directory: ${dataDir}`);
		} else {
			console.error("Error accessing data directory:", error);
			throw error;
		}
	}
}

async function readVerificationList() {
	try {
		await ensureDataDirectoryExists();
		const fileContent = await fs.readFile(verificationFilePath, "utf-8");
		return JSON.parse(fileContent);
	} catch (error) {
		if (error.code === "ENOENT") {
			console.log("Verification file not found, starting with empty list.");
			return [];
		} else if (error instanceof SyntaxError) {
			console.error("Error parsing MemberVerefication.json:", error);
			return [];
		} else {
			console.error("Error reading verification file:", error);
			throw error;
		}
	}
}

async function writeVerificationList(data) {
	try {
		await ensureDataDirectoryExists();
		const jsonData = JSON.stringify(data, null, 2);
		await fs.writeFile(verificationFilePath, jsonData, "utf-8");
	} catch (error) {
		console.error("Error writing verification file:", error);
		throw error;
	}
}

export async function POST(req) {
	try {
		const { userId: authUserId } = getAuth(req);
		if (!authUserId) {
			return NextResponse.json(
				{ error: "Unauthorized. Please sign in." },
				{ status: 401 },
			);
		}

		let requestBody;
		try {
			requestBody = await req.json();
		} catch (error) {
			return NextResponse.json(
				{ error: "Invalid request body." },
				{ status: 400 },
			);
		}

		const { userId: requestedUserId } = requestBody;

		if (!requestedUserId) {
			return NextResponse.json(
				{ error: "User ID is missing in the request body." },
				{ status: 400 },
			);
		}

		if (authUserId !== requestedUserId) {
			console.warn(
				`Forbidden attempt: Auth user ${authUserId} tried to add user ${requestedUserId}`,
			);
			return NextResponse.json(
				{ error: "Forbidden. You can only add yourself." },
				{ status: 403 },
			);
		}

		const verificationList = await readVerificationList();

		const userExists = verificationList.some(
			(entry) => entry.userID === authUserId,
		);

		if (userExists) {
			console.log(`User ${authUserId} is already in the verification list.`);
			return NextResponse.json(
				{
					message: "User already in verification list.",
					userId: authUserId,
				},
				{ status: 200 },
			);
		}

		const newUserEntry = {
			userID: authUserId,
			requestedAt: new Date().toISOString(),
		};
		const updatedList = [...verificationList, newUserEntry];

		await writeVerificationList(updatedList);

		console.log(`User ${authUserId} added to the verification list.`);

		return NextResponse.json(
			{
				message: "User added to verification list successfully.",
				userId: authUserId,
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
}
