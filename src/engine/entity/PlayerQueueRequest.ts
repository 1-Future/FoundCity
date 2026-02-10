import Linkable from '#/util/Linkable.js';

export type ScriptArgument = number | string;

export const enum PlayerQueueType {
    NORMAL,
    LONG,
    ENGINE,
    WEAK,
    STRONG,
    SOFT
}

export default class PlayerQueueRequest extends Linkable {
    readonly type: PlayerQueueType;
    readonly handlerId: number;
    readonly args: ScriptArgument[];
    delay: number;
    lastInt: number;

    constructor(type: PlayerQueueType, handlerId: number, args: ScriptArgument[], delay: number) {
        super();
        this.type = type;
        this.handlerId = handlerId;
        this.args = args;
        this.delay = delay;
        this.lastInt = 0;
    }
}

export class EntityQueueState extends Linkable {
    readonly handlerId: number;
    delay: number;

    constructor(handlerId: number, delay: number) {
        super();
        this.handlerId = handlerId;
        this.delay = delay;
    }
}
