import { NextResponse } from "next/server";
import * as z from "zod";
import { withAuth } from "@/lib/auth";
import { DataStore } from "@/lib/dataStore";
import { Agendas } from "@/types/admin/agendas";

const agendaFile = new DataStore("agendas.json", Agendas, []);

export const GET = withAuth(
	{ roles: ["admin", "committee"] },
	async (_req, _ctx, _user) => {
		try {
			const agendas = await agendaFile.read();
			return NextResponse.json(agendas);
		} catch (error: any) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}
	},
);

export const PUT = withAuth({ roles: ["admin"] }, async (req, _ctx, _user) => {
	try {
		const recieved = await req.json();
		const updatedAgendas = Agendas.parse(recieved);
		await agendaFile.write(updatedAgendas);
		return NextResponse.json(updatedAgendas);
	} catch (error: any) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: "Invalid data format" },
				{ status: 400 },
			);
		} else {
			return NextResponse.json(
				{ error: "Server error modifying agendas" },
				{ status: 500 },
			);
		}
	}
});
