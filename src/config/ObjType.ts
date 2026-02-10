import ConfigStore from '#/config/ConfigStore.js';
import { ParamHolder, ParamMap } from '#/config/ParamType.js';

/**
 * Object/item type — defines all properties of an item.
 * Ref: lostcity-ref cache/config/ObjType.ts (320 lines)
 */
export interface ObjType extends ParamHolder {
    id: number;
    debugname?: string;
    name: string;
    desc: string;
    // model
    model: number;
    zoom2d: number;
    xan2d: number;
    yan2d: number;
    xof2d: number;
    yof2d: number;
    zan2d: number;
    // appearance
    recol_s: number[];
    recol_d: number[];
    // stacking
    stackable: boolean;
    cost: number;
    members: boolean;
    // interaction options
    ops: (string | null)[];         // 5 ground options
    iops: (string | null)[];        // 5 inventory options
    // wearing
    manwear: number;
    manwear2: number;
    manwearOffsetY: number;
    womanwear: number;
    womanwear2: number;
    womanwearOffsetY: number;
    manhead: number;
    manhead2: number;
    womanhead: number;
    womanhead2: number;
    // equip slot (wearpos)
    wearpos: number;
    wearpos2: number;
    wearpos3: number;
    // weight
    weight: number;
    // category
    category: number;
    // certificate (noted form)
    certlink: number;
    certtemplate: number;
    // count display (e.g. coins)
    countobj: number[];
    countco: number[];
    // params
    params: ParamMap | null;
    // tradeable
    tradeable: boolean;
    // dummy item
    dummyitem: number;
}

export const ObjStore = new ConfigStore<ObjType>();

export function defaultObj(id: number): ObjType {
    return {
        id, name: 'null', desc: '',
        model: 0, zoom2d: 2000, xan2d: 0, yan2d: 0, xof2d: 0, yof2d: 0, zan2d: 0,
        recol_s: [], recol_d: [],
        stackable: false, cost: 1, members: false,
        ops: [null, null, 'Take', null, null],
        iops: [null, null, null, null, 'Drop'],
        manwear: -1, manwear2: -1, manwearOffsetY: 0,
        womanwear: -1, womanwear2: -1, womanwearOffsetY: 0,
        manhead: -1, manhead2: -1, womanhead: -1, womanhead2: -1,
        wearpos: -1, wearpos2: -1, wearpos3: -1,
        weight: 0, category: -1,
        certlink: -1, certtemplate: -1,
        countobj: [], countco: [],
        params: null,
        tradeable: false, dummyitem: 0,
    };
}
