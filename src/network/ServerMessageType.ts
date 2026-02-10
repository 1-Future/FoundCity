/**
 * Server→Client message type strings.
 *
 * These are the `type` field values in ServerMessage union.
 * Replaces RS225 ServerProt opcode enum with human-readable strings.
 */

export const ServerMessageType = {
    // Auth
    LOGIN_ACCEPT: 'login_accept',
    LOGIN_REJECT: 'login_reject',

    // Map/World
    REBUILD_NORMAL: 'rebuild_normal',

    // Player Info
    PLAYER_INFO: 'player_info',

    // NPC Info
    NPC_INFO: 'npc_info',

    // Zone Updates
    LOC_ADD_CHANGE: 'loc_add_change',
    LOC_DEL: 'loc_del',
    LOC_ANIM: 'loc_anim',
    LOC_MERGE: 'loc_merge',
    OBJ_ADD: 'obj_add',
    OBJ_DEL: 'obj_del',
    OBJ_COUNT: 'obj_count',
    OBJ_REVEAL: 'obj_reveal',
    MAP_ANIM: 'map_anim',
    MAP_PROJ_ANIM: 'map_proj_anim',

    // Inventory
    UPDATE_INV_FULL: 'update_inv_full',
    UPDATE_INV_PARTIAL: 'update_inv_partial',
    UPDATE_INV_STOP_TRANSMIT: 'update_inv_stop_transmit',

    // Stats
    UPDATE_STAT: 'update_stat',
    UPDATE_RUN_ENERGY: 'update_run_energy',
    UPDATE_RUN_WEIGHT: 'update_run_weight',
    UPDATE_REBOOT_TIMER: 'update_reboot_timer',

    // UI
    IF_OPEN_MAIN: 'if_open_main',
    IF_OPEN_SIDE: 'if_open_side',
    IF_OPEN_MAIN_SIDE: 'if_open_main_side',
    IF_OPEN_CHAT: 'if_open_chat',
    IF_CLOSE: 'if_close',
    IF_SET_TEXT: 'if_set_text',
    IF_SET_HIDE: 'if_set_hide',
    IF_SET_COLOUR: 'if_set_colour',
    IF_SET_MODEL: 'if_set_model',
    IF_SET_ANIM: 'if_set_anim',
    IF_SET_POSITION: 'if_set_position',
    IF_SET_PLAYER_HEAD: 'if_set_player_head',
    IF_SET_NPC_HEAD: 'if_set_npc_head',
    IF_SET_OBJECT: 'if_set_object',
    IF_SET_TAB: 'if_set_tab',
    IF_SET_TAB_ACTIVE: 'if_set_tab_active',

    // Chat
    MESSAGE_GAME: 'message_game',
    MESSAGE_PRIVATE: 'message_private',

    // Camera
    CAM_MOVE_TO: 'cam_move_to',
    CAM_LOOK_AT: 'cam_look_at',
    CAM_SHAKE: 'cam_shake',
    CAM_RESET: 'cam_reset',

    // Audio
    SYNTH_SOUND: 'synth_sound',
    MIDI_SONG: 'midi_song',
    MIDI_JINGLE: 'midi_jingle',

    // Player State
    LOGOUT: 'logout',
    SET_MULTIWAY: 'set_multiway',
    HINT_ARROW: 'hint_arrow',
    RESET_ANIMS: 'reset_anims',
    ENABLE_TRACKING: 'enable_tracking',

    // Minimap
    MINIMAP_TOGGLE: 'minimap_toggle',

    // Social
    FRIEND_LIST: 'friend_list',
    FRIEND_STATUS: 'friend_status',

    // Zone Sync
    ZONE_FULL_FOLLOWS: 'zone_full_follows',
} as const;

export type ServerMessageTypeString = (typeof ServerMessageType)[keyof typeof ServerMessageType];
