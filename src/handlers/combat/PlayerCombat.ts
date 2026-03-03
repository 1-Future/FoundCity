/**
 * Player melee combat handler.
 *
 * Registers OPNPC2 (Attack) as a global handler for all NPCs.
 * Also handles combat timer ticks, death, and XP rewards.
 */
import Player from '#/engine/entity/Player.js';
import { PlayerInfoMask } from '#/engine/entity/Player.js';
import Npc from '#/engine/entity/Npc.js';
import { NpcStat } from '#/engine/entity/NpcStat.js';
import { PlayerStat } from '#/engine/entity/PlayerStat.js';
import { HitType } from '#/engine/entity/HitType.js';
import ScriptProvider, { ScriptContext } from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import { messageGame, updateStat } from '#/network/server/ServerMessages.js';
import { rollPlayerMeleeHit, combatXp, CombatStyle } from '#/handlers/combat/CombatFormulas.js';

// RS225 melee attack animations
const PUNCH_ANIM = 422;
const KICK_ANIM = 423;
const BLOCK_ANIM = 424;

// Combat delay (4 ticks = 2.4s for standard melee)
const MELEE_ATTACK_DELAY = 4;

/**
 * Global OPNPC2 handler — player attacks an NPC.
 * typeId = -1 means this fires for any NPC with an "Attack" option.
 */
ScriptProvider.register(ServerTriggerType.OPNPC2, -1, (ctx: ScriptContext) => {
    const player = ctx.self as Player;
    const npc = ctx.target as Npc;

    if (!npc || !npc.isActive) {
        messageGame(player, 'That NPC is not here.');
        return;
    }

    // check if NPC has hitpoints (can be fought)
    if (npc.baseLevels[NpcStat.HITPOINTS] <= 0) {
        messageGame(player, 'You can\'t attack that.');
        return;
    }

    // perform melee attack
    const damage = rollPlayerMeleeHit(player, npc, CombatStyle.ACCURATE);

    // play attack animation
    player.playAnimation(PUNCH_ANIM, 0);

    if (damage > 0) {
        // apply damage to NPC
        npc.levels[NpcStat.HITPOINTS] -= damage;
        npc.applyDamage(damage, HitType.DAMAGE);

        // award combat XP
        const xp = combatXp(damage);
        player.giveStat(PlayerStat.ATTACK, xp.mainXp);
        player.giveStat(PlayerStat.HITPOINTS, xp.hpXp);
        updateStat(player, PlayerStat.ATTACK);
        updateStat(player, PlayerStat.HITPOINTS);

        // track hero points for loot attribution
        npc.heroPoints.addHero(player.hash64, damage);

        // check NPC death
        if (npc.levels[NpcStat.HITPOINTS] <= 0) {
            npc.levels[NpcStat.HITPOINTS] = 0;
            npc.die();
            messageGame(player, 'You have defeated the NPC.');
        }
    } else {
        // miss — show block
        npc.applyDamage(0, HitType.BLOCK);
    }
});

console.log('[Combat] Player melee combat handlers registered');
