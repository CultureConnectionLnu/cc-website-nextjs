import { NextResponse } from "next/server";
import * as z from "zod";
import { withAuth } from "@/lib/auth";
import { DataStore } from "@/lib/dataStore";
import {
	type Agenda,
	Agendas,
	type AgendaTopicCompletion,
} from "@/types/admin/agendas";

const SubmittedTopic = z.object({ topic: z.string().trim().min(1) });

const agendaFile = new DataStore("agendas.json", Agendas, []);

type Params = { agendaid: string };

export const POST = withAuth<Params>(
	{ roles: ["admin", "committee"] },
	async (req, { params }, user) => {
		try {
			const agendaId = (await params).agendaid;

			const body = await req.json();
			const { success, data } = SubmittedTopic.array()
				.min(1)
				.safeParse(body?.topics);

			if (!success) {
				return NextResponse.json(
					{ error: "Invalid data format" },
					{ status: 400 },
				);
			}

			const submittedTopics: AgendaTopicCompletion[] = data.map(({ topic }) => {
				return {
					id: `submitted-topic-${crypto.randomUUID()}`,
					userid: user.clerkUser.fullName ?? "Unknown Member",
					topic: topic,
					completed: false,
				} satisfies AgendaTopicCompletion;
			});

			const agendas: Agendas = await agendaFile.read();
			const agendaIdx = agendas.findIndex((agenda) => agenda.id === agendaId);
			if (agendaIdx === -1) {
				return NextResponse.json(
					{ error: "Agenda not found" },
					{ status: 404 },
				);
			}

			const targetAgenda = agendas[agendaIdx]!;

			const updatedAgenda: Agenda = {
				...targetAgenda,
				Topics: [...targetAgenda.Topics, ...submittedTopics],
			};

			agendas[agendaIdx] = updatedAgenda;
			await agendaFile.write(agendas);

			return NextResponse.json({ success: true, agenda: updatedAgenda });
		} catch (error: any) {
			console.error("Error submitting agenda topics:", error);
			return NextResponse.json(
				{ error: "Failed to submit agenda topics." },
				{ status: 500 },
			);
		}
	},
);
