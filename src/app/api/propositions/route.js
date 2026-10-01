import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/clerk-sdk-node";
import path from "path";
import { promises as fs } from "fs";

const initializeClerk = () => {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) return null;
  return createClerkClient({ secretKey });
};

const propositionsFilePath = path.join(
  process.cwd(),
  "public",
  "data",
  "propositions.json",
);

function getUserFullName(user) {
  if (!user) return "Unknown Member";
  if (user.fullName?.trim()) return user.fullName.trim();

  const fallbackFromParts = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fallbackFromParts || user.username || "Unknown Member";
}

async function readPropositions() {
  try {
    const fileContents = await fs.readFile(propositionsFilePath, "utf8");
    return JSON.parse(fileContents);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw new Error("Failed to read propositions.");
  }
}

async function writePropositions(data) {
  await fs.writeFile(
    propositionsFilePath,
    JSON.stringify(data, null, 2),
    "utf8",
  );
}

async function requireAdmin(request) {
  const authResult = getAuth(request);
  if (!authResult || !authResult.userId) {
    return { ok: false, error: "Unauthorized", status: 401 };
  }

  const clerk = initializeClerk();
  const user = await clerk.users.getUser(authResult.userId);
  const isAdmin = user?.publicMetadata?.admin === true;

  if (!isAdmin) {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  return { ok: true, authResult, user };
}

export async function GET(request) {
  const adminCheck = await requireAdmin(request);
  if (!adminCheck.ok) {
    return NextResponse.json(
      { error: adminCheck.error },
      { status: adminCheck.status },
    );
  }

  try {
    const propositions = await readPropositions();
    return NextResponse.json(propositions);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const authResult = getAuth(request);
  if (!authResult || !authResult.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const clerk = initializeClerk();
    const user = await clerk.users.getUser(authResult.userId);
    const userFullName = getUserFullName(user);
    const submittedAt = new Date().toISOString();

    const newProposition = {
      id: `prop-${Date.now()}`,
      userId: authResult.userId,
      userName: userFullName,
      userFullName,
      sectionId: body.sectionId,
      sectionTitle: body.sectionTitle,
      type: body.type,
      content: body.content,
      status: "pending",
      createdAt: submittedAt,
      submittedAt,
    };

    const propositions = await readPropositions();
    propositions.push(newProposition);
    await writePropositions(propositions);

    return NextResponse.json({ success: true, proposition: newProposition });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  const adminCheck = await requireAdmin(request);
  if (!adminCheck.ok) {
    return NextResponse.json(
      { error: adminCheck.error },
      { status: adminCheck.status },
    );
  }

  try {
    const body = await request.json();
    const { id, status } = body || {};

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Invalid proposition id." },
        { status: 400 },
      );
    }

    if (status !== "viewed") {
      return NextResponse.json(
        { error: "Invalid status update." },
        { status: 400 },
      );
    }

    const propositions = await readPropositions();
    const index = propositions.findIndex((prop) => prop.id === id);
    if (index < 0) {
      return NextResponse.json(
        { error: "Proposition not found." },
        { status: 404 },
      );
    }

    propositions[index] = {
      ...propositions[index],
      status: "viewed",
      viewedAt: new Date().toISOString(),
    };

    await writePropositions(propositions);
    return NextResponse.json({
      success: true,
      proposition: propositions[index],
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const adminCheck = await requireAdmin(request);
  if (!adminCheck.ok) {
    return NextResponse.json(
      { error: adminCheck.error },
      { status: adminCheck.status },
    );
  }

  try {
    const body = await request.json();
    const { id } = body || {};

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Invalid proposition id." },
        { status: 400 },
      );
    }

    const propositions = await readPropositions();
    const nextPropositions = propositions.filter((prop) => prop.id !== id);

    if (nextPropositions.length === propositions.length) {
      return NextResponse.json(
        { error: "Proposition not found." },
        { status: 404 },
      );
    }

    await writePropositions(nextPropositions);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
