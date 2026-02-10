import { ZoneEventType } from '#/engine/zone/ZoneEventType.js';

// Zone event payload (replaces ZoneMessage network classes)
export interface ZoneEventData {
    type: string;
    coord?: number;
    [key: string]: unknown;
}

export default class ZoneEvent {
    readonly type: ZoneEventType;
    readonly receiver64: bigint;
    readonly data: ZoneEventData;

    constructor(type: ZoneEventType, receiver64: bigint, data: ZoneEventData) {
        this.type = type;
        this.receiver64 = receiver64;
        this.data = data;
    }
}
