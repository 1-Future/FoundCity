import path from 'path';

import { FloStore } from '#/config/FloType.js';
import { CategoryStore } from '#/config/CategoryType.js';
import { SeqStore } from '#/config/SeqType.js';
import { SeqFrameStore } from '#/config/SeqFrame.js';
import { SpotanimStore } from '#/config/SpotanimType.js';
import { MesanimStore } from '#/config/MesanimType.js';
import { ParamStore } from '#/config/ParamType.js';
import { StructStore } from '#/config/StructType.js';
import { EnumStore } from '#/config/EnumType.js';
import { VarPlayerStore } from '#/config/VarPlayerType.js';
import { VarNpcStore } from '#/config/VarNpcType.js';
import { VarSharedStore } from '#/config/VarSharedType.js';
import { InvStore } from '#/config/InvType.js';
import { IdkStore } from '#/config/IdkType.js';
import { HuntStore } from '#/config/HuntType.js';
import { NpcStore } from '#/config/NpcType.js';
import { ObjStore } from '#/config/ObjType.js';
import { LocStore } from '#/config/LocType.js';
import { ComponentStore } from '#/config/Component.js';
import { FontStore } from '#/config/FontType.js';
import { DbTableStore } from '#/config/DbTableType.js';
import { DbRowStore } from '#/config/DbRowType.js';
import DbTableIndex from '#/config/DbTableIndex.js';

/**
 * Central config registry — loads all game configs from JSON files.
 * Replaces lostcity-ref's binary cache system entirely.
 *
 * Call ConfigRegistry.load(dataDir) during server startup.
 */
export default class ConfigRegistry {
    static load(dataDir: string): void {
        const configDir = path.join(dataDir, 'configs');
        console.log(`[ConfigRegistry] Loading configs from ${configDir}`);

        FloStore.load(path.join(configDir, 'flo.json'));
        CategoryStore.load(path.join(configDir, 'category.json'));
        SeqStore.load(path.join(configDir, 'seq.json'));
        SeqFrameStore.load(path.join(configDir, 'seqframe.json'));
        SpotanimStore.load(path.join(configDir, 'spotanim.json'));
        MesanimStore.load(path.join(configDir, 'mesanim.json'));
        ParamStore.load(path.join(configDir, 'param.json'));
        StructStore.load(path.join(configDir, 'struct.json'));
        EnumStore.load(path.join(configDir, 'enum.json'));
        VarPlayerStore.load(path.join(configDir, 'varp.json'));
        VarNpcStore.load(path.join(configDir, 'varn.json'));
        VarSharedStore.load(path.join(configDir, 'vars.json'));
        InvStore.load(path.join(configDir, 'inv.json'));
        IdkStore.load(path.join(configDir, 'idk.json'));
        HuntStore.load(path.join(configDir, 'hunt.json'));
        NpcStore.load(path.join(configDir, 'npc.json'));
        ObjStore.load(path.join(configDir, 'obj.json'));
        LocStore.load(path.join(configDir, 'loc.json'));
        ComponentStore.load(path.join(configDir, 'component.json'));
        FontStore.load(path.join(configDir, 'font.json'));
        DbTableStore.load(path.join(configDir, 'dbtable.json'));
        DbRowStore.load(path.join(configDir, 'dbrow.json'));

        // build database indices after all rows are loaded
        DbTableIndex.build();

        console.log('[ConfigRegistry] All configs loaded');
    }

    static reload(dataDir: string): void {
        console.log('[ConfigRegistry] Reloading configs...');
        ConfigRegistry.load(dataDir);
    }
}
