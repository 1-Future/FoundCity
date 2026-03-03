import http from 'http';
import fs from 'fs';
import path from 'path';
import { WebSocketServer as WSServer, WebSocket } from 'ws';

import NetworkPlayer from '#/engine/entity/NetworkPlayer.js';
import World from '#/engine/World.js';
import Environment from '#/util/Environment.js';
import { processLogin, cleanupRateLimits } from '#/server/login/LoginServer.js';
import { LoginResponse, loginResponseText } from '#/server/login/Messages.js';

const MIME_TYPES: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
};

export default class WebSocketServer {
    private wss: WSServer | null = null;
    private httpServer: http.Server | null = null;
    private rateLimitCleanupTimer: ReturnType<typeof setInterval> | null = null;

    start(): void {
        const port = Environment.WEB_PORT;

        // HTTP server for static files (client/)
        this.httpServer = http.createServer((req, res) => {
            const url = req.url === '/' ? '/index.html' : req.url ?? '/index.html';
            const safePath = path.normalize(url).replace(/^(\.\.(\/|\\|$))+/, '');
            const filePath = path.join('client', safePath);

            if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
                res.writeHead(404);
                res.end('Not found');
                return;
            }

            const ext = path.extname(filePath).toLowerCase();
            const mime = MIME_TYPES[ext] ?? 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': mime });
            fs.createReadStream(filePath).pipe(res);
        });

        // WebSocket server attached to the HTTP server
        this.wss = new WSServer({ server: this.httpServer });

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
                                // send login_accept immediately (pid=0; real pid assigned in processLogins)
                                // processLogins also sends login_accept with the real pid
                                ws.send(JSON.stringify({
                                    type: 'login_accept',
                                    pid: 0,
                                    staffModLevel: 0,
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

        this.httpServer.listen(port, () => {
            console.log(`[WebSocket] Server listening on http://localhost:${port}`);
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
        }
        if (this.httpServer) {
            this.httpServer.close();
            this.httpServer = null;
        }
        console.log('[WebSocket] Server stopped');
    }
}
