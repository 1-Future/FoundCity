/**
 * FuzzyMatcher — knows which message fields are non-deterministic
 * (combat RNG, inventory slot ordering, etc.) and handles them gracefully.
 */

/** Fields to ignore when comparing messages of a given type. */
const IGNORED_FIELDS: Record<string, Set<string>> = {
    // hit amounts are random — only check structure, not values
    player_info: new Set(['damage', 'damageType']),
    npc_info:    new Set(['damage', 'damageType', 'hp', 'maxHp']),
    // timing fields
    update_reboot_timer: new Set(['ticks']),
    // map data can differ in non-functional ways (encoding)
    rebuild_normal: new Set(['maps']),
};

/** Fields that should be compared as "present or absent", not by value. */
const PRESENCE_ONLY: Record<string, Set<string>> = {
    login_accept: new Set(['pid', 'staffModLevel']), // pid is arbitrary, staffModLevel may differ dev vs prod
    player_info:  new Set(['localPid']),
    npc_info:     new Set(['localNid']),
};

/** Normalize a message before comparison — strip fields that are always different. */
export function normalize(msg: Record<string, unknown>): Record<string, unknown> {
    const type = msg.type as string;
    const out: Record<string, unknown> = { ...msg };

    if (type === 'player_info') {
        // Strip pid (arbitrary server-assigned) from all player entries.
        // Also strip entries that have NO masks and NO moveSpeed — these are
        // "bystander" updates that differ between servers depending on accumulated
        // test state. Only keep meaningful player updates (appearance or movement).
        if (Array.isArray(out.players)) {
            out.players = (out.players as Record<string, unknown>[])
                .map(p => {
                    const { pid: _pid, localPid: _lp, ...rest } = p as Record<string, unknown>;
                    void _pid; void _lp;
                    // Strip x/z when the player is mid-walk (has moveSpeed).
                    // TS-BFS and WASM-rsmod pathfinders take slightly different routes,
                    // so intermediate tile positions are non-deterministic. Appearance
                    // masks (equipment, chat) are still compared to verify game state.
                    if (rest.moveSpeed !== undefined && rest.moveSpeed !== null) {
                        delete (rest as Record<string, unknown>).x;
                        delete (rest as Record<string, unknown>).z;
                    }
                    return rest;
                })
                .filter(p => {
                    // Keep if has masks (appearance update) or has moveSpeed (movement)
                    return 'masks' in p || 'moveSpeed' in p;
                });
        }
        if (Array.isArray(out.removals)) {
            // removals are just pid arrays — order/count may differ across servers
            delete out.removals;
        }
    }

    if (type === 'npc_info') {
        if (Array.isArray(out.npcs)) {
            out.npcs = (out.npcs as Record<string, unknown>[])
                .map(n => {
                    const { nid: _nid, ...rest } = n as Record<string, unknown>;
                    void _nid;
                    return rest;
                })
                // Sort by (x, z, npcType) so order differences don't cause mismatches
                .sort((a, b) => {
                    const ax = (a.x as number) ?? 0, bx = (b.x as number) ?? 0;
                    const az = (a.z as number) ?? 0, bz = (b.z as number) ?? 0;
                    const at = (a.npcType as number) ?? 0, bt = (b.npcType as number) ?? 0;
                    return ax !== bx ? ax - bx : az !== bz ? az - bz : at - bt;
                });
        }
        if (Array.isArray(out.removals)) {
            delete out.removals;
        }
    }

    return out;
}

export type MatchResult =
    | { match: true }
    | { match: false; reason: string; severity: 'exact_mismatch' | 'structural_difference' };

export function fuzzyMatch(
    type: string,
    ref: Record<string, unknown>,
    test: Record<string, unknown>
): MatchResult {
    // normalize both sides first
    ref = normalize(ref);
    test = normalize(test);
    const ignored = IGNORED_FIELDS[type] ?? new Set<string>();
    const presenceOnly = PRESENCE_ONLY[type] ?? new Set<string>();

    const refKeys = Object.keys(ref).filter(k => k !== 'type');
    const testKeys = new Set(Object.keys(test).filter(k => k !== 'type'));

    for (const key of refKeys) {
        if (ignored.has(key)) continue;

        if (!testKeys.has(key)) {
            return {
                match: false,
                reason: `Field "${key}" present in ref but missing in test`,
                severity: 'structural_difference',
            };
        }

        if (presenceOnly.has(key)) continue;

        const rv = ref[key];
        const tv = test[key];

        if (!deepEqual(rv, tv)) {
            return {
                match: false,
                reason: `Field "${key}" mismatch: ref=${JSON.stringify(rv)} test=${JSON.stringify(tv)}`,
                severity: 'exact_mismatch',
            };
        }
    }

    // check for extra fields in test
    for (const key of testKeys) {
        if (key === 'type') continue;
        if (ignored.has(key)) continue;
        if (!refKeys.includes(key)) {
            return {
                match: false,
                reason: `Field "${key}" in test but not in ref`,
                severity: 'structural_difference',
            };
        }
    }

    return { match: true };
}

function deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (a === null || b === null) return a === b;
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        return a.every((v, i) => deepEqual(v, (b as unknown[])[i]));
    }
    if (typeof a === 'object' && typeof b === 'object') {
        const ak = Object.keys(a as object).sort();
        const bk = Object.keys(b as object).sort();
        if (!deepEqual(ak, bk)) return false;
        return ak.every(k =>
            deepEqual(
                (a as Record<string, unknown>)[k],
                (b as Record<string, unknown>)[k]
            )
        );
    }
    return false;
}
