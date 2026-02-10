type Item = { id: number; count: number };
type TransactionResult = { slot: number; item: Item };

export class InventoryTransaction {
    requested = 0;
    completed = 0;
    items: TransactionResult[] = [];

    constructor(requested: number, completed: number = 0, items: TransactionResult[] = []) {
        this.requested = requested;
        this.completed = completed;
        this.items = items;
    }

    getLeftOver() {
        return this.requested - this.completed;
    }

    hasSucceeded() {
        return this.completed == this.requested;
    }

    hasFailed() {
        return !this.hasSucceeded();
    }

    revert(from: Inventory) {
        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i].item;
            from.remove(item.id, item.count, this.items[i].slot);
        }
    }
}

export interface InventoryListener {
    type: number;
    com: number;
    source: number;
    firstSeen: boolean;
}

export class Inventory {
    static STACK_LIMIT = 0x7fffffff;

    static NORMAL_STACK = 0;
    static ALWAYS_STACK = 1;
    static NEVER_STACK = 2;

    readonly stackType: number;
    readonly capacity: number;
    readonly type: number;
    readonly items: (Item | null)[];

    update = false;

    // stock objects that persist at 0 count (for shops)
    stockObjIds: number[] = [];

    constructor(type: number, capacity: number, stackType = Inventory.NORMAL_STACK) {
        this.type = type;
        this.capacity = capacity;
        this.stackType = stackType;
        this.items = new Array(capacity).fill(null);
    }

    contains(id: number) {
        return this.items.some(item => item && item.id == id);
    }

    hasAt(slot: number, id: number) {
        const item = this.items[slot];
        return item && item.id == id;
    }

    get nextFreeSlot() {
        return this.items.indexOf(null, 0);
    }

    get freeSlotCount() {
        return this.items.filter(item => item == null).length;
    }

    get occupiedSlotCount() {
        return this.items.filter(item => item != null).length;
    }

    get isFull() {
        return this.occupiedSlotCount == this.capacity;
    }

    get isEmpty() {
        return this.occupiedSlotCount == 0;
    }

    get hasAny() {
        return this.items.some(item => item != null);
    }

    get hasSpace() {
        return this.nextFreeSlot != -1;
    }

    get itemsFiltered() {
        return this.items.filter(item => item != null) as Item[];
    }

    getItemCount(id: number) {
        let count = 0;
        for (let i = 0; i < this.capacity; i++) {
            const item = this.items[i];
            if (item && item.id == id) {
                count += item.count;
            }
        }
        return Math.min(Inventory.STACK_LIMIT, count);
    }

    getItemIndex(id: number) {
        return this.items.findIndex(item => item && item.id == id);
    }

    removeAll() {
        this.items.fill(null, 0, this.capacity);
        this.update = true;
    }

    isStackable(id: number): boolean {
        if (this.stackType === Inventory.ALWAYS_STACK) return true;
        if (this.stackType === Inventory.NEVER_STACK) return false;
        // NORMAL_STACK: depends on item config — for now default to non-stackable
        // Config system will provide this later
        return false;
    }

    add(id: number, count = 1, beginSlot = -1, assureFullInsertion = true, forceNoStack = false, dryRun = false) {
        const stack = !forceNoStack && this.stackType != Inventory.NEVER_STACK && (this.isStackable(id) || this.stackType == Inventory.ALWAYS_STACK);
        const stockObj = this.stockObjIds.includes(id);

        let previousCount = 0;
        if (stack) {
            previousCount = this.getItemCount(id);
        }

        if (previousCount == Inventory.STACK_LIMIT) {
            return new InventoryTransaction(count, 0, []);
        }

        const freeSlotCount = this.freeSlotCount;
        if (freeSlotCount == 0 && (!stack || (stack && previousCount == 0 && !stockObj))) {
            return new InventoryTransaction(count, 0, []);
        }

        if (assureFullInsertion) {
            if (stack && previousCount > Inventory.STACK_LIMIT - count) {
                return new InventoryTransaction(count, 0, []);
            }
            if (!stack && count > freeSlotCount) {
                return new InventoryTransaction(count, 0, []);
            }
        } else {
            if (stack && previousCount == Inventory.STACK_LIMIT) {
                return new InventoryTransaction(count, 0, []);
            } else if (!stack && freeSlotCount == 0) {
                return new InventoryTransaction(count, 0, []);
            }
        }

        let completed = 0;
        const added: TransactionResult[] = [];

        if (!stack) {
            const startSlot = Math.max(0, beginSlot);
            for (let i = startSlot; i < this.capacity; i++) {
                if (this.items[i] != null) continue;
                const add = { id, count: 1 };
                if (!dryRun) {
                    this.set(i, add);
                }
                added.push({ slot: i, item: add });
                if (++completed >= count) break;
            }
        } else {
            let stackIndex = this.getItemIndex(id);
            if (stackIndex == -1) {
                if (beginSlot == -1) {
                    stackIndex = this.nextFreeSlot;
                } else {
                    stackIndex = this.items.indexOf(null, beginSlot);
                }
                if (stackIndex == -1) {
                    return new InventoryTransaction(count, completed, []);
                }
            }
            const stackCount = this.get(stackIndex)?.count ?? 0;
            const total = Math.min(Inventory.STACK_LIMIT, stackCount + count);
            const add = { id, count: total };
            if (!dryRun) {
                this.set(stackIndex, add);
            }
            added.push({ slot: stackIndex, item: add });
            completed = total - stackCount;
        }

        return new InventoryTransaction(count, completed, added);
    }

    remove(id: number, count = 1, beginSlot = -1, assureFullRemoval = false) {
        const hasCount = this.getItemCount(id);
        const stockObj = this.stockObjIds.includes(id);

        if (assureFullRemoval && hasCount < count) {
            return new InventoryTransaction(count, 0, []);
        } else if (!assureFullRemoval && hasCount < 1) {
            return new InventoryTransaction(count, 0, []);
        }

        let totalRemoved = 0;
        const removed: TransactionResult[] = [];

        let index = 0;
        if (beginSlot != -1) {
            index = beginSlot;
        }

        for (let i = index; i < this.capacity; i++) {
            const curItem = this.items[i];
            if (!curItem || curItem.id != id) continue;

            const removeCount = Math.min(curItem.count, count - totalRemoved);
            totalRemoved += removeCount;

            curItem.count -= removeCount;
            if (curItem.count == 0 && !stockObj) {
                const removedItem = this.items[i];
                this.items[i] = null;
                if (removedItem) {
                    removed.push({ slot: i, item: removedItem });
                }
            }

            if (totalRemoved >= count) break;
        }

        if (totalRemoved > 0) {
            this.update = true;
        }

        return new InventoryTransaction(count, totalRemoved, removed);
    }

    delete(slot: number) {
        this.items[slot] = null;
        this.update = true;
    }

    swap(from: number, to: number) {
        const temp = this.items[from];
        this.set(from, this.items[to]);
        this.set(to, temp);
    }

    get(slot: number) {
        return this.items[slot];
    }

    set(slot: number, item: Item | null) {
        this.items[slot] = item;
        this.update = true;
    }

    validSlot(slot: number) {
        return slot >= 0 && slot < this.capacity;
    }

    transfer(to: Inventory, item: Item, fromSlot = -1, toSlot = -1) {
        if (item.count <= 0) {
            return null;
        }

        const count = Math.min(item.count, this.getItemCount(item.id));
        const finalItem = { id: item.id, count };

        const add = to.add(finalItem.id, finalItem.count, toSlot, false);
        if (add.completed == 0) {
            return null;
        }

        const remove = this.remove(item.id, add.completed, fromSlot, false);
        if (remove.completed == 0) {
            return null;
        }

        return remove;
    }
}
