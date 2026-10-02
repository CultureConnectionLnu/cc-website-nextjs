import CryptoJS from "crypto-js";

const SECRET_KEY =
	process.env.NEXT_PUBLIC_GAME_SECRET || "my-fallback-secret-key-123";

export function encryptScore(score) {
	const payload = JSON.stringify({
		s: score,
		t: Date.now(),
		salt: Math.random().toString(36).substring(7),
	});

	return CryptoJS.AES.encrypt(payload, SECRET_KEY).toString();
}

export function decryptScore(encryptedString) {
	try {
		const bytes = CryptoJS.AES.decrypt(encryptedString, SECRET_KEY);
		const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
		return decryptedData;
    } catch (e) {
        console.error("Failed to decrypt score:", e);
		return null;
	}
}
