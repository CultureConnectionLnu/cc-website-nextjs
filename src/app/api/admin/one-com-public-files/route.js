import { createClerkClient } from "@clerk/clerk-sdk-node";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import SftpClient from "ssh2-sftp-client";

const initializeClerk = () => {
	const secretKey = process.env.CLERK_SECRET_KEY;
	if (!secretKey) throw new Error("Clerk Secret Key missing.");
	return createClerkClient({ secretKey });
};

async function checkUserPermission(
	request,
	allowedRoleKeys = ["admin", "committee"],
) {
	try {
		const { userId } = getAuth(request);
		if (!userId)
			return { authorized: false, error: "Auth context missing", status: 401 };
		const clerk = initializeClerk();
		const user = await clerk.users.getUser(userId);
		const hasPermission = allowedRoleKeys.some(
			(role) => user?.publicMetadata?.[role] === true,
		);
		if (!hasPermission)
			return { authorized: false, error: "Unauthorized", status: 403 };
		return { authorized: true, userId };
	} catch (error) {
		return {
			authorized: false,
			error: "Auth verification failed",
			status: 500,
		};
	}
}

const sftpConfig = {
	host: process.env.ONE_COM_SFTP_HOST,
	port: parseInt(process.env.ONE_COM_SFTP_PORT || "22", 10),
	username: process.env.ONE_COM_SFTP_USERNAME,
	password: process.env.ONE_COM_SFTP_PASSWORD,
	readyTimeout: 20000,
	retries: 2,
};

const baseRemotePath = process.env.ONE_COM_SFTP_REMOTE_PATH;
const publicBaseUrl = process.env.NEXT_PUBLIC_ONE_COM_PUBLIC_FILES_BASE_URL;

const joinPath = (...parts) => {
	return parts
		.map((part) => part || "")
		.join("/")
		.replace(/\/+/g, "/")
		.replace(/\/$/, "");
};

const getSafeRemotePath = (folderName) => {
	const safeFolder = folderName
		? folderName.replace(/[^a-zA-Z0-9_-]/g, "")
		: "";
	if (!safeFolder || safeFolder === "Root") return joinPath(baseRemotePath);
	return joinPath(baseRemotePath, safeFolder);
};

export async function GET(request) {
	const perm = await checkUserPermission(request, [
		"admin",
		"committee",
		"member",
	]);
	if (!perm.authorized)
		return NextResponse.json({ error: perm.error }, { status: perm.status });

	const { searchParams } = new URL(request.url);
	const requestedFolder = searchParams.get("folder") || "";
	const targetPath = getSafeRemotePath(requestedFolder);

	const sftp = new SftpClient();
	try {
		await sftp.connect(sftpConfig);

		const exists = await sftp.exists(targetPath);
		if (!exists) {
			return NextResponse.json({
				imageBaseUrl: publicBaseUrl,
				files: [],
				folders: [],
			});
		}

		const list = await sftp.list(targetPath);

		const files = list
			.filter(
				(item) =>
					item.type === "-" &&
					/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(item.name),
			)
			.map((item) => ({ name: item.name, size: item.size }));

		const folders = list
			.filter((item) => item.type === "d")
			.map((item) => item.name);

		return NextResponse.json({ imageBaseUrl: publicBaseUrl, files, folders });
	} catch (err) {
		return NextResponse.json({ error: err.message }, { status: 500 });
	} finally {
		if (sftp.client) await sftp.end();
	}
}

export async function POST(request) {
	const perm = await checkUserPermission(request, ["admin"]);
	if (!perm.authorized)
		return NextResponse.json({ error: perm.error }, { status: perm.status });

	const sftp = new SftpClient();
	try {
		await sftp.connect(sftpConfig);
		const formData = await request.formData();
		const action = formData.get("action");

		if (action === "create_folder") {
			const newFolderName = formData.get("new_folder_name");
			if (!newFolderName) throw new Error("New folder name is required");

			const safeNewName = newFolderName.replace(/[^a-zA-Z0-9_-]/g, "");
			const parentPath = getSafeRemotePath("");
			const newPath = joinPath(parentPath, safeNewName);

			const exists = await sftp.exists(newPath);
			if (exists) throw new Error("Folder already exists");

			await sftp.mkdir(newPath, true);
			return NextResponse.json({
				success: true,
				message: `Created category: ${safeNewName}`,
			});
		}

		const folderName = formData.get("folder") || "";
		const targetDir = getSafeRemotePath(folderName);

		const dirExists = await sftp.exists(targetDir);
		if (!dirExists) await sftp.mkdir(targetDir, true);

		const uploaded = [];
		for (const [key, file] of formData.entries()) {
			if (file instanceof File) {
				const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
				const finalName = `${Date.now()}_${safeName}`;

				const arrayBuffer = await file.arrayBuffer();
				const buffer = Buffer.from(arrayBuffer);

				const fullUploadPath = joinPath(targetDir, finalName);
				await sftp.put(buffer, fullUploadPath);
				uploaded.push(finalName);
			}
		}

		return NextResponse.json({
			success: true,
			message: `Uploaded ${uploaded.length} files.`,
		});
	} catch (err) {
		return NextResponse.json(
			{ error: `Upload Failed: ${err.message}` },
			{ status: 500 },
		);
	} finally {
		if (sftp.client) await sftp.end();
	}
}

export async function PUT(request) {
	const perm = await checkUserPermission(request, ["admin"]);
	if (!perm.authorized)
		return NextResponse.json({ error: perm.error }, { status: perm.status });

	const sftp = new SftpClient();
	try {
		const body = await request.json();
		const { fileName, currentFolder, targetFolder } = body;
		if (!fileName) throw new Error("File name is required");

		await sftp.connect(sftpConfig);

		const oldPathDir = getSafeRemotePath(currentFolder);
		const newPathDir = getSafeRemotePath(targetFolder);

		const oldFilePath = joinPath(oldPathDir, fileName);
		const newFilePath = joinPath(newPathDir, fileName);

		if (!(await sftp.exists(newPathDir))) await sftp.mkdir(newPathDir, true);
		await sftp.rename(oldFilePath, newFilePath);

		return NextResponse.json({
			success: true,
			message: `Moved to ${targetFolder || "Root"}`,
		});
	} catch (err) {
		return NextResponse.json({ error: err.message }, { status: 500 });
	} finally {
		if (sftp.client) await sftp.end();
	}
}

export async function DELETE(request) {
	const perm = await checkUserPermission(request, ["admin"]);
	if (!perm.authorized)
		return NextResponse.json({ error: perm.error }, { status: perm.status });

	const sftp = new SftpClient();
	try {
		const body = await request.json();
		const { fileName, folder } = body;
		if (!fileName) throw new Error("File name is required");

		await sftp.connect(sftpConfig);

		const folderPath = getSafeRemotePath(folder);
		const fullPath = joinPath(folderPath, fileName);

		await sftp.delete(fullPath);

		return NextResponse.json({ success: true, message: `Deleted ${fileName}` });
	} catch (err) {
		return NextResponse.json({ error: err.message }, { status: 500 });
	} finally {
		if (sftp.client) await sftp.end();
	}
}
