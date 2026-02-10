import ConfigStore from '#/config/ConfigStore.js';

/**
 * Enum type — key→value lookup table used by scripts.
 * E.g. enum mapping item slot → item name.
 * Ref: lostcity-ref cache/config/EnumType.ts
 */
export interface EnumType {
    id: number;
    debugname?: string;
    inputtype: number;           // key type (ScriptVarType)
    outputtype: number;          // value type (ScriptVarType)
    defaultInt: number;
    defaultString: string;
    values: Map<number, number | string>;
}

export const EnumStore = new ConfigStore<EnumType>();

export function defaultEnum(id: number): EnumType {
    return { id, inputtype: 1, outputtype: 1, defaultInt: 0, defaultString: '', values: new Map() };
}
