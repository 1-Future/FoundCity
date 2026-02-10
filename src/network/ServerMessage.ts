/**
 * All server→client message types.
 *
 * JSON over WebSocket. Each message has a `type` field.
 * Replaces RS225 ServerProt binary opcodes entirely.
 */

// ---- Auth ----
export interface LoginAcceptMessage {
    type: 'login_accept';
    pid: number;
    staffModLevel: number;
}

export interface LoginRejectMessage {
    type: 'login_reject';
    reason: string;
}

// ---- Map/World ----
export interface RebuildNormalMessage {
    type: 'rebuild_normal';
    zoneX: number;
    zoneZ: number;
    originX: number;
    originZ: number;
}

// ---- Player Info ----
export interface PlayerInfoMessage {
    type: 'player_info';
    players: PlayerInfoEntry[];
    removals: number[];
}

export interface PlayerInfoEntry {
    pid: number;
    x: number;
    z: number;
    moveSpeed?: number;
    masks?: PlayerInfoMasks;
}

export interface PlayerInfoMasks {
    appearance?: PlayerAppearance;
    anim?: { id: number; delay: number };
    faceEntity?: number;
    say?: string;
    damage?: { amount: number; type: number; currentHp: number; maxHp: number };
    faceCoord?: { x: number; z: number };
    chat?: { text: string; color?: number; effect?: number };
    spotanim?: { id: number; height: number; delay: number };
    exactMove?: { startX: number; startZ: number; endX: number; endZ: number; startTick: number; endTick: number; direction: number };
}

export interface PlayerAppearance {
    gender: number;
    body: number[];
    colors: number[];
    combatLevel: number;
    username: string;
}

// ---- NPC Info ----
export interface NpcInfoMessage {
    type: 'npc_info';
    npcs: NpcInfoEntry[];
    removals: number[];
}

export interface NpcInfoEntry {
    nid: number;
    npcType: number;
    x: number;
    z: number;
    moveSpeed?: number;
    masks?: NpcInfoMasks;
}

export interface NpcInfoMasks {
    anim?: { id: number; delay: number };
    faceEntity?: number;
    say?: string;
    damage?: { amount: number; type: number; currentHp: number; maxHp: number };
    changeType?: number;
    spotanim?: { id: number; height: number; delay: number };
    faceCoord?: { x: number; z: number };
}

// ---- Zone Updates ----
export interface LocAddChangeMessage {
    type: 'loc_add_change';
    zoneX: number;
    zoneZ: number;
    localX: number;
    localZ: number;
    locId: number;
    shape: number;
    angle: number;
}

export interface LocDelMessage {
    type: 'loc_del';
    zoneX: number;
    zoneZ: number;
    localX: number;
    localZ: number;
    shape: number;
    angle: number;
}

export interface LocAnimMessage {
    type: 'loc_anim';
    zoneX: number;
    zoneZ: number;
    localX: number;
    localZ: number;
    shape: number;
    angle: number;
    seqId: number;
}

export interface LocMergeMessage {
    type: 'loc_merge';
    zoneX: number;
    zoneZ: number;
    localX: number;
    localZ: number;
    shape: number;
    angle: number;
    locId: number;
    startCycle: number;
    endCycle: number;
    pid: number;
    north: number;
    south: number;
    east: number;
    west: number;
}

export interface ObjAddMessage {
    type: 'obj_add';
    zoneX: number;
    zoneZ: number;
    localX: number;
    localZ: number;
    objId: number;
    count: number;
}

export interface ObjDelMessage {
    type: 'obj_del';
    zoneX: number;
    zoneZ: number;
    localX: number;
    localZ: number;
    objId: number;
}

export interface ObjCountMessage {
    type: 'obj_count';
    zoneX: number;
    zoneZ: number;
    localX: number;
    localZ: number;
    objId: number;
    oldCount: number;
    newCount: number;
}

export interface ObjRevealMessage {
    type: 'obj_reveal';
    zoneX: number;
    zoneZ: number;
    localX: number;
    localZ: number;
    objId: number;
    count: number;
}

export interface MapAnimMessage {
    type: 'map_anim';
    x: number;
    z: number;
    seqId: number;
    height: number;
    delay: number;
}

export interface MapProjAnimMessage {
    type: 'map_proj_anim';
    srcX: number;
    srcZ: number;
    destX: number;
    destZ: number;
    target: number;
    spotanimId: number;
    srcHeight: number;
    destHeight: number;
    startDelay: number;
    endDelay: number;
    peak: number;
    arc: number;
}

// ---- Inventory ----
export interface UpdateInvFullMessage {
    type: 'update_inv_full';
    component: number;
    inv: number;
    items: ({ id: number; count: number } | null)[];
}

export interface UpdateInvPartialMessage {
    type: 'update_inv_partial';
    component: number;
    inv: number;
    slots: { slot: number; id: number; count: number }[];
}

export interface UpdateInvStopTransmitMessage {
    type: 'update_inv_stop_transmit';
    component: number;
}

// ---- Stats ----
export interface UpdateStatMessage {
    type: 'update_stat';
    stat: number;
    exp: number;
    level: number;
    baseLevel: number;
}

export interface UpdateRunEnergyMessage {
    type: 'update_run_energy';
    energy: number;
}

export interface UpdateRunWeightMessage {
    type: 'update_run_weight';
    weight: number;
}

export interface UpdateRebootTimerMessage {
    type: 'update_reboot_timer';
    ticks: number;
}

// ---- UI ----
export interface IfOpenMainMessage { type: 'if_open_main'; component: number; }
export interface IfOpenSideMessage { type: 'if_open_side'; component: number; }
export interface IfOpenMainSideMessage { type: 'if_open_main_side'; main: number; side: number; }
export interface IfOpenChatMessage { type: 'if_open_chat'; component: number; }
export interface IfCloseMessage { type: 'if_close'; }
export interface IfSetTextMessage { type: 'if_set_text'; component: number; text: string; }
export interface IfSetHideMessage { type: 'if_set_hide'; component: number; hidden: boolean; }
export interface IfSetColourMessage { type: 'if_set_colour'; component: number; colour: number; }
export interface IfSetModelMessage { type: 'if_set_model'; component: number; model: number; }
export interface IfSetAnimMessage { type: 'if_set_anim'; component: number; seqId: number; }
export interface IfSetPositionMessage { type: 'if_set_position'; component: number; x: number; y: number; }
export interface IfSetPlayerHeadMessage { type: 'if_set_player_head'; component: number; }
export interface IfSetNpcHeadMessage { type: 'if_set_npc_head'; component: number; npcId: number; }
export interface IfSetObjectMessage { type: 'if_set_object'; component: number; objId: number; zoom: number; }
export interface IfSetTabMessage { type: 'if_set_tab'; tab: number; component: number; }
export interface IfSetTabActiveMessage { type: 'if_set_tab_active'; tab: number; }

// ---- Chat ----
export interface MessageGameMessage { type: 'message_game'; text: string; }
export interface MessagePrivateOutMessage { type: 'message_private'; from: string; text: string; staffModLevel: number; }

// ---- Camera ----
export interface CamMoveToMessage { type: 'cam_move_to'; x: number; z: number; height: number; speed: number; accel: number; }
export interface CamLookAtMessage { type: 'cam_look_at'; x: number; z: number; height: number; speed: number; accel: number; }
export interface CamShakeMessage { type: 'cam_shake'; shakeType: number; amplitude: number; frequency: number; duration: number; }
export interface CamResetMessage { type: 'cam_reset'; }

// ---- Audio ----
export interface SynthSoundMessage { type: 'synth_sound'; id: number; loops: number; delay: number; }
export interface MidiSongMessage { type: 'midi_song'; name: string; }
export interface MidiJingleMessage { type: 'midi_jingle'; name: string; length: number; }

// ---- Player State ----
export interface LogoutServerMessage { type: 'logout'; }
export interface SetMultiwayMessage { type: 'set_multiway'; enabled: boolean; }
export interface HintArrowMessage { type: 'hint_arrow'; hint_type: number; target?: number; x?: number; z?: number; height?: number; }
export interface ResetAnimsMessage { type: 'reset_anims'; }
export interface EnableTrackingMessage { type: 'enable_tracking'; }

// ---- Minimap ----
export interface MinimapToggleMessage { type: 'minimap_toggle'; state: number; }

// ---- Union of all server messages ----
export type ServerMessage =
    | LoginAcceptMessage | LoginRejectMessage
    | RebuildNormalMessage
    | PlayerInfoMessage | NpcInfoMessage
    | LocAddChangeMessage | LocDelMessage | LocAnimMessage | LocMergeMessage
    | ObjAddMessage | ObjDelMessage | ObjCountMessage | ObjRevealMessage
    | MapAnimMessage | MapProjAnimMessage
    | UpdateInvFullMessage | UpdateInvPartialMessage | UpdateInvStopTransmitMessage
    | UpdateStatMessage | UpdateRunEnergyMessage | UpdateRunWeightMessage | UpdateRebootTimerMessage
    | IfOpenMainMessage | IfOpenSideMessage | IfOpenMainSideMessage | IfOpenChatMessage
    | IfCloseMessage | IfSetTextMessage | IfSetHideMessage | IfSetColourMessage
    | IfSetModelMessage | IfSetAnimMessage | IfSetPositionMessage
    | IfSetPlayerHeadMessage | IfSetNpcHeadMessage | IfSetObjectMessage
    | IfSetTabMessage | IfSetTabActiveMessage
    | MessageGameMessage | MessagePrivateOutMessage
    | CamMoveToMessage | CamLookAtMessage | CamShakeMessage | CamResetMessage
    | SynthSoundMessage | MidiSongMessage | MidiJingleMessage
    | LogoutServerMessage | SetMultiwayMessage | HintArrowMessage
    | ResetAnimsMessage | EnableTrackingMessage | MinimapToggleMessage;
