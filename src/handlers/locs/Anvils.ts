/**
 * Anvil handlers.
 * OPLOC1 (Smith) — smithing interface placeholder.
 *
 * Anvil loc IDs: 2783 (standard anvil)
 */
import Player from '#/engine/entity/Player.js';
import ScriptProvider, { ScriptContext } from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import { messageGame } from '#/network/server/ServerMessages.js';

const ANVIL_IDS = [2783];

for (const anvilId of ANVIL_IDS) {
    ScriptProvider.register(ServerTriggerType.OPLOC1, anvilId, (ctx: ScriptContext) => {
        const player = ctx.self as Player;
        const inv = player.invs.get(93);
        if (!inv) return;

        // check for hammer
        const HAMMER = 2347;
        if (!inv.contains(HAMMER)) {
            messageGame(player, 'You need a hammer to work the metal on this anvil.');
            return;
        }

        // check for any bar
        const bars = [2349, 2351, 2353, 2355, 2357, 2359, 2361, 2363];
        const hasBar = bars.some(id => inv.contains(id));
        if (!hasBar) {
            messageGame(player, 'You need a metal bar to smith on this anvil.');
            return;
        }

        messageGame(player, 'You hammer the bar on the anvil.');
        messageGame(player, 'The advanced smithing interface is not yet implemented.');
    });
}

console.log('[Locs] Anvil handlers registered');
