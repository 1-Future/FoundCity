// Canvas 2D renderer: tile grid, entities, HP bars, damage splats, chat bubbles.

import state from './state.js';
import { npcName } from './names.js';

const TILE = 24;
const VISIBLE = 27;
const CANVAS_SIZE = VISIBLE * TILE; // 648

let canvas, ctx;

export function initRenderer(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
}

// World coord → canvas pixel
function toScreen(wx, wz) {
    const cx = state.camX;
    const cz = state.camZ;
    const half = Math.floor(VISIBLE / 2);
    const sx = (wx - cx + half) * TILE;
    // Z increases north, but canvas Y increases down — flip Z
    const sy = (cz - wz + half) * TILE;
    return { sx, sy };
}

// Canvas pixel → world coord
export function toWorld(px, py) {
    const cx = state.camX;
    const cz = state.camZ;
    const half = Math.floor(VISIBLE / 2);
    const wx = Math.floor(px / TILE) + cx - half;
    const wz = cz + half - Math.floor(py / TILE);
    return { wx, wz };
}

export function render() {
    if (!ctx) return;
    const now = performance.now();

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    drawGrid();
    drawLocs();
    drawGroundItems();
    drawNpcs(now);
    drawPlayers(now);
    drawHpBars(now);
    drawSplats(now);
    drawChatBubbles(now);
    drawDestMarker();
    drawDebugInfo();
}

function drawGrid() {
    // Dark green background
    ctx.fillStyle = '#1a3a1a';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= VISIBLE; i++) {
        const pos = i * TILE;
        ctx.beginPath();
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, CANVAS_SIZE);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, pos);
        ctx.lineTo(CANVAS_SIZE, pos);
        ctx.stroke();
    }
}

function drawLocs() {
    ctx.fillStyle = 'rgba(120,120,120,0.6)';
    for (const loc of state.locs.values()) {
        const { sx, sy } = toScreen(loc.x, loc.z);
        if (sx < -TILE || sx > CANVAS_SIZE || sy < -TILE || sy > CANVAS_SIZE) continue;
        ctx.fillRect(sx + 2, sy + 2, TILE - 4, TILE - 4);
    }
}

function drawGroundItems() {
    ctx.fillStyle = '#ff8c00';
    for (const [key, items] of state.groundItems) {
        if (items.length === 0) continue;
        const parts = key.split(',');
        const wx = parseInt(parts[0]);
        const wz = parseInt(parts[1]);
        const { sx, sy } = toScreen(wx, wz);
        if (sx < -TILE || sx > CANVAS_SIZE || sy < -TILE || sy > CANVAS_SIZE) continue;
        ctx.beginPath();
        ctx.arc(sx + TILE / 2, sy + TILE / 2, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawPlayers(now) {
    ctx.textAlign = 'center';
    ctx.font = '10px monospace';
    for (const p of state.players.values()) {
        const { sx, sy } = toScreen(p.x, p.z);
        if (sx < -TILE || sx > CANVAS_SIZE || sy < -TILE || sy > CANVAS_SIZE) continue;

        const isSelf = p.pid === state.pid;
        ctx.fillStyle = isSelf ? '#4488ff' : '#dddddd';
        ctx.beginPath();
        ctx.arc(sx + TILE / 2, sy + TILE / 2, TILE / 3, 0, Math.PI * 2);
        ctx.fill();

        // Username label
        if (p.username) {
            ctx.fillStyle = isSelf ? '#88bbff' : '#ffffff';
            ctx.fillText(p.username, sx + TILE / 2, sy - 2);
        }
    }
}

function drawNpcs(now) {
    ctx.textAlign = 'center';
    ctx.font = '9px monospace';
    for (const n of state.npcs.values()) {
        const { sx, sy } = toScreen(n.x, n.z);
        if (sx < -TILE || sx > CANVAS_SIZE || sy < -TILE || sy > CANVAS_SIZE) continue;

        ctx.fillStyle = '#cc3333';
        ctx.beginPath();
        ctx.arc(sx + TILE / 2, sy + TILE / 2, TILE / 3, 0, Math.PI * 2);
        ctx.fill();

        // NPC label
        ctx.fillStyle = '#ff8888';
        ctx.fillText(npcName(n.npcType), sx + TILE / 2, sy - 2);
    }
}

function drawHpBars(now) {
    // Decay after 3 seconds
    state.hpBars = state.hpBars.filter(h => now - h.time < 3000);

    for (const h of state.hpBars) {
        // Find entity position
        let ex, ez;
        if (h.entityKey.startsWith('p')) {
            const p = state.players.get(parseInt(h.entityKey.slice(1)));
            if (!p) continue;
            ex = p.x; ez = p.z;
        } else {
            const n = state.npcs.get(parseInt(h.entityKey.slice(1)));
            if (!n) continue;
            ex = n.x; ez = n.z;
        }

        const { sx, sy } = toScreen(ex, ez);
        const barW = TILE - 4;
        const barH = 4;
        const barX = sx + 2;
        const barY = sy - 8;
        const ratio = h.maxHp > 0 ? h.currentHp / h.maxHp : 0;

        // Red background
        ctx.fillStyle = '#cc0000';
        ctx.fillRect(barX, barY, barW, barH);
        // Green foreground
        ctx.fillStyle = '#00cc00';
        ctx.fillRect(barX, barY, barW * ratio, barH);
    }
}

function drawSplats(now) {
    // Decay after 1.5 seconds
    state.splats = state.splats.filter(s => now - s.time < 1500);

    ctx.textAlign = 'center';
    ctx.font = 'bold 12px monospace';

    for (const s of state.splats) {
        const { sx, sy } = toScreen(s.x, s.z);
        const age = (now - s.time) / 1500;
        const yOff = -12 - age * 10; // float upward

        // Bubble background
        ctx.fillStyle = s.type === 0 ? 'rgba(200,0,0,0.9)' : 'rgba(0,0,200,0.9)';
        const tw = ctx.measureText(String(s.amount)).width + 6;
        ctx.beginPath();
        ctx.arc(sx + TILE / 2, sy + TILE / 2 + yOff, tw / 2 + 2, 0, Math.PI * 2);
        ctx.fill();

        // Number
        ctx.fillStyle = '#ffffff';
        ctx.fillText(String(s.amount), sx + TILE / 2, sy + TILE / 2 + yOff + 4);
    }
}

function drawChatBubbles(now) {
    // Decay after 3 seconds
    state.chatBubbles = state.chatBubbles.filter(c => now - c.time < 3000);

    ctx.textAlign = 'center';
    ctx.font = '10px monospace';

    for (const c of state.chatBubbles) {
        let ex, ez;
        if (c.entityKey.startsWith('p')) {
            const p = state.players.get(parseInt(c.entityKey.slice(1)));
            if (!p) continue;
            ex = p.x; ez = p.z;
        } else {
            const n = state.npcs.get(parseInt(c.entityKey.slice(1)));
            if (!n) continue;
            ex = n.x; ez = n.z;
        }

        const { sx, sy } = toScreen(ex, ez);
        const tw = ctx.measureText(c.text).width + 8;

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(sx + TILE / 2 - tw / 2, sy - 24, tw, 14);
        // Text
        ctx.fillStyle = '#ffff00';
        ctx.fillText(c.text, sx + TILE / 2, sy - 13);
    }
}

function drawDestMarker() {
    if (state.destX < 0 || state.destZ < 0) return;
    const { sx, sy } = toScreen(state.destX, state.destZ);
    if (sx < -TILE || sx > CANVAS_SIZE || sy < -TILE || sy > CANVAS_SIZE) return;

    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 2;
    const cx = sx + TILE / 2;
    const cy = sy + TILE / 2;
    const s = 6;
    ctx.beginPath();
    ctx.moveTo(cx - s, cy - s);
    ctx.lineTo(cx + s, cy + s);
    ctx.moveTo(cx + s, cy - s);
    ctx.lineTo(cx - s, cy + s);
    ctx.stroke();
}

function drawDebugInfo() {
    const self = state.players.get(state.pid);
    const x = self ? self.x : '?';
    const z = self ? self.z : '?';

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(4, 4, 200, 52);

    ctx.fillStyle = '#00ff00';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Pos: ${x}, ${z}`, 8, 16);
    ctx.fillText(`FPS: ${state.fps}`, 8, 28);
    ctx.fillText(`Players: ${state.players.size}  NPCs: ${state.npcs.size}`, 8, 40);
    ctx.fillText(`Locs: ${state.locs.size}  Items: ${state.groundItems.size}`, 8, 52);
}
