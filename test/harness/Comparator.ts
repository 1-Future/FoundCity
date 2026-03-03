/**
 * Comparator â€" diffs two ordered message sequences.
 *
 * Strategy:
 *  1. Group both sequences into 600 ms tick buckets (offset from login_accept).
 *  2. For each tick, align messages by type, apply FuzzyMatcher.
 *  3. Report missing / extra / mismatched messages.
 */
import type { RecordedMessage } from './TestClient.js';
import { fuzzyMatch, normalize } from './FuzzyMatcher.js';

// Using 1200ms (2 game ticks) per comparison bucket.
// This absorbs the ~600ms world-tick phase difference between the two servers
// (REF has been running longer and is at an arbitrary tick phase vs FC which
// just started). Ordering within the window is still compared by type.
const TICK_MS = 1200;

/** Messages to silently ignore when comparing (timing noise, client bookkeeping). */
const SKIP_TYPES = new Set([
    'friend_list',          // empty on fresh accounts - order irrelevant
    'friend_status',
    'obj_add',              // dynamic item spawns - timing noise from cheat command

    // npc_info: NPC wander uses Math.random() — positions diverge between servers.
    // NPC AI correctness verified indirectly through combat in the attack-rat scenario.
    'npc_info',

    // if_close timing depends on when the player reaches the NPC (tick phase sensitive).
    // Presence is checked globally in compare() instead.
    'if_close',

    // zone_full_follows, loc_add, rebuild_normal: re-enabled after static loc fix.
    // Both servers now correctly load and broadcast static map locs.
]);

/**
 * Message types where we only check global presence (did both sides send it?),
 * not timing. These are in SKIP_TYPES to avoid per-tick bucket comparison.
 */
const PRESENCE_ANY_TICK = new Set(['if_close']);

export type DiffSeverity =
    | 'exact_mismatch'
    | 'structural_difference'
    | 'missing_message'
    | 'extra_message'
    | 'fuzzy_acceptable';

export interface DiffEntry {
    tick: number;
    severity: DiffSeverity;
    description: string;
    refMsg?: Record<string, unknown>;
    testMsg?: Record<string, unknown>;
}

export interface CompareResult {
    passed: boolean;
    totalDiffs: number;
    hardFails: number;  // exact_mismatch + structural_difference + missing/extra
    diffs: DiffEntry[];
    summary: string;
}

// ---- tick bucketing ---------------------------------------------------------

interface TickBucket {
    tick: number;
    messages: Record<string, unknown>[];
}

function bucket(
    messages: RecordedMessage[],
    loginElapsed: number
): TickBucket[] {
    const buckets = new Map<number, Record<string, unknown>[]>();

    for (const { elapsed, msg } of messages) {
        if (SKIP_TYPES.has(msg.type as string)) continue;

        // Normalize and skip structurally empty updates.
        const normed = normalize(msg);
        if (normed.type === 'player_info') {
            const players = normed.players as Record<string, unknown>[] | undefined;
            if (!players || players.length === 0) continue;

            // Skip movement-only player_info (no masks on any player).
            // Walk paths differ between TS BFS and WASM rsmod pathfinders, so
            // comparing intermediate positions produces false negatives.
            // Meaningful state changes (appearance, chat, combat) always have masks.
            const hasAnyMasks = players.some(p => {
                const m = p.masks;
                return m !== null && m !== undefined
                    && typeof m === 'object'
                    && Object.keys(m as object).length > 0;
            });
            if (!hasAnyMasks) continue;
        }
        const offset = Math.max(0, elapsed - loginElapsed);
        const tick = Math.floor(offset / TICK_MS);

        // npc_info is in SKIP_TYPES — never reaches here
        if (!buckets.has(tick)) buckets.set(tick, []);
        buckets.get(tick)!.push(msg);
    }

    return Array.from(buckets.entries())
        .sort(([a], [b]) => a - b)
        .map(([tick, messages]) => ({ tick, messages }));
}

function loginElapsedOf(messages: RecordedMessage[]): number {
    const la = messages.find(m => m.msg.type === 'login_accept');
    return la?.elapsed ?? 0;
}

// ---- diffing ----------------------------------------------------------------

function diffTick(
    tick: number,
    refMsgs: Record<string, unknown>[],
    testMsgs: Record<string, unknown>[]
): DiffEntry[] {
    const entries: DiffEntry[] = [];
    const testUsed = new Set<number>();

    for (const refMsg of refMsgs) {
        const type = refMsg.type as string;

        // Best-match: find the test message of the same type that produces the
        // fewest diffs (prefer exact match > fuzzy match > structural diff).
        // This handles cases where two player_info messages in the same bucket
        // arrive in different order between servers (e.g., chat mask timing).
        const candidates = testMsgs
            .map((tm, i) => ({ i, tm }))
            .filter(({ i, tm }) => !testUsed.has(i) && tm.type === type);

        if (candidates.length === 0) {
            entries.push({
                tick,
                severity: 'missing_message',
                description: `Missing ${type} in FoundCity`,
                refMsg,
            });
            continue;
        }

        // pick the best match (fewest diffs)
        let bestIdx = candidates[0].i;
        let bestResult = fuzzyMatch(type, refMsg, candidates[0].tm);

        for (let k = 1; k < candidates.length; k++) {
            const r = fuzzyMatch(type, refMsg, candidates[k].tm);
            if (r.match) { bestIdx = candidates[k].i; bestResult = r; break; }
            // prefer structural_difference over exact_mismatch (closer to matching)
            if (!bestResult.match && bestResult.severity === 'exact_mismatch'
                && r.severity === 'structural_difference') {
                bestIdx = candidates[k].i; bestResult = r;
            }
        }

        testUsed.add(bestIdx);

        const matchIdx = bestIdx;
        void matchIdx; // used above

        const testMsg = testMsgs[bestIdx];
        if (!bestResult.match) {
            entries.push({
                tick,
                severity: bestResult.severity,
                description: `[${type}] ${bestResult.reason}`,
                refMsg,
                testMsg,
            });
        }
        // else: matched OK (or fuzzy_acceptable implicitly)
    }

    // any leftover test messages are extras
    for (let i = 0; i < testMsgs.length; i++) {
        if (!testUsed.has(i)) {
            entries.push({
                tick,
                severity: 'extra_message',
                description: `Extra ${testMsgs[i].type} in FoundCity (not in ref)`,
                testMsg: testMsgs[i],
            });
        }
    }

    return entries;
}

// ---- public API -------------------------------------------------------------

export function compare(
    refMessages: RecordedMessage[],
    testMessages: RecordedMessage[]
): CompareResult {
    const refLogin = loginElapsedOf(refMessages);
    const testLogin = loginElapsedOf(testMessages);

    const refBuckets = bucket(refMessages, refLogin);
    const testBuckets = bucket(testMessages, testLogin);

    const diffs: DiffEntry[] = [];

    // align by tick number
    const allTicks = new Set([
        ...refBuckets.map(b => b.tick),
        ...testBuckets.map(b => b.tick),
    ]);

    for (const tick of Array.from(allTicks).sort((a, b) => a - b)) {
        const ref = refBuckets.find(b => b.tick === tick)?.messages ?? [];
        const test = testBuckets.find(b => b.tick === tick)?.messages ?? [];
        diffs.push(...diffTick(tick, ref, test));
    }

    // Global presence checks: verify that timing-sensitive messages were sent by
    // both sides, regardless of which tick they arrived in.
    for (const ptype of PRESENCE_ANY_TICK) {
        const refHas = refMessages.some(m => m.msg.type === ptype);
        const testHas = testMessages.some(m => m.msg.type === ptype);
        if (refHas && !testHas) {
            diffs.push({
                tick: -1,
                severity: 'missing_message',
                description: `Missing ${ptype} in FoundCity (any tick)`,
                refMsg: { type: ptype },
            });
        } else if (!refHas && testHas) {
            diffs.push({
                tick: -1,
                severity: 'extra_message',
                description: `Extra ${ptype} in FoundCity (any tick)`,
                testMsg: { type: ptype },
            });
        }
        // if both have it (or neither has it): no diff
    }

    const hardFails = diffs.filter(
        d => d.severity === 'exact_mismatch'
            || d.severity === 'structural_difference'
            || d.severity === 'missing_message'
            || d.severity === 'extra_message'
    ).length;

    const passed = hardFails === 0;

    const lines = diffs.map(d =>
        `  tick=${d.tick} [${d.severity}] ${d.description}`
    );
    const summary = passed
        ? `âœ… PASS â€" ${refBuckets.length} ticks compared, no hard diffs`
        : `âŒ FAIL â€" ${hardFails} hard diff(s) across ${diffs.length} total\n${lines.join('\n')}`;

    return { passed, totalDiffs: diffs.length, hardFails, diffs, summary };
}
