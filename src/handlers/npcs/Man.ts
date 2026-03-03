/**
 * Man (NPC ID: 1) and Woman (NPC IDs: 4, 5, 6).
 * Op1: Talk-to — generic dialogue.
 * Op2: Attack — handled by global combat handler.
 */
import Player from '#/engine/entity/Player.js';
import Npc from '#/engine/entity/Npc.js';
import ScriptProvider, { ScriptContext } from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import { messageGame } from '#/network/server/ServerMessages.js';

const MAN_ID = 1;
const WOMAN_IDS = [4, 5, 6];

const MAN_LINES = [
    'How can I help you?',
    'Nice weather we\'re having.',
    'I\'m a bit busy right now.',
    'Do you have anything to trade?',
    'Hello there.',
];

const WOMAN_LINES = [
    'Are you looking for something?',
    'Hello there.',
    'Lovely day, isn\'t it?',
    'Can I help you?',
];

ScriptProvider.register(ServerTriggerType.OPNPC1, MAN_ID, (ctx: ScriptContext) => {
    const player = ctx.self as Player;
    const line = MAN_LINES[Math.floor(Math.random() * MAN_LINES.length)];
    messageGame(player, line);
});

for (const womanId of WOMAN_IDS) {
    ScriptProvider.register(ServerTriggerType.OPNPC1, womanId, (ctx: ScriptContext) => {
        const player = ctx.self as Player;
        const line = WOMAN_LINES[Math.floor(Math.random() * WOMAN_LINES.length)];
        messageGame(player, line);
    });
}
