/**
 * RS225 melee combat formulas.
 *
 * Accuracy: attack roll vs defence roll.
 * Max hit: based on effective strength level + equipment bonus.
 *
 * These formulas are simplified RS225-accurate calculations.
 */
import Player from '#/engine/entity/Player.js';
import Npc from '#/engine/entity/Npc.js';
import { PlayerStat } from '#/engine/entity/PlayerStat.js';
import { NpcStat } from '#/engine/entity/NpcStat.js';

// RS225 combat style bonuses
export const enum CombatStyle {
    ACCURATE = 0,   // +3 attack
    AGGRESSIVE = 1, // +3 strength
    DEFENSIVE = 2,  // +3 defence
    CONTROLLED = 3, // +1 all
}

/**
 * Calculate the player's effective melee attack level.
 */
export function effectiveAttackLevel(player: Player, style: CombatStyle = CombatStyle.ACCURATE): number {
    let level = player.levels[PlayerStat.ATTACK];
    if (style === CombatStyle.ACCURATE) level += 3;
    else if (style === CombatStyle.CONTROLLED) level += 1;
    return level + 8;
}

/**
 * Calculate the player's effective melee strength level.
 */
export function effectiveStrengthLevel(player: Player, style: CombatStyle = CombatStyle.ACCURATE): number {
    let level = player.levels[PlayerStat.STRENGTH];
    if (style === CombatStyle.AGGRESSIVE) level += 3;
    else if (style === CombatStyle.CONTROLLED) level += 1;
    return level + 8;
}

/**
 * Calculate the player's effective melee defence level.
 */
export function effectiveDefenceLevel(player: Player, style: CombatStyle = CombatStyle.ACCURATE): number {
    let level = player.levels[PlayerStat.DEFENCE];
    if (style === CombatStyle.DEFENSIVE) level += 3;
    else if (style === CombatStyle.CONTROLLED) level += 1;
    return level + 8;
}

/**
 * Calculate max hit for a melee attack.
 * Formula: floor(0.5 + effectiveStr * (strBonus + 64) / 640)
 */
export function maxHit(effectiveStr: number, strBonus: number = 0): number {
    return Math.floor(0.5 + effectiveStr * (strBonus + 64) / 640);
}

/**
 * Calculate attack roll.
 */
export function attackRoll(effectiveAtk: number, atkBonus: number = 0): number {
    return effectiveAtk * (atkBonus + 64);
}

/**
 * Calculate defence roll.
 */
export function defenceRoll(effectiveDef: number, defBonus: number = 0): number {
    return effectiveDef * (defBonus + 64);
}

/**
 * Calculate accuracy (0.0 to 1.0) from attack and defence rolls.
 */
export function accuracy(atkRoll: number, defRoll: number): number {
    if (atkRoll > defRoll) {
        return 1 - (defRoll + 2) / (2 * (atkRoll + 1));
    }
    return atkRoll / (2 * (defRoll + 1));
}

/**
 * Roll melee damage from player against NPC.
 * Returns damage amount (0 = miss/block).
 */
export function rollPlayerMeleeHit(player: Player, npc: Npc, style: CombatStyle = CombatStyle.ACCURATE): number {
    const effAtk = effectiveAttackLevel(player, style);
    const effStr = effectiveStrengthLevel(player, style);
    const effDef = npc.levels[NpcStat.DEFENCE] + 8;

    const atkR = attackRoll(effAtk);
    const defR = defenceRoll(effDef);
    const acc = accuracy(atkR, defR);

    if (Math.random() >= acc) {
        return 0; // miss
    }

    const max = maxHit(effStr);
    return Math.floor(Math.random() * (max + 1));
}

/**
 * Roll melee damage from NPC against player.
 * Returns damage amount (0 = miss/block).
 */
export function rollNpcMeleeHit(npc: Npc, player: Player): number {
    const effAtk = npc.levels[NpcStat.ATTACK] + 8;
    const effStr = npc.levels[NpcStat.STRENGTH] + 8;
    const effDef = effectiveDefenceLevel(player);

    const atkR = attackRoll(effAtk);
    const defR = defenceRoll(effDef);
    const acc = accuracy(atkR, defR);

    if (Math.random() >= acc) {
        return 0; // miss
    }

    const max = maxHit(effStr);
    return Math.floor(Math.random() * (max + 1));
}

/**
 * Calculate combat XP to award.
 * RS225: 4 XP per damage in the trained stat, 1.33 XP per damage in hitpoints.
 */
export function combatXp(damage: number): { mainXp: number; hpXp: number } {
    return {
        mainXp: damage * 40, // stored as xp * 10
        hpXp: Math.floor(damage * 40 / 3),
    };
}
