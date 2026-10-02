// src/app/api/admin/member/route.js

import fs from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";

const dataFilePath = path.join(process.cwd(), "public/data/BoardMembers.json");

async function readMembers() {
	try {
		const jsonData = await fs.readFile(dataFilePath, "utf-8");
		return JSON.parse(jsonData);
	} catch (error) {
		if (error.code === "ENOENT") {
			await fs.mkdir(path.dirname(dataFilePath), { recursive: true });
			await fs.writeFile(dataFilePath, "[]", "utf-8");
			return [];
		}
		console.error("Error reading members file:", error);
		throw new Error("Could not read members data.");
	}
}

async function writeMembers(members) {
	try {
		const jsonData = JSON.stringify(members, null, 2);
		await fs.writeFile(dataFilePath, jsonData, "utf-8");
	} catch (error) {
		console.error("Error writing members file:", error);
		throw new Error("Could not save members data.");
	}
}

function applyPartialMemberOrder(members, orderedIds) {
	if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
		throw new Error("orderedIds must be a non-empty array.");
	}

	const uniqueOrderedIds = new Set(orderedIds);
	if (uniqueOrderedIds.size !== orderedIds.length) {
		throw new Error("orderedIds cannot contain duplicates.");
	}

	const orderedMembers = orderedIds.map((id) => {
		const member = members.find((candidate) => candidate.id === id);
		if (!member) {
			throw new Error(`Member with ID ${id} not found.`);
		}
		return member;
	});

	let reorderedIndex = 0;

	return members.map((member) => {
		if (!uniqueOrderedIds.has(member.id)) {
			return member;
		}

		const nextMember = orderedMembers[reorderedIndex];
		reorderedIndex += 1;
		return nextMember;
	});
}

export async function GET() {
	try {
		const members = await readMembers();
		return NextResponse.json(members);
	} catch (error) {
		return NextResponse.json(
			{ error: error.message || "Failed to fetch members" },
			{ status: 500 },
		);
	}
}

export async function POST(request) {
	try {
		const newMemberData = await request.json();

		if (
			!newMemberData.name ||
			!newMemberData.position ||
			!newMemberData.codention
		) {
			return NextResponse.json(
				{ error: "Name, Position, and Codention are required." },
				{ status: 400 },
			);
		}

		const members = await readMembers();

		const newId = `m${Date.now()}`;
		const newMember = {
			id: newId,
			name: newMemberData.name,
			codention: newMemberData.codention,
			position: newMemberData.position,
			contact: newMemberData.contact || "",
			imageUrl: newMemberData.imageUrl || "",
			bio: newMemberData.bio || "",
		};

		members.push(newMember);
		await writeMembers(members);

		return NextResponse.json(newMember, { status: 201 });
	} catch (error) {
		console.error("Error in POST /api/admin/member:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to create member" },
			{ status: 500 },
		);
	}
}

export async function PUT(request) {
	try {
		const updatedMemberData = await request.json();

		if (!updatedMemberData.id) {
			return NextResponse.json(
				{ error: "Member ID is required." },
				{ status: 400 },
			);
		}
		if (
			!updatedMemberData.name ||
			!updatedMemberData.position ||
			!updatedMemberData.codention
		) {
			return NextResponse.json(
				{ error: "Name, Position, and Codention are required." },
				{ status: 400 },
			);
		}

		const members = await readMembers();
		const memberIndex = members.findIndex((m) => m.id === updatedMemberData.id);

		if (memberIndex === -1) {
			return NextResponse.json(
				{ error: `Member with ID ${updatedMemberData.id} not found.` },
				{ status: 404 },
			);
		}

		members[memberIndex] = {
			...members[memberIndex],
			...updatedMemberData,
		};

		await writeMembers(members);

		return NextResponse.json(members[memberIndex]);
	} catch (error) {
		console.error("Error in PUT /api/admin/member:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to update member" },
			{ status: 500 },
		);
	}
}

export async function DELETE(request) {
	try {
		const { searchParams } = request.nextUrl;
		const memberId = searchParams.get("id");

		if (!memberId) {
			return NextResponse.json(
				{ error: "Member ID is required." },
				{ status: 400 },
			);
		}

		const members = await readMembers();
		const initialLength = members.length;
		const filteredMembers = members.filter((m) => m.id !== memberId);

		if (filteredMembers.length === initialLength) {
			return NextResponse.json(
				{ error: `Member with ID ${memberId} not found.` },
				{ status: 404 },
			);
		}

		await writeMembers(filteredMembers);

		return NextResponse.json({
			message: `Member ${memberId} deleted successfully.`,
		});
	} catch (error) {
		console.error("Error in DELETE /api/admin/member:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to delete member" },
			{ status: 500 },
		);
	}
}

export async function PATCH(request) {
	try {
		const body = await request.json();
		const orderedIds = body?.orderedIds;

		const members = await readMembers();
		const reorderedMembers = applyPartialMemberOrder(members, orderedIds);

		await writeMembers(reorderedMembers);

		return NextResponse.json(reorderedMembers);
	} catch (error) {
		console.error("Error in PATCH /api/admin/member:", error);

		const status =
			error.message === "orderedIds must be a non-empty array." ||
			error.message === "orderedIds cannot contain duplicates." ||
			error.message?.includes("not found")
				? 400
				: 500;

		return NextResponse.json(
			{ error: error.message || "Failed to reorder members" },
			{ status },
		);
	}
}
