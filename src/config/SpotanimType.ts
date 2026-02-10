import ConfigStore from '#/config/ConfigStore.js';

/**
 * Spot animation type (graphic effects played at a coordinate or on an entity).
 * Ref: lostcity-ref cache/config/SpotanimType.ts
 */
export interface SpotanimType {
    id: number;
    debugname?: string;
    model: number;
    seq: number;                 // animation sequence ID
    resizeh: number;             // horizontal resize (128 = 100%)
    resizev: number;             // vertical resize (128 = 100%)
    orientation: number;
    ambient: number;
    contrast: number;
    recol_s: number[];           // source recolors
    recol_d: number[];           // dest recolors
}

export const SpotanimStore = new ConfigStore<SpotanimType>();

export function defaultSpotanim(id: number): SpotanimType {
    return {
        id, model: 0, seq: -1, resizeh: 128, resizev: 128,
        orientation: 0, ambient: 0, contrast: 0, recol_s: [], recol_d: []
    };
}
