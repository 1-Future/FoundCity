/**
 * Content handler registration.
 *
 * This directory contains TypeScript event handlers that replace lostcity-ref's
 * 1,159 RuneScript (.rs2) files. Each file registers handlers with ScriptProvider
 * for specific triggers (NPC interactions, loc clicks, quests, etc.).
 *
 * Pattern:
 *   import ScriptProvider from '#/engine/script/ScriptProvider.js';
 *   import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
 *
 *   ScriptProvider.register(ServerTriggerType.AI_OPPLAYER1, npcId, (ctx) => {
 *       const npc = ctx.self as Npc;
 *       // NPC combat AI...
 *   });
 *
 * Subdirectories:
 *   npcs/     — NPC AI, combat, dialogue
 *   locs/     — Location (scenery) interactions
 *   items/    — Item use, equipment effects
 *   combat/   — Combat calculations, death handling
 *   quests/   — Quest progression, stage logic
 *   systems/  — Login, logout, timers, global events
 *
 * Import this file in app.ts to register all handlers via side effects.
 */

// System-level handlers (login, logout, global timers)
import '#/handlers/systems/index.js';

// Combat handlers
import '#/handlers/combat/index.js';

// NPC handlers
import '#/handlers/npcs/index.js';

// Loc handlers
import '#/handlers/locs/index.js';

// Item handlers
import '#/handlers/items/index.js';

// Quest handlers
import '#/handlers/quests/index.js';

// Skill handlers
import '#/handlers/skills/index.js';
