import fs from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";

const dataFilePath = path.join(process.cwd(), "public/data/linktree.json");

async function readLinks() {
	try {
		const jsonData = await fs.readFile(dataFilePath, "utf-8");
		return JSON.parse(jsonData);
	} catch (error) {
		if (error.code === "ENOENT") {
			return [];
		}
		console.error("Error reading linktree file:", error);
		throw new Error("Could not read linktree data.");
	}
}

async function writeLinks(links) {
	try {
		if (!Array.isArray(links)) {
			throw new Error("Invalid data format: Expected an array of links.");
		}
		const jsonData = JSON.stringify(links, null, 2);
		await fs.writeFile(dataFilePath, jsonData, "utf-8");
	} catch (error) {
		console.error("Error writing linktree file:", error);
		throw new Error(`Could not save linktree data: ${error.message}`);
	}
}

export async function GET() {
	try {
		const links = await readLinks();
		return NextResponse.json(links);
	} catch (error) {
		return NextResponse.json(
			{ error: error.message || "Failed to fetch links" },
			{ status: 500 },
		);
	}
}

export async function PUT(request) {
	try {
		const newLinksData = await request.json();
		await writeLinks(newLinksData);
		return NextResponse.json(newLinksData);
	} catch (error) {
		const status = error.message.startsWith("Invalid data format") ? 400 : 500;
		return NextResponse.json(
			{ error: error.message || "Failed to update links" },
			{ status: status },
		);
	}
}
