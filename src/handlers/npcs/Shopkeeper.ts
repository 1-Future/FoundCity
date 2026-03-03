/**
 * General Store Shopkeeper (NPC ID: 520) and Shop Assistant (NPC ID: 522).
 * Op1: Talk-to — opens general store.
 * Op2: Trade — opens general store directly.
 *
 * Uses the general store inventory (inv ID 4 in RS225 configs).
 */
import Player from '#/engine/entity/Player.js';
import ScriptProvider, { ScriptContext } from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import { openShop } from '#/engine/ShopSystem.js';

const SHOPKEEPER_ID = 520;
const SHOP_ASSISTANT_ID = 522;

// General store inventory type ID (varies by location — use Lumbridge default)
const GENERAL_STORE_INV = 4;

function openGeneralStore(player: Player): void {
    openShop(player, GENERAL_STORE_INV, 'Lumbridge General Store');
}

ScriptProvider.register(ServerTriggerType.OPNPC1, SHOPKEEPER_ID, (ctx: ScriptContext) => {
    openGeneralStore(ctx.self as Player);
});

ScriptProvider.register(ServerTriggerType.OPNPC2, SHOPKEEPER_ID, (ctx: ScriptContext) => {
    openGeneralStore(ctx.self as Player);
});

ScriptProvider.register(ServerTriggerType.OPNPC1, SHOP_ASSISTANT_ID, (ctx: ScriptContext) => {
    openGeneralStore(ctx.self as Player);
});

ScriptProvider.register(ServerTriggerType.OPNPC2, SHOP_ASSISTANT_ID, (ctx: ScriptContext) => {
    openGeneralStore(ctx.self as Player);
});
