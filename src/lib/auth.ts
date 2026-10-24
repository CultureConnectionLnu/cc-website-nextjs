import { auth, clerkClient, getAuth } from "@clerk/nextjs/server";
import { stat } from "fs/promises";
import { handler } from "next/dist/server/route-modules/pages/builtin/_error";
import { NextRequest, NextResponse } from "next/server";

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

export type AuthenticatedHandler<P = Record<string, string>> = (
    request: NextRequest,
    response: NextResponse,
    user: AuthUser,
) => Promise<Response>;

type AuthOptions = {
    mode: "all" | "any",
    roles: Role | readonly Role[],
}

export function withAuth(
    optionsOrHandler: AuthOptions | AuthenticatedHandler,
    maybeHandler?: AuthenticatedHandler,
) {
    const options = typeof optionsOrHandler == "function" ? null : optionsOrHandler;
    const handler = typeof optionsOrHandler == "function" ? optionsOrHandler : maybeHandler;

    if (!handler) {
        throw new TypeError("Handler function is required");
    }

    return async (req: NextRequest, res: NextResponse) => {
        try {
            const user = options?.roles !== null
                ? await requireRole(options?.roles!)
                : await requireUser();
        } catch (error) {
            if (error instanceof AuthError) {
                return error.response();
            }
            throw error;
        }
    }
}
