import { EntityLifeCycle } from '#/engine/entity/EntityLifeCycle.js';
import NonPathingEntity from '#/engine/entity/NonPathingEntity.js';

// replaces @2004scape/rsmod-pathfinder locShapeLayer
function locShapeLayer(shape: number): number {
    if (shape === 0 || shape === 1 || shape === 2 || shape === 3) {
        return 0; // wall
    } else if (shape === 9) {
        return 1; // walldecor diagonal
    } else if (shape === 4 || shape === 5 || shape === 6 || shape === 7 || shape === 8) {
        return 2; // walldecor
    } else if (shape >= 12 && shape <= 21) {
        return 2; // roof
    } else {
        return 3; // ground decor or centrepiece
    }
}

export default class Loc extends NonPathingEntity {
    // constructor properties
    private readonly baseInfo: number;

    // runtime properties
    private currentInfo: number;

    constructor(level: number, x: number, z: number, width: number, length: number, lifecycle: EntityLifeCycle, type: number, shape: number, angle: number) {
        super(level, x, z, width, length, lifecycle);
        this.baseInfo = this.packInfo(type, shape, angle);
        this.currentInfo = this.baseInfo;
    }

    private packInfo(type: number, shape: number, angle: number): number {
        const layer: number = locShapeLayer(shape);
        return (type & 0x3fff) | ((shape & 0x1f) << 14) | ((angle & 0x3) << 19) | ((layer & 0x3) << 21);
    }

    isChanged(): boolean {
        return this.currentInfo !== this.baseInfo;
    }

    get type(): number {
        return this.currentInfo & 0x3fff;
    }

    get shape(): number {
        return (this.currentInfo >> 14) & 0x1f;
    }

    get angle(): number {
        return (this.currentInfo >> 19) & 0x3;
    }

    get layer(): number {
        return (this.baseInfo >> 21) & 0x3;
    }

    change(type: number, shape: number, angle: number) {
        this.currentInfo = this.packInfo(type, shape, angle);
    }

    revert() {
        this.currentInfo = this.baseInfo;
    }

    turn() {
        --this.lifecycleTick;
        if (this.lifecycleTick === 0) {
            // World will handle the actual add/remove/revert
            // This is called from World.processZones
        } else if (this.lifecycleTick < 0) {
            console.error(`Loc is tracked but has a negative lifecycle tick. Type: ${this.type}, Coords: ${this.x}, ${this.z}`);
            this.setLifeCycle(-1);
        }
    }
}
