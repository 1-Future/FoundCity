/**
 * LOGIN trigger handler.
 * Runs when a player first enters the world after authentication.
 * Sets up initial state: default inventory, sidebar tabs, welcome message.
 */
import Player from '#/engine/entity/Player.js';
import ScriptProvider, { ScriptContext } from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';

ScriptProvider.register(ServerTriggerType.LOGIN, -1, (ctx: ScriptContext) => {
    const player = ctx.self as Player;

    // send welcome message
    player.write({ type: 'message_game', message: 'Welcome to the server.' });

    // set default sidebar tabs (matching RS225 interface IDs)
    player.write({ type: 'if_set_tab', tab: 0, component: 2423 });  // combat
    player.write({ type: 'if_set_tab', tab: 1, component: 3917 });  // stats
    player.write({ type: 'if_set_tab', tab: 2, component: 638 });   // quests
    player.write({ type: 'if_set_tab', tab: 3, component: 3213 });  // inventory
    player.write({ type: 'if_set_tab', tab: 4, component: 1644 });  // equipment
    player.write({ type: 'if_set_tab', tab: 5, component: 5608 });  // prayer
    player.write({ type: 'if_set_tab', tab: 6, component: 1151 });  // magic
    player.write({ type: 'if_set_tab', tab: 9, component: 5065 });  // friends
    player.write({ type: 'if_set_tab', tab: 10, component: 5715 }); // ignores
    player.write({ type: 'if_set_tab', tab: 11, component: 2449 }); // logout
    player.write({ type: 'if_set_tab', tab: 12, component: 904 });  // settings
    player.write({ type: 'if_set_tab', tab: 13, component: 147 });  // emotes

    console.log(`[Login] ${player.username} login handler complete`);
});
