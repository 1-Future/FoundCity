import ConfigStore from '#/config/ConfigStore.js';
import { ParamHolder, ParamMap } from '#/config/ParamType.js';

/**
 * NPC type — defines all properties of an NPC.
 * Ref: lostcity-ref cache/config/NpcType.ts (241 lines)
 */
export interface NpcType extends ParamHolder {
    id: number;
    debugname?: string;
    name: string;
    desc: string;
    // models
    models: number[];
    heads: number[];
    // appearance
    size: number;
    recol_s: number[];
    recol_d: number[];
    // animations
    readyanim: number;
    walkanim: number;
    walkanim_b: number;         // walk backwards
    walkanim_r: number;         // walk right
    walkanim_l: number;         // walk left
    // interaction options
    ops: (string | null)[];     // 5 right-click options
    // visibility
    minimap: boolean;
    vislevel: number;           // combat level (-1 = hidden)
    // resize
    resizeh: number;
    resizev: number;
    // movement
    moverestrict: number;
    blockwalk: number;
    // hunt/AI
    huntmode: number;
    huntrange: number;
    defaultmode: number;
    timer: number;
    // combat
    attack: number;
    strength: number;
    defence: number;
    hitpoints: number;
    ranged: number;
    magic: number;
    // category
    category: number;
    // multiNPC (transforms)
    multivar: number;
    multivarp: number;
    multinpc: number[];
    // params
    params: ParamMap | null;
    // members-only
    members: boolean;
    // wander
    wanderrange: number;
    maxrange: number;
    // patrol
    patrolcoords: number[];
    patroldelays: number[];
    // respawn
    respawnrate: number;
    // give chase
    givechase: boolean;
}

export const NpcStore = new ConfigStore<NpcType>();

export function defaultNpc(id: number): NpcType {
    return {
        id, name: 'null', desc: '', models: [], heads: [],
        size: 1, recol_s: [], recol_d: [],
        readyanim: -1, walkanim: -1, walkanim_b: -1, walkanim_r: -1, walkanim_l: -1,
        ops: [null, null, null, null, null],
        minimap: true, vislevel: -1,
        resizeh: 128, resizev: 128,
        moverestrict: 0, blockwalk: 0,
        huntmode: -1, huntrange: 5, defaultmode: -1, timer: -1,
        attack: 1, strength: 1, defence: 1, hitpoints: 1, ranged: 1, magic: 1,
        category: -1,
        multivar: -1, multivarp: -1, multinpc: [],
        params: null,
        members: false,
        wanderrange: 5, maxrange: 7,
        patrolcoords: [], patroldelays: [],
        respawnrate: 100,
        givechase: true,
    };
}
