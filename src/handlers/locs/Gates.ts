/**
 * Gate handlers.
 * Standard gates and special gates (Al-Kharid toll gate).
 *
 * Gate IDs: Various generic gates.
 * Al-Kharid toll gate: 2882, 2883 (requires 10gp or Prince Ali Rescue quest).
 */
import Player from '#/engine/entity/Player.js';
import ScriptProvider, { ScriptContext } from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import { messageGame, synthSound } from '#/network/server/ServerMessages.js';

const GATE_OPEN_SOUND = 67;

// Generic open gates — just let players through
const GENERIC_GATE_IDS = [1551, 1553, 1558, 1560, 2050, 2051, 2052, 2053, 2054, 2055, 2056, 2057];

for (const gateId of GENERIC_GATE_IDS) {
    ScriptProvider.register(ServerTriggerType.OPLOC1, gateId, (ctx: ScriptContext) => {
        const player = ctx.self as Player;
        synthSound(player, GATE_OPEN_SOUND, 1, 0);
        messageGame(player, 'You open the gate.');
    });
}

// Al-Kharid toll gate
const TOLL_GATE_LEFT = 2882;
const TOLL_GATE_RIGHT = 2883;
const COINS_ID = 995;
const TOLL_COST = 10;
const PRINCE_ALI_VAR = 130;

function handleTollGate(ctx: ScriptContext): void {
    const player = ctx.self as Player;

    // check Prince Ali Rescue quest completion
    if ((player.vars[PRINCE_ALI_VAR] ?? 0) >= 7) {
        messageGame(player, 'You are let through for free.');
        synthSound(player, GATE_OPEN_SOUND, 1, 0);
        return;
    }

    // check for 10gp
    const inv = player.invs.get(93);
    if (!inv || inv.getItemCount(COINS_ID) < TOLL_COST) {
        messageGame(player, 'You need 10 gold coins to pass through this gate.');
        return;
    }

    inv.remove(COINS_ID, TOLL_COST);
    synthSound(player, GATE_OPEN_SOUND, 1, 0);
    messageGame(player, 'You pay the 10 gold toll and pass through the gate.');
}

ScriptProvider.register(ServerTriggerType.OPLOC1, TOLL_GATE_LEFT, handleTollGate);
ScriptProvider.register(ServerTriggerType.OPLOC1, TOLL_GATE_RIGHT, handleTollGate);

console.log('[Locs] Gate handlers registered');
