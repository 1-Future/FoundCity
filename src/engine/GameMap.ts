import fs from 'fs';
import path from 'path';

import { LocType, LocStore } from '#/config/LocType.js';
import { NpcStore } from '#/config/NpcType.js';
import { CoordGrid } from '#/engine/CoordGrid.js';
import { BlockWalk } from '#/engine/entity/BlockWalk.js';
import { EntityLifeCycle } from '#/engine/entity/EntityLifeCycle.js';
import Loc from '#/engine/entity/Loc.js';
import { MoveRestrict } from '#/engine/entity/MoveRestrict.js';
import Obj from '#/engine/entity/Obj.js';
import Zone from '#/engine/zone/Zone.js';
import ZoneGrid from '#/engine/zone/ZoneGrid.js';
import ZoneMap from '#/engine/zone/ZoneMap.js';

// ---- Collision flags (replaces @2004scape/rsmod-pathfinder) ----

export const enum CollisionFlag {
    NULL = -1,
    OPEN = 0,
    WALL_NORTH_WEST = 0x1,
    WALL_NORTH = 0x2,
    WALL_NORTH_EAST = 0x4,
    WALL_EAST = 0x8,
    WALL_SOUTH_EAST = 0x10,
    WALL_SOUTH = 0x20,
    WALL_SOUTH_WEST = 0x40,
    WALL_WEST = 0x80,
    LOC = 0x100,
    WALL_NORTH_WEST_PROJ = 0x200,
    WALL_NORTH_PROJ = 0x400,
    WALL_NORTH_EAST_PROJ = 0x800,
    WALL_EAST_PROJ = 0x1000,
    WALL_SOUTH_EAST_PROJ = 0x2000,
    WALL_SOUTH_PROJ = 0x4000,
    WALL_SOUTH_WEST_PROJ = 0x8000,
    WALL_WEST_PROJ = 0x10000,
    LOC_PROJ = 0x20000,
    FLOOR_DECORATION = 0x40000,
    NPC = 0x80000,
    PLAYER = 0x100000,
    FLOOR = 0x200000,
    WALL_NORTH_WEST_ROUTE = 0x400000,
    WALL_NORTH_ROUTE = 0x800000,
    WALL_NORTH_EAST_ROUTE = 0x1000000,
    WALL_EAST_ROUTE = 0x2000000,
    WALL_SOUTH_EAST_ROUTE = 0x4000000,
    WALL_SOUTH_ROUTE = 0x8000000,
    WALL_SOUTH_WEST_ROUTE = 0x10000000,
    WALL_WEST_ROUTE = 0x20000000,
    LOC_ROUTE = 0x40000000,

    // commonly used composites
    BLOCK_WALK = LOC | FLOOR_DECORATION | FLOOR,
    BLOCK_NPC = LOC | FLOOR_DECORATION | FLOOR | NPC,
    BLOCK_PLAYER = LOC | FLOOR_DECORATION | FLOOR | PLAYER,
}

export const enum CollisionType {
    NORMAL,
    BLOCKED,
    INDOORS,
    OUTDOORS,
    LINE_OF_SIGHT
}

// ---- Collision grid ----

class CollisionGrid {
    private readonly flags: Map<number, Int32Array> = new Map();

    private getOrAllocZone(zoneKey: number): Int32Array {
        let zone = this.flags.get(zoneKey);
        if (!zone) {
            zone = new Int32Array(8 * 8);
            this.flags.set(zoneKey, zone);
        }
        return zone;
    }

    private zoneKey(level: number, x: number, z: number): number {
        return ZoneMap.zoneIndex(x, z, level);
    }

    get(level: number, x: number, z: number): number {
        const zone = this.flags.get(this.zoneKey(level, x, z));
        if (!zone) return CollisionFlag.OPEN;
        const localX = x & 0x7;
        const localZ = z & 0x7;
        return zone[localX * 8 + localZ];
    }

    set(level: number, x: number, z: number, flags: number): void {
        const zone = this.getOrAllocZone(this.zoneKey(level, x, z));
        const localX = x & 0x7;
        const localZ = z & 0x7;
        zone[localX * 8 + localZ] = flags;
    }

    add(level: number, x: number, z: number, flags: number): void {
        this.set(level, x, z, this.get(level, x, z) | flags);
    }

    remove(level: number, x: number, z: number, flags: number): void {
        this.set(level, x, z, this.get(level, x, z) & ~flags);
    }

    isAllocated(level: number, x: number, z: number): boolean {
        return this.flags.has(this.zoneKey(level, x, z));
    }
}

// ---- GameMap ----

export default class GameMap {
    private readonly members: boolean;
    readonly collision: CollisionGrid = new CollisionGrid();
    readonly zoneMap: ZoneMap = new ZoneMap();

    constructor(members: boolean) {
        this.members = members;
    }

    init(dataPath: string): void {
        const mapsDir = path.join(dataPath, 'maps');
        if (!fs.existsSync(mapsDir)) {
            console.log(`[GameMap] No maps directory at ${mapsDir}, skipping map load`);
            return;
        }

        const files = fs.readdirSync(mapsDir).filter(f => f.endsWith('.json'));
        for (const file of files) {
            try {
                const data = JSON.parse(fs.readFileSync(path.join(mapsDir, file), 'utf-8'));
                this.loadMap(data);
            } catch (err) {
                console.error(`[GameMap] Failed to load map ${file}:`, err);
            }
        }

        console.log(`[GameMap] Loaded ${files.length} maps, ${this.zoneMap.zoneCount()} zones, ${this.zoneMap.locCount()} locs, ${this.zoneMap.objCount()} objs`);
    }

    // Spawn queues filled during init, consumed by World after.
    // NPC spawns stored as raw data to avoid circular import (GameMap → Npc → PathingEntity → GameMap).
    readonly npcSpawns: { level: number; x: number; z: number; type: number; size: number; moveRestrict: MoveRestrict; blockWalk: BlockWalk; config: ReturnType<typeof NpcStore.get> }[] = [];
    readonly objSpawns: { obj: Obj; receiver: bigint }[] = [];

    private loadMap(data: any): void {
        if (!data) return;

        const baseX = (data.x ?? 0) * 64;
        const baseZ = (data.z ?? 0) * 64;

        // allocate collision zones
        for (let level = 0; level < 4; level++) {
            for (let x = 0; x < 64; x++) {
                for (let z = 0; z < 64; z++) {
                    const absX = baseX + x;
                    const absZ = baseZ + z;
                    this.collision.add(level, absX, absZ, CollisionFlag.OPEN);
                }
            }
        }

        // load tile collision flags
        if (Array.isArray(data.tiles)) {
            for (const tile of data.tiles) {
                if (tile.collision) {
                    const absX = baseX + (tile.x ?? 0);
                    const absZ = baseZ + (tile.z ?? 0);
                    const level = tile.level ?? 0;
                    this.collision.add(level, absX, absZ, tile.collision);
                }
            }
        }

        // load locs (world objects)
        if (Array.isArray(data.locs)) {
            for (const locData of data.locs) {
                const absX = baseX + (locData.x ?? 0);
                const absZ = baseZ + (locData.z ?? 0);
                const level = locData.level ?? 0;
                const locType = locData.type ?? 0;
                const shape = locData.shape ?? 10;
                const angle = locData.angle ?? 0;

                const loc = new Loc(level, absX, absZ, 1, 1, EntityLifeCycle.FOREVER, locType, shape, angle);

                // add collision from loc config
                const config = LocStore.get(locType);
                if (config && config.blockwalk) {
                    this.changeLocCollision(shape, angle, config.blockrange, config.length, config.width, absX, absZ, level, true);
                }

                // add to zone
                const zone = this.zoneMap.zone(absX, absZ, level);
                zone.addLoc(loc);
            }
        }

        // load NPC spawns (store raw data — World creates Npc instances to avoid circular import)
        if (Array.isArray(data.npcs)) {
            for (const npcData of data.npcs) {
                const absX = baseX + (npcData.x ?? 0);
                const absZ = baseZ + (npcData.z ?? 0);
                const level = npcData.level ?? 0;
                const npcType = npcData.type ?? 0;

                const config = NpcStore.get(npcType);
                const size = config?.size ?? 1;
                const moveRestrict = (config?.moverestrict ?? 0) as MoveRestrict;
                const blockWalk = (config?.blockwalk ?? 0) as BlockWalk;

                this.npcSpawns.push({ level, x: absX, z: absZ, type: npcType, size, moveRestrict, blockWalk, config });
            }
        }

        // load ground item spawns
        if (Array.isArray(data.objs)) {
            for (const objData of data.objs) {
                const absX = baseX + (objData.x ?? 0);
                const absZ = baseZ + (objData.z ?? 0);
                const level = objData.level ?? 0;
                const objType = objData.type ?? 0;
                const count = objData.count ?? 1;

                const obj = new Obj(level, absX, absZ, EntityLifeCycle.FOREVER, objType, count);
                this.objSpawns.push({ obj, receiver: Obj.NO_RECEIVER });
            }
        }
    }

    // ---- zone access ----

    getZone(x: number, z: number, level: number): Zone {
        return this.zoneMap.zone(x, z, level);
    }

    getZoneIndex(x: number, z: number, level: number): number {
        return ZoneMap.zoneIndex(x, z, level);
    }

    getZoneGrid(level: number): ZoneGrid {
        return this.zoneMap.grid(level);
    }

    // ---- collision queries ----

    isFlagged(level: number, x: number, z: number, flag: number): boolean {
        return (this.collision.get(level, x, z) & flag) !== 0;
    }

    isZoneAllocated(level: number, x: number, z: number): boolean {
        return this.collision.isAllocated(level, x, z);
    }

    // ---- entity collision changes ----

    changeNpcCollision(size: number, x: number, z: number, level: number, add: boolean): void {
        const flag = CollisionFlag.NPC;
        for (let dx = 0; dx < size; dx++) {
            for (let dz = 0; dz < size; dz++) {
                if (add) {
                    this.collision.add(level, x + dx, z + dz, flag);
                } else {
                    this.collision.remove(level, x + dx, z + dz, flag);
                }
            }
        }
    }

    changePlayerCollision(size: number, x: number, z: number, level: number, add: boolean): void {
        const flag = CollisionFlag.PLAYER;
        for (let dx = 0; dx < size; dx++) {
            for (let dz = 0; dz < size; dz++) {
                if (add) {
                    this.collision.add(level, x + dx, z + dz, flag);
                } else {
                    this.collision.remove(level, x + dx, z + dz, flag);
                }
            }
        }
    }

    changeLocCollision(shape: number, angle: number, blockrange: boolean, length: number, width: number, x: number, z: number, level: number, add: boolean): void {
        // wall shapes 0-3
        if (shape >= 0 && shape <= 3) {
            this.changeWallCollision(x, z, level, angle, shape, blockrange, add);
        }
        // walldecor shapes 4-8
        else if (shape >= 4 && shape <= 8) {
            // walldecor doesn't have collision
        }
        // diagonal wall shape 9
        else if (shape === 9) {
            this.changeWallCollision(x, z, level, angle, shape, blockrange, add);
        }
        // centrepiece shapes 10-11
        else if (shape === 10 || shape === 11) {
            this.changeLocFullCollision(x, z, level, width, length, angle, blockrange, add);
        }
        // roof shapes 12-21
        else if (shape >= 12 && shape <= 21) {
            // roofs don't typically add collision for ground pathing
        }
        // ground decor shape 22
        else if (shape === 22) {
            // ground decor can block depending on config
        }
    }

    private changeLocFullCollision(x: number, z: number, level: number, sizeX: number, sizeZ: number, angle: number, blockrange: boolean, add: boolean): void {
        let actualSizeX = sizeX;
        let actualSizeZ = sizeZ;
        if (angle === 1 || angle === 3) {
            actualSizeX = sizeZ;
            actualSizeZ = sizeX;
        }

        const locFlag = CollisionFlag.LOC;
        const projFlag = CollisionFlag.LOC_PROJ;

        for (let dx = 0; dx < actualSizeX; dx++) {
            for (let dz = 0; dz < actualSizeZ; dz++) {
                if (add) {
                    this.collision.add(level, x + dx, z + dz, locFlag);
                    if (blockrange) {
                        this.collision.add(level, x + dx, z + dz, projFlag);
                    }
                } else {
                    this.collision.remove(level, x + dx, z + dz, locFlag);
                    if (blockrange) {
                        this.collision.remove(level, x + dx, z + dz, projFlag);
                    }
                }
            }
        }
    }

    private changeWallCollision(x: number, z: number, level: number, angle: number, shape: number, blockrange: boolean, add: boolean): void {
        // simplified wall collision — adds directional wall flags
        const fn = add ? this.collision.add.bind(this.collision) : this.collision.remove.bind(this.collision);

        if (shape === 0) {
            // straight wall
            if (angle === 0) {
                fn(level, x, z, CollisionFlag.WALL_WEST);
                fn(level, x - 1, z, CollisionFlag.WALL_EAST);
            } else if (angle === 1) {
                fn(level, x, z, CollisionFlag.WALL_NORTH);
                fn(level, x, z + 1, CollisionFlag.WALL_SOUTH);
            } else if (angle === 2) {
                fn(level, x, z, CollisionFlag.WALL_EAST);
                fn(level, x + 1, z, CollisionFlag.WALL_WEST);
            } else if (angle === 3) {
                fn(level, x, z, CollisionFlag.WALL_SOUTH);
                fn(level, x, z - 1, CollisionFlag.WALL_NORTH);
            }
        } else if (shape === 1 || shape === 3) {
            // diagonal corner / square corner
            if (angle === 0) {
                fn(level, x, z, CollisionFlag.WALL_NORTH_WEST);
                fn(level, x - 1, z + 1, CollisionFlag.WALL_SOUTH_EAST);
            } else if (angle === 1) {
                fn(level, x, z, CollisionFlag.WALL_NORTH_EAST);
                fn(level, x + 1, z + 1, CollisionFlag.WALL_SOUTH_WEST);
            } else if (angle === 2) {
                fn(level, x, z, CollisionFlag.WALL_SOUTH_EAST);
                fn(level, x + 1, z - 1, CollisionFlag.WALL_NORTH_WEST);
            } else if (angle === 3) {
                fn(level, x, z, CollisionFlag.WALL_SOUTH_WEST);
                fn(level, x - 1, z - 1, CollisionFlag.WALL_NORTH_EAST);
            }
        } else if (shape === 2) {
            // L-shaped corner wall
            if (angle === 0) {
                fn(level, x, z, CollisionFlag.WALL_NORTH | CollisionFlag.WALL_WEST);
                fn(level, x - 1, z, CollisionFlag.WALL_EAST);
                fn(level, x, z + 1, CollisionFlag.WALL_SOUTH);
            } else if (angle === 1) {
                fn(level, x, z, CollisionFlag.WALL_NORTH | CollisionFlag.WALL_EAST);
                fn(level, x, z + 1, CollisionFlag.WALL_SOUTH);
                fn(level, x + 1, z, CollisionFlag.WALL_WEST);
            } else if (angle === 2) {
                fn(level, x, z, CollisionFlag.WALL_SOUTH | CollisionFlag.WALL_EAST);
                fn(level, x + 1, z, CollisionFlag.WALL_WEST);
                fn(level, x, z - 1, CollisionFlag.WALL_NORTH);
            } else if (angle === 3) {
                fn(level, x, z, CollisionFlag.WALL_SOUTH | CollisionFlag.WALL_WEST);
                fn(level, x, z - 1, CollisionFlag.WALL_NORTH);
                fn(level, x - 1, z, CollisionFlag.WALL_EAST);
            }
        }
    }

    // ---- pathfinding (pure TS, replaces rsmod-pathfinder WASM) ----

    canTravel(level: number, x: number, z: number, dx: number, dz: number, size: number, extraFlag: number, collisionType: CollisionType): boolean {
        for (let sx = 0; sx < size; sx++) {
            for (let sz = 0; sz < size; sz++) {
                const curX = x + sx;
                const curZ = z + sz;
                const newX = curX + dx;
                const newZ = curZ + dz;
                const flags = this.collision.get(level, newX, newZ);
                const blockFlags = this.getBlockFlags(collisionType) | extraFlag;

                if ((flags & blockFlags) !== 0) {
                    return false;
                }

                // check directional wall flags
                if (dx === -1 && (this.collision.get(level, curX, curZ) & CollisionFlag.WALL_WEST) !== 0) return false;
                if (dx === 1 && (this.collision.get(level, curX, curZ) & CollisionFlag.WALL_EAST) !== 0) return false;
                if (dz === -1 && (this.collision.get(level, curX, curZ) & CollisionFlag.WALL_SOUTH) !== 0) return false;
                if (dz === 1 && (this.collision.get(level, curX, curZ) & CollisionFlag.WALL_NORTH) !== 0) return false;
            }
        }
        return true;
    }

    private getBlockFlags(collisionType: CollisionType): number {
        switch (collisionType) {
            case CollisionType.NORMAL: return CollisionFlag.BLOCK_WALK;
            case CollisionType.BLOCKED: return CollisionFlag.BLOCK_WALK | CollisionFlag.FLOOR_DECORATION;
            case CollisionType.INDOORS: return CollisionFlag.BLOCK_WALK;
            case CollisionType.OUTDOORS: return CollisionFlag.BLOCK_WALK;
            case CollisionType.LINE_OF_SIGHT: return CollisionFlag.BLOCK_WALK;
            default: return CollisionFlag.BLOCK_WALK;
        }
    }

    findPath(level: number, srcX: number, srcZ: number, destX: number, destZ: number, srcSize: number = 1, destWidth: number = 0, destLength: number = 0): number[] {
        if (srcX === destX && srcZ === destZ) {
            return [];
        }

        // BFS/A* pathfinding
        const maxSteps = 4096;
        const graph: Map<number, number> = new Map();
        const queue: number[] = [];
        const directions: Map<number, number> = new Map();

        const srcKey = this.pathKey(srcX, srcZ);
        graph.set(srcKey, 0);
        queue.push(srcKey);

        let found = false;
        let foundX = destX;
        let foundZ = destZ;

        while (queue.length > 0 && graph.size < maxSteps) {
            const current = queue.shift()!;
            const cx = (current >> 14) & 0x3fff;
            const cz = current & 0x3fff;
            const dist = graph.get(current)!;

            if (cx === destX && cz === destZ) {
                found = true;
                break;
            }

            // try all 8 directions
            const dirs = [
                { dx: 0, dz: 1 },
                { dx: 0, dz: -1 },
                { dx: 1, dz: 0 },
                { dx: -1, dz: 0 },
                { dx: 1, dz: 1 },
                { dx: 1, dz: -1 },
                { dx: -1, dz: 1 },
                { dx: -1, dz: -1 },
            ];

            for (const { dx, dz } of dirs) {
                const nx = cx + dx;
                const nz = cz + dz;
                const nKey = this.pathKey(nx, nz);

                if (graph.has(nKey)) continue;

                // diagonal checks
                if (dx !== 0 && dz !== 0) {
                    if (!this.canTravel(level, cx, cz, dx, 0, srcSize, 0, CollisionType.NORMAL)) continue;
                    if (!this.canTravel(level, cx, cz, 0, dz, srcSize, 0, CollisionType.NORMAL)) continue;
                    if (!this.canTravel(level, cx + dx, cz, 0, dz, srcSize, 0, CollisionType.NORMAL)) continue;
                    if (!this.canTravel(level, cx, cz + dz, dx, 0, srcSize, 0, CollisionType.NORMAL)) continue;
                } else {
                    if (!this.canTravel(level, cx, cz, dx, dz, srcSize, 0, CollisionType.NORMAL)) continue;
                }

                graph.set(nKey, dist + 1);
                directions.set(nKey, current);
                queue.push(nKey);
            }
        }

        if (!found) {
            // find closest reachable tile to dest
            let bestDist = Infinity;
            for (const [key] of graph) {
                const kx = (key >> 14) & 0x3fff;
                const kz = key & 0x3fff;
                const d = Math.max(Math.abs(kx - destX), Math.abs(kz - destZ));
                if (d < bestDist) {
                    bestDist = d;
                    foundX = kx;
                    foundZ = kz;
                }
            }
        }

        // backtrace path
        const waypoints: number[] = [];
        let traceKey = this.pathKey(foundX, foundZ);
        while (directions.has(traceKey)) {
            const tx = (traceKey >> 14) & 0x3fff;
            const tz = traceKey & 0x3fff;
            waypoints.push(CoordGrid.packCoord(0, tx, tz));
            traceKey = directions.get(traceKey)!;
            if (waypoints.length > 25) break;
        }

        return waypoints;
    }

    private pathKey(x: number, z: number): number {
        return ((x & 0x3fff) << 14) | (z & 0x3fff);
    }

    // ---- reach checks ----

    reachedEntity(level: number, srcX: number, srcZ: number, destX: number, destZ: number, destW: number, destL: number, srcSize: number): boolean {
        const maxX = destX + destW - 1;
        const maxZ = destZ + destL - 1;
        for (let sx = 0; sx < srcSize; sx++) {
            for (let sz = 0; sz < srcSize; sz++) {
                const cx = srcX + sx;
                const cz = srcZ + sz;
                // adjacent in cardinal + diagonal
                if ((cx >= destX - 1 && cx <= maxX + 1 && cz >= destZ && cz <= maxZ) ||
                    (cz >= destZ - 1 && cz <= maxZ + 1 && cx >= destX && cx <= maxX)) {
                    return true;
                }
            }
        }
        return false;
    }

    reachedObj(level: number, srcX: number, srcZ: number, destX: number, destZ: number, destW: number, destL: number, srcSize: number): boolean {
        return this.reachedEntity(level, srcX, srcZ, destX, destZ, destW, destL, srcSize);
    }

    reachedLoc(level: number, srcX: number, srcZ: number, destX: number, destZ: number, destW: number, destL: number, srcSize: number, angle: number, shape: number, forceapproach: number): boolean {
        // simplified — for centrepiece/other shapes, check adjacency
        return this.reachedEntity(level, srcX, srcZ, destX, destZ, destW, destL, srcSize);
    }

    isApproached(level: number, srcX: number, srcZ: number, destX: number, destZ: number, srcW: number, srcL: number, destW: number, destL: number): boolean {
        // line of sight check
        return CoordGrid.distanceTo(
            { x: srcX, z: srcZ, width: srcW, length: srcL },
            { x: destX, z: destZ, width: destW, length: destL }
        ) <= 1;
    }
}

// ---- Module-level convenience functions (match lostcity-ref import pattern) ----

let _gameMap: GameMap | null = null;

export function setGameMap(gm: GameMap): void {
    _gameMap = gm;
}

export function canTravel(level: number, x: number, z: number, dx: number, dz: number, size: number, extraFlag: number, collisionType: CollisionType): boolean {
    return _gameMap!.canTravel(level, x, z, dx, dz, size, extraFlag, collisionType);
}

export function findPath(level: number, srcX: number, srcZ: number, destX: number, destZ: number): number[] {
    return _gameMap!.findPath(level, srcX, srcZ, destX, destZ);
}

export function findPathToEntity(level: number, srcX: number, srcZ: number, destX: number, destZ: number, srcSize: number, destWidth: number, destLength: number): number[] {
    return _gameMap!.findPath(level, srcX, srcZ, destX, destZ, srcSize, destWidth, destLength);
}

export function findPathToLoc(level: number, srcX: number, srcZ: number, destX: number, destZ: number, srcSize: number, destWidth: number, destLength: number, angle: number, shape: number, forceapproach: number): number[] {
    return _gameMap!.findPath(level, srcX, srcZ, destX, destZ, srcSize, destWidth, destLength);
}

export function findNaivePath(level: number, srcX: number, srcZ: number, destX: number, destZ: number, srcWidth: number, srcLength: number, destWidth: number, destLength: number, extraFlag: number, collisionType: CollisionType): number[] {
    // naive path: just go directly
    return [CoordGrid.packCoord(0, destX, destZ)];
}

export function isZoneAllocated(level: number, x: number, z: number): boolean {
    return _gameMap!.isZoneAllocated(level, x, z);
}

export function changeNpcCollision(size: number, x: number, z: number, level: number, add: boolean): void {
    _gameMap!.changeNpcCollision(size, x, z, level, add);
}

export function changePlayerCollision(size: number, x: number, z: number, level: number, add: boolean): void {
    _gameMap!.changePlayerCollision(size, x, z, level, add);
}

export function reachedEntity(level: number, srcX: number, srcZ: number, destX: number, destZ: number, destW: number, destL: number, srcSize: number): boolean {
    return _gameMap!.reachedEntity(level, srcX, srcZ, destX, destZ, destW, destL, srcSize);
}

export function reachedLoc(level: number, srcX: number, srcZ: number, destX: number, destZ: number, destW: number, destL: number, srcSize: number, angle: number, shape: number, forceapproach: number): boolean {
    return _gameMap!.reachedLoc(level, srcX, srcZ, destX, destZ, destW, destL, srcSize, angle, shape, forceapproach);
}

export function reachedObj(level: number, srcX: number, srcZ: number, destX: number, destZ: number, destW: number, destL: number, srcSize: number): boolean {
    return _gameMap!.reachedObj(level, srcX, srcZ, destX, destZ, destW, destL, srcSize);
}

export function isApproached(level: number, srcX: number, srcZ: number, destX: number, destZ: number, srcW: number, srcL: number, destW: number, destL: number): boolean {
    return _gameMap!.isApproached(level, srcX, srcZ, destX, destZ, srcW, srcL, destW, destL);
}
