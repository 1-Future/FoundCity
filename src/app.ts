import 'dotenv/config';

import World from '#/engine/World.js';
import WebSocketServer from '#/server/WebSocketServer.js';
import { initLogger, flushLogs } from '#/server/logger/LoggerServer.js';
import ConfigRegistry from '#/config/ConfigRegistry.js';
import Environment from '#/util/Environment.js';
import PlayerLoading from '#/engine/entity/PlayerLoading.js';

// import all message handlers (side-effect registration)
import '#/network/handler/index.js';

// import all content handlers (side-effect registration)
import '#/handlers/index.js';

async function main(): Promise<void> {
    console.log('=== lostcitynojagex ===');
    console.log('Clean RS225 server rewrite — no RuneScript, no binary protocol');
    console.log(`Node ID: ${Environment.NODE_ID}, Port: ${Environment.WEB_PORT}`);
    console.log('');

    // 1. load configs from JSON
    console.log('[App] Loading configs...');
    ConfigRegistry.load('data');

    // 2. initialize logger
    initLogger();

    // 3. create and initialize world (loads maps, spawns NPCs/objs)
    console.log('[App] Initializing world...');
    const world = new World();
    await world.init();

    // 4. start websocket server (handles auth + client connections)
    const wsServer = new WebSocketServer();
    wsServer.start();

    // 5. start game loop
    world.start();

    // graceful shutdown
    const shutdown = (): void => {
        console.log('\n[App] Shutting down...');

        // save all online players
        for (const player of world.players) {
            if (player) {
                try {
                    PlayerLoading.save(player);
                } catch { /* ignore */ }
            }
        }

        flushLogs();
        world.stop();
        wsServer.stop();
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    console.log('[App] Server is running. Press Ctrl+C to stop.');
}

main().catch((err) => {
    console.error('[App] Fatal error:', err);
    process.exit(1);
});
