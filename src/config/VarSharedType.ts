import ConfigStore from '#/config/ConfigStore.js';

/**
 * Shared variable type — global variables shared across all players.
 * Ref: lostcity-ref cache/config/VarSharedType.ts
 */
export interface VarSharedType {
    id: number;
    debugname?: string;
    type: number;                // ScriptVarType value
}

export const VarSharedStore = new ConfigStore<VarSharedType>();

export function defaultVarShared(id: number): VarSharedType {
    return { id, type: 1 };
}
