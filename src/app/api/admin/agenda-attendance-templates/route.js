import { createClerkClient } from "@clerk/clerk-sdk-node";
import { getAuth } from "@clerk/nextjs/server";
import { promises as fs } from "fs";
import { NextResponse } from "next/server";
import path from "path";

const templateFilePath = path.join(
	process.cwd(),
	"public",
	"data",
	"agenda-attendance-templates.json",
);

const initializeClerk = () => {
	const secretKey = process.env.CLERK_SECRET_KEY;
	if (!secretKey) {
		throw new Error("Server configuration error: Clerk Secret Key missing.");
	}

	return createClerkClient({ secretKey });
};

async function checkUserPermission(request, allowedRoleKeys = ["admin"]) {
	try {
		const authResult = getAuth(request);
		if (!authResult?.userId) {
			return {
				authorized: false,
				error: "Authentication context missing.",
				status: 401,
			};
		}

		const clerk = initializeClerk();
		const user = await clerk.users.getUser(authResult.userId);
		const userPublicMetadata = user?.publicMetadata || {};

		const hasPermission = allowedRoleKeys.some(
			(roleKey) => userPublicMetadata[roleKey] === true,
		);

		if (!hasPermission) {
			return {
				authorized: false,
				error: `Unauthorized. Requires ${allowedRoleKeys.join(" or ")} role.`,
				status: 403,
			};
		}

		return { authorized: true };
	} catch (error) {
		console.error("Attendance template permission check failed:", error);
		return {
			authorized: false,
			error: "Could not verify user roles.",
			status: 500,
		};
	}
}

const normalizeTemplate = (template, index = 0) => {
	const safeTemplate =
		template && typeof template === "object" && !Array.isArray(template)
			? template
			: {};

	return {
		id:
			typeof safeTemplate.id === "string" && safeTemplate.id.trim()
				? safeTemplate.id
				: `attendance-template-${index}`,
		name: typeof safeTemplate.name === "string" ? safeTemplate.name : "",
		members: Array.isArray(safeTemplate.members)
			? safeTemplate.members.filter((member) => typeof member === "string")
			: [],
	};
};

const normalizeTemplates = (templates) => {
	if (!Array.isArray(templates)) {
		return [];
	}

	return templates
		.map((template, index) => normalizeTemplate(template, index))
		.filter((template) => template.name.trim());
};

const validateTemplates = (templates) => {
	if (!Array.isArray(templates)) {
		throw new Error("Invalid data format: Expected an array of templates.");
	}

	const seenNames = new Set();

	for (const template of templates) {
		if (
			typeof template.id !== "string" ||
			typeof template.name !== "string" ||
			!Array.isArray(template.members)
		) {
			throw new Error(
				"Invalid item structure: each template must have id, name, and members.",
			);
		}

		const normalizedName = template.name.trim().toLowerCase();
		if (!normalizedName) {
			throw new Error("Invalid data format: template names cannot be empty.");
		}

		if (seenNames.has(normalizedName)) {
			throw new Error("Invalid data format: template names must be unique.");
		}
		seenNames.add(normalizedName);
	}
};

async function readTemplateFile() {
	try {
		const fileContents = await fs.readFile(templateFilePath, "utf8");
		return normalizeTemplates(JSON.parse(fileContents));
	} catch (error) {
		if (error.code === "ENOENT") {
			return [];
		}

		console.error("Error reading attendance template file:", error);
		throw new Error("Failed to read attendance templates.");
	}
}

async function writeTemplateFile(templates) {
	const normalizedTemplates = normalizeTemplates(templates);
	validateTemplates(normalizedTemplates);

	await fs.writeFile(
		templateFilePath,
		JSON.stringify(normalizedTemplates, null, 2),
		"utf8",
	);
}

export async function GET(request) {
	const permissionCheck = await checkUserPermission(request, ["admin"]);
	if (!permissionCheck.authorized) {
		return NextResponse.json(
			{ error: permissionCheck.error },
			{ status: permissionCheck.status },
		);
	}

	try {
		return NextResponse.json(await readTemplateFile());
	} catch (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}

export async function PUT(request) {
	const permissionCheck = await checkUserPermission(request, ["admin"]);
	if (!permissionCheck.authorized) {
		return NextResponse.json(
			{ error: permissionCheck.error },
			{ status: permissionCheck.status },
		);
	}

	try {
		const updatedTemplates = await request.json();
		await writeTemplateFile(updatedTemplates);
		return NextResponse.json(normalizeTemplates(updatedTemplates));
	} catch (error) {
		const status = error.message.startsWith("Invalid data format") ? 400 : 500;
		return NextResponse.json({ error: error.message }, { status });
	}
}
