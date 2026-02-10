import ConfigStore from '#/config/ConfigStore.js';

/**
 * Identity kit type — character appearance parts (body, head, arms, etc.).
 * Ref: lostcity-ref cache/config/IdkType.ts
 */
export interface IdkType {
    id: number;
    debugname?: string;
    type: number;                // body part type (0=head, 1=jaw, etc.)
    models: number[];            // body model IDs
    heads: number[];             // head model IDs (for chathead)
    recol_s: number[];           // source recolors (6 max)
    recol_d: number[];           // dest recolors (6 max)
    disable: boolean;            // if true, not available in character creation
}

export const IdkStore = new ConfigStore<IdkType>();

export function defaultIdk(id: number): IdkType {
    return {
        id, type: -1, models: [], heads: [-1, -1, -1, -1, -1],
        recol_s: [0, 0, 0, 0, 0, 0], recol_d: [0, 0, 0, 0, 0, 0],
        disable: false
    };
}
