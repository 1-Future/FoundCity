import { CoordGrid } from '#/engine/CoordGrid.js';
import ZoneMap from '#/engine/zone/ZoneMap.js';

export default class BuildArea {
    loadedZones: Set<number> = new Set();
    activeZones: Set<number> = new Set();
    loadedMapsquares: Set<number> = new Set();

    // last rebuild origin
    originX: number = -1;
    originZ: number = -1;

    rebuildZones(x: number, z: number, level: number): void {
        this.activeZones.clear();

        const centerZoneX = x >> 3;
        const centerZoneZ = z >> 3;

        for (let dx = -3; dx <= 3; dx++) {
            for (let dz = -3; dz <= 3; dz++) {
                const zoneIndex = ZoneMap.zoneIndex((centerZoneX + dx) << 3, (centerZoneZ + dz) << 3, level);
                this.activeZones.add(zoneIndex);
            }
        }
    }

    rebuildNormal(x: number, z: number, level: number): boolean {
        const zoneX = x >> 3;
        const zoneZ = z >> 3;
        const originZoneX = this.originX >> 3;
        const originZoneZ = this.originZ >> 3;

        if (this.originX === -1 || Math.abs(zoneX - originZoneX) >= 4 || Math.abs(zoneZ - originZoneZ) >= 4) {
            this.originX = (CoordGrid.zoneCenter(x)) << 3;
            this.originZ = (CoordGrid.zoneCenter(z)) << 3;
            this.loadedZones.clear();
            this.loadedMapsquares.clear();
            this.rebuildZones(x, z, level);
            return true;
        }

        this.rebuildZones(x, z, level);
        return false;
    }

    isInBuildArea(zoneIndex: number): boolean {
        return this.activeZones.has(zoneIndex);
    }
}
