import ConfigStore from '#/config/ConfigStore.js';

/**
 * Sequence frame — individual animation frame with delay.
 * Ref: lostcity-ref cache/config/SeqFrame.ts
 */
export interface SeqFrame {
    id: number;
    debugname?: string;
    delay: number;
}

export const SeqFrameStore = new ConfigStore<SeqFrame>();
