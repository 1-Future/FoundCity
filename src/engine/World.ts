import { EntityLifeCycle } from '#/engine/entity/EntityLifeCycle.js';
import { NpcList, PlayerList } from '#/engine/entity/EntityList.js';
import { HuntModeType } from '#/engine/entity/hunt/HuntModeType.js';
import Loc from '#/engine/entity/Loc.js';
import LocObjEvent from '#/engine/entity/LocObjEvent.js';
import NetworkPlayer, { isClientConnected } from '#/engine/entity/NetworkPlayer.js';
import Npc from '#/engine/entity/Npc.js';
import NpcEventRequest, { NpcEventType } from '#/engine/entity/NpcEventRequest.js';
import Obj from '#/engine/entity/Obj.js';
import { ObjDelayedRequest } from '#/engine/entity/ObjDelayedRequest.js';
import Player from '#/engine/entity/Player.js';
import { PlayerTimerType } from '#/engine/entity/EntityTimer.js';
import { PlayerQueueType } from '#/engine/entity/PlayerQueueRequest.js';
import GameMap, { setGameMap } from '#/engine/GameMap.js';
import { Inventory } from '#/engine/Inventory.js';
import { InvStore } from '#/config/InvType.js';
import { HuntStore } from '#/config/HuntType.js';
import ScriptProvider from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import { WorldStat } from '#/engine/WorldStat.js';
import Zone from '#/engine/zone/Zone.js';
import ZoneMap from '#/engine/zone/ZoneMap.js';
import Environment from '#/util/Environment.js';
import LinkList from '#/util/LinkList.js';

export default class World {
    static readonly TICK_RATE: number = 600; // ms per tick
    static readonly TIMEOUT_IDLE: number = 75; // ticks before idle logout request
    static readonly TIMEOUT_NO_RESPONSE: number = 100; // ticks before force logout (60s)
    static readonly TIMEOUT_NO_CONNECTION: number = 50; // ticks before connection-lost logout (30s)

    // ---- singleton ----
    private static instance: World;
    static get shared(): World {
        return World.instance;
    }

    // ---- static accessors (match lostcity-ref import pattern) ----
    static currentTick: number = 0;
    static gameMap: GameMap;
    static cycleStats: Int32Array = new Int32Array(12);

    static getZone(x: number, z: number, level: number): Zone {
        return World.gameMap.getZone(x, z, level);
    }

    static getZoneIndex(x: number, z: number, level: number): number {
        return World.gameMap.getZoneIndex(x, z, level);
    }

    static getPlayerByHash64(hash64: bigint): Player | undefined {
        for (const player of World.instance.players) {
            if (player && player.hash64 === hash64) return player;
        }
        return undefined;
    }

    static getPlayerByUsername(username: string): Player | undefined {
        const lower = username.toLowerCase();
        for (const player of World.instance.players) {
            if (player && player.username.toLowerCase() === lower) return player;
        }
        return undefined;
    }

    // ---- entity management (static, matching lostcity-ref) ----

    static addLoc(loc: Loc, duration: number): void {
        const zone = World.gameMap.getZone(loc.x, loc.z, loc.level);
        zone.addLoc(loc);
        if (duration > 0) {
            loc.setLifeCycle(duration);
            loc.lastLifecycleTick = World.currentTick;
            const event = new LocObjEvent(loc);
            loc.eventTracker = event;
            World.instance.locObjTracker.addTail(event);
        }
    }

    static removeLoc(loc: Loc, duration: number): void {
        const zone = World.gameMap.getZone(loc.x, loc.z, loc.level);
        zone.removeLoc(loc);
        if (duration > 0) {
            loc.setLifeCycle(duration);
            loc.lastLifecycleTick = World.currentTick;
            const event = new LocObjEvent(loc);
            loc.eventTracker = event;
            World.instance.locObjTracker.addTail(event);
        }
    }

    static changeLoc(loc: Loc, newType: number, shape: number, angle: number, duration: number): void {
        const zone = World.gameMap.getZone(loc.x, loc.z, loc.level);
        loc.change(newType, shape, angle);
        zone.changeLoc(loc);
        if (duration > 0) {
            loc.setLifeCycle(duration);
            loc.lastLifecycleTick = World.currentTick;
            const event = new LocObjEvent(loc);
            loc.eventTracker = event;
            World.instance.locObjTracker.addTail(event);
        }
    }

    static revertLoc(loc: Loc): void {
        const zone = World.gameMap.getZone(loc.x, loc.z, loc.level);
        loc.revert();
        zone.changeLoc(loc);
    }

    static addObj(obj: Obj, receiver: bigint, duration: number): void {
        const zone = World.gameMap.getZone(obj.x, obj.z, obj.level);
        obj.receiver64 = receiver;
        zone.addObj(obj, receiver);
        if (duration > 0) {
            obj.setLifeCycle(duration);
            obj.lastLifecycleTick = World.currentTick;
            const event = new LocObjEvent(obj);
            obj.eventTracker = event;
            World.instance.locObjTracker.addTail(event);
        }
    }

    static removeObj(obj: Obj, duration: number): void {
        const zone = World.gameMap.getZone(obj.x, obj.z, obj.level);
        zone.removeObj(obj);
        if (duration > 0) {
            obj.setLifeCycle(duration);
            obj.lastLifecycleTick = World.currentTick;
            const event = new LocObjEvent(obj);
            obj.eventTracker = event;
            World.instance.locObjTracker.addTail(event);
        }
    }

    static revealObj(obj: Obj): void {
        const zone = World.gameMap.getZone(obj.x, obj.z, obj.level);
        zone.revealObj(obj);
    }

    static changeObj(obj: Obj, newCount: number): void {
        const zone = World.gameMap.getZone(obj.x, obj.z, obj.level);
        zone.changeObj(obj, obj.count, newCount);
    }

    // ---- instance properties ----
    readonly players: PlayerList;
    readonly npcs: NpcList;
    readonly invs: Set<Inventory> = new Set();
    readonly locObjTracker: LinkList<LocObjEvent> = new LinkList();
    readonly objDelayedQueue: LinkList<ObjDelayedRequest> = new LinkList();
    readonly npcEventQueue: LinkList<NpcEventRequest> = new LinkList();
    readonly newPlayers: Player[] = [];
    readonly logoutRequests: Set<number> = new Set();
    readonly zonesTracking: Set<Zone> = new Set();

    shutdown: boolean = false;
    shutdownTick: number = -1;

    private tickTimer: ReturnType<typeof setInterval> | null = null;

    constructor() {
        World.instance = this;

        this.players = new PlayerList(Environment.NODE_MAX_PLAYERS + 1);
        this.npcs = new NpcList(Environment.NODE_MAX_NPCS + 1);

        World.gameMap = new GameMap(Environment.NODE_MEMBERS);
        setGameMap(World.gameMap);
    }

    // ---- initialization ----

    async init(): Promise<void> {
        console.log('[World] Initializing...');
        World.gameMap.init('data');

        // spawn NPCs from map data (GameMap stores raw data to avoid circular import)
        for (const spawn of World.gameMap.npcSpawns) {
            const npc = new Npc(spawn.level, spawn.x, spawn.z, spawn.size, spawn.size, EntityLifeCycle.RESPAWN, spawn.type, spawn.moveRestrict, spawn.blockWalk);
            if (spawn.config) {
                npc.baseLevels[0] = spawn.config.attack;
                npc.baseLevels[1] = spawn.config.strength;
                npc.baseLevels[2] = spawn.config.defence;
                npc.baseLevels[3] = spawn.config.hitpoints;
                npc.baseLevels[4] = spawn.config.ranged;
                npc.baseLevels[5] = spawn.config.magic;
                npc.initStats();
                npc.wanderRange = spawn.config.wanderrange;
                npc.respawnDelay = spawn.config.respawnrate;
                if (spawn.config.huntmode >= 0) npc.huntMode = spawn.config.huntmode;
                if (spawn.config.huntrange > 0) npc.huntRange = spawn.config.huntrange;
            }
            this.addNpc(npc);
            npc.spawnTriggerPending = true;
        }
        for (const { obj, receiver } of World.gameMap.objSpawns) {
            World.addObj(obj, receiver, 0);
        }

        console.log(`[World] Ready. Players: ${Environment.NODE_MAX_PLAYERS}, NPCs: ${this.npcs.count}, tick: ${World.TICK_RATE}ms`);
    }

    // ---- game loop ----

    start(): void {
        this.tickTimer = setInterval(() => this.cycle(), World.TICK_RATE);
        console.log(`[World] Game loop started (${World.TICK_RATE}ms tick rate)`);
    }

    stop(): void {
        if (this.tickTimer) {
            clearInterval(this.tickTimer);
            this.tickTimer = null;
        }
        console.log('[World] Game loop stopped');
    }

    // ---- delayed obj ----

    addObjDelayed(obj: Obj, receiver: bigint, duration: number, delay: number): void {
        this.objDelayedQueue.addTail(new ObjDelayedRequest(obj, duration, delay, receiver));
    }

    // ---- zone tracking ----

    trackZone(zone: Zone): void {
        this.zonesTracking.add(zone);
    }

    /**
     * The 11-phase game cycle, matching lostcity-ref's World.ts architecture.
     */
    private cycle(): void {
        World.currentTick++;
        const cycleStart = Date.now();

        try {
            // Phase 1: World events (loc/obj lifecycle, delayed objs, NPC hunt)
            this.processWorld();

            // Phase 2: Client input (decode packets, path setup)
            this.processClientsIn();

            // Phase 3: NPC spawn/despawn events
            this.processNpcEvents();

            // Phase 4: NPC AI + movement
            this.processNpcs();

            // Phase 5: Player queues, timers, interactions, movement
            this.processPlayers();

            // Phase 6: Logouts (timeout detection, save, cleanup)
            this.processLogouts();

            // Phase 7: Logins (assign pid, init, enter world)
            this.processLogins();

            // Phase 8: Zone lifecycle (loc/obj respawn, compute shared buffers)
            this.processZones();

            // Phase 9: Compute player/NPC info updates
            this.processInfo();

            // Phase 10: Send packets to clients
            this.processClientsOut();

            // Phase 11: Cleanup (reset per-tick state)
            this.processCleanup();
        } catch (err) {
            console.error('[World] Error in game cycle:', err);
        }

        const elapsed = Date.now() - cycleStart;
        World.cycleStats[WorldStat.CYCLE] = elapsed;
        if (elapsed > World.TICK_RATE) {
            console.warn(`[World] Tick ${World.currentTick} took ${elapsed}ms (>${World.TICK_RATE}ms budget)`);
        }
    }

    // ---- Phase 1: World events ----
    private processWorld(): void {
        const start = Date.now();

        // process delayed obj spawns
        for (const request of this.objDelayedQueue.all()) {
            request.delay--;
            if (request.delay > 0) continue;
            try {
                request.unlink();
                World.addObj(request.obj, request.receiver64, request.duration);
            } catch (err) {
                console.error('[World] Delayed obj error:', err);
            }
        }

        // NPC hunt: scan for players (only if NPC has PLAYER hunt mode)
        for (const npc of this.npcs) {
            if (!npc || !npc.isActive) continue;
            if (npc.huntMode !== -1) {
                const hunt = HuntStore.get(npc.huntMode);
                if (hunt && hunt.type === HuntModeType.PLAYER) {
                    npc.huntAll();
                }
            }
        }

        World.cycleStats[WorldStat.WORLD] = Date.now() - start;
    }

    // ---- Phase 2: Client input ----
    private processClientsIn(): void {
        const start = Date.now();

        for (const player of this.players) {
            if (!player) continue;
            try {
                player.playtime++;

                if (isClientConnected(player)) {
                    player.decodeIn();

                    // if player has queued path from client, set up movement
                    if (player.userPath.length > 0 || player.opcalled) {
                        if (player.delayed) {
                            continue;
                        }

                        if (!player.busy() && player.opcalled) {
                            player.moveClickRequest = false;
                        } else {
                            player.moveClickRequest = true;
                        }

                        if (player.opcalled && player.userPath.length === 0) {
                            player.pathToTarget();
                        }
                    }
                }
            } catch (err) {
                console.error(`[World] Client input error for pid=${player.pid}:`, err);
                if (isClientConnected(player)) {
                    player.logout();
                    player.client.close();
                }
            }
        }

        World.cycleStats[WorldStat.CLIENT_IN] = Date.now() - start;
    }

    // ---- Phase 3: NPC events ----
    private processNpcEvents(): void {
        for (const event of this.npcEventQueue.all()) {
            const npc = this.npcs.get(event.npcId);
            if (!npc) {
                event.unlink();
                continue;
            }

            if (npc.delayed) continue;
            event.unlink();

            const trigger = event.type === NpcEventType.SPAWN
                ? ServerTriggerType.AI_SPAWN
                : ServerTriggerType.AI_DESPAWN;

            const handler = ScriptProvider.getByTrigger(trigger, npc.type);
            if (handler) {
                handler({ self: npc });
            }
        }
    }

    // ---- Phase 4: NPCs ----
    private processNpcs(): void {
        const start = Date.now();

        for (const npc of this.npcs) {
            if (!npc) continue;
            try {
                npc.turn(World.currentTick);
                npc.updateMovement();
            } catch (err) {
                console.error(`[World] NPC ${npc.nid} error:`, err);
                this.removeNpc(npc);
            }
        }

        World.cycleStats[WorldStat.NPC] = Date.now() - start;
    }

    // ---- Phase 5: Players ----
    private processPlayers(): void {
        const start = Date.now();

        for (const player of this.players) {
            if (!player) continue;
            try {
                // check delayed expiry
                if (player.delayed && World.currentTick >= player.delayedUntil) {
                    player.delayed = false;
                }

                // process queues
                player.processQueues();

                if (!player.loggingOut) {
                    // timers
                    player.processTimers(PlayerTimerType.NORMAL);
                    player.processTimers(PlayerTimerType.SOFT);
                }

                // engine queue
                player.processEngineQueue();

                // interaction + movement
                player.processInteraction();

                // run energy
                player.updateEnergy();

                // validate movement
                player.validateDistanceWalked();
            } catch (err) {
                console.error(`[World] Player ${player.pid} error:`, err);
                if (isClientConnected(player)) {
                    player.logout();
                    player.client.close();
                }
            }
        }

        World.cycleStats[WorldStat.PLAYER] = Date.now() - start;
    }

    // ---- Phase 6: Logouts ----
    private processLogouts(): void {
        const start = Date.now();

        for (const player of this.players) {
            if (!player) continue;

            let force = false;

            // check for shutdown or total timeout
            if (this.shutdown || (isClientConnected(player) && World.currentTick - (player as NetworkPlayer).lastResponse >= World.TIMEOUT_NO_RESPONSE)) {
                player.loggingOut = true;
                force = true;
            }

            // check for connection-lost timeout (player was connected but socket died)
            if (!isClientConnected(player) && player.isActive && !player.loggingOut) {
                player.loggingOut = true;
            }

            // player-requested logout
            if (player.requestIdleLogout) {
                player.loggingOut = true;
                player.requestIdleLogout = false;
            }

            // process logout
            if (player.loggingOut && (force || player.canAccess())) {
                player.closeModal();

                // run logout trigger
                const handler = ScriptProvider.getByTrigger(ServerTriggerType.LOGOUT, -1);
                if (handler) {
                    handler({ self: player });
                }

                // save player data
                if (isClientConnected(player)) {
                    player.logout();
                }

                this.removePlayer(player);
            }
        }

        // also process explicit logout requests from the set
        for (const pid of this.logoutRequests) {
            const player = this.players.get(pid);
            if (player) {
                player.loggingOut = true;
            }
        }
        this.logoutRequests.clear();

        World.cycleStats[WorldStat.LOGOUT] = Date.now() - start;
    }

    // ---- Phase 7: Logins ----
    private processLogins(): void {
        const start = Date.now();

        for (const player of this.newPlayers) {
            // check if already logged in
            let alreadyOnline = false;
            for (const other of this.players) {
                if (other && other.username === player.username) {
                    alreadyOnline = true;
                    break;
                }
            }

            if (alreadyOnline) {
                if (isClientConnected(player)) {
                    player.write({ type: 'login_reject', reason: 'already_online' });
                    player.client.close();
                }
                continue;
            }

            // check world capacity
            if (this.players.count >= Environment.NODE_MAX_PLAYERS) {
                if (isClientConnected(player)) {
                    player.write({ type: 'login_reject', reason: 'world_full' });
                    player.client.close();
                }
                continue;
            }

            // assign pid and enter world
            this.addPlayer(player);

            // mark teleport (so first player info sends full position)
            player.tele = true;
            player.moveClickRequest = false;

            // run login trigger
            const handler = ScriptProvider.getByTrigger(ServerTriggerType.LOGIN, -1);
            if (handler) {
                handler({ self: player });
            }

            // send initial state
            if (isClientConnected(player)) {
                player.write({
                    type: 'login_accept',
                    pid: player.pid,
                    staffModLevel: player.staffModLevel,
                });
            }

            // send reboot timer if shutdown pending
            if (this.shutdownTick !== -1) {
                player.write({
                    type: 'update_reboot_timer',
                    ticks: this.shutdownTick - World.currentTick,
                });
            }
        }

        this.newPlayers.length = 0;
        World.cycleStats[WorldStat.LOGIN] = Date.now() - start;
    }

    // ---- Phase 8: Zones ----
    private processZones(): void {
        const start = Date.now();

        // process loc/obj lifecycle in tracked zones
        for (const event of this.locObjTracker.all()) {
            if (event.check()) {
                event.entity.turn();
            } else {
                event.unlink();
            }
        }

        // compute shared zone buffers for each tracked zone
        for (const zone of this.zonesTracking) {
            zone.computeShared();
        }

        World.cycleStats[WorldStat.ZONE] = Date.now() - start;
    }

    // ---- Phase 9: Info ----
    private processInfo(): void {
        // reorient entities and compute info updates
        for (const player of this.players) {
            if (!player) continue;

            // rebuild build area if needed
            player.buildArea.rebuildNormal(player.x, player.z, player.level);
        }

        for (const npc of this.npcs) {
            if (!npc) continue;
            // NPC info state is already set via masks during turn()
        }
    }

    // ---- Phase 10: Client output ----
    private processClientsOut(): void {
        const start = Date.now();

        for (const player of this.players) {
            if (!player) continue;

            if (isClientConnected(player)) {
                try {
                    player.flushOutput();
                } catch (err) {
                    console.error(`[World] Output error for pid=${player.pid}:`, err);
                    player.logout();
                    player.client.close();
                }
            }
        }

        World.cycleStats[WorldStat.CLIENT_OUT] = Date.now() - start;
    }

    // ---- Phase 11: Cleanup ----
    private processCleanup(): void {
        const start = Date.now();

        // reset tracked zones
        for (const zone of this.zonesTracking) {
            zone.reset();
        }
        this.zonesTracking.clear();

        // reset players
        for (const player of this.players) {
            if (!player) continue;
            player.resetEntity(false);

            // reset inventory update flags
            for (const inv of player.invs.values()) {
                if (inv) inv.update = false;
            }
        }

        // reset NPCs
        for (const npc of this.npcs) {
            if (!npc) continue;
            npc.resetEntity(false);
        }

        // reset world inventories + restock shops
        for (const inv of this.invs) {
            inv.update = false;

            // shop restock
            const invType = InvStore.get(inv.type);
            if (!invType || !invType.restock || !invType.stockcount || !invType.stockrate) continue;

            for (let i = 0; i < inv.items.length; i++) {
                const item = inv.items[i];
                if (!item) continue;

                const targetCount = invType.stockcount[i] ?? 0;
                const rate = invType.stockrate[i] ?? 0;
                if (rate <= 0) continue;

                if (item.count < targetCount && World.currentTick % rate === 0) {
                    inv.add(item.id, 1, i, true, false, false);
                    inv.update = true;
                } else if (item.count > targetCount && World.currentTick % rate === 0) {
                    inv.remove(item.id, 1, i);
                    inv.update = true;
                }
            }
        }

        World.cycleStats[WorldStat.CLEANUP] = Date.now() - start;
    }

    // ---- entity add/remove ----

    addPlayer(player: Player): void {
        const pid = this.players.next();
        player.pid = pid;
        player.isActive = true;
        this.players.set(pid, player);

        const zone = World.gameMap.getZone(player.x, player.z, player.level);
        zone.enter(player);

        console.log(`[World] Player ${player.username} (pid=${pid}) entered world at ${player.x}, ${player.z}, level ${player.level}`);
    }

    removePlayer(player: Player): void {
        const zone = World.gameMap.getZone(player.x, player.z, player.level);
        zone.leave(player);

        this.players.remove(player.pid);
        player.isActive = false;

        console.log(`[World] Player ${player.username} (pid=${player.pid}) left world`);
        player.pid = -1;
    }

    addNpc(npc: Npc): void {
        const nid = this.npcs.next();
        npc.nid = nid;
        npc.isActive = true;
        this.npcs.set(nid, npc);

        const zone = World.gameMap.getZone(npc.x, npc.z, npc.level);
        zone.enter(npc);
    }

    removeNpc(npc: Npc): void {
        const zone = World.gameMap.getZone(npc.x, npc.z, npc.level);
        zone.leave(npc);

        this.npcs.remove(npc.nid);
        npc.isActive = false;
        npc.nid = -1;
    }
}
