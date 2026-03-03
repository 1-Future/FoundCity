/**
 * Furnace handlers.
 * OPLOC1 (Use) — smelting interface placeholder.
 *
 * Furnace loc IDs: 2781, 2785 (standard furnaces in Lumbridge, Al-Kharid, Falador).
 */
import Player from '#/engine/entity/Player.js';
import ScriptProvider, { ScriptContext } from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import { messageGame } from '#/network/server/ServerMessages.js';

const FURNACE_IDS = [2781, 2785];

for (const furnaceId of FURNACE_IDS) {
    ScriptProvider.register(ServerTriggerType.OPLOC1, furnaceId, (ctx: ScriptContext) => {
        const player = ctx.self as Player;
        // Full smelting requires the skills system (Phase 3)
        messageGame(player, 'You need to use a metal bar on the furnace to smelt it.');
        messageGame(player, 'The smithing system is not yet implemented.');
    });
}

console.log('[Locs] Furnace handlers registered');
