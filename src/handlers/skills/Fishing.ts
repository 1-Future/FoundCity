/**
 * Fishing skill handler.
 * OPLOC1/OPLOC2 on fishing spots — catches fish.
 *
 * Fishing spot loc IDs (from configs):
 * - 2028: Net/Bait (shrimps, sardine, herring, anchovies)
 * - 2029: Cage/Harpoon (lobster, tuna, swordfish)
 * - 2030: Net/Harpoon (monkfish, shark)
 * - 2027: Lure/Bait (trout, salmon, pike)
 * - 3032: Newbie net (Tutorial Island)
 *
 * Required tools: Small fishing net (303), Fishing rod (307), Fly fishing rod (309),
 *   Lobster pot (301), Harpoon (311)
 */
import Player from '#/engine/entity/Player.js';
import { PlayerStat } from '#/engine/entity/PlayerStat.js';
import ScriptProvider, { ScriptContext } from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import { messageGame, updateStat, updateInvFull } from '#/network/server/ServerMessages.js';

const INV_ID = 93;
const INV_COMPONENT = 3214;

// Fishing animation
const FISHING_NET_ANIM = 621;
const FISHING_ROD_ANIM = 622;
const FISHING_HARPOON_ANIM = 618;
const FISHING_CAGE_ANIM = 619;

// Tool IDs
const SMALL_NET = 303;
const FISHING_ROD = 307;
const FLY_ROD = 309;
const LOBSTER_POT = 301;
const HARPOON = 311;
const FEATHER = 314;
const BAIT = 313;

// Fish definitions: [rawId, level, xp*10, name]
type FishDef = { raw: number; level: number; xp: number; name: string };

const SHRIMPS: FishDef = { raw: 317, level: 1, xp: 100, name: 'shrimps' };
const SARDINE: FishDef = { raw: 327, level: 5, xp: 200, name: 'sardine' };
const HERRING: FishDef = { raw: 345, level: 10, xp: 300, name: 'herring' };
const ANCHOVIES: FishDef = { raw: 321, level: 15, xp: 400, name: 'anchovies' };
const TROUT: FishDef = { raw: 335, level: 20, xp: 500, name: 'trout' };
const PIKE: FishDef = { raw: 349, level: 25, xp: 600, name: 'pike' };
const SALMON: FishDef = { raw: 331, level: 30, xp: 700, name: 'salmon' };
const TUNA: FishDef = { raw: 359, level: 35, xp: 800, name: 'tuna' };
const LOBSTER: FishDef = { raw: 377, level: 40, xp: 900, name: 'lobster' };
const SWORDFISH: FishDef = { raw: 371, level: 50, xp: 1000, name: 'swordfish' };

function tryFish(player: Player, tool: number, toolName: string, baitId: number | null, anim: number, fishPool: FishDef[]): void {
    const inv = player.invs.get(INV_ID);
    if (!inv) return;

    // check tool
    if (!inv.contains(tool)) {
        messageGame(player, `You need a ${toolName} to fish here.`);
        return;
    }

    // check bait
    if (baitId !== null && !inv.contains(baitId)) {
        messageGame(player, 'You don\'t have any bait.');
        return;
    }

    // check inventory space
    if (inv.isFull) {
        messageGame(player, 'Your inventory is too full to hold any more fish.');
        return;
    }

    // find highest-level fish player can catch
    const fishLevel = player.baseLevels[PlayerStat.FISHING];
    let bestFish: FishDef | null = null;
    for (const fish of fishPool) {
        if (fishLevel >= fish.level) bestFish = fish;
    }

    if (!bestFish) {
        messageGame(player, 'You need a higher Fishing level to fish here.');
        return;
    }

    // play animation
    player.playAnimation(anim, 0);
    messageGame(player, 'You attempt to catch a fish...');

    // success roll (simplified — higher level = better chance)
    const chance = 0.3 + (fishLevel - bestFish.level) * 0.02;
    if (Math.random() > Math.min(0.95, chance)) {
        messageGame(player, 'You fail to catch anything.');
        return;
    }

    // consume bait
    if (baitId !== null) {
        inv.remove(baitId, 1);
    }

    // add fish
    inv.add(bestFish.raw, 1);

    // award XP
    player.giveStat(PlayerStat.FISHING, bestFish.xp);
    updateStat(player, PlayerStat.FISHING);
    updateInvFull(player, INV_COMPONENT, inv);

    messageGame(player, `You catch some ${bestFish.name}.`);
}

// Fishing spot 2028: Op1=Net, Op2=Bait
ScriptProvider.register(ServerTriggerType.OPLOC1, 2028, (ctx: ScriptContext) => {
    tryFish(ctx.self as Player, SMALL_NET, 'small fishing net', null, FISHING_NET_ANIM, [SHRIMPS, ANCHOVIES]);
});

ScriptProvider.register(ServerTriggerType.OPLOC2, 2028, (ctx: ScriptContext) => {
    tryFish(ctx.self as Player, FISHING_ROD, 'fishing rod', BAIT, FISHING_ROD_ANIM, [SARDINE, HERRING]);
});

// Fishing spot 2027: Op1=Lure, Op2=Bait
ScriptProvider.register(ServerTriggerType.OPLOC1, 2027, (ctx: ScriptContext) => {
    tryFish(ctx.self as Player, FLY_ROD, 'fly fishing rod', FEATHER, FISHING_ROD_ANIM, [TROUT, SALMON]);
});

ScriptProvider.register(ServerTriggerType.OPLOC2, 2027, (ctx: ScriptContext) => {
    tryFish(ctx.self as Player, FISHING_ROD, 'fishing rod', BAIT, FISHING_ROD_ANIM, [PIKE]);
});

// Fishing spot 2029: Op1=Cage, Op2=Harpoon
ScriptProvider.register(ServerTriggerType.OPLOC1, 2029, (ctx: ScriptContext) => {
    tryFish(ctx.self as Player, LOBSTER_POT, 'lobster pot', null, FISHING_CAGE_ANIM, [LOBSTER]);
});

ScriptProvider.register(ServerTriggerType.OPLOC2, 2029, (ctx: ScriptContext) => {
    tryFish(ctx.self as Player, HARPOON, 'harpoon', null, FISHING_HARPOON_ANIM, [TUNA, SWORDFISH]);
});

// Fishing spot 2031: Op1=Cage, Op2=Harpoon (alternative)
ScriptProvider.register(ServerTriggerType.OPLOC1, 2031, (ctx: ScriptContext) => {
    tryFish(ctx.self as Player, LOBSTER_POT, 'lobster pot', null, FISHING_CAGE_ANIM, [LOBSTER]);
});

ScriptProvider.register(ServerTriggerType.OPLOC2, 2031, (ctx: ScriptContext) => {
    tryFish(ctx.self as Player, HARPOON, 'harpoon', null, FISHING_HARPOON_ANIM, [TUNA, SWORDFISH]);
});

// Newbie fishing 3032: Op1=Net
ScriptProvider.register(ServerTriggerType.OPLOC1, 3032, (ctx: ScriptContext) => {
    tryFish(ctx.self as Player, SMALL_NET, 'small fishing net', null, FISHING_NET_ANIM, [SHRIMPS]);
});

console.log('[Skills] Fishing handlers registered');
