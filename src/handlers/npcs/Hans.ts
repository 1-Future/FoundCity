/**
 * Hans — Lumbridge castle guide (NPC ID: 0).
 * Op1: Talk-to — tells the player how long they've been playing.
 */
import Player from '#/engine/entity/Player.js';
import ScriptProvider, { ScriptContext } from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import { messageGame } from '#/network/server/ServerMessages.js';

const HANS_ID = 0;

ScriptProvider.register(ServerTriggerType.OPNPC1, HANS_ID, (ctx: ScriptContext) => {
    const player = ctx.self as Player;

    const minutes = Math.floor(player.playtime / 100);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    messageGame(player, 'Hello. What are you doing here?');

    if (days > 0) {
        messageGame(player, `You've been playing for ${days} day${days !== 1 ? 's' : ''}.`);
    } else if (hours > 0) {
        messageGame(player, `You've been playing for ${hours} hour${hours !== 1 ? 's' : ''}.`);
    } else {
        messageGame(player, `You've been playing for ${minutes} minute${minutes !== 1 ? 's' : ''}.`);
    }
});
