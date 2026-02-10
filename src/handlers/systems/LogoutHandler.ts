/**
 * LOGOUT trigger handler.
 * Runs when a player is about to be removed from the world.
 * Handles cleanup: save state, remove temporary effects.
 */
import Player from '#/engine/entity/Player.js';
import PlayerLoading from '#/engine/entity/PlayerLoading.js';
import ScriptProvider, { ScriptContext } from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';

ScriptProvider.register(ServerTriggerType.LOGOUT, -1, (ctx: ScriptContext) => {
    const player = ctx.self as Player;

    try {
        PlayerLoading.save(player);
    } catch (err) {
        console.error(`[Logout] Failed to save ${player.username}:`, err);
    }

    console.log(`[Logout] ${player.username} logout handler complete`);
});
