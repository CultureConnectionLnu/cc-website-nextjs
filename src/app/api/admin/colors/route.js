import { createClerkClient } from "@clerk/clerk-sdk-node";
import { getAuth } from "@clerk/nextjs/server";
import { promises as fs } from "fs";
import { NextResponse } from "next/server";
import path from "path";

const initializeClerk = () => {
	const secretKey = process.env.CLERK_SECRET_KEY;
	if (!secretKey)
		throw new Error("Server configuration error: Clerk Secret Key missing.");
	try {
		return createClerkClient({ secretKey });
	} catch (error) {
		throw new Error("Failed to initialize Clerk SDK.");
	}
};

async function verifyAdmin(request) {
	let authResult;
	try {
		authResult = getAuth(request);
	} catch (error) {
		return {
			authorized: false,
			error: "Failed to get authentication context.",
			status: 500,
		};
	}
	if (!authResult?.userId)
		return {
			authorized: false,
			error: "Authentication context missing.",
			status: 401,
		};
	const { userId } = authResult;
	let isAdmin = false;
	try {
		const clerk = initializeClerk();
		const user = await clerk.users.getUser(userId);
		isAdmin = user?.publicMetadata?.admin === true;
	} catch (error) {
		return {
			authorized: false,
			error: "Could not verify admin status.",
			status: 500,
		};
	}
	if (!isAdmin)
		return { authorized: false, error: "Unauthorized access.", status: 403 };
	return { authorized: true, userId };
}

const colorsFilePath = path.join(
	process.cwd(),
	"public",
	"data",
	"colors.json",
);

async function readColorsFile() {
	try {
		const fileContents = await fs.readFile(colorsFilePath, "utf8");
		const jsonData = JSON.parse(fileContents);
		if (Array.isArray(jsonData)) {
			return jsonData.filter(
				(item) =>
					typeof item?.colorName === "string" && item.colorName.trim() !== "",
			);
		}
		return [];
	} catch (error) {
		if (error.code === "ENOENT") return [];
		console.error("Error reading colors file:", error);
		throw new Error("Failed to read color data.");
	}
}

async function writeColorsFile(data) {
	try {
		await fs.writeFile(colorsFilePath, JSON.stringify(data, null, 2), "utf8");
	} catch (error) {
		console.error("Error writing colors file:", error);
		throw new Error("Failed to save color data.");
	}
}

export async function GET(request) {
	const adminCheck = await verifyAdmin(request);
	if (!adminCheck.authorized) {
		return NextResponse.json(
			{ error: adminCheck.error },
			{ status: adminCheck.status },
		);
	}
	try {
		const colors = await readColorsFile();
		return NextResponse.json(colors);
	} catch (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}

export async function PUT(request) {
	const adminCheck = await verifyAdmin(request);
	if (!adminCheck.authorized) {
		return NextResponse.json(
			{ error: adminCheck.error },
			{ status: adminCheck.status },
		);
	}
	try {
		const { colorName, isFavorite } = await request.json();
		if (
			!colorName ||
			typeof colorName !== "string" ||
			typeof isFavorite !== "boolean"
		) {
			return NextResponse.json(
				{
					error:
						"Invalid input: Requires 'colorName' (string) and 'isFavorite' (boolean).",
				},
				{ status: 400 },
			);
		}
		const colors = await readColorsFile();
		let found = false;
		const updatedColors = colors.map((color) => {
			if (color.colorName === colorName) {
				found = true;
				return { ...color, isFavorite: isFavorite };
			}
			return color;
		});
		if (!found) {
			return NextResponse.json(
				{ error: `Color '${colorName}' not found.` },
				{ status: 404 },
			);
		}
		await writeColorsFile(updatedColors);
		const updatedColor = updatedColors.find((c) => c.colorName === colorName);
		return NextResponse.json({ success: true, updatedColor });
	} catch (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
