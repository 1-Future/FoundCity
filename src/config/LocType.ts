import ConfigStore from '#/config/ConfigStore.js';
import { ParamHolder, ParamMap } from '#/config/ParamType.js';

/**
 * Location/scenery type — world objects (doors, trees, rocks, etc.).
 * Ref: lostcity-ref cache/config/LocType.ts (225 lines)
 */
export interface LocType extends ParamHolder {
    id: number;
    debugname?: string;
    name: string;
    desc: string;
    // models
    models: number[];
    shapes: number[];
    // dimensions
    width: number;
    length: number;
    // blocking
    blockwalk: boolean;
    blockrange: boolean;
    active: boolean;
    // appearance
    recol_s: number[];
    recol_d: number[];
    hillskew: boolean;
    sharelight: boolean;
    occlude: boolean;
    // animation
    anim: number;
    // interaction
    ops: (string | null)[];     // 5 right-click options
    // map
    mapfunction: number;
    mapscene: number;
    // flags
    mirror: boolean;
    shadow: boolean;
    resizex: number;
    resizey: number;
    resizez: number;
    // offset
    offsetx: number;
    offsety: number;
    offsetz: number;
    // lighting
    ambient: number;
    contrast: number;
    // category
    category: number;
    // multiLoc (transforms)
    multivar: number;
    multivarp: number;
    multiloc: number[];
    // force decode
    forcedecor: boolean;
    // params
    params: ParamMap | null;
    // members
    members: boolean;
    // break routine
    breakroutefinding: boolean;
}

export const LocStore = new ConfigStore<LocType>();

export function defaultLoc(id: number): LocType {
    return {
        id, name: 'null', desc: '',
        models: [], shapes: [],
        width: 1, length: 1,
        blockwalk: true, blockrange: true, active: false,
        recol_s: [], recol_d: [],
        hillskew: false, sharelight: false, occlude: false,
        anim: -1,
        ops: [null, null, null, null, null],
        mapfunction: -1, mapscene: -1,
        mirror: false, shadow: true,
        resizex: 128, resizey: 128, resizez: 128,
        offsetx: 0, offsety: 0, offsetz: 0,
        ambient: 0, contrast: 0,
        category: -1,
        multivar: -1, multivarp: -1, multiloc: [],
        forcedecor: false,
        params: null,
        members: false,
        breakroutefinding: false,
    };
}
