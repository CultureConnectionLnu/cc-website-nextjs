import { withAuth } from "@/lib/auth";
import { DataStore } from "@/lib/dataStore";
import { NextResponse } from "next/server";
import z from "zod";

type GuidelineSection = {
    id: string;
    title: string;
    content: string;
    children?: GuidelineSection[] | undefined;
};

const GuidelineSection: z.ZodType<GuidelineSection> = z.object({
    id: z.string().trim().min(1),
    title: z.string().trim().min(1),
    content: z.string().default("<p></p>"),
    children: z.lazy(() => z.array(GuidelineSection).optional()),
});

const Guidelines = z.array(GuidelineSection);

const guidelinesFile = new DataStore("guidelines.json", Guidelines, []);

export const GET = withAuth(
    { roles: ["admin", "committee"] },
    async (req, _ctx, user) => {
        try {
            const guidelines = await guidelinesFile.read();
            return NextResponse.json(guidelines);
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return NextResponse.json(
                    { error: "Invalid request body" },
                    { status: 400 },
                );
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
    },
);

export const POST = withAuth({ roles: ["admin"] }, async (req, _ctx, user) => {
    try {
        const updatedGuidelinesData = await req.json();
        const parsedGuidelines = Guidelines.parse(updatedGuidelinesData);
        await guidelinesFile.write(parsedGuidelines);
        return NextResponse.json(parsedGuidelines);
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