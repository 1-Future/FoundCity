import { CoordGrid } from '#/engine/CoordGrid.js';
import { EntityLifeCycle } from '#/engine/entity/EntityLifeCycle.js';
import Loc from '#/engine/entity/Loc.js';
import NonPathingEntity from '#/engine/entity/NonPathingEntity.js';
import Obj from '#/engine/entity/Obj.js';
import ZoneEvent, { ZoneEventData } from '#/engine/zone/ZoneEvent.js';
import { ZoneEventType } from '#/engine/zone/ZoneEventType.js';
import ZoneMap from '#/engine/zone/ZoneMap.js';
import LinkList from '#/util/LinkList.js';

// forward-declared interfaces to avoid circular deps with Player/Npc/PathingEntity
interface PathingEntityLike {
    x: number;
    z: number;
    level: number;
    width: number;
    length: number;
    isValid(): boolean;
    unlink(): void;
}

interface PlayerLike extends PathingEntityLike {
    hash64: bigint;
    originX: number;
    originZ: number;
    pid: number;
    write(message: any): void;
}

export default class Zone {
    private static readonly SIZE: number = 8 * 8;
    private static readonly LOCS: number = this.SIZE << 2;
    private static readonly OBJS: number = (this.SIZE << 1) + 1;

    readonly index: number;
    readonly x: number;
    readonly z: number;
    readonly level: number;

    // zone entities
    private readonly players: LinkList<any> = new LinkList();
    private readonly npcs: LinkList<any> = new LinkList();
    private readonly locs: LinkList<Loc> = new LinkList();
    private readonly objs: LinkList<Obj> = new LinkList();
    private playersCount: number = 0;
    private npcsCount: number = 0;
    private locsCount: number = 0;
    private objsCount: number = 0;
    private readonly entityEvents: Map<NonPathingEntity, ZoneEvent[]>;

    // zone events
    private readonly events: Set<ZoneEvent>;

    constructor(index: number) {
        this.index = index;
        const coord: CoordGrid = ZoneMap.unpackIndex(index);
        this.x = coord.x >> 3;
        this.z = coord.z >> 3;
        this.level = coord.level;
        this.events = new Set();
        this.entityEvents = new Map();
    }

    get totalLocs(): number {
        return this.locsCount;
    }

    get totalObjs(): number {
        return this.objsCount;
    }

    enter(entity: any): void {
        if (entity.pid !== undefined) {
            this.players.addTail(entity);
            this.playersCount++;
        } else if (entity.nid !== undefined) {
            this.npcs.addTail(entity);
            this.npcsCount++;
        }
    }

    leave(entity: any): void {
        entity.unlink();
        if (entity.pid !== undefined) {
            this.playersCount--;
        } else if (entity.nid !== undefined) {
            this.npcsCount--;
        }
    }

    computeShared(): void {
        // Zone events are stored in this.events
        // NetworkPlayer.encodeOut() will iterate these when sending zone updates
    }

    writeFullFollows(player: PlayerLike): void {
        // send full zone reset to player
        player.write({ type: 'zone_full_follows', zoneX: this.x, zoneZ: this.z, originX: player.originX, originZ: player.originZ });

        for (const obj of this.getAllObjsUnsafe()) {
            if (obj.receiver64 !== Obj.NO_RECEIVER && obj.receiver64 !== player.hash64) {
                continue;
            }
            if (obj.isActive) {
                player.write({ type: 'obj_add', coord: CoordGrid.packZoneCoord(obj.x, obj.z), objType: obj.type, count: obj.count });
            }
        }
        for (const loc of this.getAllLocsUnsafe()) {
            if (loc.lifecycle === EntityLifeCycle.DESPAWN && loc.isActive) {
                player.write({ type: 'loc_add', coord: CoordGrid.packZoneCoord(loc.x, loc.z), locType: loc.type, shape: loc.shape, angle: loc.angle });
            } else if (loc.lifecycle === EntityLifeCycle.RESPAWN && !loc.isActive) {
                player.write({ type: 'loc_del', coord: CoordGrid.packZoneCoord(loc.x, loc.z), shape: loc.shape, angle: loc.angle });
            } else if (loc.lifecycle === EntityLifeCycle.RESPAWN && loc.isChanged()) {
                player.write({ type: 'loc_add', coord: CoordGrid.packZoneCoord(loc.x, loc.z), locType: loc.type, shape: loc.shape, angle: loc.angle });
            }
        }
    }

    writePartialEncloses(player: PlayerLike): void {
        for (const event of this.enclosed()) {
            player.write(event.data);
        }
    }

    writePartialFollows(player: PlayerLike): void {
        for (const event of this.follows()) {
            if (event.receiver64 !== Obj.NO_RECEIVER && event.receiver64 !== player.hash64) {
                continue;
            }
            player.write(event.data);
        }
    }

    reset(): void {
        this.events.clear();
        this.entityEvents.clear();
    }

    // ---- static locs/objs are added during world init ----

    addStaticLoc(loc: Loc): void {
        this.locs.addTail(loc);
        this.locsCount++;
        loc.isActive = true;
    }

    addStaticObj(obj: Obj): void {
        this.objs.addTail(obj);
        this.objsCount++;
        obj.isActive = true;
    }

    // ---- locs ----

    addLoc(loc: Loc): void {
        const coord: number = CoordGrid.packZoneCoord(loc.x, loc.z);
        if (loc.lifecycle === EntityLifeCycle.DESPAWN) {
            this.locs.addTail(loc);
            this.locsCount++;
        }
        loc.revert();
        loc.isActive = true;
        this.queueEvent(loc, new ZoneEvent(ZoneEventType.ENCLOSED, -1n, { type: 'loc_add', coord, locType: loc.type, shape: loc.shape, angle: loc.angle }));
    }

    changeLoc(loc: Loc): void {
        loc.isActive = true;
        loc.unlink();
        this.locs.addTail(loc);

        const coord: number = CoordGrid.packZoneCoord(loc.x, loc.z);
        this.queueEvent(loc, new ZoneEvent(ZoneEventType.ENCLOSED, -1n, { type: 'loc_add', coord, locType: loc.type, shape: loc.shape, angle: loc.angle }));
    }

    removeLoc(loc: Loc): void {
        const coord: number = CoordGrid.packZoneCoord(loc.x, loc.z);
        loc.unlink();

        if (loc.lifecycle === EntityLifeCycle.RESPAWN) {
            this.locs.addTail(loc);
        } else {
            this.locsCount--;
        }

        this.clearQueuedEvents(loc);
        loc.isActive = false;

        this.queueEvent(loc, new ZoneEvent(ZoneEventType.ENCLOSED, -1n, { type: 'loc_del', coord, shape: loc.shape, angle: loc.angle }));
    }

    getLoc(x: number, z: number, type: number): Loc | null {
        for (const loc of this.getLocsSafe(CoordGrid.packZoneCoord(x, z))) {
            if (loc.type === type) {
                return loc;
            }
        }
        return null;
    }

    mergeLoc(loc: Loc, player: any, startCycle: number, endCycle: number, south: number, east: number, north: number, west: number): void {
        const coord: number = CoordGrid.packZoneCoord(loc.x, loc.z);
        this.events.add(new ZoneEvent(ZoneEventType.ENCLOSED, -1n, { type: 'loc_merge', coord, locType: loc.type, shape: loc.shape, angle: loc.angle, startCycle, endCycle, south, east, north, west, pid: player.pid }));
    }

    animLoc(loc: Loc, seq: number): void {
        const coord: number = CoordGrid.packZoneCoord(loc.x, loc.z);
        this.events.add(new ZoneEvent(ZoneEventType.ENCLOSED, -1n, { type: 'loc_anim', coord, locType: loc.type, shape: loc.shape, angle: loc.angle, seq }));
    }

    // ---- objs ----

    addObj(obj: Obj, receiver64: bigint): void {
        const coord: number = CoordGrid.packZoneCoord(obj.x, obj.z);
        if (obj.lifecycle === EntityLifeCycle.DESPAWN) {
            if (this.totalObjs >= Zone.OBJS) {
                for (const obj2 of this.getAllObjsUnsafe()) {
                    if (obj2.lifecycle === EntityLifeCycle.DESPAWN) {
                        break;
                    }
                }
            }
            this.objs.addTail(obj);
            this.objsCount++;
        }

        obj.isActive = true;

        if (obj.lifecycle === EntityLifeCycle.RESPAWN || receiver64 === Obj.NO_RECEIVER) {
            this.queueEvent(obj, new ZoneEvent(ZoneEventType.ENCLOSED, receiver64, { type: 'obj_add', coord, objType: obj.type, count: obj.count }));
        } else if (obj.lifecycle === EntityLifeCycle.DESPAWN) {
            this.queueEvent(obj, new ZoneEvent(ZoneEventType.FOLLOWS, receiver64, { type: 'obj_add', coord, objType: obj.type, count: obj.count }));
        }
    }

    revealObj(obj: Obj): void {
        const coord: number = CoordGrid.packZoneCoord(obj.x, obj.z);
        obj.receiver64 = Obj.NO_RECEIVER;
        this.queueEvent(obj, new ZoneEvent(ZoneEventType.ENCLOSED, Obj.NO_RECEIVER, { type: 'obj_reveal', coord, objType: obj.type, count: obj.count }));
    }

    changeObj(obj: Obj, oldCount: number, newCount: number): void {
        obj.count = newCount;

        const coord: number = CoordGrid.packZoneCoord(obj.x, obj.z);

        if (obj.receiver64 === Obj.NO_RECEIVER) {
            this.queueEvent(obj, new ZoneEvent(ZoneEventType.ENCLOSED, Obj.NO_RECEIVER, { type: 'obj_count', coord, objType: obj.type, oldCount, newCount }));
        } else {
            this.queueEvent(obj, new ZoneEvent(ZoneEventType.FOLLOWS, obj.receiver64, { type: 'obj_count', coord, objType: obj.type, oldCount, newCount }));
        }
    }

    removeObj(obj: Obj): void {
        const coord: number = CoordGrid.packZoneCoord(obj.x, obj.z);
        if (obj.lifecycle === EntityLifeCycle.DESPAWN) {
            obj.unlink();
            this.objsCount--;
        }

        this.clearQueuedEvents(obj);
        obj.isActive = false;

        if (obj.lifecycle === EntityLifeCycle.RESPAWN || obj.receiver64 === Obj.NO_RECEIVER) {
            this.queueEvent(obj, new ZoneEvent(ZoneEventType.ENCLOSED, Obj.NO_RECEIVER, { type: 'obj_del', coord, objType: obj.type }));
        } else if (obj.lifecycle === EntityLifeCycle.DESPAWN) {
            this.queueEvent(obj, new ZoneEvent(ZoneEventType.FOLLOWS, obj.receiver64, { type: 'obj_del', coord, objType: obj.type }));
        }
    }

    getObj(x: number, z: number, type: number, receiver64: bigint): Obj | null {
        for (const obj of this.getObjsSafe(CoordGrid.packZoneCoord(x, z))) {
            if ((obj.receiver64 === Obj.NO_RECEIVER || obj.receiver64 === receiver64) && obj.type === type) {
                return obj;
            }
        }
        return null;
    }

    getObjOfReceiver(x: number, z: number, type: number, receiver64: bigint): Obj | null {
        for (const obj of this.getObjsSafe(CoordGrid.packZoneCoord(x, z))) {
            if (obj.receiver64 === receiver64 && obj.type === type) {
                return obj;
            }
        }
        return null;
    }

    // ---- not tied to entities ----

    animMap(x: number, z: number, spotanim: number, height: number, delay: number): void {
        const coord: number = CoordGrid.packZoneCoord(x, z);
        this.events.add(new ZoneEvent(ZoneEventType.ENCLOSED, -1n, { type: 'map_anim', coord, spotanim, height, delay }));
    }

    mapProjAnim(x: number, z: number, dstX: number, dstZ: number, target: number, spotanim: number, srcHeight: number, dstHeight: number, startDelay: number, endDelay: number, peak: number, arc: number): void {
        const coord: number = CoordGrid.packZoneCoord(x, z);
        this.events.add(new ZoneEvent(ZoneEventType.ENCLOSED, -1n, { type: 'map_projanim', coord, dstX, dstZ, target, spotanim, srcHeight, dstHeight, startDelay, endDelay, peak, arc }));
    }

    // ---- iterators ----

    *getAllPlayersSafe(reverse: boolean = false): IterableIterator<any> {
        for (const player of this.players.all(reverse)) {
            if (player.isValid()) {
                yield player;
            }
        }
    }

    *getAllNpcsSafe(reverse: boolean = false): IterableIterator<any> {
        for (const npc of this.npcs.all(reverse)) {
            if (npc.isValid()) {
                yield npc;
            }
        }
    }

    *getAllObjsSafe(reverse: boolean = false): IterableIterator<Obj> {
        for (const obj of this.objs.all(reverse)) {
            if (obj.isValid()) {
                yield obj;
            }
        }
    }

    *getObjsSafe(coord: number): IterableIterator<Obj> {
        for (const obj of this.objs.all()) {
            if (obj.isValid() && CoordGrid.packZoneCoord(obj.x, obj.z) === coord) {
                yield obj;
            }
        }
    }

    *getObjsUnsafe(coord: number): IterableIterator<Obj> {
        for (const obj of this.objs.all()) {
            if (CoordGrid.packZoneCoord(obj.x, obj.z) === coord) {
                yield obj;
            }
        }
    }

    *getAllObjsUnsafe(reverse: boolean = false): IterableIterator<Obj> {
        for (const obj of this.objs.all(reverse)) {
            yield obj;
        }
    }

    *getAllLocsSafe(reverse: boolean = false): IterableIterator<Loc> {
        for (const loc of this.locs.all(reverse)) {
            if (loc.isValid()) {
                yield loc;
            }
        }
    }

    *getLocsSafe(coord: number): IterableIterator<Loc> {
        for (const loc of this.locs.all()) {
            if (loc.isValid() && CoordGrid.packZoneCoord(loc.x, loc.z) === coord) {
                yield loc;
            }
        }
    }

    *getLocsUnsafe(coord: number): IterableIterator<Loc> {
        for (const loc of this.locs.all()) {
            if (CoordGrid.packZoneCoord(loc.x, loc.z) === coord) {
                yield loc;
            }
        }
    }

    *getAllLocsUnsafe(reverse: boolean = false): IterableIterator<Loc> {
        for (const loc of this.locs.all(reverse)) {
            yield loc;
        }
    }

    *getAllNpcsUnsafe(reverse: boolean = false): IterableIterator<any> {
        for (const npc of this.npcs.all(reverse)) {
            yield npc;
        }
    }

    *getAllPlayersUnsafe(reverse: boolean = false): IterableIterator<any> {
        for (const player of this.players.all(reverse)) {
            yield player;
        }
    }

    // ---- event iterators ----

    *enclosed(): IterableIterator<ZoneEvent> {
        for (const event of this.events) {
            if (event.type === ZoneEventType.ENCLOSED) {
                yield event;
            }
        }
    }

    *follows(): IterableIterator<ZoneEvent> {
        for (const event of this.events) {
            if (event.type === ZoneEventType.FOLLOWS) {
                yield event;
            }
        }
    }

    // ---- internal ----

    private queueEvent(entity: NonPathingEntity, event: ZoneEvent): void {
        this.events.add(event);
        const exist: ZoneEvent[] | undefined = this.entityEvents.get(entity);
        if (typeof exist === 'undefined') {
            this.entityEvents.set(entity, [event]);
            return;
        }
        exist.push(event);
    }

    private clearQueuedEvents(entity: NonPathingEntity): void {
        const exist: ZoneEvent[] | undefined = this.entityEvents.get(entity);
        if (typeof exist !== 'undefined') {
            for (let index: number = 0; index < exist.length; index++) {
                this.events.delete(exist[index]);
            }
            this.entityEvents.delete(entity);
        }
    }
}
