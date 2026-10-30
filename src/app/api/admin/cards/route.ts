import { NextResponse } from "next/server";
import z from "zod";
import { withAuth } from "@/lib/auth";
import { DataStore } from "@/lib/dataStore";

const Description = z.object({
	title: z.string().optional(),
	description: z.string().optional(),
	ImagesUrl: z.array(z.httpUrl()),
});

const Card = z.object({
	id: z.int().optional(),
	title: z.string().trim().min(1),
	date: z.string().trim().min(1),
	time: z.string().trim().min(1),
	location: z.string().trim().min(1),
	bgColor: z.string().trim().min(1).optional().default("bg-gray-200"),
	description: z.string().optional().default(""),
	imageUrl: z.httpUrl().optional().catch(""),
	url: z.httpUrl().optional().catch(""),
	inDescription: z.array(Description),
});

const Cards = z.array(Card);

const cardsFile = new DataStore("cards.json", Cards, []);

export const GET = withAuth({ roles: ["admin"] }, async (req, _ctx, _user) => {
	try {
		const cards = await cardsFile.read();
		return NextResponse.json(cards);
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
});

export const POST = withAuth({ roles: ["admin"] }, async (req, _ctx, _user) => {
	try {
		const newCard = Card.parse(await req.json());
		if (!newCard.id) {
			newCard.id = Date.now();
		}
		const cards = await cardsFile.read();
		cards.push(newCard);
		await cardsFile.write(cards);
		return NextResponse.json(newCard, { status: 201 });
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
export const PUT = withAuth({ roles: ["admin"] }, async (req, _ctx, _user) => {
	try {
		const updatedCardData = Card.parse(await req.json());

		const cards = await cardsFile.read();
		const cardIndex = cards.findIndex((card) => card.id === updatedCardData.id);

		if (cardIndex === -1) {
			return NextResponse.json(
				{ error: `Card with ID ${updatedCardData.id} not found.` },
				{ status: 404 },
			);
		}

		cards[cardIndex] = { ...cards[cardIndex], ...updatedCardData };
		await cardsFile.write(cards);
		return NextResponse.json(cards[cardIndex]);
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

export const DELETE = withAuth(
	{ roles: ["admin"] },
	async (req, _ctx, _user) => {
		try {
			const { searchParams } = new URL(req.url);
			const cardIdParam = searchParams.get("id");

			if (!cardIdParam) {
				return NextResponse.json(
					{
						error: "Card ID query parameter is required for deletion.",
					},
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

			const cards = await cardsFile.read();
			const initialLength = cards.length;
			const filteredCards = cards.filter((card) => card.id !== cardId);

			if (filteredCards.length === initialLength) {
				return NextResponse.json(
					{ error: `Card with ID ${cardId} not found.` },
					{ status: 404 },
				);
			}

			await cardsFile.write(filteredCards);
			return NextResponse.json({
				message: `Card ${cardId} deleted successfully.`,
			});
		} catch (error: any) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}
	},
);
