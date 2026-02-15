// Mouse/keyboard input: click-to-move, right-click context menu, chat entry.

import state from './state.js';
import { toWorld } from './renderer.js';
import { moveClick, opNpc, opPlayer, opObj, opLoc, opHeld, messagePublic, clientCheat } from './protocol.js';
import { focusChatInput } from './ui.js';
import { npcName, npcOps, objName, locName, locOps } from './names.js';

let canvas;

export function initInput(canvasEl) {
    canvas = canvasEl;

    canvas.addEventListener('click', onLeftClick);
    canvas.addEventListener('contextmenu', onRightClick);
    document.addEventListener('keydown', onKeyDown);
}

// Hit-test entities at a world tile, returns first match or null
function hitTest(wx, wz) {
    for (const n of state.npcs.values()) {
        if (n.x === wx && n.z === wz) return { type: 'npc', entity: n };
    }
    for (const p of state.players.values()) {
        if (p.pid !== state.pid && p.x === wx && p.z === wz) return { type: 'player', entity: p };
    }
    const itemKey = `${wx},${wz}`;
    const items = state.groundItems.get(itemKey);
    if (items && items.length > 0) return { type: 'obj', items, x: wx, z: wz };
    const loc = state.locs.get(itemKey);
    if (loc) return { type: 'loc', entity: loc, x: wx, z: wz };
    return null;
}

function onLeftClick(e) {
    // Close context menu if open
    if (state.contextMenu) {
        state.contextMenu = null;
        return;
    }

    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const { wx, wz } = toWorld(px, py);

    // Left-click on entity → default action (op 1)
    const hit = hitTest(wx, wz);
    if (hit) {
        switch (hit.type) {
            case 'npc': {
                // Use first available op (usually Talk-to or Attack)
                const ops = npcOps(hit.entity.npcType);
                const firstOp = ops.findIndex(o => o !== null) + 1;
                opNpc(hit.entity.nid, firstOp || 1);
                return;
            }
            case 'player':
                opPlayer(hit.entity.pid, 1);
                return;
            case 'obj':
                opObj(wx, wz, hit.items[0].objId, 1);
                return;
            case 'loc':
                opLoc(wx, wz, hit.entity.locType, 1);
                return;
        }
    }

    // No entity — walk
    state.destX = wx;
    state.destZ = wz;
    moveClick(wx, wz, e.ctrlKey);
}

function onRightClick(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const { wx, wz } = toWorld(px, py);

    const options = [];

    // NPCs
    for (const n of state.npcs.values()) {
        if (n.x === wx && n.z === wz) {
            const nn = npcName(n.npcType);
            const ops = npcOps(n.npcType);
            for (let i = 0; i < 5; i++) {
                if (ops[i]) {
                    const op = i + 1;
                    options.push({ label: `${ops[i]} ${nn}`, action: () => opNpc(n.nid, op) });
                }
            }
            options.push({ label: `Examine ${nn}`, action: () => opNpc(n.nid, 5) });
        }
    }

    // Players
    for (const p of state.players.values()) {
        if (p.pid === state.pid) continue;
        if (p.x === wx && p.z === wz) {
            const name = p.username || 'Player';
            options.push({ label: `Op1 ${name}`, action: () => opPlayer(p.pid, 1) });
            options.push({ label: `Op2 ${name}`, action: () => opPlayer(p.pid, 2) });
            options.push({ label: `Op3 ${name}`, action: () => opPlayer(p.pid, 3) });
        }
    }

    // Ground Items
    const itemKey = `${wx},${wz}`;
    const items = state.groundItems.get(itemKey);
    if (items) {
        for (const item of items) {
            options.push({ label: `Take ${objName(item.objId)}`, action: () => opObj(wx, wz, item.objId, 1) });
        }
    }

    // Locs
    const loc = state.locs.get(itemKey);
    if (loc) {
        const ln = locName(loc.locType);
        const lops = locOps(loc.locType);
        for (let i = 0; i < 5; i++) {
            if (lops[i]) {
                const op = i + 1;
                options.push({ label: `${lops[i]} ${ln}`, action: () => opLoc(wx, wz, loc.locType, op) });
            }
        }
        if (!lops.some(Boolean)) {
            options.push({ label: `Examine ${ln}`, action: () => opLoc(wx, wz, loc.locType, 5) });
        }
    }

    // Walk here always last
    options.push({
        label: 'Walk here',
        action: () => {
            state.destX = wx;
            state.destZ = wz;
            moveClick(wx, wz);
        }
    });

    state.contextMenu = {
        screenX: e.clientX,
        screenY: e.clientY,
        options
    };
}

function onKeyDown(e) {
    if (e.key === 'Escape') {
        state.contextMenu = null;
        return;
    }

    if (e.key === 'Enter') {
        const chatInput = document.getElementById('chat-input');
        if (document.activeElement === chatInput) {
            sendChat(chatInput.value);
            chatInput.value = '';
        } else {
            focusChatInput();
        }
        e.preventDefault();
    }
}

function sendChat(text) {
    if (!text || text.trim().length === 0) return;
    text = text.trim();

    if (text.startsWith('::')) {
        clientCheat(text.substring(2));
    } else {
        messagePublic(text);
    }
}

// Inventory click handler — called from ui.js
export function onInventoryClick(slot, objId) {
    if (objId > 0) {
        opHeld(objId, slot, 0, 1);
    }
}
