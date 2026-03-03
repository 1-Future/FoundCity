/**
 * Smithing skill handler.
 * Smelting: use ore on furnace (OPLOCU on furnace locs).
 * For simplicity, registered as OPLOC1 on furnace when player has ores.
 *
 * Smelting definitions:
 * - Bronze bar: 1 copper ore + 1 tin ore, level 1, 62.5 xp
 * - Iron bar: 1 iron ore, level 15, 125 xp
 * - Steel bar: 1 iron ore + 2 coal, level 30, 175 xp
 * - Gold bar: 1 gold ore, level 40, 225 xp
 * - Mithril bar: 1 mithril ore + 4 coal, level 50, 300 xp
 * - Adamant bar: 1 adamantite ore + 6 coal, level 70, 375 xp
 * - Rune bar: 1 runite ore + 8 coal, level 85, 500 xp
 */
import Player from '#/engine/entity/Player.js';
import { PlayerStat } from '#/engine/entity/PlayerStat.js';
import ScriptProvider, { ScriptContext } from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import { messageGame, updateStat, updateInvFull } from '#/network/server/ServerMessages.js';

const INV_ID = 93;
const INV_COMPONENT = 3214;

const SMELTING_ANIM = 899;

// Ore IDs
const COPPER_ORE = 436;
const TIN_ORE = 438;
const IRON_ORE = 440;
const COAL = 453;
const GOLD_ORE = 444;
const MITHRIL_ORE = 447;
const ADAMANTITE_ORE = 449;
const RUNITE_ORE = 451;
const SILVER_ORE = 442;

// Bar IDs
const BRONZE_BAR = 2349;
const IRON_BAR = 2351;
const STEEL_BAR = 2353;
const GOLD_BAR = 2357;
const SILVER_BAR = 2355;
const MITHRIL_BAR = 2359;
const ADAMANT_BAR = 2361;
const RUNE_BAR = 2363;

type SmeltDef = {
    barId: number;
    level: number;
    xp: number;
    name: string;
    ores: [number, number][]; // [oreId, count]
};

const SMELTING: SmeltDef[] = [
    { barId: BRONZE_BAR, level: 1, xp: 63, name: 'bronze bar', ores: [[COPPER_ORE, 1], [TIN_ORE, 1]] },
    { barId: IRON_BAR, level: 15, xp: 125, name: 'iron bar', ores: [[IRON_ORE, 1]] },
    { barId: SILVER_BAR, level: 20, xp: 137, name: 'silver bar', ores: [[SILVER_ORE, 1]] },
    { barId: STEEL_BAR, level: 30, xp: 175, name: 'steel bar', ores: [[IRON_ORE, 1], [COAL, 2]] },
    { barId: GOLD_BAR, level: 40, xp: 225, name: 'gold bar', ores: [[GOLD_ORE, 1]] },
    { barId: MITHRIL_BAR, level: 50, xp: 300, name: 'mithril bar', ores: [[MITHRIL_ORE, 1], [COAL, 4]] },
    { barId: ADAMANT_BAR, level: 70, xp: 375, name: 'adamantite bar', ores: [[ADAMANTITE_ORE, 1], [COAL, 6]] },
    { barId: RUNE_BAR, level: 85, xp: 500, name: 'runite bar', ores: [[RUNITE_ORE, 1], [COAL, 8]] },
];

// Furnace loc IDs
const FURNACE_IDS = [2781, 2785];

function trySmelting(player: Player): void {
    const inv = player.invs.get(INV_ID);
    if (!inv) return;

    const smithLevel = player.baseLevels[PlayerStat.SMITHING];

    // find highest-level smeltable bar player can make
    let best: SmeltDef | null = null;
    for (const def of SMELTING) {
        if (smithLevel < def.level) continue;

        // check if player has all required ores
        let hasAll = true;
        for (const [oreId, count] of def.ores) {
            if (inv.getItemCount(oreId) < count) {
                hasAll = false;
                break;
            }
        }

        if (hasAll) best = def;
    }

    if (!best) {
        messageGame(player, 'You don\'t have the ores needed to smelt anything.');
        return;
    }

    if (inv.isFull) {
        messageGame(player, 'Your inventory is too full.');
        return;
    }

    // remove ores
    for (const [oreId, count] of best.ores) {
        inv.remove(oreId, count);
    }

    player.playAnimation(SMELTING_ANIM, 0);

    // iron has 50% fail rate (unless using ring of forging)
    if (best.barId === IRON_BAR && Math.random() < 0.5) {
        messageGame(player, 'The ore is too impure and you fail to refine it.');
        updateInvFull(player, INV_COMPONENT, inv);
        return;
    }

    inv.add(best.barId, 1);
    player.giveStat(PlayerStat.SMITHING, best.xp);
    updateStat(player, PlayerStat.SMITHING);
    updateInvFull(player, INV_COMPONENT, inv);

    messageGame(player, `You smelt a ${best.name}.`);
}

// Override furnace handlers from the placeholder in locs/Furnace.ts
// These need to be registered AFTER the loc handlers, so they'll override
for (const furnaceId of FURNACE_IDS) {
    ScriptProvider.register(ServerTriggerType.OPLOC1, furnaceId, (ctx: ScriptContext) => {
        trySmelting(ctx.self as Player);
    });
}

console.log('[Skills] Smithing handlers registered');
