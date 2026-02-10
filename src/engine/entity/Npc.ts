import { CoordGrid } from '#/engine/CoordGrid.js';
import { BlockWalk } from '#/engine/entity/BlockWalk.js';
import { EntityLifeCycle } from '#/engine/entity/EntityLifeCycle.js';
import { EntityTimer, NpcTimerType } from '#/engine/entity/EntityTimer.js';
import HeroPoints from '#/engine/entity/HeroPoints.js';
import { HitType } from '#/engine/entity/HitType.js';
import { HuntModeType } from '#/engine/entity/hunt/HuntModeType.js';
import { MoveRestrict } from '#/engine/entity/MoveRestrict.js';
import { MoveSpeed } from '#/engine/entity/MoveSpeed.js';
import { MoveStrategy } from '#/engine/entity/MoveStrategy.js';
import { NpcMode } from '#/engine/entity/NpcMode.js';
import NpcQueueRequest from '#/engine/entity/NpcQueueRequest.js';
import { NpcStat } from '#/engine/entity/NpcStat.js';
import PathingEntity from '#/engine/entity/PathingEntity.js';
import { CollisionFlag } from '#/engine/GameMap.js';
import ScriptProvider, { ScriptHandler } from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import World from '#/engine/World.js';
import LinkList from '#/util/LinkList.js';

// ---- info masks ----
export const enum NpcInfoMask {
    ANIM = 0x1,
    FACE_ENTITY = 0x2,
    SAY = 0x4,
    DAMAGE = 0x8,
    CHANGE_TYPE = 0x10,
    SPOTANIM = 0x20,
    FACE_COORD = 0x40,
}

export default class Npc extends PathingEntity {
    static readonly NPC_STAT_COUNT = 6;

    // ---- identity ----
    nid: number = -1;
    uid: number = -1;
    type: number;
    baseType: number;
    startX: number;
    startZ: number;

    // ---- stats ----
    levels: Uint8Array = new Uint8Array(Npc.NPC_STAT_COUNT);
    baseLevels: Uint8Array = new Uint8Array(Npc.NPC_STAT_COUNT);

    // ---- vars ----
    vars: Int32Array = new Int32Array(16);

    // ---- queue ----
    queue: LinkList<NpcQueueRequest> = new LinkList();

    // ---- timer ----
    timerInterval: number = 0;
    timerClock: number = 0;

    // ---- hunt ----
    huntMode: number = -1;
    huntTarget: number = -1;
    huntRange: number = 5;
    huntClock: number = 0;

    // ---- combat ----
    heroPoints: HeroPoints = new HeroPoints(16);
    regenClock: number = 0;

    // ---- ai ----
    mode: NpcMode = NpcMode.NONE;
    defaultMode: NpcMode = NpcMode.WANDER;
    wanderCounter: number = 0;
    patrolPoints: { x: number; z: number }[] = [];
    patrolIndex: number = 0;
    nextPatrolTick: number = 0;
    nextPatrolPoint: number = 0;
    delayedPatrol: boolean = false;
    spawnTriggerPending: boolean = false;

    // ---- script ----
    delayed: boolean = false;

    // ---- config (provided by config system) ----
    wanderRange: number = 5;
    respawnDelay: number = 50;
    givechase: boolean = true;

    constructor(level: number, x: number, z: number, width: number, length: number, lifecycle: EntityLifeCycle, type: number, moveRestrict: MoveRestrict, blockWalk: BlockWalk) {
        super(level, x, z, width, length, lifecycle, moveRestrict, blockWalk, MoveStrategy.NAIVE, NpcInfoMask.FACE_COORD, NpcInfoMask.FACE_ENTITY);
        this.type = type;
        this.baseType = type;
        this.startX = x;
        this.startZ = z;
    }

    // ---- lifecycle ----

    resetEntity(respawn: boolean): void {
        if (respawn) {
            this.type = this.baseType;
            this.x = this.startX;
            this.z = this.startZ;
            this.heroPoints.clear();
            this.initStats();
        }
        this.resetPathingEntity();
    }

    updateMovement(): boolean {
        if (this.tele) {
            this.moveSpeed = MoveSpeed.INSTANT;
            this.jump = true;
            return true;
        }
        return this.processMovement();
    }

    blockWalkFlag(): number {
        if (this.moveRestrict === MoveRestrict.BLOCKED) return CollisionFlag.NPC;
        if (this.moveRestrict === MoveRestrict.BLOCKED_NORMAL) return CollisionFlag.NPC;
        if (this.moveRestrict === MoveRestrict.NOMOVE) return CollisionFlag.NULL;
        if (this.moveRestrict === MoveRestrict.PASSTHRU) return CollisionFlag.OPEN;
        return CollisionFlag.NPC;
    }

    defaultMoveSpeed(): MoveSpeed {
        return MoveSpeed.WALK;
    }

    isValid(_hash64?: bigint): boolean {
        return this.nid !== -1;
    }

    // ---- stats ----

    initStats(): void {
        for (let i = 0; i < Npc.NPC_STAT_COUNT; i++) {
            this.levels[i] = this.baseLevels[i];
        }
    }

    // ---- main tick ----

    turn(currentTick: number): void {
        // 1. handle spawn trigger
        if (this.spawnTriggerPending) {
            this.spawnTriggerPending = false;
            const handler = ScriptProvider.getByTrigger(ServerTriggerType.AI_SPAWN, this.type);
            if (handler) {
                handler({ self: this });
            }
        }

        // 2. hunt processing
        this.huntClock++;
        if (this.huntMode >= 0) {
            this.huntAll();
        }
        this.consumeHuntTarget();

        // 3. HP regen
        this.processRegen();

        // 4. process timers
        this.processTimers(currentTick);

        // 5. process queue
        this.processQueue(currentTick);

        // 6. AI mode + movement + interaction
        this.aiMode(currentTick);
    }

    private processTimers(currentTick: number): void {
        if (this.timerInterval > 0) {
            this.timerClock++;
            if (this.timerClock >= this.timerInterval) {
                this.timerClock = 0;
                const handler = ScriptProvider.getByTrigger(ServerTriggerType.AI_TIMER, this.type);
                if (handler) {
                    handler({ self: this });
                }
            }
        }
    }

    private processQueue(_currentTick: number): void {
        for (const req of this.queue.all()) {
            if (req.delay > 0) {
                req.delay--;
                continue;
            }
            // execute queue handler
            const trigger = ServerTriggerType.AI_QUEUE1 + req.queueId;
            const handler = ScriptProvider.getByTrigger(trigger, this.type);
            if (handler) {
                handler({ self: this, args: req.args, lastInt: req.lastInt });
            }
            req.unlink();
        }
    }

    // ---- AI modes ----

    private aiMode(_currentTick: number): void {
        switch (this.mode) {
            case NpcMode.NONE: this.noMode(); break;
            case NpcMode.WANDER: this.wanderMode(); break;
            case NpcMode.PATROL: this.patrolMode(); break;
            case NpcMode.PLAYERESCAPE: this.playerEscapeMode(); break;
            case NpcMode.PLAYERFOLLOW: this.playerFollowMode(); break;
            case NpcMode.PLAYERFACE: this.playerFaceMode(); break;
            case NpcMode.PLAYERFACECLOSE: this.playerFaceCloseMode(); break;
            default:
                // op/ap player/npc/loc/obj interaction modes
                this.processInteraction();
                break;
        }
    }

    /**
     * NPC interaction processing (approach + operate pattern).
     * Before movement: try to interact at current distance.
     * Movement: path to target.
     * After movement: try to interact again.
     */
    private processInteraction(): void {
        if (!this.target || !this.target.isActive) {
            this.resetInteraction();
            return;
        }

        // validate target still on same level
        if (this.target.level !== this.level) {
            this.resetInteraction();
            return;
        }

        // pre-movement interaction attempt
        if (this.tryInteract(true)) return;

        // path to target + move
        this.pathToTarget();
        this.updateMovement();

        // chase check
        if (this.stepsTaken > 0 && !this.givechase) {
            this.resetInteraction();
            return;
        }

        // post-movement interaction attempt
        if (this.tryInteract(false)) return;
    }

    /**
     * Try to execute an OP or AP trigger.
     * OP = within operable distance (adjacent).
     * AP = within approach range (configurable attack range).
     */
    private tryInteract(_allowScenery: boolean): boolean {
        if (!this.target) return false;

        const opTrigger = this.findOpTrigger();
        const apTrigger = this.findApTrigger();

        // try OP first (adjacent check)
        if (opTrigger && this.inOperableDistance(this.target)) {
            opTrigger({ self: this, target: this.target });
            this.resetInteraction();
            return true;
        }

        // try AP second (range check)
        if (apTrigger && this.inApproachRange(this.target)) {
            apTrigger({ self: this, target: this.target });
            this.resetInteraction();
            return true;
        }

        return false;
    }

    private inApproachRange(target: { x: number; z: number; width: number; length: number }): boolean {
        return CoordGrid.distanceTo(this, target) <= this.huntRange;
    }

    /**
     * Get the OP trigger for the current targetOp mode.
     */
    private findOpTrigger(): ScriptHandler | undefined {
        const op = this.targetOp;
        let trigger: number = -1;

        if (op >= NpcMode.OPPLAYER1 && op <= NpcMode.OPPLAYER5) {
            trigger = ServerTriggerType.AI_OPPLAYER1 + (op - NpcMode.OPPLAYER1);
        } else if (op >= NpcMode.OPNPC1 && op <= NpcMode.OPNPC5) {
            trigger = ServerTriggerType.AI_OPNPC1 + (op - NpcMode.OPNPC1);
        } else if (op >= NpcMode.OPLOC1 && op <= NpcMode.OPLOC5) {
            trigger = ServerTriggerType.AI_OPLOC1 + (op - NpcMode.OPLOC1);
        } else if (op >= NpcMode.OPOBJ1 && op <= NpcMode.OPOBJ5) {
            trigger = ServerTriggerType.AI_OPOBJ1 + (op - NpcMode.OPOBJ1);
        }

        if (trigger === -1) return undefined;
        return ScriptProvider.getByTrigger(trigger, this.type);
    }

    /**
     * Get the AP trigger for the current targetOp mode.
     */
    private findApTrigger(): ScriptHandler | undefined {
        const op = this.targetOp;
        let trigger: number = -1;

        if (op >= NpcMode.APPLAYER1 && op <= NpcMode.APPLAYER5) {
            trigger = ServerTriggerType.AI_APPLAYER1 + (op - NpcMode.APPLAYER1);
        } else if (op >= NpcMode.APNPC1 && op <= NpcMode.APNPC5) {
            trigger = ServerTriggerType.AI_APNPC1 + (op - NpcMode.APNPC1);
        } else if (op >= NpcMode.APLOC1 && op <= NpcMode.APLOC5) {
            trigger = ServerTriggerType.AI_APLOC1 + (op - NpcMode.APLOC1);
        } else if (op >= NpcMode.APOBJ1 && op <= NpcMode.APOBJ5) {
            trigger = ServerTriggerType.AI_APOBJ1 + (op - NpcMode.APOBJ1);
        }

        if (trigger === -1) return undefined;
        return ScriptProvider.getByTrigger(trigger, this.type);
    }

    private resetInteraction(): void {
        this.target = null;
        this.targetOp = -1;
        this.mode = this.defaultMode;
    }

    private noMode(): void {
        // do nothing
    }

    private wanderMode(): void {
        if (this.target) return;
        this.wanderCounter++;
        if (this.wanderCounter < 5) return;
        this.wanderCounter = 0;

        const dx = Math.floor(Math.random() * (this.wanderRange * 2 + 1)) - this.wanderRange;
        const dz = Math.floor(Math.random() * (this.wanderRange * 2 + 1)) - this.wanderRange;
        const destX = this.startX + dx;
        const destZ = this.startZ + dz;

        if (destX !== this.x || destZ !== this.z) {
            this.queueWaypoint(destX, destZ);
        }
    }

    private patrolMode(): void {
        if (this.patrolPoints.length === 0) return;
        const point = this.patrolPoints[this.patrolIndex];
        if (this.x === point.x && this.z === point.z) {
            this.patrolIndex = (this.patrolIndex + 1) % this.patrolPoints.length;
        } else {
            this.queueWaypoint(point.x, point.z);
        }
    }

    private playerEscapeMode(): void {
        if (!this.target) {
            this.mode = this.defaultMode;
            return;
        }
        // move away from target
        const dx = this.x - this.target.x;
        const dz = this.z - this.target.z;
        this.queueWaypoint(this.x + Math.sign(dx), this.z + Math.sign(dz));
    }

    private playerFollowMode(): void {
        if (!this.target) {
            this.mode = this.defaultMode;
            return;
        }
        this.pathToTarget();
    }

    private playerFaceMode(): void {
        if (!this.target) {
            this.mode = this.defaultMode;
            return;
        }
        this.focus(CoordGrid.fine(this.target.x, this.target.width), CoordGrid.fine(this.target.z, this.target.length), true);
    }

    private playerFaceCloseMode(): void {
        if (!this.target) {
            this.mode = this.defaultMode;
            return;
        }
        if (CoordGrid.distanceToSW(this, this.target) > 1) {
            this.mode = this.defaultMode;
            return;
        }
        this.focus(CoordGrid.fine(this.target.x, this.target.width), CoordGrid.fine(this.target.z, this.target.length), true);
    }

    // ---- hunt ----

    huntAll(): void {
        if (this.huntMode < 0) return;
        if (this.huntTarget !== -1) return; // already have a target

        // scan nearby players within huntRange
        const world = World.shared;
        if (!world) return;

        // simple hunt: find nearest player in range
        let bestDist = this.huntRange + 1;
        let bestPid = -1;

        for (const player of world.players) {
            if (!player || !player.isActive) continue;
            if (player.level !== this.level) continue;

            const dist = CoordGrid.distanceTo(this, player);
            if (dist < bestDist) {
                bestDist = dist;
                bestPid = player.pid;
            }
        }

        if (bestPid !== -1) {
            this.huntTarget = bestPid;
        }
    }

    private consumeHuntTarget(): void {
        if (this.huntTarget === -1) return;

        const world = World.shared;
        if (!world) return;

        const player = world.players.get(this.huntTarget);
        if (!player || !player.isActive || player.level !== this.level) {
            this.huntTarget = -1;
            return;
        }

        // set the player as our interaction target
        this.target = player;
        this.targetOp = NpcMode.OPPLAYER1;
        this.mode = NpcMode.OPPLAYER1;
        this.huntTarget = -1;
        this.huntClock = 0;
    }

    // ---- regen ----

    private processRegen(): void {
        this.regenClock++;
        if (this.regenClock >= 100) { // regen every 100 ticks (~60s)
            this.regenClock = 0;
            const maxHp = this.baseLevels[NpcStat.HITPOINTS];
            if (this.levels[NpcStat.HITPOINTS] < maxHp) {
                this.levels[NpcStat.HITPOINTS]++;
            }
        }
    }

    // ---- death ----

    die(): void {
        // trigger death script
        const handler = ScriptProvider.getByTrigger(ServerTriggerType.AI_DESPAWN, this.type);
        if (handler) {
            handler({ self: this });
        }

        // set respawn lifecycle
        this.setLifeCycle(this.respawnDelay);
        this.lifecycle = EntityLifeCycle.RESPAWN;
        this.isActive = false;

        // clear from world
        World.shared.removeNpc(this);
    }

    // ---- type changes ----

    changeType(newType: number): void {
        this.type = newType;
        this.masks |= NpcInfoMask.CHANGE_TYPE;
    }

    revertType(): void {
        if (this.type !== this.baseType) {
            this.type = this.baseType;
            this.masks |= NpcInfoMask.CHANGE_TYPE;
        }
    }

    // ---- combat ----

    applyDamage(amount: number, type: HitType): void {
        this.damageTaken = amount;
        this.damageType = type;
        this.masks |= NpcInfoMask.DAMAGE;
    }

    playAnimation(id: number, delay: number): void {
        this.animId = id;
        this.animDelay = delay;
        this.masks |= NpcInfoMask.ANIM;
    }

    say(text: string): void {
        this.chat = text;
        this.masks |= NpcInfoMask.SAY;
    }
}
