import { withAuth } from "@/lib/auth";
import { createClerkClient } from "@clerk/clerk-sdk-node";
import { getAuth } from "@clerk/nextjs/server";
import { promises as fs } from "fs";
import { NextResponse } from "next/server";
import path from "path";
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
    })
})

const AgendaSignatures = z.object({
    secretarySigned: z.boolean(),
    secretarySignedBy: z.string(),
    secretarySignedAt: z.iso.datetime(),
    minuteCheckerSigned: z.boolean(),
    minuteCheckerSignedBy: z.string(),
    minuteCheckerSignedAt: z.iso.datetime(),
})

const AgendaTopicCompletion = z.object({
    id: z.string(),
    userid: z.string(),
    topic: z.string(),
    completed: z.boolean(),
})

const Agenda = z.looseObject({
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
    meetingEndTime: z.iso.time(),
    topics: z.array(AgendaTopic),
    meetingConcludes: z.string(),
    nextMeetingDate: z.string(),
    topicsForNextMeeting: z.string(),
    isCompleted: z.boolean(),
    completedAt: z.string(),
    signatures: AgendaSignatures,
    Topics: z.array(AgendaTopicCompletion)
})
type Agenda = z.infer<typeof Agenda>;

const Agendas = z.array(Agenda);
type Agendas = z.infer<typeof Agendas>;


const agendaFilePath = path.join(
	process.cwd(),
	"public",
	"data",
	"agendas.json",
);

const agendaDocumentFormatter = new Intl.DateTimeFormat("en-GB", {
	day: "numeric",
	month: "long",
	year: "numeric",
});

const formatAgendaDate = (dateValue: string) => {
	if (!dateValue) {
		return "Day Month, Year";
	}

	const parsedDate = new Date(`${dateValue}T12:00:00`);
	if (Number.isNaN(parsedDate.getTime())) {
		return "Day Month, Year";
	}

	return agendaDocumentFormatter.format(parsedDate);
};

const formatAgendaTitle = (dateValue: string) =>
	`Agenda ${formatAgendaDate(dateValue)}`;

const DEFAULT_AGENDA_LABELS = {
	meetingInitiation: "Meeting initiation",
	boardMembersMeetUp: "Board members meet up",
	meetingConcludes: "Meeting concludes",
	nextMeetingDate: "Next date for meeting",
	topicsForNextMeeting: "Topics for next meeting",
};

async function readAgendaFile(): Promise<Agenda[] | NextResponse> {
	try {
		const fileContents = await fs.readFile(agendaFilePath, "utf8");
        const parsed = JSON.parse(fileContents);
        const { success, data, error } = Agendas.safeParse(parsed);
        if (!success) {
            console.error("Invalid agenda data format:", error);
            throw new Error("Invalid data format in agendas file.");
        }
        return data as Agendas;
	} catch (error: any) {
		if (error.code === "ENOENT") {
			return [];
		}

		console.error("Error reading agendas file:", error);
        return NextResponse.json(
            { error: "Could not read agendas file" },
            { status: 500 });
    }
	return []
}

async function writeAgendaFile(agenda: Agendas) {
	await fs.writeFile(
		agendaFilePath,
		JSON.stringify(agenda, null, 2),
		"utf8",
	);
}

export const GET = withAuth({ roles: ["admin", "committee"] }, async (req, _ctx, user) => {
	try {
		const agendas = await readAgendaFile();
		return NextResponse.json(agendas);
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
})

export const PUT = withAuth({ roles: ["admin", "committee"] }, async (req, _ctx, user) => {
	try {
		const updatedAgendas = await req.json();
		await writeAgendaFile(updatedAgendas);
		return NextResponse.json(updatedAgendas);
	} catch (error: any) {
		const status = error.message.startsWith("Invalid data format") ? 400 : 500;
		return NextResponse.json({ error: error.message }, { status });
	}
})
