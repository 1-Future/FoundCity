import { WorldStat } from '#/engine/WorldStat.js';
import World from '#/engine/World.js';

/**
 * Simple metrics collection. Tracks game loop performance and player counts.
 *
 * Replaces lostcity-ref's Prometheus-based Metrics.ts with a lightweight
 * approach suitable for JSON exposure via HTTP or WebSocket.
 */
export default class Metrics {
    private static interval: ReturnType<typeof setInterval> | null = null;

    static start(reportIntervalMs: number = 60000): void {
        Metrics.interval = setInterval(() => Metrics.report(), reportIntervalMs);
        console.log(`[Metrics] Started (reporting every ${reportIntervalMs / 1000}s)`);
    }

    static stop(): void {
        if (Metrics.interval) {
            clearInterval(Metrics.interval);
            Metrics.interval = null;
        }
    }

    static report(): void {
        const stats = World.cycleStats;
        const world = World.shared;

        console.log(
            `[Metrics] tick=${World.currentTick} ` +
            `players=${world.players.count} ` +
            `npcs=${world.npcs.count} ` +
            `cycle=${stats[WorldStat.CYCLE]}ms ` +
            `(world=${stats[WorldStat.WORLD]} ` +
            `clientIn=${stats[WorldStat.CLIENT_IN]} ` +
            `npc=${stats[WorldStat.NPC]} ` +
            `player=${stats[WorldStat.PLAYER]} ` +
            `logout=${stats[WorldStat.LOGOUT]} ` +
            `login=${stats[WorldStat.LOGIN]} ` +
            `zone=${stats[WorldStat.ZONE]} ` +
            `clientOut=${stats[WorldStat.CLIENT_OUT]} ` +
            `cleanup=${stats[WorldStat.CLEANUP]})`
        );
    }

    static snapshot(): MetricsSnapshot {
        const stats = World.cycleStats;
        const world = World.shared;

        return {
            tick: World.currentTick,
            playerCount: world.players.count,
            npcCount: world.npcs.count,
            cycleMs: stats[WorldStat.CYCLE],
            worldMs: stats[WorldStat.WORLD],
            clientInMs: stats[WorldStat.CLIENT_IN],
            npcMs: stats[WorldStat.NPC],
            playerMs: stats[WorldStat.PLAYER],
            logoutMs: stats[WorldStat.LOGOUT],
            loginMs: stats[WorldStat.LOGIN],
            zoneMs: stats[WorldStat.ZONE],
            clientOutMs: stats[WorldStat.CLIENT_OUT],
            cleanupMs: stats[WorldStat.CLEANUP],
        };
    }
}

export interface MetricsSnapshot {
    tick: number;
    playerCount: number;
    npcCount: number;
    cycleMs: number;
    worldMs: number;
    clientInMs: number;
    npcMs: number;
    playerMs: number;
    logoutMs: number;
    loginMs: number;
    zoneMs: number;
    clientOutMs: number;
    cleanupMs: number;
}
