/**
 * Bank booth loc handlers.
 * OPLOC1 (Use) — opens bank interface.
 *
 * Bank booth loc IDs: 2213 (standard bank booth)
 */
import Player from '#/engine/entity/Player.js';
import { Inventory } from '#/engine/Inventory.js';
import { InvStore } from '#/config/InvType.js';
import ScriptProvider, { ScriptContext } from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import { messageGame, ifOpenMainSide, updateInvFull } from '#/network/server/ServerMessages.js';

const BANK_BOOTH_IDS = [2213, 2214];
const BANK_MAIN_COMPONENT = 5292;
const BANK_SIDE_COMPONENT = 5063;
const BANK_INV_COMPONENT = 5382;
const INV_SIDE_COMPONENT = 5064;
const BANK_ID = 95;
const INV_ID = 93;

function openBank(player: Player): void {
    if (!player.invs.has(BANK_ID)) {
        const bankType = InvStore.get(BANK_ID);
        player.invs.set(BANK_ID, new Inventory(BANK_ID, bankType?.size ?? 352, Inventory.ALWAYS_STACK));
    }

    ifOpenMainSide(player, BANK_MAIN_COMPONENT, BANK_SIDE_COMPONENT);

    const bank = player.invs.get(BANK_ID);
    if (bank) updateInvFull(player, BANK_INV_COMPONENT, bank);

    const inv = player.invs.get(INV_ID);
    if (inv) updateInvFull(player, INV_SIDE_COMPONENT, inv);
}

for (const boothId of BANK_BOOTH_IDS) {
    ScriptProvider.register(ServerTriggerType.OPLOC1, boothId, (ctx: ScriptContext) => {
        openBank(ctx.self as Player);
    });

    // Op2 is also common for bank booths
    ScriptProvider.register(ServerTriggerType.OPLOC2, boothId, (ctx: ScriptContext) => {
        openBank(ctx.self as Player);
    });
}

console.log('[Locs] Bank booth handlers registered');
