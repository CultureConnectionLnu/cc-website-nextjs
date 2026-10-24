import { promises as fs } from "fs";
import path from "path";

export default async function handler(req, res) {
	try {
		const jsonDirectory = path.join(process.cwd(), "public", "data");
		const filePath = path.join(jsonDirectory, "sponsors.json");

		const fileContents = await fs.readFile(filePath, "utf8");
		const data = JSON.parse(fileContents);
		res.status(200).json(data);
	} catch (error) {
		console.error("API Error reading sponsors.json:", error);
		if (error.code === "ENOENT") {
			res.status(404).json({ error: "Sponsors data file not found." });
		} else {
			res.status(500).json({ error: "Failed to load sponsors data." });
		}
	}
}
