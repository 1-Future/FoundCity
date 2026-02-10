import Linkable from '#/util/Linkable.js';

export const enum NpcEventType {
    SPAWN,
    DESPAWN
}

export default class NpcEventRequest extends Linkable {
    readonly type: NpcEventType;
    readonly npcId: number;

    constructor(type: NpcEventType, npcId: number) {
        super();
        this.type = type;
        this.npcId = npcId;
    }
}
