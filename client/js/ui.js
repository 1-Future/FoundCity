// DOM panels: inventory, stats, chat, login, context menu.

import state, { STAT_NAMES } from './state.js';
import { connect } from './net.js';
import { authLogin, logout } from './protocol.js';
import { onInventoryClick } from './input.js';
import { objName } from './names.js';

// ---- Chat ----

export function onMessage(text, type = 'game') {
    state.chatLog.push({ text, type });
    if (state.chatLog.length > 200) state.chatLog.shift();
    refreshChat();
}

function refreshChat() {
    const log = document.getElementById('chat-log');
    if (!log) return;

    // Only show last 50
    const recent = state.chatLog.slice(-50);
    log.innerHTML = recent.map(m => {
        const cls = m.type === 'private' ? 'chat-private' : m.type === 'game' ? 'chat-game' : 'chat-public';
        return `<div class="${cls}">${escapeHtml(m.text)}</div>`;
    }).join('');
    log.scrollTop = log.scrollHeight;
}

function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function focusChatInput() {
    const el = document.getElementById('chat-input');
    if (el) el.focus();
}

// ---- Login ----

export function initLogin() {
    const form = document.getElementById('login-form');
    const btn = document.getElementById('login-btn');
    const overlay = document.getElementById('login-overlay');

    btn.addEventListener('click', () => {
        const host = document.getElementById('login-host').value.trim() || 'ws://localhost:8888';
        const user = document.getElementById('login-user').value.trim() || 'testplayer';
        const pass = document.getElementById('login-pass').value.trim() || 'test123';

        state.username = user;
        connect(host);

        // Wait for connection then send auth
        const check = setInterval(() => {
            if (state.connected) {
                clearInterval(check);
                authLogin(user, pass);
            }
        }, 100);

        // Timeout after 5s
        setTimeout(() => clearInterval(check), 5000);
    });

    // Hide login overlay on successful login
    const originalPush = state.chatLog.push;
    // We'll use a different approach — poll for pid
    setInterval(() => {
        if (state.pid >= 0 && overlay.style.display !== 'none') {
            overlay.style.display = 'none';
        }
    }, 200);
}

// ---- Stats Panel ----

export function refreshStats() {
    const tbody = document.getElementById('stats-body');
    if (!tbody) return;

    let html = '';
    for (let i = 0; i < 21; i++) {
        const s = state.stats[i];
        const name = STAT_NAMES[i];
        html += `<tr><td>${name}</td><td>${s.level}</td><td>${s.baseLevel}</td><td>${Math.floor(s.exp / 10)}</td></tr>`;
    }
    html += `<tr><td>Run Energy</td><td colspan="3">${state.runEnergy}%</td></tr>`;
    tbody.innerHTML = html;
}

// ---- Inventory Panel ----

export function refreshInventory() {
    const grid = document.getElementById('inv-grid');
    if (!grid) return;

    let html = '';
    for (let i = 0; i < 28; i++) {
        const item = state.inventory[i];
        if (item && item.id > 0) {
            const countStr = item.count > 1 ? `<span class="inv-count">${formatCount(item.count)}</span>` : '';
            const name = objName(item.id);
            html += `<div class="inv-slot filled" data-slot="${i}" data-obj="${item.id}" title="${name} x${item.count}">${name}${countStr}</div>`;
        } else {
            html += `<div class="inv-slot" data-slot="${i}"></div>`;
        }
    }
    grid.innerHTML = html;

    // Bind click handlers
    grid.querySelectorAll('.inv-slot.filled').forEach(el => {
        el.addEventListener('click', () => {
            const slot = parseInt(el.dataset.slot);
            const objId = parseInt(el.dataset.obj);
            onInventoryClick(slot, objId);
        });
    });
}

function formatCount(n) {
    if (n >= 10000000) return Math.floor(n / 1000000) + 'M';
    if (n >= 100000) return Math.floor(n / 1000) + 'K';
    return String(n);
}

// ---- Context Menu ----

let lastContextMenu = null;

export function renderContextMenu() {
    let menu = document.getElementById('context-menu');

    if (!state.contextMenu) {
        if (menu) menu.style.display = 'none';
        lastContextMenu = null;
        return;
    }

    // Only rebuild DOM when the menu instance changes
    if (state.contextMenu === lastContextMenu) return;
    lastContextMenu = state.contextMenu;

    if (!menu) {
        menu = document.createElement('div');
        menu.id = 'context-menu';
        document.body.appendChild(menu);
    }

    const cm = state.contextMenu;
    menu.style.display = 'block';
    menu.style.left = cm.screenX + 'px';
    menu.style.top = cm.screenY + 'px';

    menu.innerHTML = cm.options.map((opt, i) =>
        `<div class="ctx-option" data-idx="${i}">${escapeHtml(opt.label)}</div>`
    ).join('');

    menu.querySelectorAll('.ctx-option').forEach(el => {
        el.addEventListener('click', () => {
            const idx = parseInt(el.dataset.idx);
            cm.options[idx].action();
            state.contextMenu = null;
            menu.style.display = 'none';
        });
    });
}

// ---- Logout Button ----

export function initLogout() {
    const btn = document.getElementById('logout-btn');
    if (btn) {
        btn.addEventListener('click', () => {
            logout();
            state.pid = -1;
            document.getElementById('login-overlay').style.display = 'flex';
        });
    }
}
