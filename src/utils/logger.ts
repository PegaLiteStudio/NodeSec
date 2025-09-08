import fs from "fs";
import path from "path";
import { getPreferredTime } from "./time";

/**
 * Writes a log line into data/logs/{deviceID}.log
 */
export const writeDeviceLog = (deviceID: string, log: string, time: string = getPreferredTime()) => {
    const logsDir = path.join(__dirname, "../../data/agent-logs");
    const logFile = path.join(logsDir, `${deviceID}.log`);

    // Ensure logs directory exists
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }

    const logLine = `[${time}] ${log}\n`;
    fs.appendFileSync(logFile, logLine, "utf8");

    // Trim file if too many lines
    const logs = fs.readFileSync(logFile, "utf8").split("\n").filter(Boolean);
    if (logs.length > 400) {
        const trimmed = logs.slice(-200).join("\n") + "\n";
        fs.writeFileSync(logFile, trimmed, "utf8");
    }

    io.emit("newLog-" + deviceID, logLine);
};

/**
 * Reads last 200 logs from data/logs/{deviceID}.log
 */
export const readDeviceLog = (deviceID: string): string => {
    const logsDir = path.join(__dirname, "../../data/agent-logs");
    const logFile = path.join(logsDir, `${deviceID}.log`);

    if (!fs.existsSync(logFile)) {
        return ""; // return empty if no logs yet
    }

    const logs = fs.readFileSync(logFile, "utf8").split("\n").filter(Boolean);
    return logs.slice(-200).join("\n");
};
