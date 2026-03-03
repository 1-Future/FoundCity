/**
 * Cooking skill handler.
 * Uses raw fish/meat on a fire or range to cook it.
 *
 * This uses OPLOCU (use item on loc) for fires/ranges.
 * For simplicity, we register OPHELD1 on raw items as a "Cook" action
 * that checks if the player is near a range/fire.
 *
 * Cooking fires: loc 2732 (fire)
 * Cooking ranges: loc 2728, 114 (range)
 */
import Player from '#/engine/entity/Player.js';
import { PlayerStat } from '#/engine/entity/PlayerStat.js';
import ScriptProvider, { ScriptContext } from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import { messageGame, updateStat, updateInvFull } from '#/network/server/ServerMessages.js';

const INV_ID = 93;
const INV_COMPONENT = 3214;

const COOKING_ANIM = 883;

// Cooking definitions: [rawId, cookedId, burntId, level, xp*10, name]
type CookDef = { raw: number; cooked: number; burnt: number; level: number; xp: number; name: string };

const COOKABLE: CookDef[] = [
    { raw: 317, cooked: 315, burnt: 323, level: 1, xp: 300, name: 'shrimps' },
    { raw: 2132, cooked: 2140, burnt: 2146, level: 1, xp: 300, name: 'chicken' },
    { raw: 2134, cooked: 2142, burnt: 2146, level: 1, xp: 300, name: 'meat' },
    { raw: 327, cooked: 325, burnt: 369, level: 1, xp: 400, name: 'sardine' },
    { raw: 345, cooked: 347, burnt: 357, level: 5, xp: 500, name: 'herring' },
    { raw: 321, cooked: 319, burnt: 323, level: 15, xp: 300, name: 'anchovies' },
    { raw: 335, cooked: 333, burnt: 343, level: 15, xp: 700, name: 'trout' },
    { raw: 349, cooked: 351, burnt: 357, level: 20, xp: 800, name: 'pike' },
    { raw: 331, cooked: 329, burnt: 343, level: 25, xp: 900, name: 'salmon' },
    { raw: 359, cooked: 361, burnt: 367, level: 30, xp: 1000, name: 'tuna' },
    { raw: 377, cooked: 379, burnt: 381, level: 40, xp: 1200, name: 'lobster' },
    { raw: 371, cooked: 373, burnt: 375, level: 45, xp: 1400, name: 'swordfish' },
    { raw: 383, cooked: 385, burnt: 387, level: 80, xp: 2100, name: 'shark' },
];

// Range loc IDs
const RANGE_IDS = [2728, 114];

// Register OPLOC1 on ranges — "Cook" option
for (const rangeId of RANGE_IDS) {
    ScriptProvider.register(ServerTriggerType.OPLOC1, rangeId, (ctx: ScriptContext) => {
        const player = ctx.self as Player;
        const inv = player.invs.get(INV_ID);
        if (!inv) return;

        // find first cookable raw item in inventory
        let found: CookDef | null = null;
        for (const def of COOKABLE) {
            if (inv.contains(def.raw)) {
                found = def;
                break;
            }
        }

        if (!found) {
            messageGame(player, 'You have nothing to cook.');
            return;
        }

        const cookLevel = player.baseLevels[PlayerStat.COOKING];
        if (cookLevel < found.level) {
            messageGame(player, `You need a Cooking level of ${found.level} to cook ${found.name}.`);
            return;
        }

        // remove raw
        inv.remove(found.raw, 1);

        player.playAnimation(COOKING_ANIM, 0);

        // burn chance (decreases with level)
        const burnChance = Math.max(0.01, 0.5 - (cookLevel - found.level) * 0.03);
        const burned = Math.random() < burnChance;

        if (burned) {
            inv.add(found.burnt, 1);
            messageGame(player, `You accidentally burn the ${found.name}.`);
        } else {
            inv.add(found.cooked, 1);
            player.giveStat(PlayerStat.COOKING, found.xp);
            updateStat(player, PlayerStat.COOKING);
            messageGame(player, `You successfully cook the ${found.name}.`);
        }

        updateInvFull(player, INV_COMPONENT, inv);
    });
}

console.log('[Skills] Cooking handlers registered');
