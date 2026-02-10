import ConfigStore from '#/config/ConfigStore.js';

/**
 * Database table type — schema for server-side lookup tables.
 * Ref: lostcity-ref cache/config/DbTableType.ts (145 lines)
 */

export const enum DbColumnFlag {
    INDEXED = 0x1,
    REQUIRED = 0x2,
    LIST = 0x4,
    CLIENTSIDE = 0x8,
}

export interface DbColumnDef {
    types: number[];             // ScriptVarType values (can be tuple)
    defaultValue: (number | string)[] | null;
    flags: number;               // DbColumnFlag bitmask
    debugname?: string;
}

export interface DbTableType {
    id: number;
    debugname?: string;
    columns: DbColumnDef[];
}

export const DbTableStore = new ConfigStore<DbTableType>();
