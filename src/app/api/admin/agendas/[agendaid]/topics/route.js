import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/clerk-sdk-node";
import path from "path";
import { promises as fs } from "fs";

const agendaFilePath = path.join(
	process.cwd(),
	"public",
	"data",
	"agendas.json",
);

const initializeClerk = () => {
	const secretKey = process.env.CLERK_SECRET_KEY;
	if (!secretKey) {
		throw new Error("Server configuration error: Clerk Secret Key missing.");
	}

	return createClerkClient({ secretKey });
};

async function checkUserPermission(
	request,
	allowedRoleKeys = ["admin", "committee"],
) {
	let authResult;

	try {
		authResult = getAuth(request);
		if (!authResult?.userId) {
			return {
				authorized: false,
				error: "Authentication context missing.",
				status: 401,
			};
		}
	} catch (error) {
		console.error(
			"Agenda topic permission check failed while reading auth:",
			error,
		);
		return {
			authorized: false,
			error: "Failed to get authentication context.",
			status: 500,
		};
	}

	try {
		const clerk = initializeClerk();
		const user = await clerk.users.getUser(authResult.userId);
		const userPublicMetadata = user?.publicMetadata || {};

		const hasPermission = allowedRoleKeys.some(
			(roleKey) => userPublicMetadata[roleKey] === true,
		);

		if (!hasPermission) {
			return {
				authorized: false,
				error: `Unauthorized. Requires ${allowedRoleKeys.join(" or ")} role.`,
				status: 403,
			};
		}

		return { authorized: true, userId: authResult.userId };
	} catch (error) {
		console.error(
			"Agenda topic permission check failed while reading user:",
			error,
		);
		return {
			authorized: false,
			error: "Could not verify user roles.",
			status: 500,
		};
	}
}

const createSubmittedTopicId = () =>
	`submitted-topic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeStoredTopics = (topics) => {
	if (!Array.isArray(topics)) {
		return [];
	}

	return topics
		.map((topic) => {
			const safeTopic =
				topic && typeof topic === "object" && !Array.isArray(topic)
					? topic
					: {};

			return {
				id:
					typeof safeTopic.id === "string" && safeTopic.id.trim()
						? safeTopic.id
						: createSubmittedTopicId(),
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
		})
		.filter((topic) => topic.topic.trim());
};

const getExistingAgendaTopics = (agenda) => {
	if (Array.isArray(agenda?.Topics)) {
		return normalizeStoredTopics(agenda.Topics);
	}

	if (Array.isArray(agenda?.appliedTopics)) {
		return normalizeStoredTopics(agenda.appliedTopics);
	}

	return [];
};

async function readAgendaFile() {
	try {
		const fileContents = await fs.readFile(agendaFilePath, "utf8");
		return JSON.parse(fileContents);
	} catch (error) {
		if (error.code === "ENOENT") {
			return [];
		}

		console.error("Error reading agendas file for topic submission:", error);
		throw new Error("Failed to read agenda data.");
	}
}

async function writeAgendaFile(data) {
	await fs.writeFile(agendaFilePath, JSON.stringify(data, null, 2), "utf8");
}

export async function POST(request, { params }) {
	const permissionCheck = await checkUserPermission(request, [
		"admin",
		"committee",
	]);
	if (!permissionCheck.authorized) {
		return NextResponse.json(
			{ error: permissionCheck.error },
			{ status: permissionCheck.status },
		);
	}

	try {
		const resolvedParams = await params;
		const agendaId = resolvedParams?.agendaid;
		if (typeof agendaId !== "string" || !agendaId.trim()) {
			return NextResponse.json(
				{ error: "Agenda id is required." },
				{ status: 400 },
			);
		}

		const body = await request.json();
		const submittedTopics = normalizeStoredTopics(body?.topics);

		if (submittedTopics.length === 0) {
			return NextResponse.json(
				{ error: "At least one valid topic is required." },
				{ status: 400 },
			);
		}

		const agendas = await readAgendaFile();
		if (!Array.isArray(agendas)) {
			throw new Error("Invalid data format: Expected an array of agendas.");
		}

		const agendaIndex = agendas.findIndex(
			(agenda) =>
				agenda && typeof agenda === "object" && agenda.id === agendaId,
		);

		if (agendaIndex === -1) {
			return NextResponse.json({ error: "Agenda not found." }, { status: 404 });
		}

		const currentAgenda = agendas[agendaIndex];
		const updatedAgenda = {
			...currentAgenda,
			Topics: [...getExistingAgendaTopics(currentAgenda), ...submittedTopics],
		};

		if ("appliedTopics" in updatedAgenda) {
			delete updatedAgenda.appliedTopics;
		}

		agendas[agendaIndex] = updatedAgenda;
		await writeAgendaFile(agendas);

		return NextResponse.json({ success: true, agenda: updatedAgenda });
	} catch (error) {
		console.error("Error submitting agenda topics:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to submit agenda topics." },
			{ status: 500 },
		);
	}
}
