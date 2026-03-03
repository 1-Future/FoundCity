/**
 * ScenarioRunner — executes a scripted sequence of actions against one server
 * and returns the full message recording.
 */
import { TestClient, type RecordedMessage } from './TestClient.js';

export interface ScenarioStep {
    /** ms to wait BEFORE sending this action (relative to previous step) */
    delay: number;
    /** the message to send, or null to just wait */
    action: Record<string, unknown> | null;
    /** optional label for debugging */
    label?: string;
}

export interface ScenarioOptions {
    url: string;
    username: string;
    password?: string;
    /** steps to execute after login_accept */
    steps: ScenarioStep[];
    /** how long to keep listening after the last step (ms) */
    listenMs?: number;
}

export interface ScenarioRecording {
    url: string;
    username: string;
    messages: RecordedMessage[];
    loginMs: number;    // elapsed ms when login_accept arrived
    error?: string;
}

export async function runScenario(opts: ScenarioOptions): Promise<ScenarioRecording> {
    const {
        url,
        username,
        password = 'test',
        steps,
        listenMs = 2_000,
    } = opts;

    const client = new TestClient(url);

    try {
        await client.connect();

        // authenticate
        const loginAccept = await client.login(username, password);
        const loginMs = client.getMessages().find(m => m.msg.type === 'login_accept')?.elapsed ?? 0;
        void loginAccept; // acknowledged

        // execute steps
        for (const step of steps) {
            if (step.delay > 0) {
                await new Promise(r => setTimeout(r, step.delay));
            }
            if (step.action) {
                client.send(step.action);
            }
        }

        // listen for trailing messages (zone updates, NPC responses, etc.)
        await new Promise(r => setTimeout(r, listenMs));

        // graceful logout
        try { client.send({ type: 'logout' }); } catch { /* ignore */ }
        await new Promise(r => setTimeout(r, 200));

        client.close();

        return {
            url,
            username,
            messages: client.getMessages(),
            loginMs,
        };
    } catch (err) {
        client.close();
        return {
            url,
            username,
            messages: client.getMessages(),
            loginMs: 0,
            error: String(err),
        };
    }
}
