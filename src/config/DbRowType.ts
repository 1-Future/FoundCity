import ConfigStore from '#/config/ConfigStore.js';

/**
 * Database row type — a row of data in a DbTable.
 * Ref: lostcity-ref cache/config/DbRowType.ts (134 lines)
 */
export interface DbRowType {
    id: number;
    debugname?: string;
    tableId: number;
    columnValues: Map<number, (number | string)[]>;  // column index → values
    types: Map<number, number[]>;                     // column index → ScriptVarType[]
}

export const DbRowStore = new ConfigStore<DbRowType>();
