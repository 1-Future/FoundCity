import Entity from '#/engine/entity/Entity.js';
import LocObjEvent from '#/engine/entity/LocObjEvent.js';

export default abstract class NonPathingEntity extends Entity {
    eventTracker: LocObjEvent | null = null;

    abstract turn(): void;

    resetEntity(_respawn: boolean) {
        // nothing happens here
    }
}
