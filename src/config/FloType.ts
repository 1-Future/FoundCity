import ConfigStore from '#/config/ConfigStore.js';

/**
 * Floor type (overlay/underlay tile appearance).
 * Ref: lostcity-ref cache/config/FloType.ts
 */
export interface FloType {
    id: number;
    debugname?: string;
    rgb: number;
    texture: number;
    overlay: boolean;
    occlude: boolean;
}

export const FloStore = new ConfigStore<FloType>();

export function defaultFlo(id: number): FloType {
    return { id, rgb: 0, texture: -1, overlay: false, occlude: true };
}
