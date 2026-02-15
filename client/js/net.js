// WebSocket connection and message dispatch.

import state from './state.js';
import { noTimeout } from './protocol.js';
import { onMessage } from './ui.js';

let keepaliveInterval = null;
const handlers = {};

// Register a handler: onMsg('player_info', msg => { ... })
export function onMsg(type, fn) {
    if (!handlers[type]) handlers[type] = [];
    handlers[type].push(fn);
}

export function connect(url) {
    if (state.ws) {
        state.ws.close();
    }

    state.ws = new WebSocket(url);

    state.ws.addEventListener('open', () => {
        console.log('[net] connected');
        state.connected = true;
    });

    state.ws.addEventListener('message', (event) => {
        try {
            const msg = JSON.parse(event.data);
            dispatch(msg);
        } catch (e) {
            console.error('[net] bad message', e, event.data);
        }
    });

    state.ws.addEventListener('close', () => {
        console.log('[net] disconnected');
        state.connected = false;
        state.pid = -1;
        stopKeepalive();
    });

    state.ws.addEventListener('error', (e) => {
        console.error('[net] error', e);
    });
}

function dispatch(msg) {
    const fns = handlers[msg.type];
    if (fns) {
        for (const fn of fns) fn(msg);
    } else {
        console.log('[net] unhandled:', msg.type, msg);
    }
}

export function startKeepalive() {
    stopKeepalive();
    keepaliveInterval = setInterval(() => noTimeout(), 45000);
}

export function stopKeepalive() {
    if (keepaliveInterval) {
        clearInterval(keepaliveInterval);
        keepaliveInterval = null;
    }
}

// ---- Register all message handlers ----

onMsg('login_accept', (msg) => {
    state.pid = msg.pid;
    state.staffModLevel = msg.staffModLevel;
    startKeepalive();
    onMessage(`Logged in (pid=${msg.pid}, staff=${msg.staffModLevel})`, 'game');
});

onMsg('login_reject', (msg) => {
    onMessage(`Login rejected: ${msg.reason}`, 'game');
});

onMsg('rebuild_normal', (msg) => {
    state.zoneX = msg.zoneX;
    state.zoneZ = msg.zoneZ;
    state.originX = msg.originX;
    state.originZ = msg.originZ;
    // Clear zone caches on rebuild
    state.locs.clear();
    state.groundItems.clear();
});

onMsg('zone_full_follows', (msg) => {
    state.lastZoneX = msg.zoneX;
    state.lastZoneZ = msg.zoneZ;
});

onMsg('player_info', (msg) => {
    const now = performance.now();

    // Remove players
    if (msg.removals) {
        for (const pid of msg.removals) {
            state.players.delete(pid);
        }
    }

    // Update/add players
    for (const p of msg.players) {
        let existing = state.players.get(p.pid);
        if (!existing) {
            existing = { pid: p.pid, x: p.x, z: p.z, username: '', combatLevel: 3 };
            state.players.set(p.pid, existing);
        }

        existing.x = p.x;
        existing.z = p.z;

        if (p.masks) {
            if (p.masks.appearance) {
                existing.username = p.masks.appearance.username;
                existing.combatLevel = p.masks.appearance.combatLevel;
            }
            if (p.masks.damage) {
                const d = p.masks.damage;
                state.hpBars.push({
                    entityKey: `p${p.pid}`,
                    currentHp: d.currentHp,
                    maxHp: d.maxHp,
                    time: now
                });
                state.splats.push({
                    x: p.x, z: p.z,
                    amount: d.amount,
                    type: d.type,
                    time: now
                });
            }
            if (p.masks.chat) {
                state.chatBubbles.push({
                    entityKey: `p${p.pid}`,
                    text: p.masks.chat.text,
                    time: now
                });
            }
            if (p.masks.say) {
                state.chatBubbles.push({
                    entityKey: `p${p.pid}`,
                    text: p.masks.say,
                    time: now
                });
            }
        }

        // Track self position for camera
        if (p.pid === state.pid) {
            state.camX = p.x;
            state.camZ = p.z;
            // Clear dest marker when player arrives
            if (state.destX === p.x && state.destZ === p.z) {
                state.destX = -1;
                state.destZ = -1;
            }
        }
    }
});

onMsg('npc_info', (msg) => {
    const now = performance.now();

    if (msg.removals) {
        for (const nid of msg.removals) {
            state.npcs.delete(nid);
        }
    }

    for (const n of msg.npcs) {
        let existing = state.npcs.get(n.nid);
        if (!existing) {
            existing = { nid: n.nid, npcType: n.npcType, x: n.x, z: n.z };
            state.npcs.set(n.nid, existing);
        }

        existing.x = n.x;
        existing.z = n.z;
        if (n.npcType !== undefined) existing.npcType = n.npcType;

        if (n.masks) {
            if (n.masks.damage) {
                const d = n.masks.damage;
                state.hpBars.push({
                    entityKey: `n${n.nid}`,
                    currentHp: d.currentHp,
                    maxHp: d.maxHp,
                    time: now
                });
                state.splats.push({
                    x: n.x, z: n.z,
                    amount: d.amount,
                    type: d.type,
                    time: now
                });
            }
            if (n.masks.say) {
                state.chatBubbles.push({
                    entityKey: `n${n.nid}`,
                    text: n.masks.say,
                    time: now
                });
            }
        }
    }
});

onMsg('update_stat', (msg) => {
    if (msg.stat >= 0 && msg.stat < 21) {
        state.stats[msg.stat] = {
            level: msg.level,
            baseLevel: msg.baseLevel,
            exp: msg.exp
        };
    }
});

onMsg('update_inv_full', (msg) => {
    // We handle the main backpack inventory (any component)
    const items = msg.items;
    for (let i = 0; i < items.length && i < 28; i++) {
        state.inventory[i] = items[i];
    }
});

onMsg('update_inv_partial', (msg) => {
    for (const s of msg.slots) {
        if (s.slot >= 0 && s.slot < 28) {
            state.inventory[s.slot] = s.id > 0 ? { id: s.id, count: s.count } : null;
        }
    }
});

onMsg('update_run_energy', (msg) => {
    state.runEnergy = msg.energy;
});

onMsg('message_game', (msg) => {
    onMessage(msg.text, 'game');
});

onMsg('message_private', (msg) => {
    onMessage(`[PM from ${msg.from}]: ${msg.text}`, 'private');
});

// Zone updates — two formats:
// 1. From zone_full_follows: packed coord field, objType/locType names
// 2. From dynamic updates: separate zoneX/zoneZ/localX/localZ, objId/locId names

function resolveZoneCoord(msg) {
    // Format 2: separate fields
    if (msg.localX !== undefined) {
        return {
            x: msg.zoneX * 8 + msg.localX,
            z: msg.zoneZ * 8 + msg.localZ
        };
    }
    // Format 1: packed coord after zone_full_follows
    if (msg.coord !== undefined) {
        const localX = (msg.coord >> 4) & 7;
        const localZ = msg.coord & 7;
        return {
            x: state.lastZoneX * 8 + localX,
            z: state.lastZoneZ * 8 + localZ
        };
    }
    return null;
}

function getObjId(msg) {
    return msg.objId !== undefined ? msg.objId : msg.objType;
}

function getLocId(msg) {
    return msg.locId !== undefined ? msg.locId : msg.locType;
}

onMsg('loc_add', (msg) => {
    const pos = resolveZoneCoord(msg);
    if (!pos) return;
    const key = `${pos.x},${pos.z}`;
    state.locs.set(key, { x: pos.x, z: pos.z, locType: getLocId(msg), shape: msg.shape, angle: msg.angle });
});

onMsg('loc_add_change', (msg) => {
    const pos = resolveZoneCoord(msg);
    if (!pos) return;
    const key = `${pos.x},${pos.z}`;
    state.locs.set(key, { x: pos.x, z: pos.z, locType: getLocId(msg), shape: msg.shape, angle: msg.angle });
});

onMsg('loc_del', (msg) => {
    const pos = resolveZoneCoord(msg);
    if (!pos) return;
    state.locs.delete(`${pos.x},${pos.z}`);
});

onMsg('obj_add', (msg) => {
    const pos = resolveZoneCoord(msg);
    if (!pos) return;
    const key = `${pos.x},${pos.z}`;
    if (!state.groundItems.has(key)) state.groundItems.set(key, []);
    state.groundItems.get(key).push({ objId: getObjId(msg), count: msg.count });
});

onMsg('obj_del', (msg) => {
    const pos = resolveZoneCoord(msg);
    if (!pos) return;
    const key = `${pos.x},${pos.z}`;
    const items = state.groundItems.get(key);
    if (items) {
        const id = getObjId(msg);
        const idx = items.findIndex(i => i.objId === id);
        if (idx !== -1) items.splice(idx, 1);
        if (items.length === 0) state.groundItems.delete(key);
    }
});

onMsg('obj_count', (msg) => {
    const pos = resolveZoneCoord(msg);
    if (!pos) return;
    const key = `${pos.x},${pos.z}`;
    const items = state.groundItems.get(key);
    if (items) {
        const id = getObjId(msg);
        const item = items.find(i => i.objId === id);
        if (item) item.count = msg.newCount;
    }
});

onMsg('obj_reveal', (msg) => {
    const pos = resolveZoneCoord(msg);
    if (!pos) return;
    const key = `${pos.x},${pos.z}`;
    if (!state.groundItems.has(key)) state.groundItems.set(key, []);
    state.groundItems.get(key).push({ objId: getObjId(msg), count: msg.count });
});

onMsg('if_set_tab', () => {});
onMsg('if_close', () => {});
onMsg('if_open_main', () => {});
onMsg('if_open_side', () => {});
onMsg('if_open_main_side', () => {});
onMsg('if_open_chat', () => {});
onMsg('if_set_text', () => {});
onMsg('if_set_hide', () => {});
onMsg('if_set_colour', () => {});
onMsg('if_set_model', () => {});
onMsg('if_set_anim', () => {});
onMsg('if_set_position', () => {});
onMsg('if_set_player_head', () => {});
onMsg('if_set_npc_head', () => {});
onMsg('if_set_object', () => {});
onMsg('if_set_tab_active', () => {});
onMsg('update_inv_stop_transmit', () => {});
onMsg('update_run_weight', () => {});
onMsg('update_reboot_timer', () => {});
onMsg('cam_move_to', () => {});
onMsg('cam_look_at', () => {});
onMsg('cam_shake', () => {});
onMsg('cam_reset', () => {});
onMsg('synth_sound', () => {});
onMsg('midi_song', () => {});
onMsg('midi_jingle', () => {});
onMsg('set_multiway', () => {});
onMsg('hint_arrow', () => {});
onMsg('reset_anims', () => {});
onMsg('enable_tracking', () => {});
onMsg('minimap_toggle', () => {});
onMsg('loc_anim', () => {});
onMsg('loc_merge', () => {});
onMsg('map_anim', () => {});
onMsg('map_proj_anim', () => {});

onMsg('logout', () => {
    onMessage('Logged out by server.', 'game');
    state.pid = -1;
    state.players.clear();
    state.npcs.clear();
    state.locs.clear();
    state.groundItems.clear();
    stopKeepalive();
});
