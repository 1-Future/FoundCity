import fs from 'fs';
import path from 'path';

import Player, { getLevelByExp } from '#/engine/entity/Player.js';
import NetworkPlayer from '#/engine/entity/NetworkPlayer.js';
import { PlayerStat } from '#/engine/entity/PlayerStat.js';
import World from '#/engine/World.js';
import { WebSocket } from 'ws';

/**
 * Loads or creates a player from their save file.
 *
 * Save format: JSON file in data/saves/{username}.json
 */
export default class PlayerLoading {
    static readonly SAVE_DIR = 'data/saves';

    /**
     * Load a player from disk, or create a new one.
     * Returns the player ready for World.newPlayers queue.
     */
    static load(username: string, client: WebSocket): NetworkPlayer {
        const player = new NetworkPlayer(client, username);

        const savePath = path.join(PlayerLoading.SAVE_DIR, `${username}.json`);
        if (fs.existsSync(savePath)) {
            try {
                const raw = fs.readFileSync(savePath);
                player.load(raw);
                console.log(`[PlayerLoading] Loaded save for ${username}`);
            } catch (err) {
                console.error(`[PlayerLoading] Failed to load save for ${username}:`, err);
                PlayerLoading.initNewPlayer(player);
            }
        } else {
            PlayerLoading.initNewPlayer(player);
        }

        // derive base levels from exp
        for (let stat = 0; stat < Player.STAT_COUNT; stat++) {
            const level = getLevelByExp(player.stats[stat]);
            player.baseLevels[stat] = level;
            if (player.levels[stat] === 0) {
                player.levels[stat] = level;
            }
        }

        player.updateCombatLevel();
        player.lastResponse = World.currentTick;

        return player;
    }

    /**
     * Initialize a brand new player with default stats and position.
     */
    static initNewPlayer(player: Player): void {
        player.x = 3200;
        player.z = 3200;
        player.level = 0;

        // default stats: all level 1 except hitpoints (10)
        for (let stat = 0; stat < Player.STAT_COUNT; stat++) {
            if (stat === PlayerStat.HITPOINTS) {
                player.baseLevels[stat] = 10;
                player.levels[stat] = 10;
                player.stats[stat] = 11540; // XP for level 10
            } else {
                player.baseLevels[stat] = 1;
                player.levels[stat] = 1;
                player.stats[stat] = 0;
            }
        }
    }

    /**
     * Save a player to disk.
     */
    static save(player: Player): void {
        const savePath = path.join(PlayerLoading.SAVE_DIR, `${player.username}.json`);

        try {
            if (!fs.existsSync(PlayerLoading.SAVE_DIR)) {
                fs.mkdirSync(PlayerLoading.SAVE_DIR, { recursive: true });
            }

            const raw = player.save();
            fs.writeFileSync(savePath, raw);
            console.log(`[PlayerLoading] Saved ${player.username}`);
        } catch (err) {
            console.error(`[PlayerLoading] Failed to save ${player.username}:`, err);
        }
    }
}
