import { WebSocketServer as WSServer, WebSocket } from 'ws';

import NetworkPlayer from '#/engine/entity/NetworkPlayer.js';
import World from '#/engine/World.js';
import Environment from '#/util/Environment.js';
import { processLogin, cleanupRateLimits } from '#/server/login/LoginServer.js';
import { LoginResponse, loginResponseText } from '#/server/login/Messages.js';

export default class WebSocketServer {
    private wss: WSServer | null = null;
    private rateLimitCleanupTimer: ReturnType<typeof setInterval> | null = null;

    start(): void {
        const port = Environment.WEB_PORT;

        this.wss = new WSServer({ port });

        this.wss.on('listening', () => {
            console.log(`[WebSocket] Server listening on port ${port}`);
        });

        this.wss.on('connection', (ws: WebSocket, req) => {
            const ip = req.socket.remoteAddress ?? 'unknown';
            let player: NetworkPlayer | null = null;

            ws.on('message', (data: Buffer) => {
                try {
                    const msg = JSON.parse(data.toString());

                    if (!player) {
                        // first message must be auth
                        if (msg.type === 'auth_login') {
                            const username = (msg.username ?? '').trim();
                            const password = msg.password ?? '';

                            const result = processLogin(ws, username, password, ip);

                            if (result === LoginResponse.SUCCESS) {
                                // find the player that was just queued
                                const queued = World.shared.newPlayers[World.shared.newPlayers.length - 1];
                                if (queued instanceof NetworkPlayer) {
                                    player = queued;
                                }

                                ws.send(JSON.stringify({
                                    type: 'login_accept',
                                    pid: 0, // assigned during processLogins
                                    staffModLevel: player?.staffModLevel ?? 0,
                                }));
                            } else {
                                ws.send(JSON.stringify({
                                    type: 'login_reject',
                                    reason: loginResponseText(result),
                                }));
                                ws.close();
                            }
                        } else {
                            ws.send(JSON.stringify({ type: 'login_reject', reason: 'Must authenticate first' }));
                            ws.close();
                        }
                        return;
                    }

                    // authenticated — queue message for processing
                    player.queueMessage(msg);
                } catch (err) {
                    console.error('[WebSocket] Bad message:', err);
                }
            });

            ws.on('close', () => {
                if (player && player.pid !== -1) {
                    World.shared.logoutRequests.add(player.pid);
                }
                player = null;
            });

            ws.on('error', (err: Error) => {
                console.error('[WebSocket] Connection error:', err.message);
            });
        });

        this.wss.on('error', (err: Error) => {
            console.error('[WebSocket] Server error:', err);
        });

        // clean up rate limit entries every 30 seconds
        this.rateLimitCleanupTimer = setInterval(cleanupRateLimits, 30_000);
    }

    stop(): void {
        if (this.rateLimitCleanupTimer) {
            clearInterval(this.rateLimitCleanupTimer);
            this.rateLimitCleanupTimer = null;
        }
        if (this.wss) {
            this.wss.close();
            this.wss = null;
            console.log('[WebSocket] Server stopped');
        }
    }
}
