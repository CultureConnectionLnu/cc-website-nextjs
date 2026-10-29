import { withAuth } from "@/lib/auth";
import { DataStore } from "@/lib/dataStore";
import { NextResponse } from "next/server";
import z from "zod";

const BoardMember = z.object({
    id: z.string().trim().min(1).catch(() => `m${crypto.randomUUID()}`),
    name: z.string().trim().min(1),
    codention: z.string().trim().min(1),
    position: z.string().trim().min(1),
    contact: z.string().optional().default(""),
    imageUrl: z.httpUrl().optional().default(""),
    bio: z.string().optional().default(""),
})
type BoardMember = z.infer<typeof BoardMember>

const BoardMembers = z.array(BoardMember)

const membersFile = new DataStore("BoardMembers.json", BoardMembers, []);


function applyPartialMemberOrder(members: BoardMember[], orderedIds: string[]): BoardMember[] {
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

	return members.map((member: BoardMember) => {
		if (!uniqueOrderedIds.has(member.id)) {
			return member;
		}

		const nextMember = orderedMembers[reorderedIndex];
        if (nextMember === undefined) {
            throw new Error(`No member found for ordered ID at index ${reorderedIndex}.`);
		}
        reorderedIndex += 1;
		return nextMember;
	});
}

export async function GET() {
	try {
		const members = await membersFile.read();
		return NextResponse.json(members);
	} catch (error: any) {
		return NextResponse.json(
			{ error: error.message || "Failed to fetch members" },
			{ status: 500 },
		);
	}
}

export const POST = withAuth({ roles: ["admin"] }, async (req, _ctx, _user) => 
 {
    try {
        const newMember = BoardMember.parse(await req.json());

        const members = await membersFile.read();
        members.push(newMember);
        await membersFile.write(members);

        return NextResponse.json(newMember, { status: 201 });
    } catch (error: any) {
        console.error("Error in POST /api/admin/member:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Invalid request body" }, { status: 400 }
            )
        }
		return NextResponse.json(
			{ error: error.message || "Failed to create member" },
			{ status: 500 },
		);
	}
})

export const PUT = withAuth({ roles: ["admin"] }, async (req, _ctx, _user) => 
 {
    try {
        const { success, data: updatedMemberData } = BoardMember.safeParse(await req.json());

        if (!success) {
            return NextResponse.json(
                { error: "Invalid request body" },
                { status: 400 },
            );
        }
        
		const members = await membersFile.read();
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

		await membersFile.write(members);

		return NextResponse.json(members[memberIndex]);
	} catch (error: any) {
		console.error("Error in PUT /api/admin/member:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to update member" },
			{ status: 500 },
		);
	}
})

export const DELETE = withAuth({ roles: ["admin"] }, async (req, _ctx, _user) => 
 {
    try {
		const { searchParams } = req.nextUrl;
		const memberId = searchParams.get("id");

		if (!memberId) {
			return NextResponse.json(
				{ error: "Member ID is required." },
				{ status: 400 },
			);
		}

		const members = await membersFile.read();
		const initialLength = members.length;
		const filteredMembers = members.filter((m) => m.id !== memberId);

		if (filteredMembers.length === initialLength) {
			return NextResponse.json(
				{ error: `Member with ID ${memberId} not found.` },
				{ status: 404 },
			);
		}

		await membersFile.write(filteredMembers);

		return NextResponse.json({
			message: `Member ${memberId} deleted successfully.`,
		});
	} catch (error: any) {
		console.error("Error in DELETE /api/admin/member:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to delete member" },
			{ status: 500 },
		);
	}
})
export const PATCH = withAuth({ roles: ["admin"] }, async (req, _ctx, _user) => 
 {
	try {
		const body = await req.json();
		const orderedIds = body?.orderedIds;

		const members = await membersFile.read();
		const reorderedMembers = applyPartialMemberOrder(members, orderedIds);

		await membersFile.write(reorderedMembers);

		return NextResponse.json(reorderedMembers);
	} catch (error: any) {
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
})
