import ConfigStore from '#/config/ConfigStore.js';

/**
 * Inventory type — defines an inventory container.
 * Ref: lostcity-ref cache/config/InvType.ts
 */
export interface InvType {
    id: number;
    debugname?: string;
    scope: number;               // SCOPE_TEMP(0), SCOPE_PERM(1), SCOPE_SHARED(2)
    size: number;                // capacity
    stackall: boolean;           // if true, all items stack
    restock: boolean;            // if true, shop restocking enabled
    allstock: boolean;           // if true, shop accepts all items
    stockobj: number[];          // default stock item IDs
    stockcount: number[];        // default stock counts
    stockrate: number[];         // restock rate per item (ticks)
    protect: boolean;            // prevent item loss on death
    runweight: boolean;          // items affect run weight
    dummyinv: number;            // linked dummy inventory ID
}

export const INV_SCOPE_TEMP = 0;
export const INV_SCOPE_PERM = 1;
export const INV_SCOPE_SHARED = 2;

export const InvStore = new ConfigStore<InvType>();

export function defaultInv(id: number): InvType {
    return {
        id, scope: INV_SCOPE_TEMP, size: 1, stackall: false,
        restock: false, allstock: false,
        stockobj: [], stockcount: [], stockrate: [],
        protect: true, runweight: true, dummyinv: -1
    };
}
