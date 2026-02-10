/**
 * Client→Server message type strings.
 *
 * These are the `type` field values in ClientMessage union.
 * Replaces RS225 ClientProt opcode enum with human-readable strings.
 */

export const ClientMessageType = {
    // Movement
    MOVE_CLICK: 'move_click',

    // NPC Interaction
    OP_NPC: 'op_npc',
    OP_NPC_U: 'op_npc_u',
    OP_NPC_T: 'op_npc_t',

    // Loc Interaction
    OP_LOC: 'op_loc',
    OP_LOC_U: 'op_loc_u',
    OP_LOC_T: 'op_loc_t',

    // Obj Interaction
    OP_OBJ: 'op_obj',
    OP_OBJ_U: 'op_obj_u',
    OP_OBJ_T: 'op_obj_t',

    // Player Interaction
    OP_PLAYER: 'op_player',
    OP_PLAYER_U: 'op_player_u',
    OP_PLAYER_T: 'op_player_t',

    // Inventory
    OP_HELD: 'op_held',
    OP_HELD_U: 'op_held_u',
    OP_HELD_T: 'op_held_t',
    INV_BUTTON: 'inv_button',
    INV_BUTTON_D: 'inv_button_d',

    // UI
    IF_BUTTON: 'if_button',
    CLOSE_MODAL: 'close_modal',
    IF_PLAYER_DESIGN: 'if_player_design',
    RESUME_PAUSE_BUTTON: 'resume_pause_button',
    RESUME_P_COUNT_DIALOG: 'resume_p_count_dialog',
    TUTORIAL_CLICK_SIDE: 'tutorial_click_side',

    // Chat
    MESSAGE_PUBLIC: 'message_public',
    MESSAGE_PRIVATE: 'message_private',
    CHAT_SET_MODE: 'chat_set_mode',

    // Social
    FRIEND_LIST_ADD: 'friend_list_add',
    FRIEND_LIST_DEL: 'friend_list_del',
    IGNORE_LIST_ADD: 'ignore_list_add',
    IGNORE_LIST_DEL: 'ignore_list_del',

    // System
    IDLE_TIMER: 'idle_timer',
    NO_TIMEOUT: 'no_timeout',
    CLIENT_CHEAT: 'client_cheat',
    EVENT_TRACKING: 'event_tracking',
    REPORT_ABUSE: 'report_abuse',

    // Map
    REBUILD_GET_MAPS: 'rebuild_get_maps',

    // Logout
    LOGOUT: 'logout',
} as const;

export type ClientMessageTypeString = (typeof ClientMessageType)[keyof typeof ClientMessageType];
