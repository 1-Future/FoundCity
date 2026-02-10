import Linkable from '#/util/Linkable.js';
import { ScriptArgument } from '#/engine/entity/PlayerQueueRequest.js';

export default class NpcQueueRequest extends Linkable {
    readonly queueId: number;
    readonly args: ScriptArgument[];
    delay: number;
    lastInt: number;

    constructor(queueId: number, args: ScriptArgument[], delay: number) {
        super();
        this.queueId = queueId;
        this.args = args;
        this.delay = delay;
        this.lastInt = 0;
    }
}
