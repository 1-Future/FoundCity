/**
 * Mining skill handler.
 * OPLOC1 (Mine) on rocks, OPLOC2 (Prospect) on rocks.
 *
 * Rock loc IDs (from configs):
 * - 2108/2109: Clay rocks
 * - 2094/2095: Tin rocks
 * - 2090/2091: Copper rocks
 * - 2092/2093: Iron rocks
 * - 2096/2097: Coal rocks
 * - 2100/2101: Silver rocks
 * - 2098/2099: Gold rocks
 * - 2102/2103: Mithril rocks
 * - 2104/2105: Adamantite rocks
 * - 2106/2107: Runite rocks
 *
 * Pickaxes: Bronze (1265), Iron (1267), Steel (1269), Mithril (1273),
 *           Adamant (1271), Rune (1275)
 */
import Player from '#/engine/entity/Player.js';
import { PlayerStat } from '#/engine/entity/PlayerStat.js';
import ScriptProvider, { ScriptContext } from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import { messageGame, updateStat, updateInvFull } from '#/network/server/ServerMessages.js';

const INV_ID = 93;
const WORN_ID = 94;
const INV_COMPONENT = 3214;

const MINING_ANIM = 624;

// Pickaxe definitions
const PICKAXES = [
    { id: 1265, level: 1, name: 'bronze pickaxe' },
    { id: 1267, level: 1, name: 'iron pickaxe' },
    { id: 1269, level: 6, name: 'steel pickaxe' },
    { id: 1273, level: 21, name: 'mithril pickaxe' },
    { id: 1271, level: 31, name: 'adamant pickaxe' },
    { id: 1275, level: 41, name: 'rune pickaxe' },
];

// Ore definitions
type OreDef = { oreId: number; level: number; xp: number; name: string; prospectName: string };

const CLAY: OreDef = { oreId: 434, level: 1, xp: 50, name: 'clay', prospectName: 'clay' };
const TIN: OreDef = { oreId: 438, level: 1, xp: 175, name: 'tin ore', prospectName: 'tin' };
const COPPER: OreDef = { oreId: 436, level: 1, xp: 175, name: 'copper ore', prospectName: 'copper' };
const IRON: OreDef = { oreId: 440, level: 15, xp: 350, name: 'iron ore', prospectName: 'iron' };
const COAL: OreDef = { oreId: 453, level: 30, xp: 500, name: 'coal', prospectName: 'coal' };
const SILVER: OreDef = { oreId: 442, level: 20, xp: 400, name: 'silver ore', prospectName: 'silver' };
const GOLD: OreDef = { oreId: 444, level: 40, xp: 650, name: 'gold ore', prospectName: 'gold' };
const MITHRIL: OreDef = { oreId: 447, level: 55, xp: 800, name: 'mithril ore', prospectName: 'mithril' };
const ADAMANTITE: OreDef = { oreId: 449, level: 70, xp: 950, name: 'adamantite ore', prospectName: 'adamantite' };
const RUNITE: OreDef = { oreId: 451, level: 85, xp: 1250, name: 'runite ore', prospectName: 'runite' };

function findBestPick(player: Player): typeof PICKAXES[0] | null {
    const inv = player.invs.get(INV_ID);
    const worn = player.invs.get(WORN_ID);
    const miningLevel = player.baseLevels[PlayerStat.MINING];

    let best: typeof PICKAXES[0] | null = null;
    for (const pick of PICKAXES) {
        if (miningLevel < pick.level) continue;
        const hasInv = inv?.contains(pick.id) ?? false;
        const hasWorn = worn?.contains(pick.id) ?? false;
        if (hasInv || hasWorn) best = pick;
    }
    return best;
}

function mineRock(player: Player, ore: OreDef): void {
    const inv = player.invs.get(INV_ID);
    if (!inv) return;

    const miningLevel = player.baseLevels[PlayerStat.MINING];

    if (miningLevel < ore.level) {
        messageGame(player, `You need a Mining level of ${ore.level} to mine this rock.`);
        return;
    }

    const pick = findBestPick(player);
    if (!pick) {
        messageGame(player, 'You need a pickaxe to mine this rock.');
        return;
    }

    if (inv.isFull) {
        messageGame(player, 'Your inventory is too full to hold any more ore.');
        return;
    }

    player.playAnimation(MINING_ANIM, 0);
    messageGame(player, 'You swing your pick at the rock.');

    // success roll
    const chance = 0.3 + (miningLevel - ore.level) * 0.02;
    if (Math.random() > Math.min(0.95, chance)) {
        return;
    }

    inv.add(ore.oreId, 1);
    player.giveStat(PlayerStat.MINING, ore.xp);
    updateStat(player, PlayerStat.MINING);
    updateInvFull(player, INV_COMPONENT, inv);

    messageGame(player, `You manage to mine some ${ore.name}.`);
}

function prospectRock(player: Player, ore: OreDef): void {
    messageGame(player, 'You examine the rock for ores...');
    messageGame(player, `This rock contains ${ore.prospectName}.`);
}

// Map rock IDs to ore definitions
const ROCK_MAP: [number[], OreDef][] = [
    [[2108, 2109], CLAY],
    [[2094, 2095], TIN],
    [[2090, 2091], COPPER],
    [[2092, 2093], IRON],
    [[2096, 2097], COAL],
    [[2100, 2101], SILVER],
    [[2098, 2099], GOLD],
    [[2102, 2103], MITHRIL],
    [[2104, 2105], ADAMANTITE],
    [[2106, 2107], RUNITE],
];

for (const [rockIds, ore] of ROCK_MAP) {
    for (const rockId of rockIds) {
        // Op1: Mine
        ScriptProvider.register(ServerTriggerType.OPLOC1, rockId, (ctx: ScriptContext) => {
            mineRock(ctx.self as Player, ore);
        });

        // Op2: Prospect
        ScriptProvider.register(ServerTriggerType.OPLOC2, rockId, (ctx: ScriptContext) => {
            prospectRock(ctx.self as Player, ore);
        });
    }
}

// Newbie rocks
ScriptProvider.register(ServerTriggerType.OPLOC1, 3042, (ctx: ScriptContext) => {
    mineRock(ctx.self as Player, COPPER);
});
ScriptProvider.register(ServerTriggerType.OPLOC1, 3043, (ctx: ScriptContext) => {
    mineRock(ctx.self as Player, TIN);
});

console.log('[Skills] Mining handlers registered');
