// Shared game state — single source of truth for all modules.

const state = {
    // connection
    ws: null,
    connected: false,
    pid: -1,
    staffModLevel: 0,
    username: '',

    // world origin (set by rebuild_normal)
    originX: 0,
    originZ: 0,
    zoneX: 0,
    zoneZ: 0,

    // current zone context for packed-coord messages
    lastZoneX: 0,
    lastZoneZ: 0,

    // entities  —  keyed by pid / nid
    players: new Map(),   // pid → { pid, x, z, username, combatLevel, masks }
    npcs: new Map(),      // nid → { nid, npcType, x, z, masks }

    // zone objects
    locs: new Map(),      // "x,z" → { x, z, locType, shape, angle }
    groundItems: new Map(), // "x,z" → [{ objId, count }]

    // visual effects (decay timers)
    hpBars: [],       // { entityKey, currentHp, maxHp, time }
    splats: [],       // { x, z, amount, type, time }
    chatBubbles: [],  // { entityKey, text, time }

    // player-specific
    inventory: [],    // array of 28 slots: { id, count } | null
    stats: [],        // array of 21: { level, baseLevel, exp }
    runEnergy: 100,

    // chat
    chatLog: [],      // { text, type }  type: 'game' | 'public' | 'private'

    // input
    destX: -1,
    destZ: -1,
    contextMenu: null, // { x, y, options: [{ label, action }] } or null

    // camera (centered on self)
    camX: 0,
    camZ: 0,

    // timing
    fps: 0,
    lastTick: 0,
};

// Pre-fill 21 stats
const STAT_NAMES = [
    'Attack', 'Defence', 'Strength', 'Hitpoints', 'Ranged',
    'Prayer', 'Magic', 'Cooking', 'Woodcutting', 'Fletching',
    'Fishing', 'Firemaking', 'Crafting', 'Smithing', 'Mining',
    'Herblore', 'Agility', 'Thieving', 'Stat18', 'Stat19', 'Runecraft'
];

for (let i = 0; i < 21; i++) {
    state.stats.push({ level: 1, baseLevel: 1, exp: 0 });
}

// Pre-fill 28 inventory slots
for (let i = 0; i < 28; i++) {
    state.inventory.push(null);
}

export { STAT_NAMES };
export default state;
