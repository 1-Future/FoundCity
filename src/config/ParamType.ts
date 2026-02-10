import ConfigStore from '#/config/ConfigStore.js';

/**
 * Parameter type — defines a typed parameter that can be attached to configs.
 * E.g. param "attack_speed" type=int default=4
 * Ref: lostcity-ref cache/config/ParamType.ts
 */
export interface ParamType {
    id: number;
    debugname?: string;
    type: number;                // ScriptVarType value (1=int, 2=string, etc.)
    defaultInt: number;
    defaultString: string;
    autodisable: boolean;
}

export const ParamStore = new ConfigStore<ParamType>();

export function defaultParam(id: number): ParamType {
    return { id, type: 1, defaultInt: 0, defaultString: '', autodisable: true };
}

/**
 * ParamMap: maps param ID → int or string value.
 * Used on NpcType, ObjType, LocType, StructType.
 */
export type ParamMap = Map<number, number | string>;

export interface ParamHolder {
    params: ParamMap | null;
}

export function getIntParam(holder: ParamHolder, paramId: number, defaultVal: number): number {
    if (!holder.params) return defaultVal;
    const val = holder.params.get(paramId);
    if (typeof val === 'number') return val;
    return defaultVal;
}

export function getStringParam(holder: ParamHolder, paramId: number, defaultVal: string): string {
    if (!holder.params) return defaultVal;
    const val = holder.params.get(paramId);
    if (typeof val === 'string') return val;
    return defaultVal;
}
