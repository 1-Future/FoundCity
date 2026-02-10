/**
 * All client→server message types.
 *
 * JSON over WebSocket. Each message has a `type` field.
 * Replaces RS225 ClientProt binary opcodes entirely.
 */

// ---- Movement ----
export interface MoveClickMessage {
    type: 'move_click';
    x: number;
    z: number;
    ctrlRun?: boolean;
}

// ---- NPC Interaction ----
export interface OpNpcMessage {
    type: 'op_npc';
    nid: number;
    op: number; // 1-5
}

export interface OpNpcUMessage {
    type: 'op_npc_u';
    nid: number;
    useObj: number;
    useSlot: number;
    useComponent: number;
}

export interface OpNpcTMessage {
    type: 'op_npc_t';
    nid: number;
    spellComponent: number;
}

// ---- Loc Interaction ----
export interface OpLocMessage {
    type: 'op_loc';
    x: number;
    z: number;
    locId: number;
    op: number; // 1-5
}

export interface OpLocUMessage {
    type: 'op_loc_u';
    x: number;
    z: number;
    locId: number;
    useObj: number;
    useSlot: number;
    useComponent: number;
}

export interface OpLocTMessage {
    type: 'op_loc_t';
    x: number;
    z: number;
    locId: number;
    spellComponent: number;
}

// ---- Obj (Ground Item) Interaction ----
export interface OpObjMessage {
    type: 'op_obj';
    x: number;
    z: number;
    objId: number;
    op: number; // 1-5
}

export interface OpObjUMessage {
    type: 'op_obj_u';
    x: number;
    z: number;
    objId: number;
    useObj: number;
    useSlot: number;
    useComponent: number;
}

export interface OpObjTMessage {
    type: 'op_obj_t';
    x: number;
    z: number;
    objId: number;
    spellComponent: number;
}

// ---- Player Interaction ----
export interface OpPlayerMessage {
    type: 'op_player';
    pid: number;
    op: number; // 1-5
}

export interface OpPlayerUMessage {
    type: 'op_player_u';
    pid: number;
    useObj: number;
    useSlot: number;
    useComponent: number;
}

export interface OpPlayerTMessage {
    type: 'op_player_t';
    pid: number;
    spellComponent: number;
}

// ---- Inventory Interaction ----
export interface OpHeldMessage {
    type: 'op_held';
    objId: number;
    slot: number;
    component: number;
    op: number; // 1-5
}

export interface OpHeldUMessage {
    type: 'op_held_u';
    objId: number;
    slot: number;
    component: number;
    targetObjId: number;
    targetSlot: number;
    targetComponent: number;
}

export interface OpHeldTMessage {
    type: 'op_held_t';
    objId: number;
    slot: number;
    component: number;
    spellComponent: number;
}

export interface InvButtonMessage {
    type: 'inv_button';
    objId: number;
    slot: number;
    component: number;
}

export interface InvButtonDMessage {
    type: 'inv_button_d';
    component: number;
    fromSlot: number;
    toSlot: number;
}

// ---- UI ----
export interface IfButtonMessage {
    type: 'if_button';
    component: number;
}

export interface CloseModalMessage {
    type: 'close_modal';
}

export interface IfPlayerDesignMessage {
    type: 'if_player_design';
    gender: number;
    body: number[];
    colors: number[];
}

export interface ResumePauseButtonMessage {
    type: 'resume_pause_button';
    choice: number;
}

export interface ResumePCountDialogMessage {
    type: 'resume_p_count_dialog';
    input: number;
}

export interface TutorialClickSideMessage {
    type: 'tutorial_click_side';
    tab: number;
}

// ---- Chat ----
export interface MessagePublicMessage {
    type: 'message_public';
    text: string;
    color?: number;
    effect?: number;
}

export interface MessagePrivateMessage {
    type: 'message_private';
    target: string;
    text: string;
}

export interface ChatSetModeMessage {
    type: 'chat_set_mode';
    publicChat: number;
    privateChat: number;
    tradeChat: number;
}

// ---- Social ----
export interface FriendListAddMessage {
    type: 'friend_list_add';
    username: string;
}

export interface FriendListDelMessage {
    type: 'friend_list_del';
    username: string;
}

export interface IgnoreListAddMessage {
    type: 'ignore_list_add';
    username: string;
}

export interface IgnoreListDelMessage {
    type: 'ignore_list_del';
    username: string;
}

// ---- System ----
export interface IdleTimerMessage {
    type: 'idle_timer';
}

export interface NoTimeoutMessage {
    type: 'no_timeout';
}

export interface ClientCheatMessage {
    type: 'client_cheat';
    command: string;
}

export interface EventTrackingMessage {
    type: 'event_tracking';
    data: string;
}

export interface ReportAbuseMessage {
    type: 'report_abuse';
    target: string;
    reason: number;
}

// ---- Map ----
export interface RebuildGetMapsMessage {
    type: 'rebuild_get_maps';
    zones: number[];
}

// ---- Logout ----
export interface LogoutMessage {
    type: 'logout';
}

// ---- Union of all client messages ----
export type ClientMessage =
    | MoveClickMessage
    | OpNpcMessage | OpNpcUMessage | OpNpcTMessage
    | OpLocMessage | OpLocUMessage | OpLocTMessage
    | OpObjMessage | OpObjUMessage | OpObjTMessage
    | OpPlayerMessage | OpPlayerUMessage | OpPlayerTMessage
    | OpHeldMessage | OpHeldUMessage | OpHeldTMessage
    | InvButtonMessage | InvButtonDMessage
    | IfButtonMessage | CloseModalMessage | IfPlayerDesignMessage
    | ResumePauseButtonMessage | ResumePCountDialogMessage | TutorialClickSideMessage
    | MessagePublicMessage | MessagePrivateMessage | ChatSetModeMessage
    | FriendListAddMessage | FriendListDelMessage
    | IgnoreListAddMessage | IgnoreListDelMessage
    | IdleTimerMessage | NoTimeoutMessage | ClientCheatMessage
    | EventTrackingMessage | ReportAbuseMessage
    | RebuildGetMapsMessage | LogoutMessage;
