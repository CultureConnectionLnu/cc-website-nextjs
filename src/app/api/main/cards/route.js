// app/api/main/cards/route.js
import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";

export async function GET(request) {
  try {
    const jsonDirectory = path.join(process.cwd(), "public", "data");
    const filePath = path.join(jsonDirectory, "cards.json");
    const fileContents = await fs.readFile(filePath, "utf8");
    return NextResponse.json(JSON.parse(fileContents), { status: 200 });
  } catch (error) {
    console.error("Error fetching cards from JSON:", error);
    return NextResponse.json(
      { error: "Failed to load cards data" },
      { status: 500 },
    );
  }
}
