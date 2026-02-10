import NetworkPlayer from '#/engine/entity/NetworkPlayer.js';
import { NpcMode } from '#/engine/entity/NpcMode.js';
import World from '#/engine/World.js';
import { ClientMessage, OpNpcMessage, OpNpcUMessage, OpNpcTMessage } from '#/network/ClientMessage.js';
import { MessageHandler, registerHandler } from '#/network/handler/MessageHandler.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';

class OpNpcHandler implements MessageHandler {
    handle(player: NetworkPlayer, msg: ClientMessage): void {
        const m = msg as OpNpcMessage;
        if (typeof m.nid !== 'number' || typeof m.op !== 'number') return;
        if (m.op < 1 || m.op > 5) return;

        const npc = World.shared.npcs.get(m.nid);
        if (!npc || !npc.isActive) return;

        player.clearInteraction();
        player.closeModal();

        // map op 1-5 to NpcMode OPNPC1-5 and ServerTriggerType
        player.target = npc;
        player.targetOp = ServerTriggerType.OPNPC1 + (m.op - 1);
        player.opcalled = true;
    }
}

class OpNpcUHandler implements MessageHandler {
    handle(player: NetworkPlayer, msg: ClientMessage): void {
        const m = msg as OpNpcUMessage;
        if (typeof m.nid !== 'number') return;

        const npc = World.shared.npcs.get(m.nid);
        if (!npc || !npc.isActive) return;

        player.clearInteraction();
        player.closeModal();

        player.target = npc;
        player.targetOp = ServerTriggerType.OPNPCU;
        player.lastUseItem = m.useObj;
        player.lastUseSlot = m.useSlot;
        player.opcalled = true;
    }
}

class OpNpcTHandler implements MessageHandler {
    handle(player: NetworkPlayer, msg: ClientMessage): void {
        const m = msg as OpNpcTMessage;
        if (typeof m.nid !== 'number') return;

        const npc = World.shared.npcs.get(m.nid);
        if (!npc || !npc.isActive) return;

        player.clearInteraction();
        player.closeModal();

        player.target = npc;
        player.targetOp = ServerTriggerType.OPNPCT;
        player.lastCom = m.spellComponent;
        player.opcalled = true;
    }
}

registerHandler('op_npc', new OpNpcHandler());
registerHandler('op_npc_u', new OpNpcUHandler());
registerHandler('op_npc_t', new OpNpcTHandler());
