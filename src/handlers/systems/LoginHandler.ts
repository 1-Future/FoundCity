/**
 * LOGIN trigger handler.
 * Runs when a player first enters the world after authentication.
 * Sets up initial state: default inventories, sidebar tabs, stats, welcome message.
 */
import Player from '#/engine/entity/Player.js';
import { PlayerInfoMask } from '#/engine/entity/Player.js';
import { Inventory } from '#/engine/Inventory.js';
import { InvStore } from '#/config/InvType.js';
import ScriptProvider, { ScriptContext } from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import { updateStat, updateRunEnergy, updateInvFull } from '#/network/server/ServerMessages.js';

// Standard RS225 inventory type IDs
const INV_ID = 93;
const WORN_ID = 94;
const BANK_ID = 95;

// RS225 interface component IDs for inventory display
const INV_COMPONENT = 3214;
const WORN_COMPONENT = 1688;

ScriptProvider.register(ServerTriggerType.LOGIN, -1, (ctx: ScriptContext) => {
    const player = ctx.self as Player;

    // ---- initialize default inventories if not loaded from save ----
    if (!player.invs.has(INV_ID)) {
        const invType = InvStore.get(INV_ID);
        player.invs.set(INV_ID, new Inventory(INV_ID, invType?.size ?? Player.INV_SIZE, Inventory.NORMAL_STACK));
    }
    if (!player.invs.has(WORN_ID)) {
        const wornType = InvStore.get(WORN_ID);
        player.invs.set(WORN_ID, new Inventory(WORN_ID, wornType?.size ?? Player.WORN_SIZE, Inventory.NORMAL_STACK));
    }
    if (!player.invs.has(BANK_ID)) {
        const bankType = InvStore.get(BANK_ID);
        player.invs.set(BANK_ID, new Inventory(BANK_ID, bankType?.size ?? Player.BANK_SIZE, Inventory.ALWAYS_STACK));
    }

    // ---- sidebar tabs (RS225 interface IDs) ----
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

    // ---- send all 21 stats ----
    for (let stat = 0; stat < Player.STAT_COUNT; stat++) {
        updateStat(player, stat);
    }

    // ---- send run energy ----
    updateRunEnergy(player);

    // ---- send inventory contents ----
    const inv = player.invs.get(INV_ID);
    if (inv) updateInvFull(player, INV_COMPONENT, inv);

    const worn = player.invs.get(WORN_ID);
    if (worn) updateInvFull(player, WORN_COMPONENT, worn);

    // ---- force appearance update so other players see us ----
    player.masks |= PlayerInfoMask.APPEARANCE;

    // ---- welcome message ----
    player.write({ type: 'message_game', text: 'Welcome to the server.' });

    console.log(`[Login] ${player.username} login complete (pid=${player.pid})`);
});
