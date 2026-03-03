/**
 * TestClient — minimal WebSocket bot that connects to one server,
 * sends actions on demand, and collects every message it receives.
 */
import WebSocket from 'ws';

export interface RecordedMessage {
    /** ms elapsed since the client connected */
    elapsed: number;
    /** the parsed JSON message */
    msg: Record<string, unknown>;
}

export type Action =
    | { kind: 'send'; msg: Record<string, unknown> }
    | { kind: 'wait'; ms: number };

export class TestClient {
    private ws: WebSocket | null = null;
    private startTime = 0;
    private messages: RecordedMessage[] = [];
    private connected = false;
    private closed = false;

    constructor(private readonly url: string) {}

    // ---- lifecycle ----------------------------------------------------------

    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.url);
            this.ws.on('open', () => {
                this.startTime = Date.now();
                this.connected = true;
                resolve();
            });
            this.ws.on('message', (raw: Buffer) => {
                try {
                    const msg = JSON.parse(raw.toString()) as Record<string, unknown>;
                    this.messages.push({ elapsed: Date.now() - this.startTime, msg });
                } catch {
                    // malformed — skip
                }
            });
            this.ws.on('close', () => {
                this.closed = true;
            });
            this.ws.on('error', (err) => {
                if (!this.connected) reject(err);
            });
        });
    }

    send(msg: Record<string, unknown>): void {
        if (!this.ws || this.closed) throw new Error('Not connected');
        this.ws.send(JSON.stringify(msg));
    }

    close(): void {
        if (this.ws && !this.closed) {
            this.ws.close();
        }
    }

    // ---- queries ------------------------------------------------------------

    getMessages(): RecordedMessage[] {
        return [...this.messages];
    }

    /** Wait until a message of the given type arrives or timeout. */
    waitFor(type: string, timeoutMs = 8_000): Promise<Record<string, unknown>> {
        return new Promise((resolve, reject) => {
            const deadline = Date.now() + timeoutMs;
            const check = setInterval(() => {
                const found = this.messages.find(m => m.msg.type === type);
                if (found) {
                    clearInterval(check);
                    resolve(found.msg);
                } else if (Date.now() >= deadline) {
                    clearInterval(check);
                    reject(new Error(`Timed out waiting for message type: ${type}`));
                }
            }, 50);
        });
    }

    // ---- helpers ------------------------------------------------------------

    /** Authenticate and wait for login_accept. */
    async login(username: string, password = 'test'): Promise<Record<string, unknown>> {
        this.send({ type: 'auth_login', username, password });
        return this.waitFor('login_accept');
    }
}
