/**
 * NPC melee combat AI.
 *
 * AI_OPPLAYER1 — NPC attacks a player when in combat mode.
 * Handles aggressive NPC AI including Guards and other attackable NPCs.
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
import { rollNpcMeleeHit } from '#/handlers/combat/CombatFormulas.js';

// NPC attack animation
const NPC_ATTACK_ANIM = 422;
const PLAYER_BLOCK_ANIM = 424;

/**
 * Global AI_OPPLAYER1 — NPC melee attacks a player.
 * Runs when a hunting/aggressive NPC reaches its target.
 */
ScriptProvider.register(ServerTriggerType.AI_OPPLAYER1, -1, (ctx: ScriptContext) => {
    const npc = ctx.self as Npc;
    const player = ctx.target as Player;

    if (!player || !player.isActive) return;
    if (npc.baseLevels[NpcStat.HITPOINTS] <= 0) return;

    const damage = rollNpcMeleeHit(npc, player);

    npc.playAnimation(NPC_ATTACK_ANIM, 0);

    if (damage > 0) {
        player.levels[PlayerStat.HITPOINTS] -= damage;
        player.applyDamage(damage, HitType.DAMAGE);
        updateStat(player, PlayerStat.HITPOINTS);

        if (player.levels[PlayerStat.HITPOINTS] <= 0) {
            player.levels[PlayerStat.HITPOINTS] = 0;
            // Player death — teleport to Lumbridge and reset HP
            player.levels[PlayerStat.HITPOINTS] = player.baseLevels[PlayerStat.HITPOINTS];
            player.teleport(3222, 3218, 0); // Lumbridge spawn
            updateStat(player, PlayerStat.HITPOINTS);
            messageGame(player, 'Oh dear, you are dead!');
        }
    } else {
        player.applyDamage(0, HitType.BLOCK);
    }
});

console.log('[Combat] NPC melee combat AI registered');
