/**
 * Goblin NPCs (IDs: 100, 101, 102, 174, 175, 176, 177, 178, 179, 180).
 * Op2: Attack — handled by global combat handler.
 * Common low-level combat NPCs around Lumbridge.
 */
import Npc from '#/engine/entity/Npc.js';
import ScriptProvider, { ScriptContext } from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';

const GOBLIN_IDS = [100, 101, 102, 174, 175, 176, 177, 178, 179, 180];

// AI_SPAWN: set initial combat stats for goblins
for (const goblinId of GOBLIN_IDS) {
    ScriptProvider.register(ServerTriggerType.AI_SPAWN, goblinId, (ctx: ScriptContext) => {
        const npc = ctx.self as Npc;
        // Goblins: attack=1, defence=1, strength=1, hitpoints=5, ranged=0, magic=0
        npc.baseLevels[0] = 1;  // attack
        npc.baseLevels[1] = 1;  // defence
        npc.baseLevels[2] = 1;  // strength
        npc.baseLevels[3] = 5;  // hitpoints
        npc.baseLevels[4] = 0;  // ranged
        npc.baseLevels[5] = 0;  // magic
        npc.initStats();
    });
}
