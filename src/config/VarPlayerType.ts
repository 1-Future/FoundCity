import ConfigStore from '#/config/ConfigStore.js';

/**
 * Player variable type — defines a variable slot on the player.
 * Variables store quest progress, settings, etc.
 * Ref: lostcity-ref cache/config/VarPlayerType.ts
 */
export interface VarPlayerType {
    id: number;
    debugname?: string;
    scope: number;               // SCOPE_TEMP(0) or SCOPE_PERM(1)
    type: number;                // ScriptVarType value
    protect: boolean;            // prevent client-side modification
    clientcode: number;          // client-side code reference
    transmit: boolean;           // sync to client
}

export const SCOPE_TEMP = 0;
export const SCOPE_PERM = 1;

export const VarPlayerStore = new ConfigStore<VarPlayerType>();

export function defaultVarPlayer(id: number): VarPlayerType {
    return { id, scope: SCOPE_TEMP, type: 1, protect: true, clientcode: 0, transmit: false };
}
