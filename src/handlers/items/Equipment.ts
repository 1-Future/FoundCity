/**
 * Equipment handlers.
 * OPHELD2 (Wear/Wield) — equips items from inventory to worn equipment.
 * OPHELD2 on worn items — unequips back to inventory.
 *
 * Equipment slot mapping for RS225 worn inventory (14 slots):
 * 0=Head, 1=Cape, 2=Amulet, 3=Weapon, 4=Body, 5=Shield,
 * 6=unused, 7=Legs, 8=unused, 9=Gloves, 10=Boots, 11=unused, 12=Ring, 13=Arrows
 */
import Player from '#/engine/entity/Player.js';
import { PlayerInfoMask } from '#/engine/entity/Player.js';
import ScriptProvider, { ScriptContext } from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import { messageGame, updateInvFull } from '#/network/server/ServerMessages.js';

const INV_ID = 93;
const WORN_ID = 94;
const INV_COMPONENT = 3214;
const WORN_COMPONENT = 1688;

const enum EquipSlot {
    HEAD = 0,
    CAPE = 1,
    AMULET = 2,
    WEAPON = 3,
    BODY = 4,
    SHIELD = 5,
    LEGS = 7,
    GLOVES = 9,
    BOOTS = 10,
    RING = 12,
    ARROWS = 13,
}

// Equipment definitions: maps obj ID to slot
// Covering key starter/low-level equipment
const EQUIPMENT_SLOTS: Map<number, EquipSlot> = new Map([
    // Melee weapons (slot 3)
    [1277, EquipSlot.WEAPON],  // Bronze sword
    [1279, EquipSlot.WEAPON],  // Iron sword
    [1281, EquipSlot.WEAPON],  // Steel sword
    [1283, EquipSlot.WEAPON],  // Mithril sword
    [1285, EquipSlot.WEAPON],  // Adamant sword
    [1287, EquipSlot.WEAPON],  // Rune sword
    [1289, EquipSlot.WEAPON],  // Bronze longsword
    [1291, EquipSlot.WEAPON],  // Iron longsword
    [1293, EquipSlot.WEAPON],  // Steel longsword
    [1295, EquipSlot.WEAPON],  // Mithril longsword
    [1297, EquipSlot.WEAPON],  // Adamant longsword
    [1299, EquipSlot.WEAPON],  // Rune longsword
    [1301, EquipSlot.WEAPON],  // Bronze 2h sword
    [1303, EquipSlot.WEAPON],  // Iron 2h sword
    [1305, EquipSlot.WEAPON],  // Steel 2h sword
    [1307, EquipSlot.WEAPON],  // Mithril 2h sword
    [1309, EquipSlot.WEAPON],  // Adamant 2h sword
    [1311, EquipSlot.WEAPON],  // Rune 2h sword
    [1321, EquipSlot.WEAPON],  // Bronze scimitar
    [1323, EquipSlot.WEAPON],  // Iron scimitar
    [1325, EquipSlot.WEAPON],  // Steel scimitar
    [1327, EquipSlot.WEAPON],  // Mithril scimitar
    [1329, EquipSlot.WEAPON],  // Adamant scimitar
    [1331, EquipSlot.WEAPON],  // Rune scimitar
    [1333, EquipSlot.WEAPON],  // Rune scimitar (duplicate?)
    [1349, EquipSlot.WEAPON],  // Iron battleaxe
    [1351, EquipSlot.WEAPON],  // Bronze axe (woodcutting)
    [1353, EquipSlot.WEAPON],  // Iron axe
    [1355, EquipSlot.WEAPON],  // Steel axe
    [1357, EquipSlot.WEAPON],  // Mithril axe
    [1359, EquipSlot.WEAPON],  // Adamant axe
    [1361, EquipSlot.WEAPON],  // Rune axe

    // Helmets (slot 0)
    [1137, EquipSlot.HEAD],    // Iron med helm
    [1139, EquipSlot.HEAD],    // Bronze med helm
    [1141, EquipSlot.HEAD],    // Steel med helm
    [1143, EquipSlot.HEAD],    // Mithril med helm
    [1145, EquipSlot.HEAD],    // Adamant med helm
    [1147, EquipSlot.HEAD],    // Rune med helm
    [1149, EquipSlot.HEAD],    // Bronze full helm
    [1151, EquipSlot.HEAD],    // Iron full helm
    [1153, EquipSlot.HEAD],    // Steel full helm
    [1155, EquipSlot.HEAD],    // Mithril full helm
    [1157, EquipSlot.HEAD],    // Adamant full helm
    [1159, EquipSlot.HEAD],    // Rune full helm
    [1169, EquipSlot.HEAD],    // Coif

    // Body armour (slot 4)
    [1101, EquipSlot.BODY],    // Bronze chainbody
    [1103, EquipSlot.BODY],    // Iron chainbody
    [1105, EquipSlot.BODY],    // Steel chainbody
    [1107, EquipSlot.BODY],    // Mithril chainbody
    [1109, EquipSlot.BODY],    // Adamant chainbody
    [1111, EquipSlot.BODY],    // Rune chainbody
    [1115, EquipSlot.BODY],    // Bronze platebody
    [1117, EquipSlot.BODY],    // Iron platebody
    [1119, EquipSlot.BODY],    // Steel platebody
    [1121, EquipSlot.BODY],    // Mithril platebody
    [1123, EquipSlot.BODY],    // Adamant platebody
    [1125, EquipSlot.BODY],    // Rune platebody
    [1129, EquipSlot.BODY],    // Leather body

    // Leg armour (slot 7)
    [1067, EquipSlot.LEGS],    // Bronze platelegs
    [1069, EquipSlot.LEGS],    // Iron platelegs
    [1071, EquipSlot.LEGS],    // Steel platelegs
    [1073, EquipSlot.LEGS],    // Mithril platelegs
    [1075, EquipSlot.LEGS],    // Adamant platelegs
    [1077, EquipSlot.LEGS],    // Rune platelegs
    [1087, EquipSlot.LEGS],    // Bronze plateskirt
    [1089, EquipSlot.LEGS],    // Iron plateskirt
    [1091, EquipSlot.LEGS],    // Steel plateskirt
    [1093, EquipSlot.LEGS],    // Mithril plateskirt
    [1095, EquipSlot.LEGS],    // Adamant plateskirt
    [1097, EquipSlot.LEGS],    // Rune plateskirt

    // Shields (slot 5)
    [1171, EquipSlot.SHIELD],  // Wooden shield
    [1173, EquipSlot.SHIELD],  // Bronze sq shield
    [1175, EquipSlot.SHIELD],  // Iron sq shield
    [1177, EquipSlot.SHIELD],  // Steel sq shield
    [1179, EquipSlot.SHIELD],  // Mithril sq shield
    [1181, EquipSlot.SHIELD],  // Adamant sq shield
    [1183, EquipSlot.SHIELD],  // Rune sq shield
    [1185, EquipSlot.SHIELD],  // Bronze kiteshield
    [1187, EquipSlot.SHIELD],  // Iron kiteshield
    [1189, EquipSlot.SHIELD],  // Steel kiteshield
    [1191, EquipSlot.SHIELD],  // Mithril kiteshield
    [1193, EquipSlot.SHIELD],  // Adamant kiteshield
    [1195, EquipSlot.SHIELD],  // Rune kiteshield
    [1197, EquipSlot.SHIELD],  // Anti-dragon shield

    // Capes (slot 1)
    [1007, EquipSlot.CAPE],    // Cape (red)
    [1019, EquipSlot.CAPE],    // Cape (black)
    [1021, EquipSlot.CAPE],    // Cape (blue)
    [1023, EquipSlot.CAPE],    // Cape (yellow)

    // Amulets (slot 2)
    [1692, EquipSlot.AMULET],  // Amulet of glory
    [1694, EquipSlot.AMULET],  // Amulet of glory(1)
    [1696, EquipSlot.AMULET],  // Amulet of glory(2)
    [1698, EquipSlot.AMULET],  // Amulet of glory(3)
    [1704, EquipSlot.AMULET],  // Amulet of power
    [1706, EquipSlot.AMULET],  // Amulet of strength
    [1718, EquipSlot.AMULET],  // Holy symbol
    [1725, EquipSlot.AMULET],  // Amulet of defence

    // Boots (slot 10)
    [4119, EquipSlot.BOOTS],   // Leather boots

    // Gloves (slot 9)
    [1059, EquipSlot.GLOVES],  // Leather gloves

    // Ring (slot 12)
    [2550, EquipSlot.RING],    // Ring of recoil
    [2552, EquipSlot.RING],    // Ring of duelling
]);

// Register OPHELD2 (Wear/Wield) for all equippable items
for (const [objId, slot] of EQUIPMENT_SLOTS) {
    ScriptProvider.register(ServerTriggerType.OPHELD2, objId, (ctx: ScriptContext) => {
        const player = ctx.self as Player;
        const inv = player.invs.get(INV_ID);
        const worn = player.invs.get(WORN_ID);
        if (!inv || !worn) return;

        // check if item is in inventory
        if (!inv.contains(objId)) return;

        // check if slot already occupied, swap if so
        const existing = worn.get(slot);
        inv.remove(objId, 1);

        if (existing) {
            // move old item back to inventory
            inv.add(existing.id, existing.count);
        }

        worn.set(slot, { id: objId, count: 1 });

        // update both inventories
        updateInvFull(player, INV_COMPONENT, inv);
        updateInvFull(player, WORN_COMPONENT, worn);

        // flag appearance update
        player.masks |= PlayerInfoMask.APPEARANCE;
    });
}

console.log(`[Items] ${EQUIPMENT_SLOTS.size} equipment handlers registered`);
