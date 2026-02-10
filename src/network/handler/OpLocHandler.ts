import NetworkPlayer from '#/engine/entity/NetworkPlayer.js';
import World from '#/engine/World.js';
import { ClientMessage, OpLocMessage, OpLocUMessage, OpLocTMessage } from '#/network/ClientMessage.js';
import { MessageHandler, registerHandler } from '#/network/handler/MessageHandler.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';

class OpLocHandler implements MessageHandler {
    handle(player: NetworkPlayer, msg: ClientMessage): void {
        const m = msg as OpLocMessage;
        if (typeof m.x !== 'number' || typeof m.z !== 'number' || typeof m.op !== 'number') return;
        if (m.op < 1 || m.op > 5) return;

        const zone = World.getZone(m.x, m.z, player.level);
        const loc = zone.getLoc(m.x, m.z, m.locId);
        if (!loc) return;

        player.clearInteraction();
        player.closeModal();

        player.target = loc;
        player.targetOp = ServerTriggerType.OPLOC1 + (m.op - 1);
        player.opcalled = true;
    }
}

class OpLocUHandler implements MessageHandler {
    handle(player: NetworkPlayer, msg: ClientMessage): void {
        const m = msg as OpLocUMessage;
        if (typeof m.x !== 'number' || typeof m.z !== 'number') return;

        const zone = World.getZone(m.x, m.z, player.level);
        const loc = zone.getLoc(m.x, m.z, m.locId);
        if (!loc) return;

        player.clearInteraction();
        player.closeModal();

        player.target = loc;
        player.targetOp = ServerTriggerType.OPLOCU;
        player.lastUseItem = m.useObj;
        player.lastUseSlot = m.useSlot;
        player.opcalled = true;
    }
}

class OpLocTHandler implements MessageHandler {
    handle(player: NetworkPlayer, msg: ClientMessage): void {
        const m = msg as OpLocTMessage;
        if (typeof m.x !== 'number' || typeof m.z !== 'number') return;

        const zone = World.getZone(m.x, m.z, player.level);
        const loc = zone.getLoc(m.x, m.z, m.locId);
        if (!loc) return;

        player.clearInteraction();
        player.closeModal();

        player.target = loc;
        player.targetOp = ServerTriggerType.OPLOCT;
        player.lastCom = m.spellComponent;
        player.opcalled = true;
    }
}

registerHandler('op_loc', new OpLocHandler());
registerHandler('op_loc_u', new OpLocUHandler());
registerHandler('op_loc_t', new OpLocTHandler());
