import fs from "node:fs";
import { spawn, spawnSync } from "node:child_process";

const RAILWAY_DATA_DIR = "/app/data";
const data_dir =
    process.env.DATA_DIR !== undefined
        ? process.env.DATA_DIR
        : RAILWAY_DATA_DIR;
const TZ_PATH = `${data_dir}/.timezone`;

function read_latest_backup_time() {
    try {
        const datestring = fs.readFileSync(TZ_PATH, "utf8").trim();
        return Date.parse(datestring);
    } catch (err) {
        // if the date fails to parse or open, give it the oldest possible time
        // to guarantee a backup happens even if the tz file doesn't exist
        return 0;
    }
}

function write_latest_backup_time(backup_time) {
    const current = new Date().toISOString();
    try {
        fs.writeFileSync(TZ_PATH, current);
    } catch {
        console.error("Failed to write latest backup time");
    }
}

const SECONDS = 1000;
const MINUTES = SECONDS * 60;
const HOURS = MINUTES * 60;
const BACKUP_INTERVAL = 24 * HOURS;

export function check_backup() {
    const latest_backup = read_latest_backup_time();
    const current = Date.now();

    const timeSinceBackup = Math.abs(current - latest_backup);
    console.log(
        `Time since last backup: ${Math.floor(timeSinceBackup / HOURS)} hours ${Math.floor(timeSinceBackup / MINUTES)} minutes, current ${current}, latest ${latest_backup}`,
    );
    if (timeSinceBackup > BACKUP_INTERVAL) {
        console.log(
            `Last backup was ${timeSinceBackupHours} hours ago. Running backup script...`,
        );
        run_backup();
    }
}

function run_backup() {
    const script_path = `${data_dir}/../scripts/backup.bash`;
    const current = new Date().toISOString();
    const backup = spawnSync("bash", [script_path]);
    if (backup.stdout) {
        console.log(`Backup script output: ${backup.stdout.toString()}`);
    }

    if (backup.error) {
        console.error(`Error running backup script: ${backup.error}`);
    }
    write_latest_backup_time(current);
}
check_backup();
