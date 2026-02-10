import { ScriptArgument } from '#/engine/entity/PlayerQueueRequest.js';

export const enum NpcTimerType {
    NPC
}

export const enum PlayerTimerType {
    NORMAL,
    SOFT
}

export type TimerType = NpcTimerType | PlayerTimerType;

export interface EntityTimer {
    type: TimerType;
    handlerId: number;
    args: ScriptArgument[] | null;
    interval: number;
    clock: number;
}
