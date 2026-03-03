/**
 * Chicken NPCs (IDs: 41, 1017).
 * Op2: Attack — handled by global combat handler.
 * Lowest-level combat NPC (level 1).
 */
import Npc from '#/engine/entity/Npc.js';
import ScriptProvider, { ScriptContext } from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';

const CHICKEN_IDS = [41, 1017];

for (const chickenId of CHICKEN_IDS) {
    ScriptProvider.register(ServerTriggerType.AI_SPAWN, chickenId, (ctx: ScriptContext) => {
        const npc = ctx.self as Npc;
        // Chickens: level 1
        npc.baseLevels[0] = 1;  // attack
        npc.baseLevels[1] = 1;  // defence
        npc.baseLevels[2] = 1;  // strength
        npc.baseLevels[3] = 3;  // hitpoints
        npc.baseLevels[4] = 0;  // ranged
        npc.baseLevels[5] = 0;  // magic
        npc.initStats();
    });
}
