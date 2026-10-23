// src/app/api/admin/bylaws/route.js

import { createClerkClient } from "@clerk/clerk-sdk-node";
import { getAuth } from "@clerk/nextjs/server";
import { promises as fs } from "fs";
import { NextResponse } from "next/server";
import path from "path";

const initializeClerk = () => {
	const secretKey = process.env.CLERK_SECRET_KEY;
	if (!secretKey) {
		throw new Error("Server configuration error: Clerk Secret Key missing.");
	}
	try {
		return createClerkClient({ secretKey });
	} catch (error) {
		console.error("Failed to initialize Clerk SDK:", error);
		throw new Error("Failed to initialize Clerk SDK.");
	}
};

async function checkUserPermission(request, allowedRoleKeys = ["admin"]) {
	let authResult;
	try {
		authResult = getAuth(request);
		if (!authResult?.userId) {
			return {
				authorized: false,
				error: "Authentication context missing.",
				status: 401,
			};
		}
	} catch (error) {
		console.error("checkUserPermission: Error getting auth context:", error);
		return {
			authorized: false,
			error: "Failed to get authentication context.",
			status: 500,
		};
	}

	const { userId } = authResult;
	let userPublicMetadata = {};

	try {
		const clerk = initializeClerk();
		const user = await clerk.users.getUser(userId);
		userPublicMetadata = user?.publicMetadata || {};
	} catch (error) {
		console.error(`checkUserPermission: Error fetching user ${userId}:`, error);
		return {
			authorized: false,
			error: "Could not verify user roles.",
			status: 500,
		};
	}

	const hasPermission = allowedRoleKeys.some((roleKey) => {
		return userPublicMetadata[roleKey] === true;
	});

	if (!hasPermission) {
		const requiredRolesString = allowedRoleKeys.join(" or ");
		return {
			authorized: false,
			error: `Unauthorized. Requires ${requiredRolesString} role.`,
			status: 403,
		};
	}
	return { authorized: true, userId };
}

const bylawsFilePath = path.join(
	process.cwd(),
	"public",
	"data",
	"bylaws.json",
);

async function readBylawsFile() {
	try {
		const fileContents = await fs.readFile(bylawsFilePath, "utf8");
		const data = JSON.parse(fileContents);
		if (Array.isArray(data)) {
			return data;
		}
		console.warn("Bylaws file format is invalid. Returning empty array.");
		return [];
	} catch (error) {
		if (error.code === "ENOENT") {
			console.log("Bylaws file not found, returning empty array.");
			return [];
		}
		console.error("Error reading bylaws file:", error);
		throw new Error("Failed to read bylaws data.");
	}
}

async function writeBylawsFile(data) {
	try {
		if (!Array.isArray(data)) {
			throw new Error("Invalid data format: Expected an array of bylaws.");
		}
		for (const item of data) {
			if (
				typeof item.id !== "string" ||
				typeof item.title !== "string" ||
				typeof item.content !== "string"
			) {
				throw new Error(
					"Invalid item structure: Each bylaw must have id, title, and content as strings.",
				);
			}
		}
		await fs.writeFile(bylawsFilePath, JSON.stringify(data, null, 2), "utf8");
	} catch (error) {
		console.error("Error writing bylaws file:", error);
		throw new Error(`Failed to save bylaws data: ${error.message}`);
	}
}

// GET: Fetch all bylaws (Admin or Committee)
export async function GET(request) {
	const permissionCheck = await checkUserPermission(request, [
		"admin",
		"committee",
	]);
	if (!permissionCheck.authorized) {
		return NextResponse.json(
			{ error: permissionCheck.error },
			{ status: permissionCheck.status },
		);
	}

	try {
		const bylaws = await readBylawsFile();
		return NextResponse.json(bylaws);
	} catch (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}

// PUT: Update bylaws (Admin only)
export async function PUT(request) {
	const permissionCheck = await checkUserPermission(request, ["admin"]);
	if (!permissionCheck.authorized) {
		return NextResponse.json(
			{ error: permissionCheck.error },
			{ status: permissionCheck.status },
		);
	}

	try {
		const updatedBylawsData = await request.json();
		await writeBylawsFile(updatedBylawsData);
		return NextResponse.json(updatedBylawsData);
	} catch (error) {
		const status = error.message.startsWith("Invalid data format") ? 400 : 500;
		return NextResponse.json({ error: error.message }, { status });
	}
}
