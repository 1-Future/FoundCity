/**
 * Friend server — manages friend/ignore lists and online status tracking.
 *
 * Simplified from lostcity-ref: in-process instead of separate WebSocket service.
 * All friend operations run directly through World and Player objects.
 *
 * For production: extract to separate service for multi-world support.
 */

import Player from '#/engine/entity/Player.js';
import World from '#/engine/World.js';

/**
 * Check if a player is online and return their world.
 * Returns -1 if offline.
 */
export function getOnlineStatus(username: string): number {
    const player = World.getPlayerByUsername(username);
    if (player) return 1; // world 1 (single-world for now)
    return -1;
}

/**
 * Send the initial friend list status to a player on login.
 */
export function sendFriendList(player: Player): void {
    const statusList: { username: string; world: number }[] = [];
    for (const hash of player.friendList) {
        // find username from hash — for now, scan online players
        for (const other of World.shared.players) {
            if (other && other.hash64 === hash) {
                statusList.push({ username: other.username, world: 1 });
                break;
            }
        }
    }

    player.write({
        type: 'friend_list',
        friends: statusList,
    });
}

/**
 * Notify all friends of a player that they have come online.
 */
export function broadcastLogin(player: Player): void {
    for (const other of World.shared.players) {
        if (!other || other.pid === player.pid) continue;
        if (other.friendList.includes(player.hash64)) {
            other.write({
                type: 'friend_status',
                username: player.username,
                world: 1,
            });
        }
    }
}

/**
 * Notify all friends of a player that they have gone offline.
 */
export function broadcastLogout(player: Player): void {
    for (const other of World.shared.players) {
        if (!other || other.pid === player.pid) continue;
        if (other.friendList.includes(player.hash64)) {
            other.write({
                type: 'friend_status',
                username: player.username,
                world: 0, // 0 = offline
            });
        }
    }
}
