/**
 * Cow NPCs (IDs: 81, 397, 1766, 1767).
 * Op2: Attack — handled by global combat handler.
 * Popular training target for new players.
 */
import Npc from '#/engine/entity/Npc.js';
import ScriptProvider, { ScriptContext } from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';

const COW_IDS = [81, 397, 1766, 1767];

for (const cowId of COW_IDS) {
    ScriptProvider.register(ServerTriggerType.AI_SPAWN, cowId, (ctx: ScriptContext) => {
        const npc = ctx.self as Npc;
        // Cows: level 2
        npc.baseLevels[0] = 1;  // attack
        npc.baseLevels[1] = 1;  // defence
        npc.baseLevels[2] = 1;  // strength
        npc.baseLevels[3] = 8;  // hitpoints
        npc.baseLevels[4] = 0;  // ranged
        npc.baseLevels[5] = 0;  // magic
        npc.initStats();
    });
}
