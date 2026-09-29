import fs from "node:fs";
import { spawn } from "node:child_process";

const RAILWAY_DATA_DIR = "/app/data";
const data_dir =
    process.env.DATA_DIR !== undefined
        ? process.env.DATA_DIR
        : RAILWAY_DATA_DIR;

function read_latest_backup_time() {
    const tzpath = `${data_dir}/.timezone`;
    try {
        const datestring = fs.readFileSync(tzpath, "utf8").trim();
        return Date.parse(datestring);
    } catch (err) {
        // TODO
        return 0;
    }
}

const SECONDS = 1000;
const MINUTES = SECONDS * 60;
const HOURS = MINUTES * 60;
const BACKUP_INTERVAL = 24 * HOURS;

export function check_backup() {
    const latest_backup = read_latest_backup_time();
    const current = Date.now();

    const timeSinceBackupHours = Math.abs(current - latest_backup);
    console.log(`Time since last backup: ${timeSinceBackupHours} hours, current ${current}, latest ${latest_backup}`);
    if (timeSinceBackupHours > BACKUP_INTERVAL) {
        console.log(
            `Last backup was ${timeSinceBackupHours} hours ago. Running backup script...`,
        );
        run_backup();
    }
}

function run_backup() {
    const script_path = `${data_dir}/../scripts/backup.bash`;
    const backup = spawn("bash", [script_path]);
    backup.stdout.on("data", (data) =>
        console.log(`stdout from backup script: ${data}`),
    );
    backup.on("exit", (code) => {
        console.log(`Backup script exited with code ${code}`);
    });
}

check_backup();
