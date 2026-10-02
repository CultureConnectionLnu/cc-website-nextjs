// src/env.mjs
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
	server: {
		CLERK_SECRET_KEY: z.string().min(1),
		CLERK_WEBHOOK_SECRET: z.string().min(1),
		QR_JWT_SECRET: z.string().min(1),
		PICTURE_API_URL: z.string().url().optional(),
	},

	client: {
		// Clerk variables
		NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
		NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().min(1).optional(),
		NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().min(1).optional(),
		// Kept these from your original env.mjs, assuming they might still be used
		NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().min(1).optional(),
		NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().min(1).optional(),

		// Your custom variables
		NEXT_PUBLIC_FETCHPICTURE_URL: z.string().url(),
		NEXT_PUBLIC_FETCHTREELINK_URL: z.string().url(),
		NEXT_PUBLIC_GOOGLE_DRIVE_ROOT_FOLDER_ID: z.string().min(1),
		NEXT_PUBLIC_API_DISCORD_URL: z.string().url(),
		NEXT_PUBLIC_ONE_COM_PUBLIC_FILES_BASE_URL: z.string().url(),
	},

	/**
	 * You need to manually map these variables to `process.env`.
	 * Field is required for both server and client environments, even if
	 * the schema is specified in only one of the server or client configs.
	 *
	 * Due to how Next.js bundles environment variables on Edge and Client,
	 * we need to manually destructure them to make sure all are included in bundle.
	 *
	 * @link https://env.t3.gg/docs/nextjs# Verfügbarmachen von Umgebungsvariablen für die Runtime
	 */
	runtimeEnv: {
		// Server-side variables
		CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
		CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
		QR_JWT_SECRET: process.env.QR_JWT_SECRET,
		PICTURE_API_URL: process.env.PICTURE_API_URL,

		// Client-side variables
		NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
			process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
		NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
		NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
		NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL:
			process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
		NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL:
			process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL,
		NEXT_PUBLIC_FETCHPICTURE_URL: process.env.NEXT_PUBLIC_FETCHPICTURE_URL,
		NEXT_PUBLIC_FETCHTREELINK_URL: process.env.NEXT_PUBLIC_FETCHTREELINK_URL,
		NEXT_PUBLIC_GOOGLE_DRIVE_ROOT_FOLDER_ID:
			process.env.NEXT_PUBLIC_GOOGLE_DRIVE_ROOT_FOLDER_ID,
		NEXT_PUBLIC_API_DISCORD_URL: process.env.NEXT_PUBLIC_API_DISCORD_URL,
		NEXT_PUBLIC_ONE_COM_PUBLIC_FILES_BASE_URL:
			process.env.NEXT_PUBLIC_ONE_COM_PUBLIC_FILES_BASE_URL,
	},

	/**
	 * Whether to skip validation of environment variables.
	 * Useful in CI environments or when you don't need runtime validation.
	 * @default false
	 */
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,

	/**
	 * Makes it so that empty strings are treated as undefined.
	 * `SOME_VAR: z.string()` and `SOME_VAR=''` will throw an error.
	 * `SOME_VAR: z.string().optional()` and `SOME_VAR=''` will be undefined.
	 * @default false
	 */
	emptyStringAsUndefined: true,
});
