/**
 * Login server — handles authentication and player data loading.
 *
 * Simplified from lostcity-ref: no bcrypt, no database, no worker threads.
 * Uses JSON file saves and simple username-based auth for development.
 *
 * For production: add bcrypt password hashing, database-backed accounts,
 * rate limiting, and IP bans.
 */

import { WebSocket } from 'ws';

import NetworkPlayer from '#/engine/entity/NetworkPlayer.js';
import PlayerLoading from '#/engine/entity/PlayerLoading.js';
import World from '#/engine/World.js';
import Environment from '#/util/Environment.js';
import { LoginResponse, loginResponseText } from '#/server/login/Messages.js';

// rate limiting: track login attempts per IP
const loginAttempts: Map<string, { count: number; resetAt: number }> = new Map();
const MAX_ATTEMPTS_PER_WINDOW = 5;
const WINDOW_MS = 5000;

// prevent duplicate login processing
const pendingLogins: Set<string> = new Set();

export function processLogin(ws: WebSocket, username: string, _password: string, ip: string): LoginResponse {
    const normalizedUsername = username.toLowerCase().trim();

    if (!normalizedUsername || normalizedUsername.length < 1 || normalizedUsername.length > 12) {
        return LoginResponse.INVALID_CREDENTIALS;
    }

    // validate username characters (alphanumeric + spaces + underscores)
    if (!/^[a-z0-9_ ]+$/i.test(normalizedUsername)) {
        return LoginResponse.INVALID_CREDENTIALS;
    }

    // rate limiting
    const now = Date.now();
    const attempts = loginAttempts.get(ip);
    if (attempts) {
        if (now < attempts.resetAt) {
            if (attempts.count >= MAX_ATTEMPTS_PER_WINDOW) {
                return LoginResponse.RATE_LIMITED;
            }
            attempts.count++;
        } else {
            attempts.count = 1;
            attempts.resetAt = now + WINDOW_MS;
        }
    } else {
        loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    }

    // prevent duplicate logins being processed simultaneously
    if (pendingLogins.has(normalizedUsername)) {
        return LoginResponse.ALREADY_LOGGED_IN;
    }

    // check if already logged in
    const existing = World.getPlayerByUsername(normalizedUsername);
    if (existing) {
        return LoginResponse.ALREADY_LOGGED_IN;
    }

    // check capacity
    if (World.shared.players.count >= Environment.NODE_MAX_PLAYERS) {
        return LoginResponse.SERVER_FULL;
    }

    // create player
    pendingLogins.add(normalizedUsername);
    try {
        const player = PlayerLoading.load(normalizedUsername, ws);
        World.shared.newPlayers.push(player);
        console.log(`[Login] ${normalizedUsername} authenticated from ${ip}`);
        return LoginResponse.SUCCESS;
    } catch (err) {
        console.error(`[Login] Error creating player ${normalizedUsername}:`, err);
        return LoginResponse.SERVER_ERROR;
    } finally {
        pendingLogins.delete(normalizedUsername);
    }
}

/**
 * Clean up stale rate limit entries periodically.
 */
export function cleanupRateLimits(): void {
    const now = Date.now();
    for (const [ip, attempts] of loginAttempts) {
        if (now >= attempts.resetAt) {
            loginAttempts.delete(ip);
        }
    }
}
