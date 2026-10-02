import { createHmac } from "crypto";

const SECRET = process.env.QR_JWT_SECRET || "fallback-secret";

// Compresses the token into a tiny string
export function generateShortToken(achievementId, isStatic) {
	// 1. Time Component (Seconds since epoch)
	// Static: 0
	// Dynamic: Current Time + 60 seconds (Short life)
	// CRITICAL FIX: Using seconds (not minutes) ensures the value changes
	// every single time this function runs, creating a constantly rotating QR pattern.
	const now = Math.floor(Date.now() / 1000);
	const expiry = isStatic ? 0 : now + 60;

	// 2. Data String
	const data = `${achievementId}|${expiry}`;

	// 3. Signature (First 12 chars for security)
	const signature = createHmac("sha256", SECRET)
		.update(data)
		.digest("hex")
		.substring(0, 12);

	// 4. Combine and Base64 Encode (URL Safe)
	return Buffer.from(`${data}|${signature}`).toString("base64url");
}

// Verifies and extracts the Achievement ID
export function verifyShortToken(token) {
	try {
		const decoded = Buffer.from(token, "base64url").toString("utf-8");
		const [achId, expiryStr, sig] = decoded.split("|");

		if (!achId || !expiryStr || !sig) return null;

		// 1. Re-create signature to check validity
		const expectedSig = createHmac("sha256", SECRET)
			.update(`${achId}|${expiryStr}`)
			.digest("hex")
			.substring(0, 12);

		if (sig !== expectedSig) return null; // Tampered

		// 2. Check Expiry (if not static)
		const expiry = parseInt(expiryStr, 10);
		if (expiry !== 0) {
			const now = Math.floor(Date.now() / 1000);
			// Give a small 5-second buffer for clock skew
			if (now > expiry + 5) return "expired";
		}

		return achId;
	} catch (e) {
		return null;
	}
}
