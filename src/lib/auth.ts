import { auth, clerkClient, getAuth } from "@clerk/nextjs/server";
import { stat } from "fs/promises";
import { NextResponse } from "next/server";

const Role = ["admin", "committee", "member"] as const;
export type Role = (typeof Role)[keyof typeof Role];
export type PublicMetadata = Readonly<Record<string, unknown>>;

export interface AuthUser {
    userId: string;
    sessionId: string | null;
    roles: readonly Role[];
    publicMetadata: Record<string, any>;
}

export async function requireUser(): Promise<AuthUser> {
    const { userId, sessionId } = await auth();

    if (!userId) throw new AuthError(401, "Unauthorized");

    const clerkUser = await (await clerkClient()).users.getUser(userId);
    const publicMetadata = (clerkUser.publicMetadata ?? {}) as PublicMetadata;
    const roles = Role.filter((role) => publicMetadata[role] == true);

    return {
        userId,
        sessionId: sessionId ?? null,
        roles,
        publicMetadata,
    };
}

export async function requireRole(
    required: Role | readonly Role[],
    options?: {
        mode?: "any" | "all";
        user?: AuthUser;
    },
): Promise<AuthUser> {
    const user = options?.user ?? (await requireUser());
    const requiredRoles: readonly Role[] = Array.isArray(required)
        ? required
        : [required];
    const mode = options?.mode ?? "any";

    const allowed =
        mode == "any"
            ? requiredRoles.some((role) => user.roles.includes(role))
            : requiredRoles.every((role) => user.roles.includes(role));

    if (!allowed) {
        throw new AuthError(
            403,
            `Forbidden: requires ${mode} of [${requiredRoles.join(", ")}]`,
        );
    }

    return user;
}

export class AuthError extends Error {
    readonly status: number = 401 | 403;
    constructor(status: 401 | 403, message: string) {
        super(message);
        this.name = "AuthError";
        this.status = status;
    }

    response() {
        const code = this.status == 401 ? "Unauthorized" : "Forbidden";
        return NextResponse.json(
            { error: { code, message: this.message } },
            { status: this.status },
        );
    }
}
