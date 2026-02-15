// Name lookups for NPCs, objects, and locs. Loaded async from JSON data files.
// NPC/Loc format: { id: [name, op1, op2, op3, op4, op5] }
// Obj format: { id: name }

const npcData = {};
const objNames = {};
const locData = {};

export function npcName(id) {
    const d = npcData[id];
    return d ? d[0] : `NPC#${id}`;
}

export function npcOps(id) {
    const d = npcData[id];
    return d ? d.slice(1) : [null, null, null, null, null];
}

export function objName(id) {
    return objNames[id] || `Obj#${id}`;
}

export function locName(id) {
    const d = locData[id];
    return d ? d[0] : `Loc#${id}`;
}

export function locOps(id) {
    const d = locData[id];
    return d ? d.slice(1) : [null, null, null, null, null];
}

async function loadJson(url, target) {
    try {
        const resp = await fetch(url);
        const data = await resp.json();
        Object.assign(target, data);
    } catch (e) {
        console.warn('[names] Failed to load', url, e);
    }
}

export async function loadNames() {
    await Promise.all([
        loadJson('data/npc_names.json', npcData),
        loadJson('data/obj_names.json', objNames),
        loadJson('data/loc_names.json', locData),
    ]);
    console.log(`[names] Loaded ${Object.keys(npcData).length} NPCs, ${Object.keys(objNames).length} objs, ${Object.keys(locData).length} locs`);
}
