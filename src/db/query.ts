/**
 * Database access layer.
 *
 * Simplified from lostcity-ref — uses JSON file storage for player saves
 * and in-memory maps for session data. No external database dependency.
 *
 * For production, replace with better-sqlite3 or another DB.
 */

import fs from 'fs';
import path from 'path';

const SAVES_DIR = 'data/saves';

export function ensureSavesDir(): void {
    if (!fs.existsSync(SAVES_DIR)) {
        fs.mkdirSync(SAVES_DIR, { recursive: true });
    }
}

export function loadPlayerSave(username: string): Buffer | null {
    const safeName = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const filePath = path.join(SAVES_DIR, `${safeName}.json`);
    if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath);
    }
    return null;
}

export function savePlayerData(username: string, data: Uint8Array): void {
    ensureSavesDir();
    const safeName = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const filePath = path.join(SAVES_DIR, `${safeName}.json`);
    fs.writeFileSync(filePath, data);
}

export function deletePlayerSave(username: string): void {
    const safeName = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const filePath = path.join(SAVES_DIR, `${safeName}.json`);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}

export function listPlayerSaves(): string[] {
    ensureSavesDir();
    return fs.readdirSync(SAVES_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''));
}

export function toDbDate(date: Date): string {
    return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
}
