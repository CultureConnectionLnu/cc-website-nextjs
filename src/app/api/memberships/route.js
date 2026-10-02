import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import fs from "fs/promises";
import path from "path";

const dataFilePath = path.join(
	process.cwd(),
	"public",
	"data",
	"membership.json",
);

async function readMemberships() {
	try {
		const fileData = await fs.readFile(dataFilePath, "utf-8");
		return JSON.parse(fileData);
	} catch (error) {
		if (error.code === "ENOENT") {
			await fs.writeFile(dataFilePath, JSON.stringify([], null, 2), "utf-8");
			return [];
		}
		console.error("Failed to read memberships file:", error);
		throw new Error("Could not read membership data.");
	}
}

async function writeMemberships(data) {
	try {
		await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), "utf-8");
	} catch (error) {
		console.error("Failed to write memberships file:", error);
		throw new Error("Could not save membership data.");
	}
}

export async function GET(request) {
	try {
		const memberships = await readMemberships();
		memberships.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
		return NextResponse.json(memberships, { status: 200 });
	} catch (error) {
		return NextResponse.json(
			{ message: error.message || "Internal Server Error" },
			{ status: 500 },
		);
	}
}

export async function POST(request) {
	try {
		const body = await request.json();
		const {
			name,
			description,
			address,
			discount,
			imgurl,
			websiteUrl,
			googleMapUrl,
		} = body;

		if (!name || !description || !address || !discount || !imgurl) {
			return NextResponse.json(
				{
					message:
						"Missing required fields: name, description, address, discount, imgurl.",
				},
				{ status: 400 },
			);
		}

		const newMembership = {
			id: `mem_${uuidv4()}`,
			name,
			description,
			address,
			discount,
			imgurl,
			websiteUrl: websiteUrl || null,
			googleMapUrl: googleMapUrl || null,
			createdAt: new Date().toISOString(),
		};

		const memberships = await readMemberships();
		memberships.unshift(newMembership);
		await writeMemberships(memberships);

		return NextResponse.json(newMembership, { status: 201 });
	} catch (error) {
		if (error instanceof SyntaxError) {
			return NextResponse.json(
				{ message: "Invalid JSON body" },
				{ status: 400 },
			);
		}
		console.error("Error creating membership:", error);
		return NextResponse.json(
			{ message: error.message || "Internal Server Error creating membership" },
			{ status: 500 },
		);
	}
}

export async function PUT(request) {
	try {
		const body = await request.json();
		const {
			id,
			name,
			description,
			address,
			discount,
			imgurl,
			websiteUrl,
			googleMapUrl,
		} = body;

		if (!id) {
			return NextResponse.json(
				{ message: "Membership ID is required for update." },
				{ status: 400 },
			);
		}

		const memberships = await readMemberships();
		const membershipIndex = memberships.findIndex((mem) => mem.id === id);

		if (membershipIndex === -1) {
			return NextResponse.json(
				{ message: "Membership not found." },
				{ status: 404 },
			);
		}

		const updatedMembership = {
			...memberships[membershipIndex],
			name: name ?? memberships[membershipIndex].name,
			description: description ?? memberships[membershipIndex].description,
			address: address ?? memberships[membershipIndex].address,
			discount: discount ?? memberships[membershipIndex].discount,
			imgurl: imgurl ?? memberships[membershipIndex].imgurl,
			websiteUrl:
				websiteUrl !== undefined
					? websiteUrl
					: memberships[membershipIndex].websiteUrl,
			googleMapUrl:
				googleMapUrl !== undefined
					? googleMapUrl
					: memberships[membershipIndex].googleMapUrl,
			updatedAt: new Date().toISOString(),
		};

		memberships[membershipIndex] = updatedMembership;
		await writeMemberships(memberships);

		return NextResponse.json(updatedMembership, { status: 200 });
	} catch (error) {
		if (error instanceof SyntaxError) {
			return NextResponse.json(
				{ message: "Invalid JSON body" },
				{ status: 400 },
			);
		}
		console.error("Error updating membership:", error);
		return NextResponse.json(
			{ message: error.message || "Internal Server Error updating membership" },
			{ status: 500 },
		);
	}
}

export async function DELETE(request) {
	try {
		const { searchParams } = new URL(request.url);
		const membershipId = searchParams.get("id");

		if (!membershipId) {
			return NextResponse.json(
				{ message: "Membership ID is required." },
				{ status: 400 },
			);
		}

		let memberships = await readMemberships();
		const initialLength = memberships.length;
		memberships = memberships.filter((mem) => mem.id !== membershipId);

		if (memberships.length === initialLength) {
			return NextResponse.json(
				{ message: "Membership not found." },
				{ status: 404 },
			);
		}

		await writeMemberships(memberships);

		return NextResponse.json(
			{ message: "Membership discount deleted successfully." },
			{ status: 200 },
		);
	} catch (error) {
		console.error("Error deleting membership:", error);
		return NextResponse.json(
			{ message: error.message || "Internal Server Error deleting membership" },
			{ status: 500 },
		);
	}
}
