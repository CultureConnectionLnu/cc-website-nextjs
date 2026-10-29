import { NextResponse } from "next/server";
import z from "zod";
import { withAuth } from "@/lib/auth";
import { DataStore } from "@/lib/dataStore";

const AttendanceTemplate = z.array(
	z.object({
		id: z.string().trim().min(1),
		name: z.string().trim().min(1),
		members: z.array(z.string().trim().min(1)),
	}),
);

const templateFile = new DataStore(
	"agenda-attendance-templates.json",
	AttendanceTemplate,
);

export const GET = withAuth({ roles: ["admin"] }, async (req, _ctx, _user) => {
	try {
		return NextResponse.json(await templateFile.read());
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
});

export const PUT = withAuth({ roles: "admin" }, async (req, _ctx, _user) => {
	try {
		const updatedTemplates = AttendanceTemplate.parse(await req.json());
		await templateFile.write(updatedTemplates);
		return NextResponse.json(updatedTemplates);
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
