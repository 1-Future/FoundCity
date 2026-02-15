// Outgoing message builder helpers.

import state from './state.js';

function send(msg) {
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify(msg));
    }
}

export function authLogin(username, password) {
    send({ type: 'auth_login', username, password });
}

export function moveClick(x, z, ctrlRun = false) {
    send({ type: 'move_click', x, z, ctrlRun });
}

export function messagePublic(text) {
    send({ type: 'message_public', text, color: 0, effect: 0 });
}

export function clientCheat(command) {
    send({ type: 'client_cheat', command });
}

export function noTimeout() {
    send({ type: 'no_timeout' });
}

export function logout() {
    send({ type: 'logout' });
}

export function opNpc(nid, op) {
    send({ type: 'op_npc', nid, op });
}

export function opLoc(x, z, locId, op) {
    send({ type: 'op_loc', x, z, locId, op });
}

export function opObj(x, z, objId, op) {
    send({ type: 'op_obj', x, z, objId, op });
}

export function opPlayer(pid, op) {
    send({ type: 'op_player', pid, op });
}

export function opHeld(objId, slot, component, op) {
    send({ type: 'op_held', objId, slot, component, op });
}
