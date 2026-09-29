import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";

export async function GET(request) {
  try {
    const jsonDirectory = path.join(process.cwd(), "public", "data");
    const filePath = path.join(jsonDirectory, "linktree.json");

    const fileContents = await fs.readFile(filePath, "utf8");
    const data = JSON.parse(fileContents);
    return NextResponse.json(data);
  } catch (error) {
    console.error("API Error reading linktree.json:", error);

    if (error.code === "ENOENT") {
      return NextResponse.json(
        { error: "linktree data file not found." },
        { status: 404 },
      );
    } else {
      return NextResponse.json(
        { error: "Failed to load linktree data." },
        { status: 500 },
      );
    }
  }
}
