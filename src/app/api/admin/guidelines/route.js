// src/app/api/admin/guidelines/route.js

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

// Helper function to check user permissions
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

const guidelinesFilePath = path.join(
	process.cwd(),
	"public",
	"data",
	"guidelines.json",
);

function normalizeGuidelineSection(section, fallbackId = "guideline-section") {
	const safeSection =
		section && typeof section === "object" && !Array.isArray(section)
			? section
			: {};

	return {
		id:
			typeof safeSection.id === "string" && safeSection.id.trim()
				? safeSection.id
				: fallbackId,
		title: typeof safeSection.title === "string" ? safeSection.title : "",
		content:
			typeof safeSection.content === "string" ? safeSection.content : "<p></p>",
		children: normalizeGuidelinesData(
			safeSection.children,
			`${fallbackId}-child`,
		),
	};
}

function normalizeGuidelinesData(data, fallbackPrefix = "guideline-section") {
	if (!Array.isArray(data)) {
		return [];
	}

	return data.map((section, index) =>
		normalizeGuidelineSection(section, `${fallbackPrefix}-${index}`),
	);
}

function serializeGuidelineSection(section) {
	const serializedSection = {
		id: section.id,
		title: section.title,
		content: section.content,
	};

	if (Array.isArray(section.children) && section.children.length > 0) {
		serializedSection.children = section.children.map(
			serializeGuidelineSection,
		);
	}

	return serializedSection;
}

function validateGuidelineSections(data) {
	if (!Array.isArray(data)) {
		throw new Error("Invalid data format: Expected an array of guidelines.");
	}

	for (const item of data) {
		if (
			typeof item.id !== "string" ||
			typeof item.title !== "string" ||
			typeof item.content !== "string"
		) {
			throw new Error(
				"Invalid item structure: Each guideline must have id, title, and content as strings.",
			);
		}

		if (item.children !== undefined && !Array.isArray(item.children)) {
			throw new Error(
				"Invalid item structure: children must be an array when provided.",
			);
		}

		validateGuidelineSections(item.children || []);
	}
}

async function readGuidelinesFile() {
	try {
		const fileContents = await fs.readFile(guidelinesFilePath, "utf8");
		const data = JSON.parse(fileContents);
		if (Array.isArray(data)) {
			return normalizeGuidelinesData(data);
		}
		console.warn("Guidelines file format is invalid. Returning empty array.");
		return [];
	} catch (error) {
		if (error.code === "ENOENT") {
			console.log("Guidelines file not found, returning empty array.");
			return []; // Return empty array if file doesn't exist
		}
		console.error("Error reading guidelines file:", error);
		throw new Error("Failed to read guidelines data.");
	}
}

async function writeGuidelinesFile(data) {
	try {
		const normalizedData = normalizeGuidelinesData(data);
		validateGuidelineSections(normalizedData);
		await fs.writeFile(
			guidelinesFilePath,
			JSON.stringify(normalizedData.map(serializeGuidelineSection), null, 2),
			"utf8",
		);
	} catch (error) {
		console.error("Error writing guidelines file:", error);
		throw new Error(`Failed to save guidelines data: ${error.message}`);
	}
}

// GET: Fetch all guidelines (Admin or Committee)
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
		const guidelines = await readGuidelinesFile();
		return NextResponse.json(guidelines);
	} catch (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}

// PUT: Update guidelines (Admin only)
export async function PUT(request) {
	const permissionCheck = await checkUserPermission(request, ["admin"]);
	if (!permissionCheck.authorized) {
		return NextResponse.json(
			{ error: permissionCheck.error },
			{ status: permissionCheck.status },
		);
	}

	try {
		const updatedGuidelinesData = await request.json();
		await writeGuidelinesFile(updatedGuidelinesData);
		return NextResponse.json(updatedGuidelinesData);
	} catch (error) {
		const status =
			error.message.startsWith("Invalid data format") ||
			error.message.startsWith("Invalid item structure")
				? 400
				: 500;
		return NextResponse.json({ error: error.message }, { status });
	}
}
