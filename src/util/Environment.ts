import 'dotenv/config';

import { tryParseBoolean, tryParseInt, tryParseString } from '#/util/TryParse.js';

export default {
    // ---- shared ----
    WEB_PORT: tryParseInt(process.env.WEB_PORT, 8888),
    WEB_CORS: tryParseBoolean(process.env.WEB_CORS, true),

    // ---- game ----
    NODE_PORT: tryParseInt(process.env.NODE_PORT, 43594),
    NODE_ID: tryParseInt(process.env.NODE_ID, 10),
    NODE_MEMBERS: tryParseBoolean(process.env.NODE_MEMBERS, true),
    NODE_XPRATE: tryParseInt(process.env.NODE_XPRATE, 1),
    NODE_PRODUCTION: tryParseBoolean(process.env.NODE_PRODUCTION, false),
    NODE_KILLTIMER: tryParseInt(process.env.NODE_KILLTIMER, 50),
    NODE_ALLOW_CHEATS: tryParseBoolean(process.env.NODE_ALLOW_CHEATS, true),
    NODE_DEBUG: tryParseBoolean(process.env.NODE_DEBUG, false),
    NODE_DEBUG_PROFILE: tryParseBoolean(process.env.NODE_DEBUG_PROFILE, false),
    NODE_MAX_PLAYERS: tryParseInt(process.env.NODE_MAX_PLAYERS, 2047),
    NODE_MAX_NPCS: tryParseInt(process.env.NODE_MAX_NPCS, 8191),

    // ---- login ----
    LOGIN_HOST: tryParseString(process.env.LOGIN_HOST, 'localhost'),
    LOGIN_PORT: tryParseInt(process.env.LOGIN_PORT, 43500),
    LOGIN_KEY: tryParseString(process.env.LOGIN_KEY, ''),

    // ---- database ----
    DB_BACKEND: tryParseString(process.env.DB_BACKEND, 'sqlite'),
    DB_HOST: tryParseString(process.env.DB_HOST, 'localhost'),
    DB_PORT: tryParseInt(process.env.DB_PORT, 3306),
    DB_NAME: tryParseString(process.env.DB_NAME, 'lostcity'),
    DB_USER: tryParseString(process.env.DB_USER, 'lostcity'),
    DB_PASS: tryParseString(process.env.DB_PASS, ''),

    // ---- build ----
    BUILD_STARTUP: tryParseBoolean(process.env.BUILD_STARTUP, true),
    BUILD_STARTUP_UPDATE: tryParseBoolean(process.env.BUILD_STARTUP_UPDATE, true),
    BUILD_VERIFY: tryParseBoolean(process.env.BUILD_VERIFY, true),
    BUILD_VERIFY_FOLDER: tryParseBoolean(process.env.BUILD_VERIFY_FOLDER, true),
    BUILD_VERIFY_PACK: tryParseBoolean(process.env.BUILD_VERIFY_PACK, true),
    BUILD_VERIFY_PROCEDURES: tryParseBoolean(process.env.BUILD_VERIFY_PROCEDURES, true),
} as const;
