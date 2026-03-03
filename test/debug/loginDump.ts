/**
 * Quick diagnostic — dump raw message sequences from both servers on login.
 * Run: npx tsx test/debug/loginDump.ts
 */
import WebSocket from 'ws';

async function dumpLogin(url: string, label: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const messages: { elapsed: number; msg: unknown }[] = [];
        let startTime = 0;
        const ws = new WebSocket(url);

        ws.on('open', () => {
            startTime = Date.now();
            ws.send(JSON.stringify({ type: 'auth_login', username: `debugtest_${label}`, password: 'test' }));
        });

        ws.on('message', (raw: Buffer) => {
            const msg = JSON.parse(raw.toString());
            messages.push({ elapsed: Date.now() - startTime, msg });
        });

        ws.on('error', reject);

        // collect for 3 seconds then dump
        setTimeout(() => {
            ws.close();
            console.log(`\n=== ${label} (${url}) — ${messages.length} messages ===`);
            for (const { elapsed, msg } of messages) {
                const type = (msg as { type: string }).type;
                console.log(`  [${String(elapsed).padStart(5)}ms] ${type}`);
            }
            resolve();
        }, 3_000);
    });
}

await dumpLogin('ws://localhost:8889', 'REF');
await dumpLogin('ws://localhost:8888', 'FC');
