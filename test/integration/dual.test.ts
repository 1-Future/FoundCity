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
                // Teleport the player directly adjacent to rat nid=4759 (type 47, Rat)
                // which spawns at (3197, 3204) — 5 tiles from default spawn (3200,3200).
                // tele format: level,mx,mz,lx,lz  →  (49<<6)+62=3198, (50<<6)+4=3204
                // Player lands at (3198, 3204) = 1 tile east of rat spawn.
                // staffModLevel=4 is set in PlayerLoading when NODE_ALLOW_CHEATS=true.
                { delay: 2 * TICK, action: { type: 'client_cheat', command: 'tele 0,49,50,62,4' } },
                // Attack the rat immediately — it's at most a few tiles away (wanderrange=15
                // but only 2 ticks have elapsed since server start, so ~2 random steps max).
                { delay: TICK, action: { type: 'op_npc', nid: 4759, op: 2 } }, // op=2 = "Attack" (ops[1])
            ],
            listenMs: 10 * TICK, // walk ≤5 tiles + combat resolution (rat has 2 HP)
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
                // spawn bones on the ground via cheat at player spawn (3200,3200)
                // staffModLevel=4 is set in PlayerLoading when NODE_ALLOW_CHEATS=true
                { delay: 2 * TICK, action: { type: 'client_cheat', command: 'spawnobj 526 1' } },
                // wait a tick for the obj to be registered in the zone
                { delay: TICK, action: null },
                // pick it up — objId field (not 'id') matches OpObjMessage interface
                { delay: 0, action: { type: 'op_obj', x: 3200, z: 3200, objId: 526, op: 1 } },
            ],
            listenMs: 6 * TICK, // spawnobj + walk to obj + pickup + inv_update
        });
        (ctx.task as unknown as { _dualResult: DualResult })._dualResult = result;
        assertPassed(result);
    });
});
