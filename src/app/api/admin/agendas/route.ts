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
    secretarySignedAt: z.iso.date(),
    minuteCheckerSigned: z.boolean(),
    minuteCheckerSignedBy: z.string(),
    minuteCheckerSignedAt: z.iso.date(),
})

const AgendaTopicCompletion = z.object({
    id: z.string(),
    userid: z.string(),
    topic: z.string(),
    completed: z.boolean(),
})

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

const formatAgendaDate = (dateValue) => {
	if (!dateValue) {
		return "Day Month, Year";
	}

	const parsedDate = new Date(`${dateValue}T12:00:00`);
	if (Number.isNaN(parsedDate.getTime())) {
		return "Day Month, Year";
	}

	return agendaDocumentFormatter.format(parsedDate);
};

const formatAgendaTitle = (dateValue) =>
	`Agenda ${formatAgendaDate(dateValue)}`;

const DEFAULT_AGENDA_LABELS = {
	meetingInitiation: "Meeting initiation",
	boardMembersMeetUp: "Board members meet up",
	meetingConcludes: "Meeting concludes",
	nextMeetingDate: "Next date for meeting",
	topicsForNextMeeting: "Topics for next meeting",
};

const normalizeAgendaLabels = (labels) => {
	const safeLabels =
		labels && typeof labels === "object" && !Array.isArray(labels)
			? labels
			: {};

	return Object.fromEntries(
		Object.entries(DEFAULT_AGENDA_LABELS).map(([key, fallbackValue]) => [
			key,
			typeof safeLabels[key] === "string" && safeLabels[key].trim()
				? safeLabels[key]
				: fallbackValue,
		]),
	);
};

const ensureTopicList = (topics) => {
	const normalizedTopics = Array.isArray(topics)
		? topics.slice(0, 20).map((topic, index) => {
				if (typeof topic === "string") {
					return {
						id: `agenda-topic-${index}`,
						label: `Topic ${index + 1}`,
						content: topic,
					};
				}

				const safeTopic =
					topic && typeof topic === "object" && !Array.isArray(topic)
						? topic
						: {};

				return {
					id:
						typeof safeTopic.id === "string" && safeTopic.id.trim()
							? safeTopic.id
							: `agenda-topic-${index}`,
					label:
						typeof safeTopic.label === "string" && safeTopic.label.trim()
							? safeTopic.label
							: `Topic ${index + 1}`,
					content:
						typeof safeTopic.content === "string" ? safeTopic.content : "",
					voting: {
						enabled:
							safeTopic.voting && typeof safeTopic.voting === "object"
								? safeTopic.voting.enabled === true
								: false,
						reason:
							safeTopic.voting &&
							typeof safeTopic.voting === "object" &&
							typeof safeTopic.voting.reason === "string"
								? safeTopic.voting.reason
								: "",
						approve:
							safeTopic.voting &&
							typeof safeTopic.voting === "object" &&
							Array.isArray(safeTopic.voting.approve)
								? safeTopic.voting.approve.filter(
										(member) => typeof member === "string",
									)
								: [],
						disapprove:
							safeTopic.voting &&
							typeof safeTopic.voting === "object" &&
							Array.isArray(safeTopic.voting.disapprove)
								? safeTopic.voting.disapprove.filter(
										(member) => typeof member === "string",
									)
								: [],
						abstain:
							safeTopic.voting &&
							typeof safeTopic.voting === "object" &&
							Array.isArray(safeTopic.voting.abstain)
								? safeTopic.voting.abstain.filter(
										(member) => typeof member === "string",
									)
								: [],
					},
				};
			})
		: [];

	return normalizedTopics;
};

const ensureAppliedTopicSubmissions = (topics) => {
	if (!Array.isArray(topics)) {
		return [];
	}

	return topics.map((topic, index) => {
		const safeTopic =
			topic && typeof topic === "object" && !Array.isArray(topic) ? topic : {};

		return {
			id:
				typeof safeTopic.id === "string" && safeTopic.id.trim()
					? safeTopic.id
					: `applied-topic-${index}`,
			userid:
				typeof safeTopic.userid === "string" && safeTopic.userid.trim()
					? safeTopic.userid
					: typeof safeTopic.submittedBy === "string" &&
							safeTopic.submittedBy.trim()
						? safeTopic.submittedBy
						: "Unknown",
			topic:
				typeof safeTopic.topic === "string"
					? safeTopic.topic
					: typeof safeTopic.content === "string"
						? safeTopic.content
						: "",
			completed: safeTopic.completed === true ? true : null,
		};
	});
};

const normalizeAgendaSignatures = (signatures) => {
	const safeSignatures =
		signatures && typeof signatures === "object" && !Array.isArray(signatures)
			? signatures
			: {};

	return {
		secretarySigned: safeSignatures.secretarySigned === true,
		secretarySignedBy:
			typeof safeSignatures.secretarySignedBy === "string"
				? safeSignatures.secretarySignedBy
				: "",
		secretarySignedAt:
			typeof safeSignatures.secretarySignedAt === "string"
				? safeSignatures.secretarySignedAt
				: "",
		minuteCheckerSigned: safeSignatures.minuteCheckerSigned === true,
		minuteCheckerSignedBy:
			typeof safeSignatures.minuteCheckerSignedBy === "string"
				? safeSignatures.minuteCheckerSignedBy
				: "",
		minuteCheckerSignedAt:
			typeof safeSignatures.minuteCheckerSignedAt === "string"
				? safeSignatures.minuteCheckerSignedAt
				: "",
	};
};

const normalizeAgenda = (agenda, index = 0) => {
	const safeAgenda =
		agenda && typeof agenda === "object" && !Array.isArray(agenda)
			? agenda
			: {};
	const date = typeof safeAgenda.date === "string" ? safeAgenda.date : "";
	const legacyPresent =
		typeof safeAgenda.present === "string" ? safeAgenda.present : "";
	const presentMembers = Array.isArray(safeAgenda.presentMembers)
		? safeAgenda.presentMembers.filter((member) => typeof member === "string")
		: legacyPresent
			? legacyPresent
					.split(/\n|,/)
					.map((member) => member.trim())
					.filter(Boolean)
			: [];
	const minuteChecker =
		typeof safeAgenda.minuteChecker === "string"
			? safeAgenda.minuteChecker
			: typeof safeAgenda.minuteValidator === "string"
				? safeAgenda.minuteValidator
				: "";

	return {
		id:
			typeof safeAgenda.id === "string" && safeAgenda.id.trim()
				? safeAgenda.id
				: `agenda-${index}`,
		date,
		title: formatAgendaTitle(date),
		customLabels: normalizeAgendaLabels(safeAgenda.customLabels),
		presentMembers,
		additionalNotes:
			typeof safeAgenda.additionalNotes === "string"
				? safeAgenda.additionalNotes
				: "",
		chairman:
			typeof safeAgenda.chairman === "string" ? safeAgenda.chairman : "",
		secretary:
			typeof safeAgenda.secretary === "string" ? safeAgenda.secretary : "",
		minuteChecker,
		meetingInitiation:
			typeof safeAgenda.meetingInitiation === "string"
				? safeAgenda.meetingInitiation
				: "",
		boardMembersMeetUp:
			typeof safeAgenda.boardMembersMeetUp === "string"
				? safeAgenda.boardMembersMeetUp
				: "",
		meetingStartTime:
			typeof safeAgenda.meetingStartTime === "string"
				? safeAgenda.meetingStartTime
				: "",
		meetingEndTime:
			typeof safeAgenda.meetingEndTime === "string"
				? safeAgenda.meetingEndTime
				: "",
		topics: ensureTopicList(safeAgenda.topics),
		meetingConcludes:
			typeof safeAgenda.meetingConcludes === "string"
				? safeAgenda.meetingConcludes
				: "",
		nextMeetingDate:
			typeof safeAgenda.nextMeetingDate === "string"
				? safeAgenda.nextMeetingDate
				: "",
		topicsForNextMeeting:
			typeof safeAgenda.topicsForNextMeeting === "string"
				? safeAgenda.topicsForNextMeeting
				: "",
		isCompleted: safeAgenda.isCompleted === true,
		completedAt:
			typeof safeAgenda.completedAt === "string" ? safeAgenda.completedAt : "",
		signatures: normalizeAgendaSignatures(safeAgenda.signatures),
		Topics: ensureAppliedTopicSubmissions(
			Array.isArray(safeAgenda.Topics)
				? safeAgenda.Topics
				: safeAgenda.appliedTopics,
		),
	};
};

const normalizeAgendas = (data) => {
	if (!Array.isArray(data)) {
		return [];
	}

	return data
		.map((agenda, index) => normalizeAgenda(agenda, index))
		.sort((left, right) => right.date.localeCompare(left.date));
};

const validateAgendas = (data) => {
	if (!Array.isArray(data)) {
		throw new Error("Invalid data format: Expected an array of agendas.");
	}

	const seenDates = new Set();

	for (const agenda of data) {
		if (
			typeof agenda.id !== "string" ||
			typeof agenda.date !== "string" ||
			typeof agenda.title !== "string"
		) {
			throw new Error(
				"Invalid item structure: Each agenda must have id, date, and title as strings.",
			);
		}

		if (!Array.isArray(agenda.topics)) {
			throw new Error("Invalid item structure: topics must be an array.");
		}

		for (const topic of agenda.topics) {
			if (
				!topic ||
				typeof topic !== "object" ||
				typeof topic.id !== "string" ||
				typeof topic.label !== "string" ||
				typeof topic.content !== "string"
			) {
				throw new Error(
					"Invalid item structure: each topic must have id, label, and content.",
				);
			}

			if (
				!topic.voting ||
				typeof topic.voting !== "object" ||
				typeof topic.voting.enabled !== "boolean" ||
				typeof topic.voting.reason !== "string" ||
				!Array.isArray(topic.voting.approve) ||
				!Array.isArray(topic.voting.disapprove) ||
				!Array.isArray(topic.voting.abstain)
			) {
				throw new Error(
					"Invalid item structure: each topic voting block must be complete.",
				);
			}
		}

		if (!Array.isArray(agenda.presentMembers)) {
			throw new Error(
				"Invalid item structure: presentMembers must be an array.",
			);
		}

		if (!Array.isArray(agenda.Topics)) {
			throw new Error("Invalid item structure: Topics must be an array.");
		}

		if (typeof agenda.isCompleted !== "boolean") {
			throw new Error("Invalid item structure: isCompleted must be a boolean.");
		}

		if (typeof agenda.completedAt !== "string") {
			throw new Error("Invalid item structure: completedAt must be a string.");
		}

		if (
			!agenda.signatures ||
			typeof agenda.signatures !== "object" ||
			Array.isArray(agenda.signatures)
		) {
			throw new Error("Invalid item structure: signatures must be an object.");
		}

		if (
			typeof agenda.signatures.secretarySigned !== "boolean" ||
			typeof agenda.signatures.secretarySignedBy !== "string" ||
			typeof agenda.signatures.secretarySignedAt !== "string" ||
			typeof agenda.signatures.minuteCheckerSigned !== "boolean" ||
			typeof agenda.signatures.minuteCheckerSignedBy !== "string" ||
			typeof agenda.signatures.minuteCheckerSignedAt !== "string"
		) {
			throw new Error(
				"Invalid item structure: signatures must include secretary and minute checker signing details.",
			);
		}

		for (const topic of agenda.Topics) {
			if (
				!topic ||
				typeof topic !== "object" ||
				typeof topic.id !== "string" ||
				typeof topic.userid !== "string" ||
				typeof topic.topic !== "string" ||
				!(topic.completed === true || topic.completed === null)
			) {
				throw new Error(
					"Invalid item structure: each Topics item must have id, userid, topic, and completed.",
				);
			}
		}

		if (
			!agenda.customLabels ||
			typeof agenda.customLabels !== "object" ||
			Array.isArray(agenda.customLabels)
		) {
			throw new Error(
				"Invalid item structure: customLabels must be an object.",
			);
		}

		if (agenda.date) {
			if (seenDates.has(agenda.date)) {
				throw new Error("Invalid data format: Agenda dates must be unique.");
			}
			seenDates.add(agenda.date);
		}
	}
};

async function readAgendaFile() {
	try {
		const fileContents = await fs.readFile(agendaFilePath, "utf8");
		return normalizeAgendas(JSON.parse(fileContents));
	} catch (error) {
		if (error.code === "ENOENT") {
			return [];
		}

		console.error("Error reading agendas file:", error);
		throw new Error("Failed to read agenda data.");
	}
}

async function writeAgendaFile(data) {
	const normalizedAgendas = normalizeAgendas(data);
	validateAgendas(normalizedAgendas);

	await fs.writeFile(
		agendaFilePath,
		JSON.stringify(normalizedAgendas, null, 2),
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

export async function PUT(request) {
	const permissionCheck = await checkUserPermission(request, ["admin"]);
	if (!permissionCheck.authorized) {
		return NextResponse.json(
			{ error: permissionCheck.error },
			{ status: permissionCheck.status },
		);
	}

	try {
		const updatedAgendas = await request.json();
		await writeAgendaFile(updatedAgendas);
		return NextResponse.json(normalizeAgendas(updatedAgendas));
	} catch (error) {
		const status = error.message.startsWith("Invalid data format") ? 400 : 500;
		return NextResponse.json({ error: error.message }, { status });
	}
}
