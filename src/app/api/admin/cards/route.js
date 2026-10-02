import { createClerkClient } from "@clerk/clerk-sdk-node";
import { getAuth } from "@clerk/nextjs/server";
import { promises as fs } from "fs";
import { NextResponse } from "next/server";
import path from "path";

const initializeClerk = () => {
	const secretKey = process.env.CLERK_SECRET_KEY;
	if (!secretKey)
		throw new Error("Server configuration error: Clerk Secret Key missing.");
	return createClerkClient({ secretKey });
};

async function verifyAdmin(request) {
	const authResult = getAuth(request);
	if (!authResult || !authResult.userId) {
		return { authorized: false, error: "Unauthorized", status: 401 };
	}
	const { userId } = authResult;
	try {
		const clerk = initializeClerk();
		const user = await clerk.users.getUser(userId);
		if (user?.publicMetadata?.admin !== true) {
			return { authorized: false, error: "Forbidden", status: 403 };
		}
		return { authorized: true, userId };
	} catch (error) {
		console.error(`verifyAdmin Error:`, error);
		return {
			authorized: false,
			error: "Could not verify admin status.",
			status: 500,
		};
	}
}

const jsonFilePath = path.join(process.cwd(), "public", "data", "cards.json");

async function readCardsFile() {
	try {
		const fileContents = await fs.readFile(jsonFilePath, "utf8");
		return JSON.parse(fileContents);
	} catch (error) {
		if (error.code === "ENOENT") return [];
		throw new Error("Failed to read card data.");
	}
}

async function writeCardsFile(data) {
	try {
		await fs.writeFile(jsonFilePath, JSON.stringify(data, null, 2), "utf8");
	} catch (error) {
		throw new Error("Failed to save card data.");
	}
}

export async function GET(request) {
	try {
		const cards = await readCardsFile();
		return NextResponse.json(cards);
	} catch (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}

export async function POST(request) {
	const adminCheck = await verifyAdmin(request);
	if (!adminCheck.authorized) {
		return NextResponse.json(
			{ error: adminCheck.error },
			{ status: adminCheck.status },
		);
	}

	try {
		const newCardData = await request.json();
		if (
			!newCardData.title ||
			!newCardData.date ||
			!newCardData.time ||
			!newCardData.location
		) {
			return NextResponse.json(
				{ error: "Missing required card fields." },
				{ status: 400 },
			);
		}

		const cards = await readCardsFile();
		const newCard = {
			...newCardData,
			id: Date.now(),
			bgColor: newCardData.bgColor || "bg-gray-200",
		};
		cards.push(newCard);
		await writeCardsFile(cards);
		return NextResponse.json(newCard, { status: 201 });
	} catch (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}

export async function PUT(request) {
	const adminCheck = await verifyAdmin(request);
	if (!adminCheck.authorized) {
		return NextResponse.json(
			{ error: adminCheck.error },
			{ status: adminCheck.status },
		);
	}

	try {
		const updatedCardData = await request.json();
		if (!updatedCardData.id) {
			return NextResponse.json(
				{ error: "Card ID is required for update." },
				{ status: 400 },
			);
		}

		const cards = await readCardsFile();
		const cardIndex = cards.findIndex((card) => card.id === updatedCardData.id);

		if (cardIndex === -1) {
			return NextResponse.json(
				{ error: `Card with ID ${updatedCardData.id} not found.` },
				{ status: 404 },
			);
		}

		cards[cardIndex] = { ...cards[cardIndex], ...updatedCardData };
		await writeCardsFile(cards);
		return NextResponse.json(cards[cardIndex]);
	} catch (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}

export async function DELETE(request) {
	const adminCheck = await verifyAdmin(request);
	if (!adminCheck.authorized) {
		return NextResponse.json(
			{ error: adminCheck.error },
			{ status: adminCheck.status },
		);
	}

	try {
		const { searchParams } = new URL(request.url);
		const cardIdParam = searchParams.get("id");

		if (!cardIdParam) {
			return NextResponse.json(
				{ error: "Card ID query parameter is required for deletion." },
				{ status: 400 },
			);
		}
		const cardId = parseInt(cardIdParam, 10);
		if (isNaN(cardId)) {
			return NextResponse.json(
				{ error: "Invalid Card ID format." },
				{ status: 400 },
			);
		}

		const cards = await readCardsFile();
		const initialLength = cards.length;
		const filteredCards = cards.filter((card) => card.id !== cardId);

		if (filteredCards.length === initialLength) {
			return NextResponse.json(
				{ error: `Card with ID ${cardId} not found.` },
				{ status: 404 },
			);
		}

		await writeCardsFile(filteredCards);
		return NextResponse.json({
			message: `Card ${cardId} deleted successfully.`,
		});
	} catch (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
