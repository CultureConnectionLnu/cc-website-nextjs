import fs from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";
import { type NoParams, Role, withAuth } from "@/lib/auth";

const dataFilePath = path.join(process.cwd(), "public/data/sponsors.json");

type Sponsor = {
	id: string;
	name: string;
	imageUrl: string;
	websiteUrl: string;
};

async function readSponsors(): Promise<Sponsor[]> {
	try {
		const jsonData = await fs.readFile(dataFilePath, "utf-8");
		return JSON.parse(jsonData);
	} catch (error) {
		if (
			error instanceof Error &&
			(error as NodeJS.ErrnoException).code === "ENOENT"
		) {
			return [];
		}
		console.error("Error reading sponsors file:", error);
		throw new Error("Could not read sponsors data.");
	}
}

async function writeSponsors(sponsors: Sponsor[]) {
	try {
		const jsonData = JSON.stringify(sponsors, null, 2);
		await fs.writeFile(dataFilePath, jsonData, "utf-8");
	} catch (error) {
		console.error("Error writing sponsors file:", error);
		throw new Error("Could not save sponsors data.");
	}
}

export const GET = withAuth<NoParams>(
	{ roles: [Role.admin] },
	async (_req, _ctx, _user) => {
		try {
			const sponsors = await readSponsors();
			return NextResponse.json(sponsors);
		} catch {
			return NextResponse.json(
				{ error: "Failed to fetch sponsors" },
				{ status: 500 },
			);
		}
	},
);

export const POST = withAuth<NoParams>(
	{ roles: [Role.admin] },
	async (req, _ctx, _user) => {
		try {
			const newSponsorData = await req.json();

			if (!newSponsorData.name) {
				return NextResponse.json(
					{ error: "Sponsor Name is required." },
					{ status: 400 },
				);
			}

			const newId = `sp${Date.now()}`;
			const newSponsor = {
				id: newId,
				name: newSponsorData.name,
				imageUrl: newSponsorData.imageUrl || "",
				websiteUrl: newSponsorData.websiteUrl || "",
			};

			const sponsors = await readSponsors();
			sponsors.push(newSponsor);
			await writeSponsors(sponsors);

			return NextResponse.json(newSponsor, { status: 201 });
		} catch {
			return NextResponse.json(
				{ error: "Failed to create sponsor" },
				{ status: 500 },
			);
		}
	},
);

export const PUT = withAuth<NoParams>(
	{ roles: [Role.admin] },
	async (req, _ctx, _user) => {
		try {
			const updatedSponsorData = await req.json();

			if (!updatedSponsorData.id) return missingValue("Sponsor ID");
			if (!updatedSponsorData.name) return missingValue("Sponsor Name");

			const sponsors = await readSponsors();
			const sponsorIndex = sponsors.findIndex(
				(s) => s.id === updatedSponsorData.id,
			);

			if (sponsorIndex === -1) {
				return NextResponse.json(
					{
						error: `Sponsor with ID ${updatedSponsorData.id} not found.`,
					},
					{ status: 404 },
				);
			}

			sponsors[sponsorIndex] = {
				...sponsors[sponsorIndex],
				...updatedSponsorData,
			};

			await writeSponsors(sponsors);

			return NextResponse.json(sponsors[sponsorIndex]);
		} catch (error) {
			return NextResponse.json(
				{ error: "Failed to update sponsor" },
				{ status: 500 },
			);
		}
	},
);

export const DELETE = withAuth<NoParams>(
	{ roles: [Role.admin] },
	async (req, _ctx, _user) => {
		try {
			const { searchParams } = req.nextUrl;
			const sponsorId = searchParams.get("id");
			if (!sponsorId) return missingValue("Sponsor ID");

			const sponsors = await readSponsors();
			const initialLength = sponsors.length;
			const filteredSponsors = sponsors.filter((s) => s.id !== sponsorId);

			if (filteredSponsors.length === initialLength) {
				return NextResponse.json(
					{ error: `Sponsor with ID ${sponsorId} not found.` },
					{ status: 404 },
				);
			}

			await writeSponsors(filteredSponsors);

			return NextResponse.json({
				message: `Sponsor ${sponsorId} deleted successfully.`,
			});
		} catch (error) {
			return NextResponse.json(
				{ error: "Failed to delete sponsor" },
				{ status: 500 },
			);
		}
	},
);

function missingValue(label: string) {
	return NextResponse.json({ error: `${label} is required.` }, { status: 400 });
}
