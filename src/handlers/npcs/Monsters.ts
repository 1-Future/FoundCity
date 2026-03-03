/**
 * Monster spawn stats for common RS225 combat NPCs.
 * Sets AI_SPAWN handlers to initialize combat levels.
 * Attack handled by global OPNPC2 combat handler.
 */
import Npc from '#/engine/entity/Npc.js';
import ScriptProvider, { ScriptContext } from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';

type MonsterDef = {
    ids: number[];
    atk: number;
    def: number;
    str: number;
    hp: number;
    rng: number;
    mag: number;
    aggressive?: boolean;
    huntRange?: number;
};

const MONSTERS: MonsterDef[] = [
    // Lumbridge / beginner area
    { ids: [41, 1017], atk: 1, def: 1, str: 1, hp: 3, rng: 0, mag: 0 },             // Chicken
    { ids: [86, 87], atk: 2, def: 2, str: 3, hp: 5, rng: 0, mag: 0 },               // Giant rat
    { ids: [100, 101, 102], atk: 1, def: 1, str: 1, hp: 5, rng: 0, mag: 0 },        // Goblin
    { ids: [81, 397], atk: 1, def: 1, str: 1, hp: 8, rng: 0, mag: 0 },              // Cow
    { ids: [1, 2], atk: 1, def: 1, str: 1, hp: 7, rng: 0, mag: 0 },                 // Man/Woman

    // Guards
    { ids: [9, 10], atk: 18, def: 14, str: 18, hp: 22, rng: 0, mag: 0 },            // Guard

    // Varrock area
    { ids: [172, 174], atk: 7, def: 7, str: 5, hp: 19, rng: 0, mag: 12, aggressive: true, huntRange: 4 }, // Dark wizard
    { ids: [59, 60, 61], atk: 4, def: 4, str: 4, hp: 10, rng: 0, mag: 0 },          // Spider / Giant spider
    { ids: [90, 91, 92], atk: 14, def: 14, str: 14, hp: 25, rng: 0, mag: 0, aggressive: true }, // Skeleton

    // Barbarian Village
    { ids: [12], atk: 6, def: 5, str: 6, hp: 14, rng: 0, mag: 0 },                  // Barbarian

    // Al-Kharid
    { ids: [18, 19], atk: 12, def: 12, str: 12, hp: 19, rng: 0, mag: 0 },           // Al-Kharid warrior

    // Draynor
    { ids: [76, 77], atk: 13, def: 11, str: 13, hp: 20, rng: 0, mag: 0 },           // Zombie

    // Wilderness
    { ids: [82], atk: 33, def: 37, str: 33, hp: 40, rng: 0, mag: 0, aggressive: true }, // Lesser demon
    { ids: [83], atk: 80, def: 80, str: 82, hp: 87, rng: 0, mag: 0, aggressive: true }, // Greater demon
    { ids: [50], atk: 60, def: 60, str: 60, hp: 65, rng: 0, mag: 0, aggressive: true }, // Black demon

    // Hill Giant
    { ids: [117], atk: 18, def: 26, str: 27, hp: 35, rng: 0, mag: 0 },              // Hill giant

    // Moss Giant
    { ids: [112], atk: 30, def: 30, str: 30, hp: 60, rng: 0, mag: 0 },              // Moss giant

    // Fire Giant
    { ids: [110], atk: 65, def: 65, str: 65, hp: 111, rng: 0, mag: 0, aggressive: true }, // Fire giant

    // Ice Giant
    { ids: [111], atk: 40, def: 40, str: 40, hp: 70, rng: 0, mag: 0 },              // Ice giant

    // Hobgoblin
    { ids: [122, 123], atk: 22, def: 24, str: 22, hp: 29, rng: 0, mag: 0 },         // Hobgoblin

    // Imp
    { ids: [708], atk: 1, def: 1, str: 1, hp: 3, rng: 0, mag: 0 },                  // Imp
];

for (const monster of MONSTERS) {
    for (const npcId of monster.ids) {
        ScriptProvider.register(ServerTriggerType.AI_SPAWN, npcId, (ctx: ScriptContext) => {
            const npc = ctx.self as Npc;
            npc.baseLevels[0] = monster.atk;
            npc.baseLevels[1] = monster.def;
            npc.baseLevels[2] = monster.str;
            npc.baseLevels[3] = monster.hp;
            npc.baseLevels[4] = monster.rng;
            npc.baseLevels[5] = monster.mag;
            npc.initStats();

            if (monster.aggressive) {
                npc.huntMode = 1;
                npc.huntRange = monster.huntRange ?? 5;
            }
        });
    }
}

const totalNpcs = MONSTERS.reduce((sum, m) => sum + m.ids.length, 0);
console.log(`[NPCs] ${totalNpcs} monster stat handlers registered`);
