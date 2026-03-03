/**
 * Default engine-level "Take" handler for ground items (OPOBJ1).
 *
 * In RS225, picking up a ground item is an engine-hardcoded behavior,
 * not a RuneScript. When no specific script is registered for the obj type,
 * this global handler fires: removes the obj from the zone, adds the item
 * to the player's main inventory, and sends an inv update.
 */

import Obj from '#/engine/entity/Obj.js';
import Player from '#/engine/entity/Player.js';
import World from '#/engine/World.js';
import ScriptProvider from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import { updateInvPartial } from '#/network/server/ServerMessages.js';
import NetworkPlayer from '#/engine/entity/NetworkPlayer.js';

// Main inventory constants (see LoginHandler for full list)
const INV_ID = 93;
const INV_COMPONENT = 3214;

console.log('[ObjTake] registering global OPOBJ1 handler');

// Register a global fallback for all OPOBJ1 (Take) interactions.
// Specific-type handlers (e.g. keys that trigger a quest) can override this
// by calling ScriptProvider.register(OPOBJ1, specificObjTypeId, handler).
ScriptProvider.registerGlobal(ServerTriggerType.OPOBJ1, (ctx) => {
    const player = ctx.self as Player;
    const obj = ctx.target as Obj;
    console.log(`[ObjTake] firing: obj.type=${obj?.type} at (${obj?.x},${obj?.z}), player=(${player?.x},${player?.z})`);

    if (!obj || !obj.isActive) return;

    const inv = player.invs.get(INV_ID);
    if (!inv) return;

    // Try to add the item; abort if inventory is full
    const result = inv.add(obj.type, obj.count);
    if (result.completed <= 0) {
        // Inventory full — leave obj on ground
        return;
    }

    // Remove from the zone permanently (duration=0 means no respawn tracking)
    World.removeObj(obj, 0);

    // Send inv update if the player is networked
    if (player instanceof NetworkPlayer) {
        const changedSlots = result.items.map(r => r.slot);
        if (changedSlots.length > 0) {
            updateInvPartial(player, INV_COMPONENT, inv, changedSlots);
        }
    }
});
