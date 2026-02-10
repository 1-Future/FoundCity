import Linkable from '#/util/Linkable.js';
import NonPathingEntity from '#/engine/entity/NonPathingEntity.js';

export default class LocObjEvent extends Linkable {
    readonly entity: NonPathingEntity;

    constructor(entity: NonPathingEntity) {
        super();
        this.entity = entity;
    }

    check(): boolean {
        return this.entity.eventTracker === this;
    }
}
