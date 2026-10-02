import fs from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";

const dataFilePath = path.join(process.cwd(), "public/data/sponsors.json");

async function readSponsors() {
	try {
		const jsonData = await fs.readFile(dataFilePath, "utf-8");
		return JSON.parse(jsonData);
	} catch (error) {
		if (error.code === "ENOENT") {
			return [];
		}
		console.error("Error reading sponsors file:", error);
		throw new Error("Could not read sponsors data.");
	}
}

async function writeSponsors(sponsors) {
	try {
		const jsonData = JSON.stringify(sponsors, null, 2);
		await fs.writeFile(dataFilePath, jsonData, "utf-8");
	} catch (error) {
		console.error("Error writing sponsors file:", error);
		throw new Error("Could not save sponsors data.");
	}
}

export async function GET() {
	try {
		const sponsors = await readSponsors();
		return NextResponse.json(sponsors);
	} catch (error) {
		return NextResponse.json(
			{ error: error.message || "Failed to fetch sponsors" },
			{ status: 500 },
		);
	}
}

export async function POST(request) {
	try {
		const newSponsorData = await request.json();

		if (!newSponsorData.name) {
			return NextResponse.json(
				{ error: "Sponsor Name is required." },
				{ status: 400 },
			);
		}

		const sponsors = await readSponsors();
		const newId = `sp${Date.now()}`;
		const newSponsor = {
			id: newId,
			name: newSponsorData.name,
			imageUrl: newSponsorData.imageUrl || "",
			websiteUrl: newSponsorData.websiteUrl || "",
		};

		sponsors.push(newSponsor);
		await writeSponsors(sponsors);

		return NextResponse.json(newSponsor, { status: 201 });
	} catch (error) {
		return NextResponse.json(
			{ error: error.message || "Failed to create sponsor" },
			{ status: 500 },
		);
	}
}

export async function PUT(request) {
	try {
		const updatedSponsorData = await request.json();

		if (!updatedSponsorData.id) {
			return NextResponse.json(
				{ error: "Sponsor ID is required." },
				{ status: 400 },
			);
		}
		if (!updatedSponsorData.name) {
			return NextResponse.json(
				{ error: "Sponsor Name is required." },
				{ status: 400 },
			);
		}

		const sponsors = await readSponsors();
		const sponsorIndex = sponsors.findIndex(
			(s) => s.id === updatedSponsorData.id,
		);

		if (sponsorIndex === -1) {
			return NextResponse.json(
				{ error: `Sponsor with ID ${updatedSponsorData.id} not found.` },
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
			{ error: error.message || "Failed to update sponsor" },
			{ status: 500 },
		);
	}
}

export async function DELETE(request) {
	try {
		const { searchParams } = request.nextUrl;
		const sponsorId = searchParams.get("id");

		if (!sponsorId) {
			return NextResponse.json(
				{ error: "Sponsor ID is required." },
				{ status: 400 },
			);
		}

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
			{ error: error.message || "Failed to delete sponsor" },
			{ status: 500 },
		);
	}
}
