/**
 * Cook's Assistant quest.
 *
 * Quest var: 29 (COOKS_ASSISTANT)
 * Stages: 0 = not started, 1 = started, 2 = complete
 *
 * Requirements: None
 * Items needed: Bucket of milk (1927), Egg (1944), Pot of flour (1933)
 * Rewards: 300 Cooking XP, access to Cook's range
 *
 * The Cook NPC handler (npcs/Cook.ts) handles the main dialogue.
 * This file registers the quest journal interface handler.
 */
import Player from '#/engine/entity/Player.js';
import ScriptProvider, { ScriptContext } from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import { ifSetText, ifOpenMain } from '#/network/server/ServerMessages.js';

// Quest journal interface (RS225)
const QUEST_JOURNAL_COMPONENT = 275;
const QUEST_JOURNAL_TITLE = 276;
const QUEST_JOURNAL_LINE_START = 277; // lines 277-296

// Cook's Assistant quest var
export const COOKS_ASSISTANT_VAR = 29;

/**
 * Quest journal: IF_BUTTON on quest list entry.
 * Component for Cook's Assistant in the quest sidebar.
 */
ScriptProvider.register(ServerTriggerType.IF_BUTTON, 274, (ctx: ScriptContext) => {
    const player = ctx.self as Player;
    const state = player.vars[COOKS_ASSISTANT_VAR] ?? 0;

    ifOpenMain(player, QUEST_JOURNAL_COMPONENT);
    ifSetText(player, QUEST_JOURNAL_TITLE, "Cook's Assistant");

    let line = QUEST_JOURNAL_LINE_START;

    if (state === 0) {
        ifSetText(player, line++, 'I can start this quest by speaking to the');
        ifSetText(player, line++, 'Cook in Lumbridge Castle.');
        ifSetText(player, line++, '');
        ifSetText(player, line++, 'Requirements: None');
    } else if (state === 1) {
        ifSetText(player, line++, 'The Cook needs me to bring him:');
        ifSetText(player, line++, '');

        const inv = player.invs.get(93);
        const hasMilk = inv?.contains(1927) ?? false;
        const hasEgg = inv?.contains(1944) ?? false;
        const hasFlour = inv?.contains(1933) ?? false;

        ifSetText(player, line++, hasMilk ? '<str>A bucket of milk</str>' : 'A bucket of milk');
        ifSetText(player, line++, hasEgg ? '<str>An egg</str>' : 'An egg');
        ifSetText(player, line++, hasFlour ? '<str>A pot of flour</str>' : 'A pot of flour');
    } else {
        ifSetText(player, line++, '<str>Quest Complete!</str>');
        ifSetText(player, line++, '');
        ifSetText(player, line++, 'I helped the Cook make a cake for the');
        ifSetText(player, line++, "Duke's birthday party.");
        ifSetText(player, line++, '');
        ifSetText(player, line++, 'Rewards:');
        ifSetText(player, line++, '  300 Cooking XP');
    }

    // clear remaining lines
    while (line <= 296) {
        ifSetText(player, line++, '');
    }
});

console.log('[Quests] Cook\'s Assistant registered');
