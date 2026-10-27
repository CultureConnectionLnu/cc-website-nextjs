import { promises as fsp } from "node:fs";
import fs from "node:fs"
import path from "node:path";
import type z from "zod";

export class DataStore<T> {
    store: string;
    schema: z.ZodType;
    fallback: T | undefined;

    constructor(storePath: string, schema: z.ZodType<T>, fallback?: T) {
        this.store = path.join(
        	process.cwd(),
        	"public",
        	"data",
            storePath,
        );
        this.schema = schema;
        this.fallback = fallback;
        if (!fs.existsSync(this.store) && fallback !== undefined) {
            this.write(fallback)
        }
    }

    async read(): Promise<T> {
        let fileContents: string;
        try {
            fileContents = await fsp.readFile(this.store, "utf8");
        } catch (error: any) {
            if (error.code === "ENOENT" && this.fallback !== undefined) {
                return this.fallback;
            }
            throw error;
        }
        const parsed = JSON.parse(fileContents);
        const { success, data, error } = this.schema.safeParse(parsed);
        if (!success) {
            console.error("Invalid data format:", error);
            throw new DataStoreError("Invalid data format in store file.");
        }
        return data as T;
    }

    async write(contents: T) {
        const { success, error } = this.schema.safeParse(contents);
        if (!success) {
            console.error("Invalid data format:", error);
            throw new DataStoreError("Invalid data format for store file.");
        }
        // write to a temporary file and rename since rename is atomic
        const tempPath = this.store + ".tmp"
        await fsp.writeFile(tempPath, JSON.stringify(contents, null, 2), "utf-8");
        await fsp.rename(tempPath, this.store)
    }
}

export class DataStoreError extends Error {
    constructor(message: string) {
        super(message);
    }
}