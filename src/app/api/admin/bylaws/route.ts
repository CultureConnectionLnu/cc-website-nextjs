import { NextResponse } from "next/server";
import z from "zod";
import { withAuth } from "@/lib/auth";
import { DataStore } from "@/lib/dataStore";

const Bylaw = z.object({
	id: z.string().trim().min(1),
	title: z.string().trim().min(1),
	content: z.string().trim().min(1),
});

const Bylaws = z.array(Bylaw);

const bylawsFile = new DataStore("bylaws.json", Bylaws, []);

export const GET = withAuth({ roles: ["admin"] }, async (_req, _ctx, _user) => {
	try {
		const bylaws = await bylawsFile.read();
		return NextResponse.json(bylaws);
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
});

export const PUT = withAuth({ roles: ["admin"] }, async (req, _ctx, _user) => {
	try {
		const updatedBylawsData = Bylaws.parse(await req.json());
		await bylawsFile.write(updatedBylawsData);
		return NextResponse.json(updatedBylawsData);
	} catch (error: any) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: "Invalid request body" },
				{ status: 400 },
			);
		}
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
});
