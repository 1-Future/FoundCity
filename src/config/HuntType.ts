import ConfigStore from '#/config/ConfigStore.js';
import { HuntModeType } from '#/engine/entity/hunt/HuntModeType.js';
import { HuntVis } from '#/engine/entity/hunt/HuntVis.js';
import { HuntCheckNotTooStrong } from '#/engine/entity/hunt/HuntCheckNotTooStrong.js';
import { HuntNobodyNear } from '#/engine/entity/hunt/HuntNobodyNear.js';
import { NpcMode } from '#/engine/entity/NpcMode.js';

/**
 * Hunt type — NPC hunting/aggression behavior config.
 * Ref: lostcity-ref cache/config/HuntType.ts
 */
export interface HuntType {
    id: number;
    debugname?: string;
    type: HuntModeType;
    checkVis: HuntVis;
    checkNotTooStrong: HuntCheckNotTooStrong;
    checkNotBusy: boolean;
    findKeepHunting: boolean;
    findNewMode: NpcMode;
    nobodyNear: HuntNobodyNear;
    // optional condition checking
    checkNotCombat: number;
    checkNotCombatSelf: number;
    checkAfk: boolean;
    rate: number;                // ticks between hunt attempts
    checkCategory: number;       // NPC category to check
    checkNpcVar: number;         // var condition: varId
    checkNpcVarBit: number;      // var condition: bit range
    checkNpcVarVal: number;      // var condition: expected value
}

export const HuntStore = new ConfigStore<HuntType>();

export function defaultHunt(id: number): HuntType {
    return {
        id,
        type: HuntModeType.OFF,
        checkVis: HuntVis.OFF,
        checkNotTooStrong: HuntCheckNotTooStrong.OFF,
        checkNotBusy: false,
        findKeepHunting: false,
        findNewMode: NpcMode.NONE,
        nobodyNear: HuntNobodyNear.KEEPHUNTING,
        checkNotCombat: -1,
        checkNotCombatSelf: -1,
        checkAfk: false,
        rate: 1,
        checkCategory: -1,
        checkNpcVar: -1,
        checkNpcVarBit: -1,
        checkNpcVarVal: -1,
    };
}
