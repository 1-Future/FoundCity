/**
 * Logger server — handles game event logging and telemetry.
 *
 * Simplified from lostcity-ref: in-process instead of separate WebSocket service.
 * Writes to console and optionally to log files.
 *
 * For production: extract to separate service with database persistence,
 * structured logging, and log rotation.
 */

import fs from 'fs';
import path from 'path';

import { LoggerEventType } from '#/server/LoggerEventType.js';
import { WealthEventType } from '#/server/WealthEventType.js';

const LOG_DIR = 'data/logs';

export interface SessionLogEntry {
    accountId: number;
    world: number;
    sessionUuid: string;
    timestamp: number;
    coord: number;
    event: string;
    eventType: LoggerEventType;
}

export interface WealthLogEntry {
    world: number;
    timestamp: number;
    eventType: WealthEventType;
    senderUsername: string;
    senderItems: string; // JSON
    senderValue: number;
    recipientUsername: string | null;
    recipientItems: string | null;
    recipientValue: number | null;
}

export interface ReportLogEntry {
    reporterUsername: string;
    offenderUsername: string;
    reason: number;
    coord: number;
    timestamp: number;
}

let sessionBuffer: SessionLogEntry[] = [];
let wealthBuffer: WealthLogEntry[] = [];
const FLUSH_INTERVAL = 60_000; // flush logs every 60 seconds

/**
 * Initialize the logger. Sets up log directory and flush timer.
 */
export function initLogger(): void {
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    }

    setInterval(flushLogs, FLUSH_INTERVAL);
    console.log('[Logger] Initialized');
}

/**
 * Log a session event.
 */
export function logSessionEvent(entry: SessionLogEntry): void {
    sessionBuffer.push(entry);
}

/**
 * Log a wealth event.
 */
export function logWealthEvent(entry: WealthLogEntry): void {
    wealthBuffer.push(entry);
}

/**
 * Log a player report.
 */
export function logReport(entry: ReportLogEntry): void {
    const line = `[${new Date(entry.timestamp).toISOString()}] ${entry.reporterUsername} reported ${entry.offenderUsername} reason=${entry.reason} coord=${entry.coord}`;
    console.log(`[Report] ${line}`);
    appendToLog('reports.log', line);
}

/**
 * Flush accumulated logs to disk.
 */
export function flushLogs(): void {
    if (sessionBuffer.length > 0) {
        const lines = sessionBuffer.map(e =>
            `${new Date(e.timestamp).toISOString()}\t${e.event}\ttype=${e.eventType}\tcoord=${e.coord}`
        );
        appendToLog('sessions.log', lines.join('\n'));
        sessionBuffer = [];
    }

    if (wealthBuffer.length > 0) {
        const lines = wealthBuffer.map(e =>
            `${new Date(e.timestamp).toISOString()}\t${e.senderUsername}\ttype=${e.eventType}\tvalue=${e.senderValue}`
        );
        appendToLog('wealth.log', lines.join('\n'));
        wealthBuffer = [];
    }
}

function appendToLog(filename: string, content: string): void {
    try {
        const filePath = path.join(LOG_DIR, filename);
        fs.appendFileSync(filePath, content + '\n');
    } catch (err) {
        console.error(`[Logger] Failed to write ${filename}:`, err);
    }
}
