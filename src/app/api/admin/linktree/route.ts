import fs from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";
import { type NoParams, Role, withAuth } from "@/lib/auth";

const dataFilePath = path.join(process.cwd(), "public/data/linktree.json");

type Link = {
	color: string;
	text: string;
	link: string;
	textColor: string;
	isEnabled: boolean;
};

async function readLinks(): Promise<Link[]> {
	try {
		const jsonData = await fs.readFile(dataFilePath, "utf-8");
		return JSON.parse(jsonData);
	} catch (error: any) {
		if (error.code === "ENOENT") {
			return [];
		}
		console.error("Error reading linktree file:", error);
		throw new Error("Could not read linktree data.");
	}
}

async function writeLinks(links: Link[]) {
	try {
		if (!Array.isArray(links)) {
			throw new Error("Invalid data format: Expected an array of links.");
		}
		const jsonData = JSON.stringify(links, null, 2);
		await fs.writeFile(dataFilePath, jsonData, "utf-8");
	} catch (error: any) {
		console.error("Error writing linktree file:", error);
		throw new Error(`Could not save linktree data: ${error.message}`);
	}
}

export const GET = withAuth<NoParams>(
	{ roles: [Role.admin] },
	async (req, _ctx, _user) => {
		try {
			const links = await readLinks();
			return NextResponse.json(links);
		} catch (error) {
			return NextResponse.json(
				{ error: "Failed to fetch links" },
				{ status: 500 },
			);
		}
	},
);

export const PUT = withAuth<NoParams>(
	{ roles: [Role.admin] },
	async (req, _ctx, _user) => {
		try {
			const newLinksData = await req.json();
			await writeLinks(newLinksData);
			return NextResponse.json(newLinksData);
		} catch (error: any) {
			const status = error.message.startsWith("Invalid data format")
				? 400
				: 500;
			return NextResponse.json(
				{ error: error.message || "Failed to update links" },
				{ status: status },
			);
		}
	},
);
