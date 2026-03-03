/**
 * Woodcutting skill handler.
 * OPLOC1 (Chop down) on trees.
 *
 * Tree loc IDs (from configs):
 * - 1276, 1278, 1279: Normal tree -> logs (1511)
 * - 1281: Oak tree -> oak logs (1521)
 * - 1308: Willow tree -> willow logs (1519)
 * - 1309: Yew tree -> yew logs (1515)
 * - 1306: Magic tree -> magic logs (1513)
 *
 * Axes: Bronze (1351), Iron (1353), Steel (1355), Mithril (1357),
 *        Adamant (1359), Rune (1361)
 */
import Player from '#/engine/entity/Player.js';
import { PlayerStat } from '#/engine/entity/PlayerStat.js';
import ScriptProvider, { ScriptContext } from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import { messageGame, updateStat, updateInvFull } from '#/network/server/ServerMessages.js';

const INV_ID = 93;
const WORN_ID = 94;
const INV_COMPONENT = 3214;

const WC_ANIM = 879; // generic woodcutting animation

// Axe definitions: [objId, level, name]
const AXES = [
    { id: 1351, level: 1, name: 'bronze axe' },
    { id: 1349, level: 1, name: 'iron axe' },
    { id: 1353, level: 6, name: 'steel axe' },
    { id: 1355, level: 21, name: 'mithril axe' },
    { id: 1357, level: 31, name: 'adamant axe' },
    { id: 1359, level: 41, name: 'rune axe' },
];

// Tree definitions
type TreeDef = { logId: number; level: number; xp: number; name: string };

const NORMAL_TREE: TreeDef = { logId: 1511, level: 1, xp: 250, name: 'tree' };
const OAK_TREE: TreeDef = { logId: 1521, level: 15, xp: 375, name: 'oak tree' };
const WILLOW_TREE: TreeDef = { logId: 1519, level: 30, xp: 675, name: 'willow tree' };
const YEW_TREE: TreeDef = { logId: 1515, level: 60, xp: 1750, name: 'yew tree' };
const MAGIC_TREE: TreeDef = { logId: 1513, level: 75, xp: 2500, name: 'magic tree' };

function findBestAxe(player: Player): typeof AXES[0] | null {
    const inv = player.invs.get(INV_ID);
    const worn = player.invs.get(WORN_ID);
    const wcLevel = player.baseLevels[PlayerStat.WOODCUTTING];

    let bestAxe: typeof AXES[0] | null = null;
    for (const axe of AXES) {
        if (wcLevel < axe.level) continue;
        const hasInv = inv?.contains(axe.id) ?? false;
        const hasWorn = worn?.contains(axe.id) ?? false;
        if (hasInv || hasWorn) bestAxe = axe;
    }
    return bestAxe;
}

function chopTree(player: Player, tree: TreeDef): void {
    const inv = player.invs.get(INV_ID);
    if (!inv) return;

    const wcLevel = player.baseLevels[PlayerStat.WOODCUTTING];

    // check level
    if (wcLevel < tree.level) {
        messageGame(player, `You need a Woodcutting level of ${tree.level} to chop this ${tree.name}.`);
        return;
    }

    // check axe
    const axe = findBestAxe(player);
    if (!axe) {
        messageGame(player, 'You need an axe to chop down this tree.');
        return;
    }

    // check space
    if (inv.isFull) {
        messageGame(player, 'Your inventory is too full to hold any more logs.');
        return;
    }

    player.playAnimation(WC_ANIM, 0);
    messageGame(player, 'You swing your axe at the tree.');

    // success roll
    const chance = 0.3 + (wcLevel - tree.level) * 0.02;
    if (Math.random() > Math.min(0.95, chance)) {
        messageGame(player, 'You fail to chop anything.');
        return;
    }

    inv.add(tree.logId, 1);
    player.giveStat(PlayerStat.WOODCUTTING, tree.xp);
    updateStat(player, PlayerStat.WOODCUTTING);
    updateInvFull(player, INV_COMPONENT, inv);

    messageGame(player, 'You get some logs.');
}

// Normal trees
for (const treeId of [1276, 1278, 1279]) {
    ScriptProvider.register(ServerTriggerType.OPLOC1, treeId, (ctx: ScriptContext) => {
        chopTree(ctx.self as Player, NORMAL_TREE);
    });
}

// Oak
ScriptProvider.register(ServerTriggerType.OPLOC1, 1281, (ctx: ScriptContext) => {
    chopTree(ctx.self as Player, OAK_TREE);
});

// Willow
ScriptProvider.register(ServerTriggerType.OPLOC1, 1308, (ctx: ScriptContext) => {
    chopTree(ctx.self as Player, WILLOW_TREE);
});

// Yew
ScriptProvider.register(ServerTriggerType.OPLOC1, 1309, (ctx: ScriptContext) => {
    chopTree(ctx.self as Player, YEW_TREE);
});

// Magic
ScriptProvider.register(ServerTriggerType.OPLOC1, 1306, (ctx: ScriptContext) => {
    chopTree(ctx.self as Player, MAGIC_TREE);
});

console.log('[Skills] Woodcutting handlers registered');
