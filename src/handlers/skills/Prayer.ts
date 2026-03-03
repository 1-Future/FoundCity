/**
 * Prayer skill handler.
 *
 * OPHELD1 on bones — "Bury" action.
 * Prayer interface activation via IF_BUTTON on prayer sidebar.
 *
 * RS225 prayer list (unlocked by prayer level):
 * 1: Thick Skin (+5% def)
 * 4: Burst of Strength (+5% str)
 * 7: Clarity of Thought (+5% atk)
 * 10: Rock Skin (+10% def)
 * 13: Superhuman Strength (+10% str)
 * 16: Improved Reflexes (+10% atk)
 * 19: Rapid Restore (2x stat restore)
 * 22: Rapid Heal (2x hp restore)
 * 25: Protect Items (keep 1 extra on death)
 * 28: Steel Skin (+15% def)
 * 31: Ultimate Strength (+15% str)
 * 34: Incredible Reflexes (+15% atk)
 * 37: Protect from Magic
 * 40: Protect from Missiles
 * 43: Protect from Melee
 */
import Player from '#/engine/entity/Player.js';
import { PlayerStat } from '#/engine/entity/PlayerStat.js';
import ScriptProvider, { ScriptContext } from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import { messageGame, updateStat, updateInvFull } from '#/network/server/ServerMessages.js';

const INV_ID = 93;
const INV_COMPONENT = 3214;

const BURY_ANIM = 827;

// Bone definitions: [objId, xp*10, name]
type BoneDef = { id: number; xp: number; name: string };

const BONES: BoneDef[] = [
    { id: 526, xp: 45, name: 'bones' },           // Regular bones
    { id: 528, xp: 45, name: 'burnt bones' },      // Burnt bones
    { id: 530, xp: 150, name: 'bat bones' },       // Bat bones
    { id: 532, xp: 150, name: 'big bones' },       // Big bones
    { id: 534, xp: 720, name: 'dragon bones' },    // Dragon bones
];

for (const bone of BONES) {
    ScriptProvider.register(ServerTriggerType.OPHELD1, bone.id, (ctx: ScriptContext) => {
        const player = ctx.self as Player;
        const inv = player.invs.get(INV_ID);
        if (!inv) return;

        const tx = inv.remove(bone.id, 1);
        if (tx.hasFailed()) return;

        player.playAnimation(BURY_ANIM, 0);
        player.giveStat(PlayerStat.PRAYER, bone.xp);
        updateStat(player, PlayerStat.PRAYER);
        updateInvFull(player, INV_COMPONENT, inv);

        messageGame(player, `You bury the ${bone.name}.`);
    });
}

console.log(`[Skills] Prayer handlers registered (${BONES.length} bone types)`);
