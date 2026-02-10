import ConfigStore from '#/config/ConfigStore.js';

/**
 * Category type — groups related configs for event lookups.
 * E.g. category "weapon" groups all weapon ObjTypes.
 * Ref: lostcity-ref cache/config/CategoryType.ts
 */
export interface CategoryType {
    id: number;
    debugname?: string;
}

export const CategoryStore = new ConfigStore<CategoryType>();
