import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";

const dataFilePath = path.join(
	process.cwd(),
	"public",
	"data",
	"slideImagesData.json",
);
const settingsFilePath = path.join(
	process.cwd(),
	"public",
	"data",
	"sliderSettings.json",
);

export async function GET() {
	try {
		const dataContents = await fs.readFile(dataFilePath, "utf8");
		const settingsContents = await fs.readFile(settingsFilePath, "utf8");

		const jsonData = JSON.parse(dataContents);
		const jsonSettings = JSON.parse(settingsContents);

		return NextResponse.json({
			data: jsonData,
			settings: jsonSettings,
		});
	} catch (error) {
		console.error("[API GET] Failed to read slider data or settings:", error);
		return NextResponse.json(
			{ message: "Error reading data files.", error: error.message },
			{ status: 500 },
		);
	}
}

export async function POST(request) {
	try {
		const body = await request.json();
		const { newData, newSettings } = body;

		if (!newData || !newSettings) {
			return NextResponse.json(
				{ message: "Invalid data format." },
				{ status: 400 },
			);
		}

		await fs.writeFile(dataFilePath, JSON.stringify(newData, null, 2), "utf8");
		await fs.writeFile(
			settingsFilePath,
			JSON.stringify(newSettings, null, 2),
			"utf8",
		);

		return NextResponse.json({
			message: "Slider data and settings updated successfully.",
		});
	} catch (error) {
		return NextResponse.json(
			{ message: "Error writing data files.", error: error.message },
			{ status: 500 },
		);
	}
}
