import ConfigStore from '#/config/ConfigStore.js';

/**
 * NPC variable type — defines a variable slot on NPCs.
 * Ref: lostcity-ref cache/config/VarNpcType.ts
 */
export interface VarNpcType {
    id: number;
    debugname?: string;
    type: number;                // ScriptVarType value
}

export const VarNpcStore = new ConfigStore<VarNpcType>();

export function defaultVarNpc(id: number): VarNpcType {
    return { id, type: 1 };
}
