/**
 * Altar handlers.
 * OPLOC1 (Pray-at) — restores prayer points.
 *
 * Altar loc IDs: 409 (standard altar), 2640 (Lumbridge church altar)
 */
import Player from '#/engine/entity/Player.js';
import { PlayerStat } from '#/engine/entity/PlayerStat.js';
import ScriptProvider, { ScriptContext } from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import { messageGame, updateStat } from '#/network/server/ServerMessages.js';

const ALTAR_IDS = [409, 2640];
const PRAY_ANIM = 645;

for (const altarId of ALTAR_IDS) {
    ScriptProvider.register(ServerTriggerType.OPLOC1, altarId, (ctx: ScriptContext) => {
        const player = ctx.self as Player;
        const base = player.baseLevels[PlayerStat.PRAYER];
        const current = player.levels[PlayerStat.PRAYER];

        if (current >= base) {
            messageGame(player, 'You already have full prayer points.');
            return;
        }

        player.levels[PlayerStat.PRAYER] = base;
        player.playAnimation(PRAY_ANIM, 0);
        updateStat(player, PlayerStat.PRAYER);
        messageGame(player, 'You recharge your Prayer points.');
    });
}

console.log('[Locs] Altar handlers registered');
