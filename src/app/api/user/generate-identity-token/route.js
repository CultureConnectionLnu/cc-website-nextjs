import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

export async function GET(request) {
  const { userId } = getAuth(request);

  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ userIdentityString: userId });
}
