import { WebSocket } from 'ws';

import Player from '#/engine/entity/Player.js';
import World from '#/engine/World.js';
import { handleClientMessage } from '#/network/handler/MessageHandler.js';
import { ClientMessage } from '#/network/ClientMessage.js';
import { buildPlayerInfo, buildNpcInfo } from '#/network/server/PlayerInfoEncoder.js';

const USER_EVENT_TYPES: Set<string> = new Set([
    'move_click', 'op_npc', 'op_npc_u', 'op_npc_t',
    'op_loc', 'op_loc_u', 'op_loc_t',
    'op_obj', 'op_obj_u', 'op_obj_t',
    'op_player', 'op_player_u', 'op_player_t',
    'op_held', 'op_held_u', 'op_held_t',
    'message_public', 'if_button', 'inv_button', 'inv_button_d',
]);

export default class NetworkPlayer extends Player {
    client: WebSocket;

    // rate limiting
    private readonly userLimit: number = 10; // max user events per tick
    private readonly clientLimit: number = 50; // max client events per tick

    // incoming message buffer
    private readonly incomingMessages: ClientMessage[] = [];

    // last activity
    lastResponse: number = 0;
    lastConnected: number = 0;
    userPath: number[] = [];
    opcalled: boolean = false;

    constructor(client: WebSocket, username: string) {
        super();
        this.client = client;
        this.username = username;
        this.hash64 = BigInt(username.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0));
        this.lastResponse = World.currentTick;
        this.lastConnected = World.currentTick;
    }

    // ---- input ----

    queueMessage(message: ClientMessage): void {
        this.incomingMessages.push(message);
    }

    decodeIn(): void {
        this.userPath = [];
        this.opcalled = false;
        this.lastConnected = World.currentTick;

        let userCount = 0;
        let clientCount = 0;

        while (this.incomingMessages.length > 0) {
            const msg = this.incomingMessages.shift();
            if (!msg || !msg.type) continue;

            // rate limit by category
            if (USER_EVENT_TYPES.has(msg.type)) {
                if (++userCount > this.userLimit) continue;
            } else {
                if (++clientCount > this.clientLimit) continue;
            }

            this.lastResponse = World.currentTick;
            handleClientMessage(this, msg);
        }
    }

    // ---- output ----

    flushOutput(): void {
        if (!this.isClientConnected()) return;

        // check if build area needs rebuild
        const needsRebuild = this.buildArea.rebuildNormal(this.x, this.z, this.level);
        if (needsRebuild) {
            this.originX = this.buildArea.originX;
            this.originZ = this.buildArea.originZ;
            this.sendToClient({
                type: 'rebuild_normal',
                zoneX: this.x >> 3,
                zoneZ: this.z >> 3,
                originX: this.originX,
                originZ: this.originZ,
            });
        }

        // modal close/open
        if (this.refreshModalClose) {
            this.sendToClient({ type: 'if_close' });
            this.refreshModalClose = false;
        }

        // zone updates (loc/obj add/remove/change)
        this.updateZones();

        // player info
        this.sendToClient(buildPlayerInfo(this));

        // npc info
        this.sendToClient(buildNpcInfo(this));

        // flush message buffer (inv updates, stat updates, UI, etc.)
        const messages = this.encodeOut();
        for (const msg of messages) {
            this.sendToClient(msg);
        }

        // reset social protect flag at end of tick
        this.socialProtect = false;
    }

    /**
     * Zone sync: send full zone data for newly loaded zones, partial updates for existing.
     * Based on BuildArea's active/loaded zone tracking.
     */
    private updateZones(): void {
        const { activeZones, loadedZones } = this.buildArea;
        const zoneMap = World.gameMap.zoneMap;

        // unload zones no longer active
        for (const zoneIndex of loadedZones) {
            if (!activeZones.has(zoneIndex)) {
                loadedZones.delete(zoneIndex);
            }
        }

        // load/update active zones
        for (const zoneIndex of activeZones) {
            const zone = zoneMap.zoneByIndex(zoneIndex);

            // first time seeing this zone — send full snapshot
            if (!loadedZones.has(zoneIndex)) {
                zone.writeFullFollows(this);
            }

            // every tick — send partial updates
            zone.writePartialEncloses(this);
            zone.writePartialFollows(this);

            loadedZones.add(zoneIndex);
        }
    }

    sendToClient(message: any): void {
        if (this.isClientConnected()) {
            try {
                this.client.send(JSON.stringify(message));
            } catch {
                // connection error — will be cleaned up by processLogouts
            }
        }
    }

    override isClientConnected(): boolean {
        return this.client.readyState === WebSocket.OPEN;
    }

    override logout(): void {
        this.sendToClient({ type: 'logout' });
        this.client.close();
    }
}

export function isClientConnected(player: Player): player is NetworkPlayer {
    return player instanceof NetworkPlayer && player.isClientConnected();
}
