import NetworkPlayer from '#/engine/entity/NetworkPlayer.js';
import World from '#/engine/World.js';
import { ClientMessage, OpObjMessage, OpObjUMessage, OpObjTMessage } from '#/network/ClientMessage.js';
import { MessageHandler, registerHandler } from '#/network/handler/MessageHandler.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';

class OpObjHandler implements MessageHandler {
    handle(player: NetworkPlayer, msg: ClientMessage): void {
        const m = msg as OpObjMessage;
        if (typeof m.x !== 'number' || typeof m.z !== 'number' || typeof m.op !== 'number') return;
        if (m.op < 1 || m.op > 5) return;

        const zone = World.getZone(m.x, m.z, player.level);
        const obj = zone.getObj(m.x, m.z, m.objId, player.hash64);
        if (!obj) return;

        player.clearInteraction();
        player.closeModal();

        player.target = obj;
        player.targetOp = ServerTriggerType.OPOBJ1 + (m.op - 1);
        player.opcalled = true;
    }
}

class OpObjUHandler implements MessageHandler {
    handle(player: NetworkPlayer, msg: ClientMessage): void {
        const m = msg as OpObjUMessage;
        if (typeof m.x !== 'number' || typeof m.z !== 'number') return;

        const zone = World.getZone(m.x, m.z, player.level);
        const obj = zone.getObj(m.x, m.z, m.objId, player.hash64);
        if (!obj) return;

        player.clearInteraction();
        player.closeModal();

        player.target = obj;
        player.targetOp = ServerTriggerType.OPOBJU;
        player.lastUseItem = m.useObj;
        player.lastUseSlot = m.useSlot;
        player.opcalled = true;
    }
}

class OpObjTHandler implements MessageHandler {
    handle(player: NetworkPlayer, msg: ClientMessage): void {
        const m = msg as OpObjTMessage;
        if (typeof m.x !== 'number' || typeof m.z !== 'number') return;

        const zone = World.getZone(m.x, m.z, player.level);
        const obj = zone.getObj(m.x, m.z, m.objId, player.hash64);
        if (!obj) return;

        player.clearInteraction();
        player.closeModal();

        player.target = obj;
        player.targetOp = ServerTriggerType.OPOBJT;
        player.lastCom = m.spellComponent;
        player.opcalled = true;
    }
}

registerHandler('op_obj', new OpObjHandler());
registerHandler('op_obj_u', new OpObjUHandler());
registerHandler('op_obj_t', new OpObjTHandler());
