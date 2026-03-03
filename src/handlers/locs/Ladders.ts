/**
 * Ladder handlers.
 * Climb-up / Climb-down / Climb (bidirectional).
 *
 * Ladder IDs from configs:
 * - 2884: Climb / Climb-up / Climb-down (bidirectional)
 * - 3028, 3030: Climb-up
 * - 3029, 3031: Climb-down
 * - 3205: Climb-down
 */
import Player from '#/engine/entity/Player.js';
import ScriptProvider, { ScriptContext } from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import { messageGame } from '#/network/server/ServerMessages.js';

// Bidirectional ladders — Op1: Climb, Op2: Climb-up, Op3: Climb-down
const LADDER_BIDIRECTIONAL = 2884;

// Climb-up only (Op1)
const LADDER_UP_IDS = [3028, 3030];

// Climb-down only (Op1)
const LADDER_DOWN_IDS = [3029, 3031, 3205];

function climbUp(player: Player): void {
    if (player.level >= 3) {
        messageGame(player, 'You can\'t go up any further.');
        return;
    }
    player.teleport(player.x, player.z, player.level + 1);
    messageGame(player, 'You climb up the ladder.');
}

function climbDown(player: Player): void {
    if (player.level <= 0) {
        messageGame(player, 'You can\'t go down any further.');
        return;
    }
    player.teleport(player.x, player.z, player.level - 1);
    messageGame(player, 'You climb down the ladder.');
}

// Bidirectional: Op1=Climb (up), Op2=Climb-up, Op3=Climb-down
ScriptProvider.register(ServerTriggerType.OPLOC1, LADDER_BIDIRECTIONAL, (ctx: ScriptContext) => {
    climbUp(ctx.self as Player);
});

ScriptProvider.register(ServerTriggerType.OPLOC2, LADDER_BIDIRECTIONAL, (ctx: ScriptContext) => {
    climbUp(ctx.self as Player);
});

ScriptProvider.register(ServerTriggerType.OPLOC3, LADDER_BIDIRECTIONAL, (ctx: ScriptContext) => {
    climbDown(ctx.self as Player);
});

// Climb-up ladders
for (const ladderId of LADDER_UP_IDS) {
    ScriptProvider.register(ServerTriggerType.OPLOC1, ladderId, (ctx: ScriptContext) => {
        climbUp(ctx.self as Player);
    });
}

// Climb-down ladders
for (const ladderId of LADDER_DOWN_IDS) {
    ScriptProvider.register(ServerTriggerType.OPLOC1, ladderId, (ctx: ScriptContext) => {
        climbDown(ctx.self as Player);
    });
}

console.log('[Locs] Ladder handlers registered');
