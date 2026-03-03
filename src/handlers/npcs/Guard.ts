/**
 * Guard NPCs (IDs: 9, 10).
 * Op1: Talk-to — brief dialogue.
 * Op2: Attack — handled by global combat handler.
 * These guards have combat stats and can be fought.
 */
import Player from '#/engine/entity/Player.js';
import Npc from '#/engine/entity/Npc.js';
import ScriptProvider, { ScriptContext } from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import { messageGame } from '#/network/server/ServerMessages.js';

const GUARD_IDS = [9, 10];

for (const guardId of GUARD_IDS) {
    ScriptProvider.register(ServerTriggerType.OPNPC1, guardId, (ctx: ScriptContext) => {
        const player = ctx.self as Player;
        messageGame(player, 'Move along, citizen.');
    });
}
