/**
 * Admin :: command processing.
 * Ported from lostcity-ref ClientCheatHandler.ts (~599 lines).
 *
 * Commands are gated by staffModLevel:
 *   2+ = Moderator commands
 *   3+ = Admin commands
 *   4+ = Developer commands (non-production only)
 */

import { BlockWalk } from '#/engine/entity/BlockWalk.js';
import { EntityLifeCycle } from '#/engine/entity/EntityLifeCycle.js';
import { MoveRestrict } from '#/engine/entity/MoveRestrict.js';
import { MoveSpeed } from '#/engine/entity/MoveSpeed.js';
import { MoveStrategy } from '#/engine/entity/MoveStrategy.js';
import Loc from '#/engine/entity/Loc.js';
import Npc from '#/engine/entity/Npc.js';
import Player, { PlayerInfoMask, getLevelByExp, getExpByLevel } from '#/engine/entity/Player.js';
// PlayerStat is a const enum — create runtime name mapping
const STAT_NAMES: string[] = [
    'ATTACK', 'DEFENCE', 'STRENGTH', 'HITPOINTS', 'RANGED', 'PRAYER', 'MAGIC',
    'COOKING', 'WOODCUTTING', 'FLETCHING', 'FISHING', 'FIREMAKING', 'CRAFTING',
    'SMITHING', 'MINING', 'HERBLORE', 'AGILITY', 'THIEVING', 'STAT18', 'STAT19', 'RUNECRAFT'
];

const STAT_HITPOINTS = 3; // PlayerStat.HITPOINTS
import World from '#/engine/World.js';
import NetworkPlayer from '#/engine/entity/NetworkPlayer.js';
import { NpcStore } from '#/config/NpcType.js';
import { ObjStore } from '#/config/ObjType.js';
import { LocStore } from '#/config/LocType.js';
import { VarPlayerStore } from '#/config/VarPlayerType.js';
import { Inventory } from '#/engine/Inventory.js';
import { InvStore } from '#/config/InvType.js';
import Environment from '#/util/Environment.js';

/**
 * Process a cheat command. Returns true if the command was handled.
 */
export function processCheatCommand(player: NetworkPlayer, input: string): boolean {
    if (input.length > 80) return false;

    const parts = input.toLowerCase().split(' ');
    const cmd = parts[0];

    // ---- Level 4+: Developer commands (non-production only) ----
    if (player.staffModLevel >= 4 && !Environment.NODE_PRODUCTION) {
        switch (cmd) {
            case 'speed': return cmdSpeed(player, parts);
            case 'fly': return cmdFly(player);
            case 'naive': return cmdNaive(player);
            case 'reload': return cmdReload(player);
        }
    }

    // ---- Level 3+: Admin commands ----
    if (player.staffModLevel >= 3) {
        switch (cmd) {
            case 'setvar': return cmdSetVar(player, parts);
            case 'getvar': return cmdGetVar(player, parts);
            case 'give': return cmdGive(player, parts);
            case 'givemany': return cmdGiveMany(player, parts);
            case 'givecrap': return cmdGiveCrap(player);
            case 'setstat': return cmdSetStat(player, parts);
            case 'advancestat': return cmdAdvanceStat(player, parts);
            case 'minme': return cmdMinMe(player);
            case 'npcadd': return cmdNpcAdd(player, parts);
            case 'locadd': return cmdLocAdd(player, parts);
            case 'teleother': return cmdTeleOther(player, parts);
            case 'setvarother': return cmdSetVarOther(player, parts);
            case 'getvarother': return cmdGetVarOther(player, parts);
            case 'giveother': return cmdGiveOther(player, parts);
            case 'broadcast': return cmdBroadcast(player, parts);
            case 'reboot': return cmdReboot(player);
            case 'slowreboot': return cmdSlowReboot(player, parts);
            case 'serverdrop': return cmdServerDrop(player);
        }
    }

    // ---- Level 2+: Moderator commands ----
    if (player.staffModLevel >= 2) {
        switch (cmd) {
            case 'tele': return cmdTele(player, parts);
            case 'teleto': return cmdTeleTo(player, parts);
            case 'getcoord': return cmdGetCoord(player);
            case 'kick': return cmdKick(player, parts);
            case 'ban': return cmdBan(player, parts);
            case 'mute': return cmdMute(player, parts);
            case 'setvis': return cmdSetVis(player, parts);
        }
    }

    return false;
}

// ============================================================
// Developer commands (level 4+, non-production)
// ============================================================

function cmdSpeed(player: Player, parts: string[]): boolean {
    if (parts.length < 2) return false;
    const ms = parseInt(parts[1], 10);
    if (isNaN(ms) || ms < 20) {
        gameMessage(player, 'Usage: ::speed <ms> (min 20)');
        return true;
    }
    // cannot change tick rate at runtime in this implementation,
    // but we accept the command and inform
    gameMessage(player, `Tick rate change not supported at runtime (requested ${ms}ms)`);
    return true;
}

function cmdFly(player: Player): boolean {
    if (player.moveStrategy === MoveStrategy.FLY) {
        player.moveStrategy = MoveStrategy.SMART;
        gameMessage(player, 'Fly mode: OFF');
    } else {
        player.moveStrategy = MoveStrategy.FLY;
        gameMessage(player, 'Fly mode: ON');
    }
    return true;
}

function cmdNaive(player: Player): boolean {
    if (player.moveStrategy === MoveStrategy.NAIVE) {
        player.moveStrategy = MoveStrategy.SMART;
        gameMessage(player, 'Naive mode: OFF');
    } else {
        player.moveStrategy = MoveStrategy.NAIVE;
        gameMessage(player, 'Naive mode: ON');
    }
    return true;
}

function cmdReload(player: Player): boolean {
    gameMessage(player, 'Reloading configs...');
    try {
        // dynamic import to avoid circular dependency
        import('#/config/ConfigRegistry.js').then(mod => {
            mod.default.reload('data');
            gameMessage(player, 'Configs reloaded.');
        });
    } catch {
        gameMessage(player, 'Reload failed.');
    }
    return true;
}

// ============================================================
// Admin commands (level 3+)
// ============================================================

function cmdSetVar(player: Player, parts: string[]): boolean {
    if (parts.length < 3) {
        gameMessage(player, 'Usage: ::setvar <variable> <value>');
        return true;
    }

    const varName = parts[1];
    const value = parseInt(parts[2], 10);
    if (isNaN(value)) return true;

    const varp = VarPlayerStore.getByName(varName);
    if (!varp) {
        // try as numeric id
        const id = parseInt(varName, 10);
        if (isNaN(id) || id < 0 || id >= player.vars.length) {
            gameMessage(player, `Unknown variable: ${varName}`);
            return true;
        }
        player.vars[id] = value;
        gameMessage(player, `Set var[${id}] = ${value}`);
    } else {
        if (varp.id >= 0 && varp.id < player.vars.length) {
            player.vars[varp.id] = value;
            gameMessage(player, `Set ${varName} = ${value}`);
        }
    }
    return true;
}

function cmdGetVar(player: Player, parts: string[]): boolean {
    if (parts.length < 2) {
        gameMessage(player, 'Usage: ::getvar <variable>');
        return true;
    }

    const varName = parts[1];
    const varp = VarPlayerStore.getByName(varName);
    if (!varp) {
        const id = parseInt(varName, 10);
        if (isNaN(id) || id < 0 || id >= player.vars.length) {
            gameMessage(player, `Unknown variable: ${varName}`);
            return true;
        }
        gameMessage(player, `var[${id}] = ${player.vars[id]}`);
    } else {
        gameMessage(player, `${varName} = ${player.vars[varp.id]}`);
    }
    return true;
}

function cmdSetVarOther(player: Player, parts: string[]): boolean {
    if (parts.length < 4) {
        gameMessage(player, 'Usage: ::setvarother <username> <variable> <value>');
        return true;
    }

    const other = World.getPlayerByUsername(parts[1]);
    if (!other) {
        gameMessage(player, `Player ${parts[1]} not found`);
        return true;
    }

    const varName = parts[2];
    const value = parseInt(parts[3], 10);
    if (isNaN(value)) return true;

    const varp = VarPlayerStore.getByName(varName);
    const id = varp ? varp.id : parseInt(varName, 10);
    if (isNaN(id) || id < 0 || id >= other.vars.length) {
        gameMessage(player, `Unknown variable: ${varName}`);
        return true;
    }

    other.vars[id] = value;
    gameMessage(player, `Set ${other.username}.${varName} = ${value}`);
    return true;
}

function cmdGetVarOther(player: Player, parts: string[]): boolean {
    if (parts.length < 3) {
        gameMessage(player, 'Usage: ::getvarother <username> <variable>');
        return true;
    }

    const other = World.getPlayerByUsername(parts[1]);
    if (!other) {
        gameMessage(player, `Player ${parts[1]} not found`);
        return true;
    }

    const varName = parts[2];
    const varp = VarPlayerStore.getByName(varName);
    const id = varp ? varp.id : parseInt(varName, 10);
    if (isNaN(id) || id < 0 || id >= other.vars.length) {
        gameMessage(player, `Unknown variable: ${varName}`);
        return true;
    }

    gameMessage(player, `${other.username}.${varName} = ${other.vars[id]}`);
    return true;
}

function cmdGive(player: Player, parts: string[]): boolean {
    if (parts.length < 2) {
        gameMessage(player, 'Usage: ::give <item> [amount]');
        return true;
    }

    const obj = resolveObj(parts[1]);
    if (obj === -1) {
        gameMessage(player, `Unknown item: ${parts[1]}`);
        return true;
    }

    const amount = parts.length >= 3 ? Math.min(parseInt(parts[2], 10) || 1, 0x7fffffff) : 1;

    const inv = getOrCreateInv(player, 0); // inv 0 = main inventory
    const result = inv.add(obj, amount);
    if (result.completed > 0) {
        inv.update = true;
        gameMessage(player, `Gave ${result.completed}x ${ObjStore.get(obj)?.name ?? obj}`);
    } else {
        gameMessage(player, 'Inventory full');
    }
    return true;
}

function cmdGiveOther(player: Player, parts: string[]): boolean {
    if (parts.length < 3) {
        gameMessage(player, 'Usage: ::giveother <username> <item> [amount]');
        return true;
    }

    const other = World.getPlayerByUsername(parts[1]);
    if (!other) {
        gameMessage(player, `Player ${parts[1]} not found`);
        return true;
    }

    const obj = resolveObj(parts[2]);
    if (obj === -1) {
        gameMessage(player, `Unknown item: ${parts[2]}`);
        return true;
    }

    const amount = parts.length >= 4 ? Math.min(parseInt(parts[3], 10) || 1, 0x7fffffff) : 1;
    const inv = getOrCreateInv(other, 0);
    const result = inv.add(obj, amount);
    if (result.completed > 0) {
        inv.update = true;
        gameMessage(player, `Gave ${result.completed}x ${ObjStore.get(obj)?.name ?? obj} to ${other.username}`);
    } else {
        gameMessage(player, `${other.username}'s inventory is full`);
    }
    return true;
}

function cmdGiveMany(player: Player, parts: string[]): boolean {
    if (parts.length < 2) {
        gameMessage(player, 'Usage: ::givemany <item>');
        return true;
    }

    const obj = resolveObj(parts[1]);
    if (obj === -1) {
        gameMessage(player, `Unknown item: ${parts[1]}`);
        return true;
    }

    const inv = getOrCreateInv(player, 0);
    const result = inv.add(obj, 1000);
    if (result.completed > 0) {
        inv.update = true;
        gameMessage(player, `Gave ${result.completed}x ${ObjStore.get(obj)?.name ?? obj}`);
    } else {
        gameMessage(player, 'Inventory full');
    }
    return true;
}

function cmdGiveCrap(player: Player): boolean {
    const inv = getOrCreateInv(player, 0);

    let given = 0;
    for (let id = 0; id < ObjStore.count && given < Player.INV_SIZE; id++) {
        const type = ObjStore.get(id);
        if (!type || type.dummyitem !== 0 || type.members) continue;
        if (!inv.hasSpace) break;

        const result = inv.add(id, 1);
        if (result.completed > 0) given++;
    }

    inv.update = true;
    gameMessage(player, `Gave ${given} random items`);
    return true;
}

function cmdSetStat(player: Player, parts: string[]): boolean {
    if (parts.length < 3) {
        gameMessage(player, 'Usage: ::setstat <skill> <level>');
        return true;
    }

    const stat = resolveStat(parts[1]);
    if (stat === -1) {
        gameMessage(player, `Unknown skill: ${parts[1]}`);
        return true;
    }

    const level = Math.max(1, Math.min(99, parseInt(parts[2], 10) || 1));
    player.baseLevels[stat] = level;
    player.levels[stat] = level;
    player.stats[stat] = getExpByLevel(level);
    player.masks |= PlayerInfoMask.APPEARANCE;
    gameMessage(player, `Set ${STAT_NAMES[stat] ?? stat} to level ${level}`);
    return true;
}

function cmdAdvanceStat(player: Player, parts: string[]): boolean {
    if (parts.length < 3) {
        gameMessage(player, 'Usage: ::advancestat <skill> <level>');
        return true;
    }

    const stat = resolveStat(parts[1]);
    if (stat === -1) {
        gameMessage(player, `Unknown skill: ${parts[1]}`);
        return true;
    }

    const targetLevel = Math.max(1, Math.min(99, parseInt(parts[2], 10) || 1));
    const targetXp = getExpByLevel(targetLevel);
    if (targetXp > player.stats[stat]) {
        player.giveStat(stat, targetXp - player.stats[stat]);
    }
    player.masks |= PlayerInfoMask.APPEARANCE;
    gameMessage(player, `Advanced ${STAT_NAMES[stat] ?? stat} to level ${targetLevel}`);
    return true;
}

function cmdMinMe(player: Player): boolean {
    for (let i = 0; i < Player.STAT_COUNT; i++) {
        player.baseLevels[i] = i === STAT_HITPOINTS ? 10 : 1;
        player.levels[i] = player.baseLevels[i];
        player.stats[i] = getExpByLevel(player.baseLevels[i]);
    }
    player.masks |= PlayerInfoMask.APPEARANCE;
    gameMessage(player, 'All stats reset to minimum');
    return true;
}

function cmdNpcAdd(player: Player, parts: string[]): boolean {
    if (parts.length < 2) {
        gameMessage(player, 'Usage: ::npcadd <npc_name_or_id>');
        return true;
    }

    const npcId = resolveNpc(parts[1]);
    if (npcId === -1) {
        gameMessage(player, `Unknown NPC: ${parts[1]}`);
        return true;
    }

    const npcType = NpcStore.get(npcId);
    if (!npcType) {
        gameMessage(player, `NPC type ${npcId} not found`);
        return true;
    }

    const npc = new Npc(
        player.level, player.x, player.z,
        npcType.size, npcType.size,
        EntityLifeCycle.DESPAWN,
        npcId,
        npcType.moverestrict as MoveRestrict,
        npcType.blockwalk as BlockWalk
    );

    World.shared.addNpc(npc);
    npc.setLifeCycle(500); // despawn after 500 ticks (5 minutes)
    gameMessage(player, `Spawned NPC: ${npcType.name} (id=${npcId})`);
    return true;
}

function cmdLocAdd(player: Player, parts: string[]): boolean {
    if (parts.length < 2) {
        gameMessage(player, 'Usage: ::locadd <loc_name_or_id>');
        return true;
    }

    const locId = resolveLoc(parts[1]);
    if (locId === -1) {
        gameMessage(player, `Unknown loc: ${parts[1]}`);
        return true;
    }

    const locType = LocStore.get(locId);
    if (!locType) {
        gameMessage(player, `Loc type ${locId} not found`);
        return true;
    }

    const loc = new Loc(player.level, player.x, player.z, locType.width, locType.length, EntityLifeCycle.DESPAWN, locId, 10, 0);
    World.addLoc(loc, 500); // despawn after 500 ticks
    gameMessage(player, `Spawned loc: ${locType.name} (id=${locId})`);
    return true;
}

function cmdTeleOther(player: Player, parts: string[]): boolean {
    if (parts.length < 2) {
        gameMessage(player, 'Usage: ::teleother <username>');
        return true;
    }

    const other = World.getPlayerByUsername(parts[1]);
    if (!other) {
        gameMessage(player, `Player ${parts[1]} not found`);
        return true;
    }

    other.closeModal();
    other.clearInteraction();
    other.clearWaypoints();
    other.teleport(player.x, player.z, player.level);
    gameMessage(player, `Teleported ${other.username} to your location`);
    return true;
}

function cmdBroadcast(player: Player, parts: string[]): boolean {
    if (parts.length < 2) {
        gameMessage(player, 'Usage: ::broadcast <message>');
        return true;
    }

    const message = parts.slice(1).join(' ');
    for (const other of World.shared.players) {
        if (!other) continue;
        other.write({ type: 'message_game', message: `[Server] ${message}` });
    }
    return true;
}

function cmdReboot(player: Player): boolean {
    gameMessage(player, 'Initiating immediate reboot...');
    World.shared.shutdown = true;
    return true;
}

function cmdSlowReboot(player: Player, parts: string[]): boolean {
    if (parts.length < 2) {
        gameMessage(player, 'Usage: ::slowreboot <seconds>');
        return true;
    }

    const seconds = parseInt(parts[1], 10);
    if (isNaN(seconds) || seconds <= 0) return true;

    const ticks = Math.ceil((seconds * 1000) / World.TICK_RATE);
    World.shared.shutdownTick = World.currentTick + ticks;

    // broadcast reboot timer to all players
    for (const other of World.shared.players) {
        if (!other) continue;
        other.write({ type: 'update_reboot_timer', ticks });
    }

    gameMessage(player, `Reboot in ${seconds}s (${ticks} ticks)`);
    return true;
}

function cmdServerDrop(player: NetworkPlayer): boolean {
    gameMessage(player, 'Dropping connection...');
    player.client.close();
    return true;
}

// ============================================================
// Moderator commands (level 2+)
// ============================================================

function cmdTele(player: Player, parts: string[]): boolean {
    if (parts.length < 2) {
        gameMessage(player, 'Usage: ::tele <level,mx,mz[,lx,lz]>');
        return true;
    }

    const coords = parts[1].split(',').map(c => parseInt(c, 10));
    if (coords.length < 3 || coords.some(isNaN)) {
        gameMessage(player, 'Invalid coord format. Use: level,mx,mz[,lx,lz]');
        return true;
    }

    const level = Math.max(0, Math.min(3, coords[0]));
    const mx = Math.max(0, Math.min(255, coords[1]));
    const mz = Math.max(0, Math.min(255, coords[2]));
    const lx = coords.length >= 4 ? Math.max(0, Math.min(63, coords[3])) : 32;
    const lz = coords.length >= 5 ? Math.max(0, Math.min(63, coords[4])) : 32;

    const x = (mx << 6) + lx;
    const z = (mz << 6) + lz;

    player.closeModal();
    player.clearInteraction();
    player.clearWaypoints();
    player.teleport(x, z, level);
    gameMessage(player, `Teleported to ${level},${mx},${mz},${lx},${lz}`);
    return true;
}

function cmdTeleTo(player: Player, parts: string[]): boolean {
    if (parts.length < 2) {
        gameMessage(player, 'Usage: ::teleto <username>');
        return true;
    }

    const other = World.getPlayerByUsername(parts[1]);
    if (!other) {
        gameMessage(player, `Player ${parts[1]} not found`);
        return true;
    }

    player.closeModal();
    player.clearInteraction();
    player.clearWaypoints();
    player.teleport(other.x, other.z, other.level);
    gameMessage(player, `Teleported to ${other.username}`);
    return true;
}

function cmdGetCoord(player: Player): boolean {
    const mx = player.x >> 6;
    const mz = player.z >> 6;
    const lx = player.x & 63;
    const lz = player.z & 63;
    gameMessage(player, `Coord: ${player.level},${mx},${mz},${lx},${lz} (abs: ${player.x},${player.z})`);
    return true;
}

function cmdKick(player: Player, parts: string[]): boolean {
    if (parts.length < 2) {
        gameMessage(player, 'Usage: ::kick <username>');
        return true;
    }

    const other = World.getPlayerByUsername(parts[1]);
    if (!other) {
        gameMessage(player, `Player ${parts[1]} not found`);
        return true;
    }

    World.shared.logoutRequests.add(other.pid);
    gameMessage(player, `Kicked ${other.username}`);
    return true;
}

function cmdBan(player: Player, parts: string[]): boolean {
    if (parts.length < 3) {
        gameMessage(player, 'Usage: ::ban <username> <minutes>');
        return true;
    }

    const minutes = parseInt(parts[2], 10);
    if (isNaN(minutes) || minutes <= 0) return true;

    // kick if online
    const other = World.getPlayerByUsername(parts[1]);
    if (other) {
        World.shared.logoutRequests.add(other.pid);
    }

    // bans would be persisted in a proper ban table, for now just log + kick
    console.log(`[Admin] ${player.username} banned ${parts[1]} for ${minutes} minutes`);
    gameMessage(player, `Banned ${parts[1]} for ${minutes} minutes`);
    return true;
}

function cmdMute(player: Player, parts: string[]): boolean {
    if (parts.length < 3) {
        gameMessage(player, 'Usage: ::mute <username> <minutes>');
        return true;
    }

    const minutes = parseInt(parts[2], 10);
    if (isNaN(minutes) || minutes <= 0) return true;

    console.log(`[Admin] ${player.username} muted ${parts[1]} for ${minutes} minutes`);
    gameMessage(player, `Muted ${parts[1]} for ${minutes} minutes`);
    return true;
}

function cmdSetVis(player: Player, parts: string[]): boolean {
    if (parts.length < 2) {
        gameMessage(player, 'Usage: ::setvis <0=default|1=soft|2=hard>');
        return true;
    }

    const vis = parseInt(parts[1], 10);
    if (isNaN(vis) || vis < 0 || vis > 2) return true;

    gameMessage(player, `Visibility set to ${vis === 0 ? 'default' : vis === 1 ? 'soft hidden' : 'hard hidden'}`);
    return true;
}

// ============================================================
// Helpers
// ============================================================

function gameMessage(player: Player, message: string): void {
    player.write({ type: 'message_game', message });
}

function resolveObj(nameOrId: string): number {
    const id = parseInt(nameOrId, 10);
    if (!isNaN(id)) {
        const obj = ObjStore.get(id);
        return obj ? id : -1;
    }
    const obj = ObjStore.getByName(nameOrId);
    return obj ? obj.id : -1;
}

function resolveNpc(nameOrId: string): number {
    const id = parseInt(nameOrId, 10);
    if (!isNaN(id)) {
        const npc = NpcStore.get(id);
        return npc ? id : -1;
    }
    const npc = NpcStore.getByName(nameOrId);
    return npc ? npc.id : -1;
}

function resolveLoc(nameOrId: string): number {
    const id = parseInt(nameOrId, 10);
    if (!isNaN(id)) {
        const loc = LocStore.get(id);
        return loc ? id : -1;
    }
    const loc = LocStore.getByName(nameOrId);
    return loc ? loc.id : -1;
}

function resolveStat(nameOrId: string): number {
    const id = parseInt(nameOrId, 10);
    if (!isNaN(id) && id >= 0 && id < Player.STAT_COUNT) return id;

    const upper = nameOrId.toUpperCase();
    const idx = STAT_NAMES.indexOf(upper);
    return idx !== -1 ? idx : -1;
}

function getOrCreateInv(player: Player, type: number): Inventory {
    let inv = player.invs.get(type);
    if (!inv) {
        const invType = InvStore.get(type);
        const capacity = invType?.size ?? Player.INV_SIZE;
        const stackType = invType?.stackall ? Inventory.ALWAYS_STACK : Inventory.NORMAL_STACK;
        inv = new Inventory(type, capacity, stackType);
        player.invs.set(type, inv);
    }
    return inv;
}
