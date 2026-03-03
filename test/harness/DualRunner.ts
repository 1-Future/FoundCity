/**
 * DualRunner — runs the same scenario against both servers in parallel,
 * then compares the results.
 */
import { runScenario, type ScenarioStep, type ScenarioRecording } from './ScenarioRunner.js';
import { compare, type CompareResult } from './Comparator.js';

export const REF_URL  = 'ws://localhost:8889'; // lostcity-emulator (reference)
export const TEST_URL = 'ws://localhost:8888'; // FoundCity (under test)

export interface DualScenario {
    name: string;
    username: string;
    steps: ScenarioStep[];
    listenMs?: number;
    password?: string;
}

export interface DualResult {
    scenario: string;
    ref: ScenarioRecording;
    test: ScenarioRecording;
    comparison: CompareResult;
}

/**
 * Run `scenario` against both servers simultaneously and return the diff.
 *
 * Two separate usernames are used (username_ref / username_fc) so they
 * don't collide as "already logged in" on the same server or confuse
 * broadcast tests.
 */
export async function runDual(scenario: DualScenario): Promise<DualResult> {
    // Use the SAME username on both servers — they're separate processes so no collision.
    // Using different names creates username mismatches in player appearance masks.
    const refUser  = scenario.username;
    const testUser = scenario.username;

    const [ref, test] = await Promise.all([
        runScenario({
            url: REF_URL,
            username: refUser,
            password: scenario.password,
            steps: scenario.steps,
            listenMs: scenario.listenMs,
        }),
        runScenario({
            url: TEST_URL,
            username: testUser,
            password: scenario.password,
            steps: scenario.steps,
            listenMs: scenario.listenMs,
        }),
    ]);

    const comparison = compare(ref.messages, test.messages);

    return {
        scenario: scenario.name,
        ref,
        test,
        comparison,
    };
}

/** Pretty-print a DualResult for Discord/CI output. */
export function formatResult(r: DualResult): string {
    const lines: string[] = [
        `**${r.scenario}**`,
        r.comparison.summary,
    ];

    if (!r.comparison.passed) {
        // show first 10 hard diffs in detail
        const hard = r.comparison.diffs.filter(d =>
            d.severity !== 'fuzzy_acceptable'
        ).slice(0, 10);

        lines.push('', '**Hard diffs:**');
        for (const d of hard) {
            lines.push(`  \`tick=${d.tick}\` [${d.severity}] ${d.description}`);
            if (d.refMsg)  lines.push(`    ref:  \`${JSON.stringify(d.refMsg).substring(0, 120)}\``);
            if (d.testMsg) lines.push(`    test: \`${JSON.stringify(d.testMsg).substring(0, 120)}\``);
        }
    }

    if (r.ref.error)  lines.push(`\n⚠️ REF error: ${r.ref.error}`);
    if (r.test.error) lines.push(`\n⚠️ FC error:  ${r.test.error}`);

    return lines.join('\n');
}
