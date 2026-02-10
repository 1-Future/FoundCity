import { CoordGrid } from '#/engine/CoordGrid.js';
import { MoveSpeed } from '#/engine/entity/MoveSpeed.js';
import Npc from '#/engine/entity/Npc.js';
import Player, { PlayerInfoMask } from '#/engine/entity/Player.js';
import { NpcStat } from '#/engine/entity/NpcStat.js';
import { PlayerStat } from '#/engine/entity/PlayerStat.js';
import World from '#/engine/World.js';
import { PlayerInfoMessage, PlayerInfoEntry, PlayerInfoMasks, PlayerAppearance, NpcInfoMessage, NpcInfoEntry, NpcInfoMasks } from '#/network/ServerMessage.js';
import { NpcInfoMask } from '#/engine/entity/Npc.js';

/**
 * Build player_info message for a specific viewer.
 *
 * Determines which players are visible to the viewer,
 * encodes their movement and info mask updates.
 */
export function buildPlayerInfo(viewer: Player): PlayerInfoMessage {
    const entries: PlayerInfoEntry[] = [];
    const removals: number[] = [];

    // visible range (in tiles)
    const range = 15;

    for (const other of World.shared.players) {
        if (!other || !other.isActive) continue;
        if (other.pid === viewer.pid) {
            // always include self
            entries.push(buildPlayerEntry(viewer, other));
            continue;
        }

        if (other.level !== viewer.level) {
            // different level — not visible
            continue;
        }

        const dx = other.x - viewer.x;
        const dz = other.z - viewer.z;
        if (Math.abs(dx) > range || Math.abs(dz) > range) {
            continue;
        }

        entries.push(buildPlayerEntry(viewer, other));
    }

    return { type: 'player_info', players: entries, removals };
}

function buildPlayerEntry(viewer: Player, player: Player): PlayerInfoEntry {
    const entry: PlayerInfoEntry = {
        pid: player.pid,
        x: player.x,
        z: player.z,
    };

    // movement
    if (player.tele) {
        entry.moveSpeed = MoveSpeed.INSTANT;
    } else if (player.runDir !== -1) {
        entry.moveSpeed = MoveSpeed.RUN;
    } else if (player.walkDir !== -1) {
        entry.moveSpeed = MoveSpeed.WALK;
    }

    // info masks
    if (player.masks !== 0) {
        entry.masks = buildPlayerMasks(player);
    }

    return entry;
}

function buildPlayerMasks(player: Player): PlayerInfoMasks {
    const masks: PlayerInfoMasks = {};

    if (player.masks & PlayerInfoMask.APPEARANCE) {
        masks.appearance = {
            gender: player.gender,
            body: player.body,
            colors: player.colors,
            combatLevel: player.combatLevel,
            username: player.username,
        };
    }

    if (player.masks & PlayerInfoMask.ANIM) {
        masks.anim = { id: player.animId, delay: player.animDelay };
    }

    if (player.masks & PlayerInfoMask.FACE_ENTITY) {
        masks.faceEntity = player.faceEntity;
    }

    if (player.masks & PlayerInfoMask.SAY) {
        masks.say = player.chat;
    }

    if (player.masks & PlayerInfoMask.DAMAGE) {
        masks.damage = {
            amount: player.damageTaken,
            type: player.damageType,
            currentHp: player.levels[PlayerStat.HITPOINTS],
            maxHp: player.baseLevels[PlayerStat.HITPOINTS],
        };
    }

    if (player.masks & PlayerInfoMask.FACE_COORD) {
        masks.faceCoord = { x: player.faceX, z: player.faceZ };
    }

    if (player.masks & PlayerInfoMask.CHAT) {
        masks.chat = { text: player.chat };
    }

    if (player.masks & PlayerInfoMask.SPOTANIM) {
        masks.spotanim = { id: player.graphicId, height: player.graphicHeight, delay: player.graphicDelay };
    }

    return masks;
}

/**
 * Build npc_info message for a specific viewer.
 */
export function buildNpcInfo(viewer: Player): NpcInfoMessage {
    const entries: NpcInfoEntry[] = [];
    const removals: number[] = [];
    const range = 15;

    for (const npc of World.shared.npcs) {
        if (!npc || !npc.isActive) continue;
        if (npc.level !== viewer.level) continue;

        const dx = npc.x - viewer.x;
        const dz = npc.z - viewer.z;
        if (Math.abs(dx) > range || Math.abs(dz) > range) continue;

        const entry: NpcInfoEntry = {
            nid: npc.nid,
            npcType: npc.type,
            x: npc.x,
            z: npc.z,
        };

        // movement
        if (npc.tele) {
            entry.moveSpeed = MoveSpeed.INSTANT;
        } else if (npc.walkDir !== -1) {
            entry.moveSpeed = MoveSpeed.WALK;
        }

        // info masks
        if (npc.masks !== 0) {
            entry.masks = buildNpcMasks(npc);
        }

        entries.push(entry);
    }

    return { type: 'npc_info', npcs: entries, removals };
}

function buildNpcMasks(npc: Npc): NpcInfoMasks {
    const masks: NpcInfoMasks = {};

    if (npc.masks & NpcInfoMask.ANIM) {
        masks.anim = { id: npc.animId, delay: npc.animDelay };
    }

    if (npc.masks & NpcInfoMask.FACE_ENTITY) {
        masks.faceEntity = npc.faceEntity;
    }

    if (npc.masks & NpcInfoMask.SAY) {
        masks.say = npc.chat ?? undefined;
    }

    if (npc.masks & NpcInfoMask.DAMAGE) {
        masks.damage = {
            amount: npc.damageTaken,
            type: npc.damageType,
            currentHp: npc.levels[NpcStat.HITPOINTS],
            maxHp: npc.baseLevels[NpcStat.HITPOINTS],
        };
    }

    if (npc.masks & NpcInfoMask.CHANGE_TYPE) {
        masks.changeType = npc.type;
    }

    if (npc.masks & NpcInfoMask.SPOTANIM) {
        masks.spotanim = { id: npc.graphicId, height: npc.graphicHeight, delay: npc.graphicDelay };
    }

    if (npc.masks & NpcInfoMask.FACE_COORD) {
        masks.faceCoord = { x: npc.faceX, z: npc.faceZ };
    }

    return masks;
}
