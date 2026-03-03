/**
 * Shop system — manages shared shop inventories and buy/sell operations.
 *
 * Each shop is a world-level Inventory with restock enabled.
 * InvType config provides stockobj[], stockcount[], stockrate[].
 * The World cleanup phase handles restocking via InvType.restock flag.
 */
import { Inventory } from '#/engine/Inventory.js';
import { InvStore, InvType } from '#/config/InvType.js';
import World from '#/engine/World.js';
import Player from '#/engine/entity/Player.js';
import { messageGame, ifOpenMainSide, updateInvFull } from '#/network/server/ServerMessages.js';

// RS225 shop interface component IDs
const SHOP_MAIN_COMPONENT = 3824;
const SHOP_SIDE_COMPONENT = 3822;
const SHOP_INV_COMPONENT = 3900;
const INV_SIDE_COMPONENT = 3823;

const INV_ID = 93;
const COINS_ID = 995;

// Cache of initialized shop inventories by inv type ID
const shopInvs: Map<number, Inventory> = new Map();

/**
 * Get or create a shop inventory from the InvStore config.
 */
export function getShopInv(shopInvId: number): Inventory | null {
    // check cache
    let inv = shopInvs.get(shopInvId);
    if (inv) return inv;

    // look up config
    const invType = InvStore.get(shopInvId);
    if (!invType) return null;

    // create shop inventory with always-stack
    inv = new Inventory(shopInvId, invType.size, Inventory.ALWAYS_STACK);

    // populate stock from config
    if (invType.stockobj) {
        for (let i = 0; i < invType.stockobj.length; i++) {
            const objId = invType.stockobj[i];
            const count = invType.stockcount?.[i] ?? 0;
            if (objId > 0 && count > 0) {
                inv.set(i, { id: objId, count });
            }
        }
        inv.stockObjIds = invType.stockobj.filter(id => id > 0);
    }

    shopInvs.set(shopInvId, inv);

    // register with world for restocking
    World.shared.invs.add(inv);

    return inv;
}

/**
 * Open a shop interface for a player.
 */
export function openShop(player: Player, shopInvId: number, shopName: string = 'Shop'): void {
    const shopInv = getShopInv(shopInvId);
    if (!shopInv) {
        messageGame(player, 'This shop is not available.');
        return;
    }

    // open shop interface
    ifOpenMainSide(player, SHOP_MAIN_COMPONENT, SHOP_SIDE_COMPONENT);

    // send shop inventory
    updateInvFull(player, SHOP_INV_COMPONENT, shopInv);

    // send player inventory in side panel
    const inv = player.invs.get(INV_ID);
    if (inv) updateInvFull(player, INV_SIDE_COMPONENT, inv);

    messageGame(player, shopName);
}

/**
 * Buy an item from a shop.
 */
export function buyItem(player: Player, shopInvId: number, slot: number, count: number = 1): boolean {
    const shopInv = getShopInv(shopInvId);
    if (!shopInv) return false;

    const shopItem = shopInv.get(slot);
    if (!shopItem || shopItem.count <= 0) {
        messageGame(player, 'This item is out of stock.');
        return false;
    }

    const inv = player.invs.get(INV_ID);
    if (!inv) return false;

    // calculate price (simplified — 1gp base, should come from obj config)
    const price = 1; // TODO: look up obj value from config
    const totalCost = price * count;

    // check coins
    if (inv.getItemCount(COINS_ID) < totalCost) {
        messageGame(player, "You don't have enough coins.");
        return false;
    }

    const buyCount = Math.min(count, shopItem.count);

    // remove coins
    inv.remove(COINS_ID, price * buyCount);

    // add item to player
    const tx = inv.add(shopItem.id, buyCount);
    if (tx.hasFailed()) {
        // refund coins
        inv.add(COINS_ID, price * buyCount);
        messageGame(player, "You don't have enough inventory space.");
        return false;
    }

    // remove from shop
    shopInv.remove(shopItem.id, buyCount, slot);

    return true;
}

/**
 * Sell an item to a shop.
 */
export function sellItem(player: Player, shopInvId: number, itemSlot: number, count: number = 1): boolean {
    const shopInv = getShopInv(shopInvId);
    if (!shopInv) return false;

    const inv = player.invs.get(INV_ID);
    if (!inv) return false;

    const item = inv.get(itemSlot);
    if (!item) return false;

    // sell price (simplified — 1gp, should come from obj config)
    const sellPrice = 1; // TODO: look up obj value from config

    const sellCount = Math.min(count, item.count);

    // remove item from player
    const tx = inv.remove(item.id, sellCount, itemSlot);
    if (tx.hasFailed()) return false;

    // add coins to player
    inv.add(COINS_ID, sellPrice * sellCount);

    // add item to shop
    shopInv.add(item.id, sellCount);

    return true;
}
