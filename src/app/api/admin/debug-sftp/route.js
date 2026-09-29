// src/app/api/admin/debug-sftp/route.js
import { NextResponse } from "next/server";
import SftpClient from "ssh2-sftp-client";

export async function GET() {
  const host = process.env.ONE_COM_SFTP_HOST;
  const user = process.env.ONE_COM_SFTP_USERNAME;
  const pass = process.env.ONE_COM_SFTP_PASSWORD;
  const path = process.env.ONE_COM_SFTP_REMOTE_PATH;

  // 1. Check if variables exist
  if (!host || !user || !pass || !path) {
    return NextResponse.json({
      status: "Configuration Missing",
      details: {
        hasHost: !!host,
        hasUser: !!user,
        hasPass: !!pass, // If this is false, your server doesn't have the .env file!
        hasPath: !!path,
      },
    });
  }

  // 2. Try to Connect
  const client = new SftpClient();
  try {
    await client.connect({
      host: process.env.ONE_COM_SFTP_HOST,
      port: 22,
      username: process.env.ONE_COM_SFTP_USERNAME,
      password: process.env.ONE_COM_SFTP_PASSWORD,
      readyTimeout: 10000,
    });
    const list = await client.list(
      "/customers/b/8/9/cultureconnection.se/httpd.www/public_images",
    );
    await client.end();

    return NextResponse.json({
      status: "Success",
      message: `Connected! Found ${list.length} files.`,
      pathUsed: path,
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "Connection Failed",
        error: err.message,
        code: err.code || "UNKNOWN",
        // This will help us identify if it's a password or network issue
      },
      { status: 500 },
    );
  }
}
