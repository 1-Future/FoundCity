import { DbRowStore, DbRowType } from '#/config/DbRowType.js';
import { DbTableStore, DbColumnFlag } from '#/config/DbTableType.js';

/**
 * Database table index — pre-computed lookup maps for indexed columns.
 * Ref: lostcity-ref cache/config/DbTableIndex.ts (90 lines)
 */
export default class DbTableIndex {
    // tableId → columnIndex → (stringKey → rowIds[])
    private static indices: Map<number, Map<number, Map<string, number[]>>> = new Map();

    /**
     * Build indices for all tables with INDEXED columns.
     */
    static build(): void {
        DbTableIndex.indices.clear();

        for (const table of DbTableStore.getAll()) {
            if (!table) continue;

            const tableIndex = new Map<number, Map<string, number[]>>();

            for (let col = 0; col < table.columns.length; col++) {
                const colDef = table.columns[col];
                if (!(colDef.flags & DbColumnFlag.INDEXED)) continue;

                const colIndex = new Map<string, number[]>();

                for (const row of DbRowStore.getAll()) {
                    if (!row || row.tableId !== table.id) continue;

                    const values = row.columnValues.get(col);
                    if (!values) continue;

                    const key = values.join(',');
                    const existing = colIndex.get(key) ?? [];
                    existing.push(row.id);
                    colIndex.set(key, existing);
                }

                tableIndex.set(col, colIndex);
            }

            DbTableIndex.indices.set(table.id, tableIndex);
        }
    }

    /**
     * Find row IDs matching the given column value in a table.
     */
    static find(tableId: number, column: number, key: (number | string)[]): number[] {
        const tableIndex = DbTableIndex.indices.get(tableId);
        if (!tableIndex) return [];
        const colIndex = tableIndex.get(column);
        if (!colIndex) return [];
        return colIndex.get(key.join(',')) ?? [];
    }
}
