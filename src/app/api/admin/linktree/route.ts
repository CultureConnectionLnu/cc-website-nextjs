import { NextResponse } from "next/server";
import { type NoParams, withAuth } from "@/lib/auth";
import { DataStore } from "@/lib/dataStore";
import z from "zod";

const Link = z.object({
    color: z.string().trim().min(1),
    text: z.string().trim().min(1),
    link: z.string().trim().min(1),
    textColor: z.string().trim().min(1),
    isEnabled: z.boolean(),
})

const Linktree = z.array(Link)

const linktreeFile = new DataStore("linktree.json", Linktree, [])

export const GET = withAuth<NoParams>(
	{ roles: ["admin", "committee"] },
	async (_req, _ctx, _user) => {
		try {
			const links = await linktreeFile.read();
			return NextResponse.json(links);
		} catch (error) {
			return NextResponse.json(
				{ error: "Failed to fetch links" },
				{ status: 500 },
			);
		}
	},
);

export const PUT = withAuth<NoParams>(
	{ roles: ["admin"] },
	async (req, _ctx, _user) => {
		try {
			const newLinksData = Linktree.parse(await req.json());
			await linktreeFile.write(newLinksData);
			return NextResponse.json(newLinksData);
        } catch (error: any) {
            console.error("Error updating links:", error);
    		if (error instanceof z.ZodError) {
    			return NextResponse.json(
    				{ error: "Invalid request body" },
    				{ status: 400 },
    			);
    		}
			return NextResponse.json(
				{ error: "Failed to update links" },
				{ status: 500 },
			);
		}
	},
);
