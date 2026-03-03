/**
 * Posts dual-test results to the FoundCity Discord server.
 *
 * Uses the OpenClaw gateway invoke endpoint to route through the bot,
 * since we don't have a direct Discord token here.
 */
import { formatResult } from '../harness/DualRunner.js';
import type { DualResult } from '../harness/DualRunner.js';

// FoundCity Discord channels (from memory)
const RESULTS_FORUM_ID  = '1478248223226204241'; // #test-results
const DISCREP_FORUM_ID  = '1478248256898072709'; // #discrepancies

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY ?? 'http://localhost:9999';
const GATEWAY_TOKEN = process.env.OPENCLAW_TOKEN ?? '';

async function gatewayInvoke(command: string, params: Record<string, unknown>): Promise<void> {
    try {
        const res = await fetch(`${GATEWAY_URL}/tools/invoke`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(GATEWAY_TOKEN ? { Authorization: `Bearer ${GATEWAY_TOKEN}` } : {}),
            },
            body: JSON.stringify({ tool: command, params }),
        });
        if (!res.ok) {
            console.warn(`[discordPost] Gateway responded ${res.status}`);
        }
    } catch (err) {
        console.warn('[discordPost] Could not reach gateway:', err);
    }
}

export async function postResult(result: DualResult, testName: string): Promise<void> {
    const body = formatResult(result);
    const status = result.comparison.passed ? '✅' : '❌';
    const title = `${status} ${testName}`;

    // post a thread to #test-results
    await gatewayInvoke('message', {
        action: 'thread-create',
        channel: RESULTS_FORUM_ID,
        threadName: title,
        message: body.substring(0, 1990),
    });

    // if there are hard fails, also post each to #discrepancies
    if (!result.comparison.passed) {
        const hardDiffs = result.comparison.diffs.filter(d =>
            d.severity === 'exact_mismatch' || d.severity === 'structural_difference' ||
            d.severity === 'missing_message'  || d.severity === 'extra_message'
        );

        for (const diff of hardDiffs.slice(0, 3)) {
            const discrepBody = [
                `**Scenario:** ${result.scenario}`,
                `**Severity:** ${diff.severity}`,
                `**Tick:** ${diff.tick}`,
                `**Description:** ${diff.description}`,
                diff.refMsg  ? `**REF msg:** \`${JSON.stringify(diff.refMsg).substring(0, 200)}\`` : '',
                diff.testMsg ? `**FC msg:**  \`${JSON.stringify(diff.testMsg).substring(0, 200)}\`` : '',
            ].filter(Boolean).join('\n');

            await gatewayInvoke('message', {
                action: 'thread-create',
                channel: DISCREP_FORUM_ID,
                threadName: `[${result.scenario}] tick=${diff.tick} ${diff.severity}`,
                message: discrepBody.substring(0, 1990),
            });
        }
    }
}
