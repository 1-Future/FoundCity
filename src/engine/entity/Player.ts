import { CoordGrid } from '#/engine/CoordGrid.js';
import { BlockWalk } from '#/engine/entity/BlockWalk.js';
import BuildArea from '#/engine/entity/BuildArea.js';
import CameraInfo from '#/engine/entity/CameraInfo.js';
import { EntityLifeCycle } from '#/engine/entity/EntityLifeCycle.js';
import { EntityTimer, PlayerTimerType } from '#/engine/entity/EntityTimer.js';
import HeroPoints from '#/engine/entity/HeroPoints.js';
import { HitType } from '#/engine/entity/HitType.js';
import { Interaction } from '#/engine/entity/Interaction.js';
import { ModalState } from '#/engine/entity/ModalState.js';
import { MoveRestrict } from '#/engine/entity/MoveRestrict.js';
import { MoveSpeed } from '#/engine/entity/MoveSpeed.js';
import { MoveStrategy } from '#/engine/entity/MoveStrategy.js';
import PathingEntity from '#/engine/entity/PathingEntity.js';
import { PlayerStat } from '#/engine/entity/PlayerStat.js';
import PlayerQueueRequest, { PlayerQueueType } from '#/engine/entity/PlayerQueueRequest.js';
import { CollisionFlag } from '#/engine/GameMap.js';
import { Inventory } from '#/engine/Inventory.js';
import ScriptProvider from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import World from '#/engine/World.js';
import LinkList from '#/util/LinkList.js';

// ---- info masks ----
export const enum PlayerInfoMask {
    APPEARANCE = 0x1,
    ANIM = 0x2,
    FACE_ENTITY = 0x4,
    SAY = 0x8,
    DAMAGE = 0x10,
    FACE_COORD = 0x20,
    CHAT = 0x40,
    EXACT_MOVE = 0x100,
    SPOTANIM = 0x200,
}

// ---- XP table (RS225) ----
const XP_TABLE: number[] = new Array(100);
{
    let acc = 0;
    for (let i = 1; i < 100; i++) {
        acc += Math.floor(i + 300 * 2 ** (i / 7));
        XP_TABLE[i] = Math.floor(acc / 4) * 10;
    }
}

export function getLevelByExp(exp: number): number {
    for (let i = 98; i >= 1; i--) {
        if (exp >= XP_TABLE[i]) return Math.min(i + 1, 99);
    }
    return 1;
}

export function getExpByLevel(level: number): number {
    return XP_TABLE[level - 1] ?? 0;
}

export default class Player extends PathingEntity {
    static readonly STAT_COUNT = 21;
    static readonly INV_SIZE = 28;
    static readonly WORN_SIZE = 14;
    static readonly BANK_SIZE = 352;

    // ---- identity ----
    pid: number = -1;
    hash64: bigint = -1n;
    username: string = '';
    staffModLevel: number = 0;

    // ---- appearance ----
    gender: number = 0;
    body: number[] = [0, 0, 0, 0, 0, 0, 0];
    colors: number[] = [0, 0, 0, 0, 0];

    // ---- stats ----
    stats: Int32Array = new Int32Array(Player.STAT_COUNT);
    levels: Uint8Array = new Uint8Array(Player.STAT_COUNT);
    baseLevels: Uint8Array = new Uint8Array(Player.STAT_COUNT);

    // ---- vars (player variables, e.g. quest progress) ----
    vars: Int32Array = new Int32Array(256);

    // ---- inventories ----
    invs: Map<number, Inventory> = new Map();

    // ---- queues ----
    queue: LinkList<PlayerQueueRequest> = new LinkList();
    weakQueue: LinkList<PlayerQueueRequest> = new LinkList();
    engineQueue: LinkList<PlayerQueueRequest> = new LinkList();

    // ---- timers ----
    timers: Map<number, EntityTimer> = new Map();

    // ---- modal state ----
    modalState: number = ModalState.NONE;
    modalTop: number = -1;
    modalBottom: number = -1;
    modalSidebar: number = -1;
    refreshModalClose: boolean = false;

    // ---- combat ----
    heroPoints: HeroPoints = new HeroPoints(16);

    // ---- build area ----
    buildArea: BuildArea = new BuildArea();
    originX: number = -1;
    originZ: number = -1;
    lastZoneX: number = -1;
    lastZoneZ: number = -1;

    // ---- camera ----
    cameraPackets: LinkList<CameraInfo> = new LinkList();

    // ---- run energy ----
    runenergy: number = 10000; // stored * 100

    // ---- tracking / idle ----
    playtime: number = 0;
    requestIdleLogout: boolean = false;
    submitInput: boolean = false;
    loggingOut: boolean = false;
    delayedUntil: number = 0;
    moveClickRequest: boolean = false;

    // ---- chat ----
    chat: string = '';

    // ---- social ----
    friendList: bigint[] = [];
    ignoreList: bigint[] = [];
    socialProtect: boolean = false;

    // ---- character creation ----
    allowDesign: boolean = false;

    // ---- interaction context (set by message handlers) ----
    lastItem: number = -1;
    lastSlot: number = -1;
    lastUseItem: number = -1;
    lastUseSlot: number = -1;
    lastTargetSlot: number = -1;
    lastCom: number = -1;

    // ---- appearance ----
    combatLevel: number = 3;
    lastAppearanceTick: number = -1;

    // ---- tabs ----
    tabs: number[] = new Array(14).fill(-1);

    // ---- protect flag (script execution) ----
    protect: boolean = false;
    delayed: boolean = false;

    // ---- message buffer ----
    private buffer: any[] = [];

    constructor() {
        super(0, 3200, 3200, 1, 1, EntityLifeCycle.FOREVER, MoveRestrict.NORMAL, BlockWalk.NONE, MoveStrategy.SMART, PlayerInfoMask.FACE_COORD, PlayerInfoMask.FACE_ENTITY);
    }

    // ---- lifecycle ----

    resetEntity(_respawn: boolean): void {
        this.resetPathingEntity();
    }

    updateMovement(): boolean {
        if (this.tele) {
            this.moveSpeed = MoveSpeed.INSTANT;
            this.jump = true;
            return true;
        }
        return this.processMovement();
    }

    blockWalkFlag(): number {
        return CollisionFlag.PLAYER;
    }

    defaultMoveSpeed(): MoveSpeed {
        return MoveSpeed.WALK;
    }

    isValid(_hash64?: bigint): boolean {
        return this.pid !== -1;
    }

    // ---- stats ----

    giveStat(stat: number, xp: number): void {
        const before = this.baseLevels[stat];
        this.stats[stat] += xp;
        const after = getLevelByExp(this.stats[stat]);
        if (after > before) {
            this.baseLevels[stat] = after;
            this.levels[stat] = after;
        }
    }

    // ---- timers ----

    setTimer(type: PlayerTimerType, handlerId: number, interval: number): void {
        this.timers.set(handlerId, { type, handlerId, args: null, interval, clock: interval });
    }

    clearTimer(handlerId: number): void {
        this.timers.delete(handlerId);
    }

    // ---- modal ----

    openMainModal(interfaceId: number): void {
        this.modalState |= ModalState.MAIN;
        this.modalTop = interfaceId;
        this.refreshModalClose = false;
    }

    openChatModal(interfaceId: number): void {
        this.modalState |= ModalState.CHAT;
        this.modalBottom = interfaceId;
        this.refreshModalClose = false;
    }

    openSideModal(interfaceId: number): void {
        this.modalState |= ModalState.SIDE;
        this.modalSidebar = interfaceId;
        this.refreshModalClose = false;
    }

    closeModal(): void {
        this.modalState = ModalState.NONE;
        this.modalTop = -1;
        this.modalBottom = -1;
        this.modalSidebar = -1;
        this.refreshModalClose = true;
    }

    isModalOpen(): boolean {
        return this.modalState !== ModalState.NONE;
    }

    // ---- combat ----

    applyDamage(amount: number, type: HitType): void {
        this.damageTaken = amount;
        this.damageType = type;
        this.masks |= PlayerInfoMask.DAMAGE;
    }

    playAnimation(id: number, delay: number): void {
        this.animId = id;
        this.animDelay = delay;
        this.masks |= PlayerInfoMask.ANIM;
    }

    // ---- energy ----

    updateEnergy(): void {
        if (this.moveSpeed === MoveSpeed.RUN && this.stepsTaken > 0) {
            this.runenergy -= 67;
            if (this.runenergy < 0) this.runenergy = 0;
        } else if (this.moveSpeed !== MoveSpeed.RUN && this.runenergy < 10000) {
            this.runenergy += 15;
            if (this.runenergy > 10000) this.runenergy = 10000;
        }
    }

    // ---- scripting ----

    enqueueScript(type: PlayerQueueType, handlerId: number, args: any[] = [], delay: number = 0): void {
        const request = new PlayerQueueRequest(type, handlerId, args, delay);
        if (type === PlayerQueueType.WEAK) {
            this.weakQueue.addTail(request);
        } else if (type === PlayerQueueType.ENGINE) {
            this.engineQueue.addTail(request);
        } else {
            this.queue.addTail(request);
        }
    }

    // ---- network ----

    write(message: any): void {
        this.buffer.push(message);
    }

    addOutputMessage(message: any): void {
        this.buffer.push(message);
    }

    encodeOut(): any[] {
        const messages = [...this.buffer];
        this.buffer.length = 0;
        return messages;
    }

    // ---- persistence ----

    save(): Uint8Array {
        const data = {
            username: this.username,
            x: this.x,
            z: this.z,
            level: this.level,
            gender: this.gender,
            body: this.body,
            colors: this.colors,
            stats: Array.from(this.stats),
            levels: Array.from(this.levels),
            baseLevels: Array.from(this.baseLevels),
            vars: Array.from(this.vars),
            runenergy: this.runenergy,
            friendList: this.friendList.map(h => h.toString()),
            ignoreList: this.ignoreList.map(h => h.toString()),
        };
        return new TextEncoder().encode(JSON.stringify(data));
    }

    load(raw: Uint8Array): void {
        try {
            const data = JSON.parse(new TextDecoder().decode(raw));
            this.username = data.username ?? '';
            this.x = data.x ?? 3200;
            this.z = data.z ?? 3200;
            this.level = data.level ?? 0;
            this.gender = data.gender ?? 0;
            this.body = data.body ?? [0, 0, 0, 0, 0, 0, 0];
            this.colors = data.colors ?? [0, 0, 0, 0, 0];
            if (data.stats) this.stats.set(data.stats);
            if (data.levels) this.levels.set(data.levels);
            if (data.baseLevels) this.baseLevels.set(data.baseLevels);
            if (data.vars) this.vars.set(data.vars);
            this.runenergy = data.runenergy ?? 10000;
            this.friendList = (data.friendList ?? []).map((h: string) => BigInt(h));
            this.ignoreList = (data.ignoreList ?? []).map((h: string) => BigInt(h));
        } catch {
            console.error(`[Player] Failed to load save for ${this.username}`);
        }
    }

    // ---- network (overridden by NetworkPlayer) ----

    logout(): void {
        // base implementation — overridden in NetworkPlayer
    }

    isClientConnected(): boolean {
        return false; // overridden in NetworkPlayer
    }

    // ---- busy / access ----

    busy(): boolean {
        return this.delayed || this.isModalOpen();
    }

    canAccess(): boolean {
        return !this.protect && !this.busy();
    }

    // ---- per-tick processing ----

    /**
     * Main per-tick player processing. Called during World.processPlayers().
     * Handles queues, timers, walktriggers, and interaction.
     */
    turn(): void {
        this.processEngineQueue();
        this.processTimers(PlayerTimerType.NORMAL);
        this.processTimers(PlayerTimerType.SOFT);
        this.processQueues();
        this.processWalktrigger();
    }

    processEngineQueue(): void {
        for (const req of this.engineQueue.all()) {
            if (req.delay > 0) {
                req.delay--;
                continue;
            }
            const handler = ScriptProvider.getByTrigger(req.type === PlayerQueueType.ENGINE ? ServerTriggerType.QUEUE1 + req.handlerId : ServerTriggerType.QUEUE1, 0);
            if (handler) {
                handler({ self: this, args: req.args });
            }
            req.unlink();
        }
    }

    processQueues(): void {
        this.processQueue();
        this.processWeakQueue();
    }

    private processQueue(): void {
        for (const req of this.queue.all()) {
            if (req.delay > 0) {
                req.delay--;
                continue;
            }
            if (!this.canAccess()) continue;

            const trigger = ServerTriggerType.QUEUE1 + req.handlerId;
            const handler = ScriptProvider.getByTrigger(trigger, 0);
            if (handler) {
                handler({ self: this, args: req.args });
            }
            req.unlink();
        }
    }

    private processWeakQueue(): void {
        for (const req of this.weakQueue.all()) {
            if (req.delay > 0) {
                req.delay--;
                continue;
            }

            const trigger = ServerTriggerType.QUEUE1 + req.handlerId;
            const handler = ScriptProvider.getByTrigger(trigger, 0);
            if (handler) {
                handler({ self: this, args: req.args });
            }
            req.unlink();
        }
    }

    processTimers(type: PlayerTimerType): void {
        for (const [id, timer] of this.timers) {
            if (timer.type !== type) continue;

            timer.clock--;
            if (timer.clock > 0) continue;
            timer.clock = timer.interval;

            // SOFT timers execute even when busy; NORMAL timers check canAccess
            if (type === PlayerTimerType.NORMAL && !this.canAccess()) continue;

            const handler = ScriptProvider.getByTrigger(
                type === PlayerTimerType.SOFT ? ServerTriggerType.SOFTTIMER : ServerTriggerType.TIMER,
                id
            );
            if (handler) {
                this.protect = type === PlayerTimerType.NORMAL;
                handler({ self: this });
                this.protect = false;
            }
        }
    }

    private processWalktrigger(): void {
        if (this.stepsTaken === 0) return;
        const handler = ScriptProvider.getByTrigger(ServerTriggerType.WALKTRIGGER, 0);
        if (handler) {
            handler({ self: this });
        }
    }

    // ---- combat level ----

    getCombatLevel(): number {
        const attack = this.baseLevels[PlayerStat.ATTACK] ?? 1;
        const strength = this.baseLevels[PlayerStat.STRENGTH] ?? 1;
        const defence = this.baseLevels[PlayerStat.DEFENCE] ?? 1;
        const hitpoints = this.baseLevels[PlayerStat.HITPOINTS] ?? 10;
        const prayer = this.baseLevels[PlayerStat.PRAYER] ?? 1;
        const ranged = this.baseLevels[PlayerStat.RANGED] ?? 1;
        const magic = this.baseLevels[PlayerStat.MAGIC] ?? 1;

        const base = 0.25 * (defence + hitpoints + Math.floor(prayer / 2));
        const melee = 0.325 * (attack + strength);
        const range = 0.325 * (Math.floor(ranged * 3 / 2));
        const mage = 0.325 * (Math.floor(magic * 3 / 2));

        return Math.floor(base + Math.max(melee, range, mage));
    }

    updateCombatLevel(): void {
        const newLevel = this.getCombatLevel();
        if (newLevel !== this.combatLevel) {
            this.combatLevel = newLevel;
            this.masks |= PlayerInfoMask.APPEARANCE;
        }
    }

    // ---- zone triggers ----

    triggerMapzone(): void {
        const handler = ScriptProvider.getByTrigger(ServerTriggerType.MAPZONE, 0);
        if (handler) {
            handler({ self: this });
        }
    }

    triggerZone(): void {
        const handler = ScriptProvider.getByTrigger(ServerTriggerType.ZONE, 0);
        if (handler) {
            handler({ self: this });
        }
    }
}
