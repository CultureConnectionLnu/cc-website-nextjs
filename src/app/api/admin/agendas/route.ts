import { withAuth } from "@/lib/auth";
import { DataStore, DataStoreError } from "@/lib/dataStore";
import { NextResponse } from "next/server";
import * as z from "zod";

const AgendaTopic = z.object({
	id: z.string(),
	label: z.string(),
	content: z.string(),
	voting: z.object({
		enabled: z.boolean(),
		reason: z.string(),
		approve: z.array(z.string()),
		disapprove: z.array(z.string()),
		abstain: z.array(z.string()),
	}),
});

const AgendaSignatures = z.object({
	secretarySigned: z.boolean(),
	secretarySignedBy: z.string(),
	secretarySignedAt: z.iso.datetime().or(z.string().max(0)),
	minuteCheckerSigned: z.boolean(),
	minuteCheckerSignedBy: z.string(),
	minuteCheckerSignedAt: z.iso.datetime().or(z.string().max(0)),
});

const AgendaTopicCompletion = z.object({
	id: z.string(),
	userid: z.string(),
	topic: z.string(),
	completed: z.boolean().nullable(),
});

const Agenda = z.object({
	id: z.string(),
	date: z.iso.date(),
	title: z.string(),
	customLabels: z.record(z.string(), z.string()),
	presentMembers: z.array(z.string()),
	additionalNotes: z.string(),
	chairman: z.string(),
	secretary: z.string(),
	minuteChecker: z.string(),
	meetingInitiation: z.string(),
	boardMembersMeetUp: z.string(),
	meetingStartTime: z.iso.time(),
	meetingEndTime: z.iso.time().or(z.string().max(0)),
	topics: z.array(AgendaTopic),
	meetingConcludes: z.string(),
	nextMeetingDate: z.string(),
	topicsForNextMeeting: z.string(),
	isCompleted: z.boolean(),
	completedAt: z.string(),
	signatures: AgendaSignatures,
	Topics: z.array(AgendaTopicCompletion),
});
type Agenda = z.infer<typeof Agenda>;

const Agendas = z.array(Agenda).refine(
	(agendas) => {
		const dates = agendas.map((agenda) => agenda.date);
		return new Set(dates).size === dates.length;
	},
	{ message: "Agendas cannot have duplicate dates" },
);
type Agendas = z.infer<typeof Agendas>;

const agendaFile = new DataStore("agendas.json", Agendas);

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

export const PUT = withAuth({ roles: ["admin"] }, async (req, _ctx, user) => {
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
