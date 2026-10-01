import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// We store settings in a separate file to keep member data clean
const settingsFilePath = path.join(
  process.cwd(),
  "public/data/BoardSettings.json",
);

function normalizeSettings(settings) {
  const safeSettings =
    settings && typeof settings === "object" && !Array.isArray(settings)
      ? settings
      : {};

  return {
    defaultCodention:
      typeof safeSettings.defaultCodention === "string" &&
      safeSettings.defaultCodention.trim()
        ? safeSettings.defaultCodention
        : "All",
    codentionOrder: Array.isArray(safeSettings.codentionOrder)
      ? safeSettings.codentionOrder.filter(
          (codention) => typeof codention === "string" && codention.trim(),
        )
      : [],
  };
}

async function readSettings() {
  try {
    const data = await fs.readFile(settingsFilePath, "utf-8");
    return normalizeSettings(JSON.parse(data));
  } catch (error) {
    // Return default structure if file doesn't exist
    return normalizeSettings({});
  }
}

async function writeSettings(settings) {
  const normalizedSettings = normalizeSettings(settings);
  await fs.writeFile(
    settingsFilePath,
    JSON.stringify(normalizedSettings, null, 2),
    "utf-8",
  );
}

export async function GET() {
  try {
    const settings = await readSettings();
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json(normalizeSettings({}));
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    if (
      !body ||
      (body.defaultCodention === undefined && body.codentionOrder === undefined)
    ) {
      return NextResponse.json(
        { error: "Missing settings payload" },
        { status: 400 },
      );
    }

    const currentSettings = await readSettings();
    const nextSettings = normalizeSettings({
      ...currentSettings,
      ...(body.defaultCodention !== undefined
        ? { defaultCodention: body.defaultCodention }
        : {}),
      ...(body.codentionOrder !== undefined
        ? { codentionOrder: body.codentionOrder }
        : {}),
    });

    if (
      body.codentionOrder !== undefined &&
      !Array.isArray(body.codentionOrder)
    ) {
      return NextResponse.json(
        { error: "codentionOrder must be an array" },
        { status: 400 },
      );
    }

    if (
      Array.isArray(nextSettings.codentionOrder) &&
      new Set(nextSettings.codentionOrder).size !==
        nextSettings.codentionOrder.length
    ) {
      return NextResponse.json(
        { error: "codentionOrder cannot contain duplicates" },
        { status: 400 },
      );
    }

    if (
      body.defaultCodention !== undefined &&
      typeof body.defaultCodention !== "string"
    ) {
      return NextResponse.json(
        { error: "defaultCodention must be a string" },
        { status: 400 },
      );
    }

    if (body.defaultCodention !== undefined && !body.defaultCodention.trim()) {
      return NextResponse.json(
        { error: "defaultCodention cannot be empty" },
        { status: 400 },
      );
    }

    await writeSettings(nextSettings);

    return NextResponse.json(nextSettings);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 },
    );
  }
}
