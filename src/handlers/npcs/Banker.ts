/**
 * Banker NPCs (IDs: 494, 495).
 * Op1: Talk-to — opens bank interface.
 */
import Player from '#/engine/entity/Player.js';
import { Inventory } from '#/engine/Inventory.js';
import { InvStore } from '#/config/InvType.js';
import ScriptProvider, { ScriptContext } from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import { messageGame, ifOpenMainSide, updateInvFull } from '#/network/server/ServerMessages.js';

const BANKER_IDS = [494, 495];

// RS225 bank interface + side inventory
const BANK_MAIN_COMPONENT = 5292;
const BANK_SIDE_COMPONENT = 5063;
const BANK_INV_COMPONENT = 5382;
const INV_COMPONENT = 5064;

const BANK_ID = 95;
const INV_ID = 93;

function openBank(player: Player): void {
    // ensure bank inventory exists
    if (!player.invs.has(BANK_ID)) {
        const bankType = InvStore.get(BANK_ID);
        player.invs.set(BANK_ID, new Inventory(BANK_ID, bankType?.size ?? 352, Inventory.ALWAYS_STACK));
    }

    // open bank interface
    ifOpenMainSide(player, BANK_MAIN_COMPONENT, BANK_SIDE_COMPONENT);

    // send bank contents
    const bank = player.invs.get(BANK_ID);
    if (bank) updateInvFull(player, BANK_INV_COMPONENT, bank);

    // send inventory contents for side panel
    const inv = player.invs.get(INV_ID);
    if (inv) updateInvFull(player, INV_COMPONENT, inv);

    messageGame(player, 'The banker opens your bank box.');
}

for (const bankerId of BANKER_IDS) {
    ScriptProvider.register(ServerTriggerType.OPNPC1, bankerId, (ctx: ScriptContext) => {
        const player = ctx.self as Player;
        openBank(player);
    });
}
