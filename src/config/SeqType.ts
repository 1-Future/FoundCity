import ConfigStore from '#/config/ConfigStore.js';

/**
 * Animation sequence type.
 * Ref: lostcity-ref cache/config/SeqType.ts
 */
export interface SeqType {
    id: number;
    debugname?: string;
    frames: number[];
    delays: number[];
    replayoff: number;         // loop reset frame (-1 = no loop)
    walkmerge: number[];       // walking animation merge data
    stretches: boolean;
    priority: number;
    mainhand: number;          // held item replacement (main hand)
    offhand: number;           // held item replacement (off hand)
    replaycount: number;       // how many times to replay
    duration: number;          // total duration in ticks (computed from delays)
}

export const SeqStore = new ConfigStore<SeqType>();

export function defaultSeq(id: number): SeqType {
    return {
        id, frames: [], delays: [], replayoff: -1, walkmerge: [],
        stretches: false, priority: 5, mainhand: -1, offhand: -1,
        replaycount: 99, duration: 0
    };
}
