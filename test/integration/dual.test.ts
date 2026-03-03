/**
 * Dual-server integration tests.
 *
 * Each test runs the same scenario against:
 *   REF  = lostcity-emulator  (port 8889)
 *   TEST = FoundCity           (port 8888)
 *
 * and asserts that the message sequences match within fuzzy tolerance.
 *
 * Run: npx vitest run test/integration/dual.test.ts
 */
import { describe, it, expect, afterEach } from 'vitest';
import { runDual, formatResult, type DualResult } from '../harness/DualRunner.js';

// post results to Discord #test-results after each test
import { postResult } from '../helpers/discordPost.js';

const TICK = 600; // ms per game tick

// ---- helpers ----------------------------------------------------------------

function assertPassed(result: DualResult) {
    const report = formatResult(result);
    console.log('\n' + report);
    expect(result.comparison.passed, report).toBe(true);
}

afterEach(async (ctx) => {
    // Give both servers 2 full ticks to process disconnects before the next test.
    // Without this, previous-test players accumulate in the world and appear in
    // zone-local player_info packets, making comparisons noisy.
    await new Promise(r => setTimeout(r, 2 * TICK));

    // best-effort Discord post — don't fail the test if it errors
    try {
        const r = (ctx.task as unknown as { _dualResult?: DualResult })._dualResult;
        if (r) await postResult(r, ctx.task.name);
    } catch { /* ignore */ }
});

// ---- 01 — Login & spawn -----------------------------------------------------

describe('01 — login and spawn', () => {
    it('player spawns at correct coordinates with correct stats', async (ctx) => {
        const result = await runDual({
            name: '01-login-spawn',
            username: 'dtest01',
            steps: [],          // just login, nothing else
            listenMs: 3 * TICK, // wait 3 ticks for all init messages
        });
        (ctx.task as unknown as { _dualResult: DualResult })._dualResult = result;
        assertPassed(result);
    });
});

// ---- 02 — Walk to coordinate ------------------------------------------------

describe('02 — walk to coordinate', () => {
    it('move_click produces matching player_info walk sequence', async (ctx) => {
        const result = await runDual({
            name: '02-walk',
            username: 'dtest02',
            steps: [
                { delay: 2 * TICK, action: { type: 'move_click', x: 3220, z: 3220, run: false } },
            ],
            listenMs: 6 * TICK, // enough ticks to complete the walk
        });
        (ctx.task as unknown as { _dualResult: DualResult })._dualResult = result;
        assertPassed(result);
    });
});

// ---- 03 — Attack rat --------------------------------------------------------

describe('03 — attack rat', () => {
    it('op_npc attack produces matching combat sequence', async (ctx) => {
        const result = await runDual({
            name: '03-attack-rat',
            username: 'dtest03',
            steps: [
                // first walk near rat spawn (lumbridge cellar area — nid 1 should be a rat)
                { delay: 2 * TICK, action: { type: 'move_click', x: 3225, z: 3208, run: false } },
                // attack the closest NPC (nid=1, op=1 = attack)
                { delay: 5 * TICK, action: { type: 'op_npc', nid: 1, op: 1 } },
            ],
            listenMs: 12 * TICK, // enough for combat resolution
        });
        (ctx.task as unknown as { _dualResult: DualResult })._dualResult = result;
        assertPassed(result);
    });
});

// ---- 04 — Public chat -------------------------------------------------------

describe('04 — public chat', () => {
    it('message_public broadcast arrives back to sender', async (ctx) => {
        const result = await runDual({
            name: '04-public-chat',
            username: 'dtest04',
            steps: [
                { delay: 2 * TICK, action: {
                    type: 'message_public',
                    text: 'Hello world',  // field is 'text', not 'message'
                    color: 0,
                    effect: 0,
                }},
            ],
            listenMs: 3 * TICK,
        });
        (ctx.task as unknown as { _dualResult: DualResult })._dualResult = result;
        assertPassed(result);
    });
});

// ---- 05 — Pick up ground item -----------------------------------------------

describe('05 — pick up ground item', () => {
    it('op_obj on a ground item updates inventory', async (ctx) => {
        const result = await runDual({
            name: '05-pickup-item',
            username: 'dtest05',
            steps: [
                // spawn a bone on the ground via cheat (staffmod = 4 in dev)
                { delay: 2 * TICK, action: { type: 'client_cheat', command: 'spawnobj 526 1' } },
                // wait a tick for it to appear
                { delay: TICK, action: null },
                // pick it up (op=1 on the nearest obj)
                { delay: 0, action: { type: 'op_obj', x: 3200, z: 3200, id: 526, op: 1 } },
            ],
            listenMs: 4 * TICK,
        });
        (ctx.task as unknown as { _dualResult: DualResult })._dualResult = result;
        assertPassed(result);
    });
});
