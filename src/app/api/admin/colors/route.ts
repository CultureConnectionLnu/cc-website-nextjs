import { NextResponse } from "next/server";
import path from "path";
import z from "zod";
import { withAuth } from "@/lib/auth";
import { DataStore } from "@/lib/dataStore";

const Color = z.object({
	colorName: z.string().trim().min(0),
	isFavorite: z.boolean(),
});

const Colors = z.array(Color);

const colorsFile = new DataStore("colors.json", Colors, []);

export const GET = withAuth({ roles: ["admin"] }, async (req, _ctx, _user) => {
	try {
		const colors = await colorsFile.read();
		return NextResponse.json(colors);
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
});

export const POST = withAuth({ roles: ["admin"] }, async (req, _ctx, _user) => {
	try {
		const { colorName, isFavorite } = Color.parse(await req.json());

		const colors = await colorsFile.read();
		if (!colors.some((color) => color.colorName === colorName)) {
			return NextResponse.json(
				{ error: `Color '${colorName}' not found.` },
				{ status: 404 },
			);
		}
		const updatedColors = colors.map((color) => {
			if (color.colorName === colorName) {
				color.isFavorite = isFavorite;
			}
			return color;
		});
		await colorsFile.write(updatedColors);
		const updatedColor = updatedColors.find((c) => c.colorName === colorName);
		return NextResponse.json({ success: true, updatedColor });
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
