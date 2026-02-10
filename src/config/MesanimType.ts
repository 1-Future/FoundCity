import ConfigStore from '#/config/ConfigStore.js';

/**
 * Message animation type — links chat message types to animation sequences.
 * Ref: lostcity-ref cache/config/MesanimType.ts
 */
export interface MesanimType {
    id: number;
    debugname?: string;
    len: [number, number, number, number]; // animation IDs for 4 message lengths
}

export const MesanimStore = new ConfigStore<MesanimType>();

export function defaultMesanim(id: number): MesanimType {
    return { id, len: [-1, -1, -1, -1] };
}
