import { CoordGrid } from '#/engine/CoordGrid.js';
import { BlockWalk } from '#/engine/entity/BlockWalk.js';
import Entity from '#/engine/entity/Entity.js';
import { EntityLifeCycle } from '#/engine/entity/EntityLifeCycle.js';
import { Interaction } from '#/engine/entity/Interaction.js';
import Loc from '#/engine/entity/Loc.js';
import { MoveRestrict } from '#/engine/entity/MoveRestrict.js';
import { MoveSpeed } from '#/engine/entity/MoveSpeed.js';
import { MoveStrategy } from '#/engine/entity/MoveStrategy.js';
import NonPathingEntity from '#/engine/entity/NonPathingEntity.js';
import Obj from '#/engine/entity/Obj.js';
import { CollisionFlag, CollisionType, canTravel, changeNpcCollision, changePlayerCollision, findPath, findPathToEntity, findPathToLoc, findNaivePath, isZoneAllocated, reachedEntity, reachedLoc, reachedObj, isApproached } from '#/engine/GameMap.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';

type TargetSubject = {
    type: number;
    com: number;
};

export type TargetOp = number; // ServerTriggerType or NpcMode

export default abstract class PathingEntity extends Entity {
    // constructor properties
    protected readonly moveRestrict: MoveRestrict;
    blockWalk: BlockWalk;
    moveStrategy: MoveStrategy;
    private readonly coordmask: number;
    readonly entitymask: number;

    // runtime properties
    moveSpeed: MoveSpeed = MoveSpeed.INSTANT;
    walkDir: number = -1;
    runDir: number = -1;
    waypointIndex: number = -1;
    waypoints: Int32Array = new Int32Array(25);
    lastTickX: number = -1;
    lastTickZ: number = -1;
    lastLevel: number = -1;
    tele: boolean = false;
    jump: boolean = false;
    lastStepX: number = -1;
    lastStepZ: number = -1;
    followX: number = -1;
    followZ: number = -1;
    stepsTaken: number = 0;
    lastInt: number = -1;
    lastCrawl: boolean = false;
    lastMovement: number = 0;

    walktrigger: number = -1;
    walktriggerArg: number = 0;

    delayed: boolean = false;
    delayedUntil: number = -1;
    interacted: boolean = false;
    repathed: boolean = false;
    target: Entity | null = null;
    targetOp: TargetOp = -1;
    targetSubject: TargetSubject = { type: -1, com: -1 };
    apRange: number = 10;
    apRangeCalled: boolean = false;

    targetX: number = -1;
    targetZ: number = -1;

    // info update masks
    masks: number = 0;
    exactStartX: number = -1;
    exactStartZ: number = -1;
    exactEndX: number = -1;
    exactEndZ: number = -1;
    exactMoveStart: number = -1;
    exactMoveEnd: number = -1;
    exactMoveDirection: number = -1;
    faceX: number = -1;
    faceZ: number = -1;
    orientationX: number = -1;
    orientationZ: number = -1;
    faceEntity: number = -1;
    damageTaken: number = -1;
    damageType: number = -1;
    animId: number = -1;
    animDelay: number = -1;
    chat: string | null = null;
    graphicId: number = -1;
    graphicHeight: number = -1;
    graphicDelay: number = -1;

    protected constructor(level: number, x: number, z: number, width: number, length: number, lifecycle: EntityLifeCycle, moveRestrict: MoveRestrict, blockWalk: BlockWalk, moveStrategy: MoveStrategy, coordmask: number, entitymask: number) {
        super(level, x, z, width, length, lifecycle);
        this.moveRestrict = moveRestrict;
        this.blockWalk = blockWalk;
        this.moveStrategy = moveStrategy;
        this.coordmask = coordmask;
        this.entitymask = entitymask;
        this.lastStepX = x - 1;
        this.lastStepZ = z;
    }

    get coord() {
        return CoordGrid.packCoord(this.level, this.x, this.z);
    }

    abstract updateMovement(): boolean;
    abstract blockWalkFlag(): number;
    abstract defaultMoveSpeed(): MoveSpeed;

    processMovement(): boolean {
        if (!this.hasWaypoints() || this.moveSpeed === MoveSpeed.STATIONARY || this.moveSpeed === MoveSpeed.INSTANT) {
            return false;
        }
        if (this.moveSpeed === MoveSpeed.CRAWL) {
            this.lastCrawl = !this.lastCrawl;
            if (this.lastCrawl && this.walkDir === -1) {
                this.walkDir = this.validateAndAdvanceStep();
            }
        } else if (this.walkDir === -1) {
            this.walkDir = this.validateAndAdvanceStep();
            if (this.moveSpeed === MoveSpeed.RUN && this.walkDir !== -1 && this.runDir === -1) {
                this.runDir = this.validateAndAdvanceStep();
            }
        }
        return true;
    }

    private refreshZonePresence(previousX: number, previousZ: number, previousLevel: number): void {
        if (this.x != previousX || this.z !== previousZ || this.level !== previousLevel) {
            switch (this.blockWalk) {
                case BlockWalk.NPC:
                    changeNpcCollision(this.width, previousX, previousZ, previousLevel, false);
                    changeNpcCollision(this.width, this.x, this.z, this.level, true);
                    break;
                case BlockWalk.ALL:
                    changeNpcCollision(this.width, previousX, previousZ, previousLevel, false);
                    changeNpcCollision(this.width, this.x, this.z, this.level, true);
                    changePlayerCollision(this.width, previousX, previousZ, previousLevel, false);
                    changePlayerCollision(this.width, this.x, this.z, this.level, true);
                    break;
            }
            this.lastStepX = previousX;
            this.lastStepZ = previousZ;
        }

        // dynamic import avoidance: use duck-typed World reference
        if (CoordGrid.zone(previousX) !== CoordGrid.zone(this.x) || CoordGrid.zone(previousZ) !== CoordGrid.zone(this.z) || previousLevel != this.level) {
            // Zone leave/enter handled by World
        }
    }

    private validateAndAdvanceStep(): number {
        const dir: number | null = this.takeStep();
        if (dir === null) {
            return -1;
        }
        if (dir === -1) {
            this.waypointIndex--;
            if (this.waypointIndex != -1) {
                return this.validateAndAdvanceStep();
            }
            return -1;
        }
        const previousX: number = this.x;
        const previousZ: number = this.z;
        this.x = CoordGrid.moveX(this.x, dir);
        this.z = CoordGrid.moveZ(this.z, dir);
        const moveX: number = CoordGrid.moveX(this.x, dir);
        const moveZ: number = CoordGrid.moveZ(this.z, dir);
        this.focus(CoordGrid.fine(moveX, this.width), CoordGrid.fine(moveZ, this.length), false);
        this.stepsTaken++;
        this.refreshZonePresence(previousX, previousZ, this.level);

        if (this.waypointIndex !== -1) {
            const coord: CoordGrid = CoordGrid.unpackCoord(this.waypoints[this.waypointIndex]);
            if (coord.x === this.x && coord.z === this.z) {
                this.waypointIndex--;
            }
        }

        return dir;
    }

    queueWaypoint(x: number, z: number): void {
        this.waypoints[0] = CoordGrid.packCoord(0, x, z);
        this.waypointIndex = 0;
    }

    queueWaypoints(waypoints: ArrayLike<number>): void {
        let index: number = -1;
        for (let input: number = waypoints.length - 1, output: number = 0; input >= 0 && output < this.waypoints.length; input--, output++) {
            this.waypoints[output] = waypoints[input];
            index++;
        }
        this.waypointIndex = index;
    }

    clearWaypoints(): void {
        this.waypointIndex = -1;
    }

    teleJump(x: number, z: number, level: number): void {
        this.teleport(x, z, level);
        this.moveSpeed = MoveSpeed.INSTANT;
        this.jump = true;
    }

    teleport(x: number, z: number, level: number): void {
        if (isNaN(level)) {
            level = 0;
        }
        level = Math.max(0, Math.min(level, 3));

        if (!isZoneAllocated(level, x, z)) {
            return;
        }

        const previousX: number = this.x;
        const previousZ: number = this.z;
        const previousLevel: number = this.level;
        this.x = x;
        this.z = z;
        this.level = level;
        const dir: number = CoordGrid.face(previousX, previousZ, x, z);
        const moveX: number = CoordGrid.moveX(this.x, dir);
        const moveZ: number = CoordGrid.moveZ(this.z, dir);
        this.focus(CoordGrid.fine(moveX, this.width), CoordGrid.fine(moveZ, this.length), false);
        this.refreshZonePresence(previousX, previousZ, previousLevel);
        this.lastStepX = this.x - 1;
        this.lastStepZ = this.z;
        this.tele = true;

        if (previousLevel != level) {
            this.moveSpeed = MoveSpeed.INSTANT;
            this.jump = true;
        }
    }

    validateDistanceWalked() {
        const distanceCheck =
            CoordGrid.distanceTo(this, {
                x: this.lastTickX,
                z: this.lastTickZ,
                width: this.width,
                length: this.length
            }) > 2;
        if (distanceCheck) {
            this.jump = true;
        }
    }

    focus(fineX: number, fineZ: number, client: boolean): void {
        this.orientationX = fineX;
        this.orientationZ = fineZ;
        if (client) {
            this.faceX = fineX;
            this.faceZ = fineZ;
            this.masks |= this.coordmask;
        }
    }

    unfocus(): void {
        this.orientationX = CoordGrid.fine(this.x, this.width);
        this.orientationZ = CoordGrid.fine(this.z - 1, this.length);
    }

    reorient(): void {
        const target: Entity | null = this.target;
        if (target instanceof PathingEntity) {
            this.focus(CoordGrid.fine(target.x, target.width), CoordGrid.fine(target.z, target.length), false);
        } else if (this.targetX !== -1 && this.stepsTaken === 0) {
            this.focus(this.targetX, this.targetZ, false);
            this.targetX = -1;
            this.targetZ = -1;
        }
    }

    hasWaypoints(): boolean {
        return this.waypointIndex !== -1;
    }

    isLastOrNoWaypoint(): boolean {
        return this.waypointIndex <= 0;
    }

    inOperableDistance(target: Entity): boolean {
        if (target.level !== this.level) {
            return false;
        }
        if (target instanceof PathingEntity) {
            return reachedEntity(this.level, this.x, this.z, target.x, target.z, target.width, target.length, this.width);
        } else if (target instanceof Loc) {
            return reachedLoc(this.level, this.x, this.z, target.x, target.z, target.width, target.length, this.width, target.angle, target.shape, 0);
        }
        return reachedObj(this.level, this.x, this.z, target.x, target.z, target.width, target.length, this.width);
    }

    protected inApproachDistance(range: number, target: Entity): boolean {
        if (target.level !== this.level) {
            return false;
        }
        if (target instanceof PathingEntity && CoordGrid.intersects(this.x, this.z, this.width, this.length, target.x, target.z, target.width, target.length)) {
            return false;
        }
        return CoordGrid.distanceTo(this, target) <= range && isApproached(this.level, this.x, this.z, target.x, target.z, this.width, this.length, target.width, target.length);
    }

    pathToMoveClick(input: number[], needsfinding: boolean): void {
        if (this.moveStrategy === MoveStrategy.SMART) {
            if (needsfinding) {
                const { x, z } = CoordGrid.unpackCoord(input[0]);
                this.queueWaypoints(findPath(this.level, this.x, this.z, x, z));
            } else {
                this.queueWaypoints(input);
            }
        } else {
            const { x, z } = CoordGrid.unpackCoord(input[input.length - 1]);
            this.queueWaypoint(x, z);
        }
    }

    pathToPathingTarget(): void {
        if (!this.target) return;
        if (!(this.target instanceof PathingEntity)) {
            this.pathToTarget();
            return;
        }
        if (!this.isLastOrNoWaypoint()) return;
        this.pathToTarget();
    }

    pathToTarget(): void {
        if (!this.target) return;

        if (this.moveStrategy === MoveStrategy.SMART) {
            if (this.target instanceof PathingEntity) {
                this.queueWaypoints(findPathToEntity(this.level, this.x, this.z, this.target.x, this.target.z, this.width, this.target.width, this.target.length));
            } else if (this.target instanceof Loc) {
                this.queueWaypoints(findPathToLoc(this.level, this.x, this.z, this.target.x, this.target.z, this.width, this.target.width, this.target.length, this.target.angle, this.target.shape, 0));
            } else if (this.target instanceof Obj && this.x === this.target.x && this.z === this.target.z) {
                this.queueWaypoint(this.target.x, this.target.z);
            } else {
                this.queueWaypoints(findPath(this.level, this.x, this.z, this.target.x, this.target.z));
            }
        } else if (this.moveStrategy === MoveStrategy.NAIVE) {
            const collisionStrategy: CollisionType | null = this.getCollisionStrategy();
            if (collisionStrategy === null) return;
            const extraFlag: number = this.blockWalkFlag();
            if (extraFlag === CollisionFlag.NULL) return;
            if (this.target instanceof PathingEntity) {
                this.queueWaypoints(findNaivePath(this.level, this.x, this.z, this.target.x, this.target.z, this.width, this.length, this.target.width, this.target.length, extraFlag, collisionStrategy));
            } else {
                this.queueWaypoint(this.target.x, this.target.z);
            }
        } else {
            this.queueWaypoint(this.target.x, this.target.z);
        }
    }

    setInteraction(interaction: Interaction, target: Entity, op: TargetOp, com?: number): boolean {
        if (!target.isValid()) {
            return false;
        }

        this.target = target;
        this.targetOp = op;
        this.apRange = 10;
        this.apRangeCalled = false;

        this.targetSubject.com = com ? com : -1;
        if (target instanceof NonPathingEntity && 'type' in target) {
            this.targetSubject.type = (target as any).type;
        } else {
            this.targetSubject.type = -1;
        }

        this.focus(CoordGrid.fine(target.x, target.width), CoordGrid.fine(target.z, target.length), target instanceof NonPathingEntity && interaction === Interaction.ENGINE);

        if ('pid' in target) {
            const pid: number = (target as any).pid + 32768;
            if (this.faceEntity !== pid) {
                this.faceEntity = pid;
                this.masks |= this.entitymask;
            }
        } else if ('nid' in target) {
            const nid: number = (target as any).nid;
            if (this.faceEntity !== nid) {
                this.faceEntity = nid;
                this.masks |= this.entitymask;
            }
        } else {
            this.targetX = CoordGrid.fine(target.x, target.width);
            this.targetZ = CoordGrid.fine(target.z, target.length);
        }

        return true;
    }

    clearInteraction(): void {
        this.target = null;
        this.targetOp = -1;
        this.targetSubject = { type: -1, com: -1 };
        this.apRange = 10;
        this.apRangeCalled = false;
    }

    protected getCollisionStrategy(): CollisionType | null {
        if (this.moveRestrict === MoveRestrict.NORMAL) return CollisionType.NORMAL;
        if (this.moveRestrict === MoveRestrict.BLOCKED) return CollisionType.BLOCKED;
        if (this.moveRestrict === MoveRestrict.BLOCKED_NORMAL) return CollisionType.LINE_OF_SIGHT;
        if (this.moveRestrict === MoveRestrict.INDOORS) return CollisionType.INDOORS;
        if (this.moveRestrict === MoveRestrict.OUTDOORS) return CollisionType.OUTDOORS;
        if (this.moveRestrict === MoveRestrict.NOMOVE) return null;
        if (this.moveRestrict === MoveRestrict.PASSTHRU) return CollisionType.NORMAL;
        return null;
    }

    protected resetPathingEntity(): void {
        this.moveSpeed = this.defaultMoveSpeed();
        this.walkDir = -1;
        this.runDir = -1;
        this.jump = false;
        this.tele = false;
        this.lastTickX = this.x;
        this.lastTickZ = this.z;
        this.lastLevel = this.level;
        this.stepsTaken = 0;
        this.interacted = false;
        this.apRangeCalled = false;

        this.masks = 0;
        this.exactStartX = -1;
        this.exactStartZ = -1;
        this.exactEndX = -1;
        this.exactEndZ = -1;
        this.exactMoveStart = -1;
        this.exactMoveEnd = -1;
        this.exactMoveDirection = -1;
        this.animId = -1;
        this.animDelay = -1;
        this.chat = null;
        this.damageTaken = -1;
        this.damageType = -1;
        this.graphicId = -1;
        this.graphicHeight = -1;
        this.graphicDelay = -1;
        this.faceX = -1;
        this.faceZ = -1;

        if (!this.target && this.faceEntity !== -1) {
            this.masks |= this.entitymask;
            this.faceEntity = -1;
        }
    }

    private takeStep(): number | null {
        if (this.waypointIndex === -1) {
            return null;
        }

        const collisionStrategy: CollisionType | null = this.getCollisionStrategy();
        if (collisionStrategy === null) {
            return -1;
        }

        const extraFlag: number = this.blockWalkFlag();
        if (extraFlag === CollisionFlag.NULL) {
            return -1;
        }

        const srcX: number = this.x;
        const srcZ: number = this.z;

        const { x, z } = CoordGrid.unpackCoord(this.waypoints[this.waypointIndex]);

        if (this.width > 1) {
            const tryDirX = CoordGrid.face(srcX, 0, x, 0);
            if (canTravel(this.level, srcX, srcZ, CoordGrid.deltaX(tryDirX), 0, this.width, extraFlag, collisionStrategy)) {
                return tryDirX;
            }
            const tryDirZ = CoordGrid.face(0, srcZ, 0, z);
            if (canTravel(this.level, srcX, srcZ, 0, CoordGrid.deltaZ(tryDirZ), this.width, extraFlag, collisionStrategy)) {
                return tryDirZ;
            }
            return -1;
        }

        const dir: number = CoordGrid.face(srcX, srcZ, x, z);
        const dx: number = CoordGrid.deltaX(dir);
        const dz: number = CoordGrid.deltaZ(dir);

        if (dx == 0 && dz == 0) {
            return -1;
        }

        if (this.moveStrategy === MoveStrategy.FLY) {
            return dir;
        }

        if (canTravel(this.level, this.x, this.z, dx, dz, this.width, extraFlag, collisionStrategy)) {
            return dir;
        }

        if (dx != 0 && canTravel(this.level, this.x, this.z, dx, 0, this.width, extraFlag, collisionStrategy)) {
            return CoordGrid.face(srcX, srcZ, x, srcZ);
        }

        if (dz != 0 && canTravel(this.level, this.x, this.z, 0, dz, this.width, extraFlag, collisionStrategy)) {
            return CoordGrid.face(srcX, srcZ, srcX, z);
        }

        return null;
    }
}
