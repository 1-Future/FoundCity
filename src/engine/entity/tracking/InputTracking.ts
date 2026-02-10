import Player from '#/engine/entity/Player.js';
import InputTrackingBlob from '#/engine/entity/tracking/InputEvent.js';
import World from '#/engine/World.js';
import Environment from '#/util/Environment.js';

export default class InputTracking {
    // How many ticks between tracking sessions
    private static readonly TRACKING_RATE: number = 200; // 120 seconds
    // How many ticks the tracking is enabled for
    private static readonly TRACKING_TIME: number = 150; // 90 seconds
    // How many ticks to allow for any remaining data from client
    private static readonly REMAINING_DATA_UPLOAD_LEEWAY: number = 16; // ~10 seconds

    private readonly player: Player;

    // Whether we have seen at least one input tracking report
    hasSeenReport: boolean = false;
    // Whether we are waiting for any remaining data to be sent from client
    waitingForRemainingData: boolean = false;

    // Whether we have enabled tracking
    enabled: boolean = false;

    // The World tick-count for when tracking should start
    startTrackingAt: number = this.nextScheduledTrackingStart();

    // The World tick-count for when tracking should end
    endTrackingAt: number = this.nextScheduledTrackingEnd();

    // List of recorded input 'blobs'
    recordedBlobs: InputTrackingBlob[] = [];
    // Number of bytes in total for all recorded blobs
    recordedBlobsSizeTotal: number = 0;

    constructor(player: Player) {
        this.player = player;
    }

    private nextScheduledTrackingStart(): number {
        return World.currentTick + InputTracking.TRACKING_RATE + this.offset(15);
    }

    private nextScheduledTrackingEnd(): number {
        return this.startTrackingAt + InputTracking.TRACKING_TIME;
    }

    private shouldStartTracking(): boolean {
        return World.currentTick >= this.startTrackingAt;
    }

    private shouldEndTracking(): boolean {
        return World.currentTick >= this.endTrackingAt;
    }

    /**
     * Called once per cycle for each player. Decides whether to enable
     * or disable input tracking, along with submitting events.
     */
    onCycle(): void {
        if (this.waitingForRemainingData) {
            if (this.endTrackingAt + InputTracking.REMAINING_DATA_UPLOAD_LEEWAY < World.currentTick) {
                this.submitEvents();
            }
            return;
        }

        if (this.shouldStartTracking() && !this.enabled) {
            this.enable();
            return;
        }

        if (this.shouldEndTracking() && this.enabled) {
            this.disable();
            return;
        }
    }

    enable(): void {
        if (this.enabled) {
            return;
        }
        this.enabled = true;
        this.startTrackingAt = World.currentTick;
        this.endTrackingAt = this.nextScheduledTrackingEnd();
        // notify the client to start tracking — queued as outgoing message
        this.player.addOutputMessage({ type: 'enable_tracking' });
    }

    disable(): void {
        if (!this.enabled) {
            return;
        }
        this.enabled = false;
        this.startTrackingAt = this.nextScheduledTrackingStart();
        this.endTrackingAt = World.currentTick;
        this.waitingForRemainingData = true;
        this.player.addOutputMessage({ type: 'finish_tracking' });
    }

    isActive(): boolean {
        const withinTicks = World.currentTick >= this.startTrackingAt && World.currentTick <= this.endTrackingAt;
        return withinTicks || this.waitingForRemainingData;
    }

    record(rawData: Uint8Array): void {
        this.recordedBlobsSizeTotal += rawData.length;
        this.recordedBlobs.push(new InputTrackingBlob(rawData, this.recordedBlobs.length + 1, this.player.coord));
    }

    submitEvents(): void {
        if (!this.hasSeenReport && !Environment.NODE_DEBUG) {
            // player didn't send tracking report — may be AFK botting
            this.player.requestIdleLogout = true;
        }
        // reset state
        this.waitingForRemainingData = false;
        this.recordedBlobs = [];
        this.recordedBlobsSizeTotal = 0;
        this.hasSeenReport = false;
    }

    offset(n: number): number {
        return Math.floor(Math.random() * (n - -n + 1)) + -n;
    }
}
