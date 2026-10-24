import { auth, clerkClient, type User } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";

export const Role = {
	admin: "admin",
	committee: "committee",
	member: "member",
} as const;
export type Role = (typeof Role)[keyof typeof Role];
export type PublicMetadata = Readonly<Record<string, unknown>>;

export interface AuthUser {
	userId: string;
	sessionId: string | null;
	roles: readonly Role[];
	publicMetadata: PublicMetadata;
	clerkUser: User;
}

export async function requireUser(): Promise<AuthUser> {
	const { userId, sessionId } = await auth();

	if (!userId) throw new AuthError(401, "Unauthorized");

	const clerkUser = await (await clerkClient()).users.getUser(userId);
	const publicMetadata = (clerkUser.publicMetadata ?? {}) as PublicMetadata;
	const roles = Object.values(Role).filter(
		(role) => publicMetadata[role] === true,
	);

	return {
		userId,
		sessionId: sessionId,
		roles,
		publicMetadata,
		clerkUser,
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
	if (requiredRoles.length === 0) {
		throw new AuthError(
			403,
			"Server error: No roles specified for authorization check.",
		);
	}
	const mode = options?.mode ?? "any";

	const allowed =
		mode === "any"
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
	readonly status: 401 | 403;
	constructor(status: 401 | 403, message: string) {
		super(message);
		this.name = "AuthError";
		this.status = status;
	}

	response() {
		const code = this.status === 401 ? "Unauthorized" : "Forbidden";
		return NextResponse.json(
			{ error: { code, message: this.message } },
			{ status: this.status },
		);
	}
}

export type AuthenticatedHandler<P = Record<string, string>> = (
	request: NextRequest,
	context: Context<P>,
	user: AuthUser,
) => Promise<Response>;

type AuthOptions = {
	mode?: "all" | "any";
	roles: Role | readonly Role[];
};

export type Context<P = Record<string, string>> = {
	params: Promise<P>;
};

export function withAuth<P>(
	optionsOrHandler: AuthOptions | AuthenticatedHandler<P>,
	maybeHandler?: AuthenticatedHandler<P>,
) {
	const options =
		typeof optionsOrHandler === "function" ? null : optionsOrHandler;
	const handler =
		typeof optionsOrHandler === "function" ? optionsOrHandler : maybeHandler;

	if (!handler) {
		throw new TypeError("Handler function is required");
	}

	return async (req: NextRequest, ctx: Context<P>) => {
		try {
			const user = options
				? await requireRole(options?.roles, { mode: options.mode ?? "any" })
				: await requireUser();
			return await handler(req, ctx, user);
		} catch (error) {
			if (error instanceof AuthError) {
				return error.response();
			}
			throw error;
		}
	};
}
