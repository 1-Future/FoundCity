/**
 * Helper functions to create server→client messages.
 *
 * These are convenience wrappers around the ServerMessage types.
 * Use player.write(msg) to queue the message for sending.
 */

import Player from '#/engine/entity/Player.js';
import { PlayerStat } from '#/engine/entity/PlayerStat.js';
import {
    UpdateStatMessage, UpdateRunEnergyMessage, UpdateRunWeightMessage, UpdateRebootTimerMessage,
    UpdateInvFullMessage, UpdateInvPartialMessage, UpdateInvStopTransmitMessage,
    IfOpenMainMessage, IfOpenSideMessage, IfOpenMainSideMessage, IfOpenChatMessage,
    IfCloseMessage, IfSetTextMessage, IfSetHideMessage, IfSetColourMessage,
    IfSetModelMessage, IfSetAnimMessage, IfSetPositionMessage, IfSetObjectMessage,
    IfSetTabMessage, IfSetTabActiveMessage,
    IfSetPlayerHeadMessage, IfSetNpcHeadMessage,
    MessageGameMessage, MessagePrivateOutMessage, EnableTrackingMessage,
    HintArrowMessage, ResetAnimsMessage,
    SynthSoundMessage, MidiSongMessage, MidiJingleMessage,
    CamMoveToMessage, CamLookAtMessage, CamShakeMessage, CamResetMessage,
    SetMultiwayMessage, MinimapToggleMessage,
    LocAddChangeMessage, LocDelMessage, LocAnimMessage, LocMergeMessage,
    ObjAddMessage, ObjDelMessage, ObjCountMessage, ObjRevealMessage,
    MapAnimMessage, MapProjAnimMessage,
} from '#/network/ServerMessage.js';
import { Inventory } from '#/engine/Inventory.js';

// ---- Stats ----

export function updateStat(player: Player, stat: number): void {
    player.write({
        type: 'update_stat',
        stat,
        exp: player.stats[stat],
        level: player.levels[stat],
        baseLevel: player.baseLevels[stat],
    } satisfies UpdateStatMessage);
}

export function updateRunEnergy(player: Player): void {
    player.write({
        type: 'update_run_energy',
        energy: Math.floor(player.runenergy / 100),
    } satisfies UpdateRunEnergyMessage);
}

export function updateRunWeight(player: Player, weight: number): void {
    player.write({
        type: 'update_run_weight',
        weight,
    } satisfies UpdateRunWeightMessage);
}

export function updateRebootTimer(player: Player, ticks: number): void {
    player.write({
        type: 'update_reboot_timer',
        ticks,
    } satisfies UpdateRebootTimerMessage);
}

// ---- Inventory ----

export function updateInvFull(player: Player, component: number, inv: Inventory): void {
    player.write({
        type: 'update_inv_full',
        component,
        inv: inv.type,
        items: inv.items.map(item => item ? { id: item.id, count: item.count } : null),
    } satisfies UpdateInvFullMessage);
}

export function updateInvPartial(player: Player, component: number, inv: Inventory, changedSlots: number[]): void {
    player.write({
        type: 'update_inv_partial',
        component,
        inv: inv.type,
        slots: changedSlots.map(slot => {
            const item = inv.items[slot];
            return { slot, id: item?.id ?? -1, count: item?.count ?? 0 };
        }),
    } satisfies UpdateInvPartialMessage);
}

export function updateInvStopTransmit(player: Player, component: number): void {
    player.write({
        type: 'update_inv_stop_transmit',
        component,
    } satisfies UpdateInvStopTransmitMessage);
}

// ---- UI ----

export function ifOpenMain(player: Player, component: number): void {
    player.write({ type: 'if_open_main', component } satisfies IfOpenMainMessage);
}

export function ifOpenSide(player: Player, component: number): void {
    player.write({ type: 'if_open_side', component } satisfies IfOpenSideMessage);
}

export function ifOpenMainSide(player: Player, main: number, side: number): void {
    player.write({ type: 'if_open_main_side', main, side } satisfies IfOpenMainSideMessage);
}

export function ifOpenChat(player: Player, component: number): void {
    player.write({ type: 'if_open_chat', component } satisfies IfOpenChatMessage);
}

export function ifClose(player: Player): void {
    player.write({ type: 'if_close' } satisfies IfCloseMessage);
}

export function ifSetText(player: Player, component: number, text: string): void {
    player.write({ type: 'if_set_text', component, text } satisfies IfSetTextMessage);
}

export function ifSetHide(player: Player, component: number, hidden: boolean): void {
    player.write({ type: 'if_set_hide', component, hidden } satisfies IfSetHideMessage);
}

export function ifSetColour(player: Player, component: number, colour: number): void {
    player.write({ type: 'if_set_colour', component, colour } satisfies IfSetColourMessage);
}

export function ifSetModel(player: Player, component: number, model: number): void {
    player.write({ type: 'if_set_model', component, model } satisfies IfSetModelMessage);
}

export function ifSetAnim(player: Player, component: number, seqId: number): void {
    player.write({ type: 'if_set_anim', component, seqId } satisfies IfSetAnimMessage);
}

export function ifSetPosition(player: Player, component: number, x: number, y: number): void {
    player.write({ type: 'if_set_position', component, x, y } satisfies IfSetPositionMessage);
}

export function ifSetObject(player: Player, component: number, objId: number, zoom: number): void {
    player.write({ type: 'if_set_object', component, objId, zoom } satisfies IfSetObjectMessage);
}

export function ifSetTab(player: Player, tab: number, component: number): void {
    player.write({ type: 'if_set_tab', tab, component } satisfies IfSetTabMessage);
}

export function ifSetTabActive(player: Player, tab: number): void {
    player.write({ type: 'if_set_tab_active', tab } satisfies IfSetTabActiveMessage);
}

export function ifSetPlayerHead(player: Player, component: number): void {
    player.write({ type: 'if_set_player_head', component } satisfies IfSetPlayerHeadMessage);
}

export function ifSetNpcHead(player: Player, component: number, npcId: number): void {
    player.write({ type: 'if_set_npc_head', component, npcId } satisfies IfSetNpcHeadMessage);
}

// ---- Chat ----

export function messageGame(player: Player, text: string): void {
    player.write({ type: 'message_game', text } satisfies MessageGameMessage);
}

export function messagePrivate(player: Player, from: string, text: string, staffModLevel: number): void {
    player.write({ type: 'message_private', from, text, staffModLevel } satisfies MessagePrivateOutMessage);
}

// ---- Camera ----

export function camMoveTo(player: Player, x: number, z: number, height: number, speed: number, accel: number): void {
    player.write({ type: 'cam_move_to', x, z, height, speed, accel } satisfies CamMoveToMessage);
}

export function camLookAt(player: Player, x: number, z: number, height: number, speed: number, accel: number): void {
    player.write({ type: 'cam_look_at', x, z, height, speed, accel } satisfies CamLookAtMessage);
}

export function camShake(player: Player, shakeType: number, amplitude: number, frequency: number, duration: number): void {
    player.write({ type: 'cam_shake', shakeType, amplitude, frequency, duration } satisfies CamShakeMessage);
}

export function camReset(player: Player): void {
    player.write({ type: 'cam_reset' } satisfies CamResetMessage);
}

// ---- Audio ----

export function synthSound(player: Player, id: number, loops: number, delay: number): void {
    player.write({ type: 'synth_sound', id, loops, delay } satisfies SynthSoundMessage);
}

export function midiSong(player: Player, name: string): void {
    player.write({ type: 'midi_song', name } satisfies MidiSongMessage);
}

export function midiJingle(player: Player, name: string, length: number): void {
    player.write({ type: 'midi_jingle', name, length } satisfies MidiJingleMessage);
}

// ---- Player State ----

export function hintArrow(player: Player, hintType: number, target?: number, x?: number, z?: number, height?: number): void {
    player.write({ type: 'hint_arrow', hint_type: hintType, target, x, z, height } satisfies HintArrowMessage);
}

export function resetAnims(player: Player): void {
    player.write({ type: 'reset_anims' } satisfies ResetAnimsMessage);
}

export function setMultiway(player: Player, enabled: boolean): void {
    player.write({ type: 'set_multiway', enabled } satisfies SetMultiwayMessage);
}

export function minimapToggle(player: Player, state: number): void {
    player.write({ type: 'minimap_toggle', state } satisfies MinimapToggleMessage);
}

export function enableTracking(player: Player): void {
    player.write({ type: 'enable_tracking' } satisfies EnableTrackingMessage);
}

// ---- Zone Updates ----

export function locAddChange(player: Player, zoneX: number, zoneZ: number, localX: number, localZ: number, locId: number, shape: number, angle: number): void {
    player.write({ type: 'loc_add_change', zoneX, zoneZ, localX, localZ, locId, shape, angle } satisfies LocAddChangeMessage);
}

export function locDel(player: Player, zoneX: number, zoneZ: number, localX: number, localZ: number, shape: number, angle: number): void {
    player.write({ type: 'loc_del', zoneX, zoneZ, localX, localZ, shape, angle } satisfies LocDelMessage);
}

export function locAnim(player: Player, zoneX: number, zoneZ: number, localX: number, localZ: number, shape: number, angle: number, seqId: number): void {
    player.write({ type: 'loc_anim', zoneX, zoneZ, localX, localZ, shape, angle, seqId } satisfies LocAnimMessage);
}

export function locMerge(
    player: Player, zoneX: number, zoneZ: number, localX: number, localZ: number,
    shape: number, angle: number, locId: number,
    startCycle: number, endCycle: number, pid: number,
    north: number, south: number, east: number, west: number
): void {
    player.write({
        type: 'loc_merge', zoneX, zoneZ, localX, localZ, shape, angle, locId,
        startCycle, endCycle, pid, north, south, east, west,
    } satisfies LocMergeMessage);
}

export function objAdd(player: Player, zoneX: number, zoneZ: number, localX: number, localZ: number, objId: number, count: number): void {
    player.write({ type: 'obj_add', zoneX, zoneZ, localX, localZ, objId, count } satisfies ObjAddMessage);
}

export function objDel(player: Player, zoneX: number, zoneZ: number, localX: number, localZ: number, objId: number): void {
    player.write({ type: 'obj_del', zoneX, zoneZ, localX, localZ, objId } satisfies ObjDelMessage);
}

export function objCount(player: Player, zoneX: number, zoneZ: number, localX: number, localZ: number, objId: number, oldCount: number, newCount: number): void {
    player.write({ type: 'obj_count', zoneX, zoneZ, localX, localZ, objId, oldCount, newCount } satisfies ObjCountMessage);
}

export function objReveal(player: Player, zoneX: number, zoneZ: number, localX: number, localZ: number, objId: number, count: number): void {
    player.write({ type: 'obj_reveal', zoneX, zoneZ, localX, localZ, objId, count } satisfies ObjRevealMessage);
}

export function mapAnim(player: Player, x: number, z: number, seqId: number, height: number, delay: number): void {
    player.write({ type: 'map_anim', x, z, seqId, height, delay } satisfies MapAnimMessage);
}

export function mapProjAnim(
    player: Player, srcX: number, srcZ: number, destX: number, destZ: number,
    target: number, spotanimId: number, srcHeight: number, destHeight: number,
    startDelay: number, endDelay: number, peak: number, arc: number
): void {
    player.write({
        type: 'map_proj_anim', srcX, srcZ, destX, destZ,
        target, spotanimId, srcHeight, destHeight,
        startDelay, endDelay, peak, arc,
    } satisfies MapProjAnimMessage);
}
