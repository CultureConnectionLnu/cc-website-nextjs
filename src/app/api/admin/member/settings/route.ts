import fs from "fs/promises";
import { type NextRequest, NextResponse } from "next/server";
import path from "path";
import * as z from "zod";
import { type NoParams, Role, withAuth } from "@/lib/auth";

// We store settings in a separate file to keep member data clean
const settingsFilePath = path.join(
	process.cwd(),
	"public/data/BoardSettings.json",
);

const Settings = z
	.object({
		defaultCodention: z.string().trim().min(1).optional(),
		codentionOrder: z.array(z.string().trim().min(1)).optional(),
	});

type Settings = z.infer<typeof Settings>;

const SettingsUpdate = z
	.object({
		defaultCodention: z.string().trim().min(1).optional(),
		codentionOrder: z.array(z.string().trim().min(1)).optional(),
	})
	.refine(
		(s) => s.defaultCodention !== undefined || s.codentionOrder !== undefined,
		{ message: "Missing settings payload" },
	);

type SettingsUpdate = z.infer<typeof Settings>;

const defaultSettings: Settings = {
	defaultCodention: "All",
	codentionOrder: [],
};

async function readSettings() {
	try {
		const data = await fs.readFile(settingsFilePath, "utf-8");
		return Settings.parse(JSON.parse(data));
	} catch (error) {
		if (
			error instanceof Error &&
			(error as NodeJS.ErrnoException).code === "ENOENT"
		) {
			return defaultSettings;
		}
		throw error;
	}
}

async function writeSettings(settings: Settings) {
	await fs.writeFile(
		settingsFilePath,
		JSON.stringify(settings, null, 2),
		"utf-8",
	);
}

export async function GET(_req: NextRequest) {
	try {
		const settings = await readSettings();
		return NextResponse.json(settings);
	} catch (error) {
		console.error("Error fetching settings: ", error);
		return NextResponse.json(defaultSettings, { status: 500 });
	}
}

export const POST = withAuth<NoParams>(
	{ roles: [Role.admin] },
	async (req, _ctx, _user) => {
		try {
			const body = await req.json();
			const { success, data: settings } = SettingsUpdate.safeParse(body);

			if (!success)
				return NextResponse.json(
					{ error: "body must contain default or order" },
					{ status: 400 },
				);

			if (
				settings.codentionOrder !== undefined &&
				new Set(settings.codentionOrder).size !==
					settings.codentionOrder?.length
			) {
				return NextResponse.json(
					{ error: "codentionOrder cannot contain duplicates" },
					{ status: 400 },
				);
			}

			const currentSettings = await readSettings();
			const nextSettings: Settings = {
				defaultCodention:
					settings.defaultCodention ?? currentSettings.defaultCodention,
				codentionOrder:
					settings.codentionOrder ?? currentSettings.codentionOrder,
			};

			await writeSettings(nextSettings);
			return NextResponse.json(nextSettings);
		} catch (error) {
			console.error("Error saving settings: ", error);
			return NextResponse.json(
				{ error: "Failed to save settings" },
				{ status: 500 },
			);
		}
	},
);
