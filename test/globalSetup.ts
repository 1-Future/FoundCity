/**
 * Vitest globalSetup — spins up both server processes before any test runs,
 * tears them down after all tests complete.
 *
 * ref  = lostcity-emulator  → port 8889
 * test = FoundCity           → port 8888
 */
import { spawn, ChildProcess } from 'child_process';
import { createConnection } from 'net';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_FC = path.resolve(__dirname, '..'); // FoundCity
const ROOT_REF = path.resolve(__dirname, '../../lostcity-emulator'); // reference

let refProc: ChildProcess | null = null;
let testProc: ChildProcess | null = null;

// ---- helpers ----------------------------------------------------------------

function waitForPort(port: number, timeoutMs = 20_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    return new Promise((resolve, reject) => {
        function attempt() {
            const client = createConnection({ port, host: '127.0.0.1' }, () => {
                client.destroy();
                resolve();
            });
            client.on('error', () => {
                if (Date.now() >= deadline) {
                    reject(new Error(`Port ${port} did not open within ${timeoutMs}ms`));
                } else {
                    setTimeout(attempt, 300);
                }
            });
        }
        attempt();
    });
}

function startServer(
    cwd: string,
    port: number,
    label: string
): ChildProcess {
    const proc = spawn(
        'cmd',
        ['/c', `npx tsx src/app.ts`],
        {
            cwd,
            env: { ...process.env, WEB_PORT: String(port), NODE_DEBUG: 'false' },
            stdio: ['ignore', 'pipe', 'pipe'],
        }
    );

    proc.stdout?.on('data', (d: Buffer) => {
        const line = d.toString().trim();
        if (line) process.stdout.write(`  [${label}] ${line}\n`);
    });
    proc.stderr?.on('data', (d: Buffer) => {
        const line = d.toString().trim();
        if (line) process.stderr.write(`  [${label}:ERR] ${line}\n`);
    });
    proc.on('exit', (code) => {
        if (code !== null && code !== 0) {
            process.stderr.write(`  [${label}] exited with code ${code}\n`);
        }
    });

    return proc;
}

// ---- vitest lifecycle -------------------------------------------------------

async function isPortOpen(port: number): Promise<boolean> {
    return new Promise(resolve => {
        const c = createConnection({ port, host: '127.0.0.1' }, () => { c.destroy(); resolve(true); });
        c.on('error', () => resolve(false));
    });
}

export async function setup(): Promise<void> {
    const [ref8889, fc8888] = await Promise.all([isPortOpen(8889), isPortOpen(8888)]);

    if (ref8889 && fc8888) {
        console.log('\n[GlobalSetup] Both servers already running — skipping launch.\n');
        return;
    }

    if (!ref8889) {
        console.log('\n[GlobalSetup] Starting reference server (lostcity-emulator) on :8889...');
        refProc = startServer(ROOT_REF, 8889, 'REF');
    }

    if (!fc8888) {
        console.log('[GlobalSetup] Starting test server (FoundCity) on :8888...');
        testProc = startServer(ROOT_FC, 8888, 'FC');
    }

    console.log('[GlobalSetup] Waiting for servers...');
    await Promise.all([
        waitForPort(8889),
        waitForPort(8888),
    ]);
    await new Promise(r => setTimeout(r, 1_500));
    console.log('[GlobalSetup] Servers ready.\n');
}

export async function teardown(): Promise<void> {
    console.log('\n[GlobalSetup] Stopping servers...');
    refProc?.kill('SIGTERM');
    testProc?.kill('SIGTERM');
    // give them a moment to flush/save
    await new Promise(r => setTimeout(r, 800));
    refProc?.kill('SIGKILL');
    testProc?.kill('SIGKILL');
    console.log('[GlobalSetup] Done.');
}
