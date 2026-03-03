/**
 * Service NPC handlers — various utility NPCs around the world.
 * Tutors, priests, ranged shop, sword shop, etc.
 */
import Player from '#/engine/entity/Player.js';
import ScriptProvider, { ScriptContext } from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import { messageGame } from '#/network/server/ServerMessages.js';
import { openShop } from '#/engine/ShopSystem.js';

// ---- Lumbridge NPCs ----

// Duke Horacio (NPC 741)
ScriptProvider.register(ServerTriggerType.OPNPC1, 741, (ctx: ScriptContext) => {
    messageGame(ctx.self as Player, 'Greetings. Welcome to my castle.');
});

// Father Aereck (NPC 456) — Restless Ghost quest NPC
ScriptProvider.register(ServerTriggerType.OPNPC1, 456, (ctx: ScriptContext) => {
    messageGame(ctx.self as Player, 'Welcome to the church of Lumbridge.');
});

// Bob (NPC 519) — axe shop
ScriptProvider.register(ServerTriggerType.OPNPC1, 519, (ctx: ScriptContext) => {
    messageGame(ctx.self as Player, 'Welcome to my axe shop!');
    openShop(ctx.self as Player, 9, "Bob's Brilliant Axes");
});

// ---- Varrock NPCs ----

// Zaff (NPC 546) — staff shop
ScriptProvider.register(ServerTriggerType.OPNPC1, 546, (ctx: ScriptContext) => {
    messageGame(ctx.self as Player, 'Would you like to buy a staff?');
    openShop(ctx.self as Player, 21, "Zaff's Superior Staffs");
});

// Aubury (NPC 553) — rune shop
ScriptProvider.register(ServerTriggerType.OPNPC1, 553, (ctx: ScriptContext) => {
    messageGame(ctx.self as Player, 'Would you like to buy some runes?');
    openShop(ctx.self as Player, 22, "Aubury's Rune Shop");
});

// Thessalia (NPC 548) — clothes shop
ScriptProvider.register(ServerTriggerType.OPNPC1, 548, (ctx: ScriptContext) => {
    messageGame(ctx.self as Player, 'Welcome to my clothes shop!');
    openShop(ctx.self as Player, 23, "Thessalia's Fine Clothes");
});

// Lowe (NPC 550) — ranged shop
ScriptProvider.register(ServerTriggerType.OPNPC1, 550, (ctx: ScriptContext) => {
    openShop(ctx.self as Player, 24, "Lowe's Archery Emporium");
});

// Horvik (NPC 549) — armour shop
ScriptProvider.register(ServerTriggerType.OPNPC1, 549, (ctx: ScriptContext) => {
    openShop(ctx.self as Player, 25, "Horvik's Armour Shop");
});

// ---- Falador NPCs ----

// Wayne (NPC 581) — chainmail shop
ScriptProvider.register(ServerTriggerType.OPNPC1, 581, (ctx: ScriptContext) => {
    openShop(ctx.self as Player, 30, "Wayne's Chains");
});

// ---- Al-Kharid NPCs ----

// Ali Morrisane (NPC 1862) — general trader
ScriptProvider.register(ServerTriggerType.OPNPC1, 1862, (ctx: ScriptContext) => {
    messageGame(ctx.self as Player, 'Hello my friend! Would you like to trade?');
});

// Gem trader (NPC 540)
ScriptProvider.register(ServerTriggerType.OPNPC1, 540, (ctx: ScriptContext) => {
    openShop(ctx.self as Player, 14, 'Al-Kharid Gem Stall');
});

console.log('[NPCs] Service NPC handlers registered');
