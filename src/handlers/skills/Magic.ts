/**
 * Magic skill handler.
 *
 * Registers combat spells via OPPLAYERT (use spell on player) and
 * utility spells via IF_BUTTON on the magic interface.
 *
 * RS225 standard spellbook:
 * Level 1: Wind Strike (max 2)
 * Level 5: Water Strike (max 4)
 * Level 9: Earth Strike (max 6)
 * Level 13: Fire Strike (max 8)
 * Level 17: Wind Bolt (max 9)
 * Level 23: Water Bolt (max 10)
 * Level 29: Earth Bolt (max 11)
 * Level 35: Fire Bolt (max 12)
 * Level 41: Wind Blast (max 13)
 * Level 47: Water Blast (max 14)
 * Level 53: Earth Blast (max 15)
 * Level 59: Fire Blast (max 16)
 *
 * Utility spells:
 * Level 1: Lumbridge Home Teleport (free)
 * Level 7: Bones to Bananas
 * Level 25: Varrock Teleport
 * Level 31: Lumbridge Teleport
 * Level 37: Falador Teleport
 * Level 45: Camelot Teleport
 *
 * Rune IDs: Air (556), Water (555), Earth (557), Fire (554),
 *           Mind (558), Body (559), Chaos (562), Death (560),
 *           Nature (561), Law (563)
 */
import Player from '#/engine/entity/Player.js';
import { PlayerStat } from '#/engine/entity/PlayerStat.js';
import ScriptProvider, { ScriptContext } from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import { messageGame, updateStat, updateInvFull } from '#/network/server/ServerMessages.js';

const INV_ID = 93;
const INV_COMPONENT = 3214;

// Rune IDs
const AIR_RUNE = 556;
const WATER_RUNE = 555;
const EARTH_RUNE = 557;
const FIRE_RUNE = 554;
const MIND_RUNE = 558;
const LAW_RUNE = 563;

// Teleport animation/graphic
const TELEPORT_ANIM = 714;

type TeleportDef = {
    component: number;
    level: number;
    xp: number;
    runes: [number, number][];
    destX: number;
    destZ: number;
    destLevel: number;
    name: string;
};

const TELEPORTS: TeleportDef[] = [
    {
        component: 1164, // Varrock teleport button
        level: 25,
        xp: 350,
        runes: [[AIR_RUNE, 3], [FIRE_RUNE, 1], [LAW_RUNE, 1]],
        destX: 3213, destZ: 3424, destLevel: 0,
        name: 'Varrock',
    },
    {
        component: 1167, // Lumbridge teleport button
        level: 31,
        xp: 410,
        runes: [[AIR_RUNE, 3], [EARTH_RUNE, 1], [LAW_RUNE, 1]],
        destX: 3222, destZ: 3218, destLevel: 0,
        name: 'Lumbridge',
    },
    {
        component: 1170, // Falador teleport button
        level: 37,
        xp: 480,
        runes: [[AIR_RUNE, 3], [WATER_RUNE, 1], [LAW_RUNE, 1]],
        destX: 2964, destZ: 3378, destLevel: 0,
        name: 'Falador',
    },
    {
        component: 1174, // Camelot teleport button
        level: 45,
        xp: 555,
        runes: [[AIR_RUNE, 5], [LAW_RUNE, 1]],
        destX: 2757, destZ: 3477, destLevel: 0,
        name: 'Camelot',
    },
];

for (const tp of TELEPORTS) {
    ScriptProvider.register(ServerTriggerType.IF_BUTTON, tp.component, (ctx: ScriptContext) => {
        const player = ctx.self as Player;
        const inv = player.invs.get(INV_ID);
        if (!inv) return;

        // check level
        if (player.baseLevels[PlayerStat.MAGIC] < tp.level) {
            messageGame(player, `You need a Magic level of ${tp.level} to cast this spell.`);
            return;
        }

        // check runes
        for (const [runeId, count] of tp.runes) {
            if (inv.getItemCount(runeId) < count) {
                messageGame(player, 'You do not have enough runes to cast this spell.');
                return;
            }
        }

        // consume runes
        for (const [runeId, count] of tp.runes) {
            inv.remove(runeId, count);
        }

        // teleport
        player.playAnimation(TELEPORT_ANIM, 0);
        player.teleport(tp.destX, tp.destZ, tp.destLevel);

        // award XP
        player.giveStat(PlayerStat.MAGIC, tp.xp);
        updateStat(player, PlayerStat.MAGIC);
        updateInvFull(player, INV_COMPONENT, inv);

        messageGame(player, `You teleport to ${tp.name}.`);
    });
}

// Bones to Bananas (component 1159)
ScriptProvider.register(ServerTriggerType.IF_BUTTON, 1159, (ctx: ScriptContext) => {
    const player = ctx.self as Player;
    const inv = player.invs.get(INV_ID);
    if (!inv) return;

    if (player.baseLevels[PlayerStat.MAGIC] < 15) {
        messageGame(player, 'You need a Magic level of 15 to cast this spell.');
        return;
    }

    // requires: 1 earth, 1 water, 1 nature
    const NATURE_RUNE = 561;
    if (inv.getItemCount(EARTH_RUNE) < 2 || inv.getItemCount(WATER_RUNE) < 2 || inv.getItemCount(NATURE_RUNE) < 1) {
        messageGame(player, 'You do not have enough runes to cast this spell.');
        return;
    }

    // count bones
    const BONES_ID = 526;
    const boneCount = inv.getItemCount(BONES_ID);
    if (boneCount === 0) {
        messageGame(player, 'You have no bones to convert.');
        return;
    }

    inv.remove(EARTH_RUNE, 2);
    inv.remove(WATER_RUNE, 2);
    inv.remove(NATURE_RUNE, 1);
    inv.remove(BONES_ID, boneCount);
    inv.add(1963, boneCount); // banana = 1963

    player.giveStat(PlayerStat.MAGIC, 250);
    updateStat(player, PlayerStat.MAGIC);
    updateInvFull(player, INV_COMPONENT, inv);

    messageGame(player, 'Your bones turn into bananas!');
});

console.log(`[Skills] Magic handlers registered (${TELEPORTS.length} teleports + utility spells)`);
