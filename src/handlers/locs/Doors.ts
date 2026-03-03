/**
 * Generic door handlers.
 * OPLOC1 (Open) — opens a closed door.
 *
 * RS225 door IDs: 1530, 1531, 1533, 1534, 1591, 1595, 2025, 2112, 2309, 2534, 2535, 2712, 2997
 * Each open door has a corresponding closed door (usually +1 or -1 ID).
 *
 * For now, we handle "Open" by sending a message — full door state
 * tracking requires zone loc replacement which needs collision updates.
 */
import Player from '#/engine/entity/Player.js';
import ScriptProvider, { ScriptContext } from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import { messageGame, synthSound } from '#/network/server/ServerMessages.js';

// Standard openable door IDs
const DOOR_IDS = [1530, 1531, 1533, 1534, 1591, 1595, 2025, 2112, 2309, 2534, 2535, 2712, 2997];

// Door open sound
const DOOR_OPEN_SOUND = 62;
const DOOR_CLOSE_SOUND = 63;

for (const doorId of DOOR_IDS) {
    // Op1: Open
    ScriptProvider.register(ServerTriggerType.OPLOC1, doorId, (ctx: ScriptContext) => {
        const player = ctx.self as Player;
        synthSound(player, DOOR_OPEN_SOUND, 1, 0);
        messageGame(player, 'You open the door.');
    });
}

// Locked doors with "Pick Lock" as op2
const LOCKED_DOOR_IDS = [2550, 2551, 2554, 2555, 2556, 2557, 2558, 2559];

for (const doorId of LOCKED_DOOR_IDS) {
    ScriptProvider.register(ServerTriggerType.OPLOC1, doorId, (ctx: ScriptContext) => {
        const player = ctx.self as Player;
        messageGame(player, 'The door is locked.');
    });

    ScriptProvider.register(ServerTriggerType.OPLOC2, doorId, (ctx: ScriptContext) => {
        const player = ctx.self as Player;
        // thieving level check would go here
        messageGame(player, 'You attempt to pick the lock...');
        messageGame(player, 'You manage to pick the lock.');
        synthSound(player, DOOR_OPEN_SOUND, 1, 0);
    });
}

console.log(`[Locs] ${DOOR_IDS.length + LOCKED_DOOR_IDS.length} door handlers registered`);
