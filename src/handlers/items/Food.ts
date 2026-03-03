/**
 * Food item handlers.
 * OPHELD1 (Eat) — heals hitpoints.
 *
 * RS225 food items with their healing amounts:
 */
import Player from '#/engine/entity/Player.js';
import { PlayerStat } from '#/engine/entity/PlayerStat.js';
import ScriptProvider, { ScriptContext } from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import { messageGame, updateStat, updateInvFull } from '#/network/server/ServerMessages.js';

// Food eat animation
const EAT_ANIM = 829;

// Inventory constants
const INV_ID = 93;
const INV_COMPONENT = 3214;

// Food definitions: [objId, healAmount, name]
const FOOD_ITEMS: [number, number, string][] = [
    // Basic food
    [315, 3, 'shrimps'],         // Shrimps
    [319, 3, 'anchovies'],       // Anchovies
    [2309, 2, 'bread'],          // Bread
    [1891, 4, 'cake'],           // Cake (first bite)
    [1893, 4, '2/3 cake'],       // 2/3 cake
    [1895, 4, 'slice of cake'],  // Slice of cake
    [1942, 1, 'potato'],         // Potato

    // Cooked meat
    [2140, 3, 'cooked chicken'], // Cooked chicken
    [2142, 3, 'cooked meat'],    // Cooked meat

    // Fish
    [333, 7, 'trout'],           // Trout
    [329, 9, 'salmon'],          // Salmon
    [339, 5, 'sardine'],         // Sardine
    [347, 5, 'herring'],         // Herring
    [351, 8, 'pike'],            // Pike
    [355, 9, 'tuna'],            // Tuna
    [379, 12, 'lobster'],        // Lobster
    [373, 14, 'swordfish'],      // Swordfish
    [385, 20, 'shark'],          // Shark

    // Wine
    [1993, 11, 'jug of wine'],   // Jug of wine

    // Pies
    [2325, 6, 'meat pie'],       // Meat pie
    [2327, 6, 'half a meat pie'], // Half a meat pie
    [2323, 6, 'redberry pie'],   // Redberry pie

    // Stew
    [2003, 11, 'stew'],          // Stew
];

for (const [objId, heal, name] of FOOD_ITEMS) {
    ScriptProvider.register(ServerTriggerType.OPHELD1, objId, (ctx: ScriptContext) => {
        const player = ctx.self as Player;
        const inv = player.invs.get(INV_ID);
        if (!inv) return;

        // remove food from inventory
        const tx = inv.remove(objId, 1);
        if (tx.hasFailed()) return;

        // heal hitpoints
        const maxHp = player.baseLevels[PlayerStat.HITPOINTS];
        const currentHp = player.levels[PlayerStat.HITPOINTS];

        if (currentHp < maxHp) {
            player.levels[PlayerStat.HITPOINTS] = Math.min(maxHp, currentHp + heal);
            updateStat(player, PlayerStat.HITPOINTS);
        }

        // play eating animation
        player.playAnimation(EAT_ANIM, 0);

        // handle special replacements (cake slices, pie halves)
        if (objId === 1891) inv.add(1893, 1); // Cake -> 2/3 cake
        else if (objId === 1893) inv.add(1895, 1); // 2/3 cake -> Slice of cake
        else if (objId === 2325) inv.add(2327, 1); // Meat pie -> Half
        else if (objId === 1993) inv.add(1935, 1); // Jug of wine -> Jug

        // update inventory
        updateInvFull(player, INV_COMPONENT, inv);

        messageGame(player, `You eat the ${name}.`);
    });
}

console.log(`[Items] ${FOOD_ITEMS.length} food handlers registered`);
