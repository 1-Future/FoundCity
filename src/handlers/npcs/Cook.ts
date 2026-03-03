/**
 * Cook — Lumbridge Castle kitchen (NPC ID: 278).
 * Op1: Talk-to — Cook's Assistant quest intro dialogue.
 */
import Player from '#/engine/entity/Player.js';
import ScriptProvider, { ScriptContext } from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import { messageGame } from '#/network/server/ServerMessages.js';

const COOK_ID = 278;

// Cook's Assistant quest var index
const COOKS_ASSISTANT_VAR = 29;

// Quest stages
const QUEST_NOT_STARTED = 0;
const QUEST_STARTED = 1;
const QUEST_COMPLETE = 2;

// Required items (obj IDs)
const BUCKET_OF_MILK = 1927;
const EGG = 1944;
const POT_OF_FLOUR = 1933;

ScriptProvider.register(ServerTriggerType.OPNPC1, COOK_ID, (ctx: ScriptContext) => {
    const player = ctx.self as Player;
    const questState = player.vars[COOKS_ASSISTANT_VAR] ?? QUEST_NOT_STARTED;

    switch (questState) {
        case QUEST_NOT_STARTED:
            messageGame(player, 'What am I to do? I need to make the Duke\'s birthday cake!');
            messageGame(player, 'I need a bucket of milk, an egg, and a pot of flour.');
            messageGame(player, 'Can you help me? Please bring me these items.');
            // start quest
            player.vars[COOKS_ASSISTANT_VAR] = QUEST_STARTED;
            break;

        case QUEST_STARTED: {
            // check if player has all items
            const inv = player.invs.get(93); // inventory ID
            if (!inv) {
                messageGame(player, 'Please bring me a bucket of milk, an egg, and a pot of flour.');
                return;
            }

            const hasMilk = inv.contains(BUCKET_OF_MILK);
            const hasEgg = inv.contains(EGG);
            const hasFlour = inv.contains(POT_OF_FLOUR);

            if (hasMilk && hasEgg && hasFlour) {
                inv.remove(BUCKET_OF_MILK, 1);
                inv.remove(EGG, 1);
                inv.remove(POT_OF_FLOUR, 1);
                player.vars[COOKS_ASSISTANT_VAR] = QUEST_COMPLETE;
                messageGame(player, 'Thank you so much! You\'ve saved the day!');
                messageGame(player, 'Quest complete: Cook\'s Assistant.');
                // award cooking XP
                player.giveStat(7, 3000); // cooking stat = 7, 300 xp * 10
            } else {
                messageGame(player, 'I still need:');
                if (!hasMilk) messageGame(player, '  - A bucket of milk');
                if (!hasEgg) messageGame(player, '  - An egg');
                if (!hasFlour) messageGame(player, '  - A pot of flour');
            }
            break;
        }

        case QUEST_COMPLETE:
            messageGame(player, 'Thanks again for helping me with the Duke\'s cake!');
            break;
    }
});
