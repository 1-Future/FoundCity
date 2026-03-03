/**
 * Staircase handlers.
 * Climb-up / Climb-down staircases.
 *
 * Common staircase IDs: 2718 (up), 2719 (down), 2715 (up), 2716 (down).
 */
import Player from '#/engine/entity/Player.js';
import ScriptProvider, { ScriptContext } from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import { messageGame } from '#/network/server/ServerMessages.js';

// Staircases — Climb-up (Op1)
const STAIRCASE_UP_IDS = [2718, 2715];

// Staircases — Climb-down (Op1)
const STAIRCASE_DOWN_IDS = [2719, 2716];

for (const stairId of STAIRCASE_UP_IDS) {
    ScriptProvider.register(ServerTriggerType.OPLOC1, stairId, (ctx: ScriptContext) => {
        const player = ctx.self as Player;
        if (player.level >= 3) {
            messageGame(player, 'You can\'t go up any further.');
            return;
        }
        player.teleport(player.x, player.z, player.level + 1);
        messageGame(player, 'You climb up the stairs.');
    });
}

for (const stairId of STAIRCASE_DOWN_IDS) {
    ScriptProvider.register(ServerTriggerType.OPLOC1, stairId, (ctx: ScriptContext) => {
        const player = ctx.self as Player;
        if (player.level <= 0) {
            messageGame(player, 'You can\'t go down any further.');
            return;
        }
        player.teleport(player.x, player.z, player.level - 1);
        messageGame(player, 'You climb down the stairs.');
    });
}

console.log('[Locs] Staircase handlers registered');
