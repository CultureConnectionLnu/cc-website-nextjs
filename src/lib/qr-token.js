import { createHmac } from "crypto";

const SECRET =
	process.env.CLERK_SECRET_KEY || "fallback_secret_do_not_use_in_prod";

export function generateQrUrl(badgeId, isStatic = false) {
	// For static badges, we can use a fixed timestamp (0) or the current time.
	// Using current time is fine, we just won't enforce it on verification.
	const ts = Date.now().toString();

	// Create a signature: Hash(badgeId + timestamp + SECRET)
	const signature = createHmac("sha256", SECRET)
		.update(`${badgeId}:${ts}`)
		.digest("hex");

	// Return the full relative URL
	return `/claim?badgeId=${badgeId}&ts=${ts}&sig=${signature}`;
}

export function verifyQrSignature(badgeId, ts, sig) {
	const expectedSig = createHmac("sha256", SECRET)
		.update(`${badgeId}:${ts}`)
		.digest("hex");

	return sig === expectedSig;
}
