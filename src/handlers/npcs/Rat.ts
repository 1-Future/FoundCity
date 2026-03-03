/**
 * Giant Rat NPCs (IDs: 86, 87).
 * Op2: Attack — handled by global combat handler.
 * Common low-level NPC in Lumbridge sewers.
 */
import Npc from '#/engine/entity/Npc.js';
import ScriptProvider, { ScriptContext } from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';

const GIANT_RAT_IDS = [86, 87];

for (const ratId of GIANT_RAT_IDS) {
    ScriptProvider.register(ServerTriggerType.AI_SPAWN, ratId, (ctx: ScriptContext) => {
        const npc = ctx.self as Npc;
        // Giant rats: level 3
        npc.baseLevels[0] = 2;  // attack
        npc.baseLevels[1] = 2;  // defence
        npc.baseLevels[2] = 3;  // strength
        npc.baseLevels[3] = 5;  // hitpoints
        npc.baseLevels[4] = 0;  // ranged
        npc.baseLevels[5] = 0;  // magic
        npc.initStats();
    });
}
