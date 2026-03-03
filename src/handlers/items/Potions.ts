/**
 * Potion item handlers.
 * OPHELD1 (Drink) — applies stat boosts.
 *
 * RS225 potions with 4 doses each.
 */
import Player from '#/engine/entity/Player.js';
import { PlayerStat } from '#/engine/entity/PlayerStat.js';
import ScriptProvider, { ScriptContext } from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import { messageGame, updateStat, updateInvFull } from '#/network/server/ServerMessages.js';

const INV_ID = 93;
const INV_COMPONENT = 3214;
const VIAL_ID = 229; // Empty vial

// Potion definitions: [objId, nextDose, stat, boostAmount, name]
// nextDose = -1 means this is the last dose (produces empty vial)
type PotionDef = {
    id: number;
    next: number; // next dose obj ID, or VIAL_ID for last
    stat: number;
    boost: number;
    name: string;
};

const POTIONS: PotionDef[] = [
    // Attack potions (4->3->2->1->vial)
    { id: 2428, next: 121, stat: PlayerStat.ATTACK, boost: 3, name: 'Attack potion' },
    { id: 121, next: 123, stat: PlayerStat.ATTACK, boost: 3, name: 'Attack potion' },
    { id: 123, next: 125, stat: PlayerStat.ATTACK, boost: 3, name: 'Attack potion' },
    { id: 125, next: VIAL_ID, stat: PlayerStat.ATTACK, boost: 3, name: 'Attack potion' },

    // Strength potions
    { id: 113, next: 115, stat: PlayerStat.STRENGTH, boost: 3, name: 'Strength potion' },
    { id: 115, next: 117, stat: PlayerStat.STRENGTH, boost: 3, name: 'Strength potion' },
    { id: 117, next: 119, stat: PlayerStat.STRENGTH, boost: 3, name: 'Strength potion' },
    { id: 119, next: VIAL_ID, stat: PlayerStat.STRENGTH, boost: 3, name: 'Strength potion' },

    // Defence potions
    { id: 2432, next: 133, stat: PlayerStat.DEFENCE, boost: 3, name: 'Defence potion' },
    { id: 133, next: 135, stat: PlayerStat.DEFENCE, boost: 3, name: 'Defence potion' },
    { id: 135, next: 137, stat: PlayerStat.DEFENCE, boost: 3, name: 'Defence potion' },
    { id: 137, next: VIAL_ID, stat: PlayerStat.DEFENCE, boost: 3, name: 'Defence potion' },

    // Prayer potions (restores prayer points)
    { id: 2434, next: 139, stat: PlayerStat.PRAYER, boost: 7, name: 'Prayer potion' },
    { id: 139, next: 141, stat: PlayerStat.PRAYER, boost: 7, name: 'Prayer potion' },
    { id: 141, next: 143, stat: PlayerStat.PRAYER, boost: 7, name: 'Prayer potion' },
    { id: 143, next: VIAL_ID, stat: PlayerStat.PRAYER, boost: 7, name: 'Prayer potion' },
];

for (const potion of POTIONS) {
    ScriptProvider.register(ServerTriggerType.OPHELD1, potion.id, (ctx: ScriptContext) => {
        const player = ctx.self as Player;
        const inv = player.invs.get(INV_ID);
        if (!inv) return;

        // remove potion, add next dose or vial
        const tx = inv.remove(potion.id, 1);
        if (tx.hasFailed()) return;

        inv.add(potion.next, 1);

        // apply boost
        const base = player.baseLevels[potion.stat];
        const current = player.levels[potion.stat];

        if (potion.stat === PlayerStat.PRAYER) {
            // prayer potions restore, not boost
            player.levels[potion.stat] = Math.min(base, current + potion.boost);
        } else {
            // combat potions boost above base
            const maxBoosted = base + potion.boost + Math.floor(base * 0.1);
            if (current < maxBoosted) {
                player.levels[potion.stat] = Math.min(maxBoosted, current + potion.boost + Math.floor(base * 0.1));
            }
        }

        updateStat(player, potion.stat);
        updateInvFull(player, INV_COMPONENT, inv);

        const dosesLeft = potion.next === VIAL_ID ? 0 : -1; // -1 means not last
        if (potion.next === VIAL_ID) {
            messageGame(player, `You drink the last of your ${potion.name}.`);
        } else {
            messageGame(player, `You drink some of your ${potion.name}.`);
        }
    });
}

console.log(`[Items] ${POTIONS.length} potion handlers registered`);
