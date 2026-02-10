import ConfigStore from '#/config/ConfigStore.js';
import { ParamHolder, ParamMap } from '#/config/ParamType.js';

/**
 * Struct type — generic data container with params.
 * Used for grouping related parameters together.
 * Ref: lostcity-ref cache/config/StructType.ts
 */
export interface StructType extends ParamHolder {
    id: number;
    debugname?: string;
    params: ParamMap | null;
}

export const StructStore = new ConfigStore<StructType>();
