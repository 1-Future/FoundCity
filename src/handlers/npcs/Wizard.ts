/**
 * Dark Wizard NPCs (IDs: 172, 174).
 * Aggressive wizards south of Varrock.
 * They use melee attacks (simplified — no magic in this phase).
 */
import Npc from '#/engine/entity/Npc.js';
import ScriptProvider, { ScriptContext } from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';

const DARK_WIZARD_IDS = [172, 174];

for (const wizId of DARK_WIZARD_IDS) {
    ScriptProvider.register(ServerTriggerType.AI_SPAWN, wizId, (ctx: ScriptContext) => {
        const npc = ctx.self as Npc;
        // Dark wizards: level 7/20
        npc.baseLevels[0] = 7;   // attack
        npc.baseLevels[1] = 7;   // defence
        npc.baseLevels[2] = 5;   // strength
        npc.baseLevels[3] = 19;  // hitpoints
        npc.baseLevels[4] = 0;   // ranged
        npc.baseLevels[5] = 12;  // magic
        npc.initStats();

        // aggressive: hunt players
        npc.huntMode = 1;
        npc.huntRange = 4;
    });
}
