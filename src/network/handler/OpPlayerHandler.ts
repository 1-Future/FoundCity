import NetworkPlayer from '#/engine/entity/NetworkPlayer.js';
import World from '#/engine/World.js';
import { ClientMessage, OpPlayerMessage, OpPlayerUMessage, OpPlayerTMessage } from '#/network/ClientMessage.js';
import { MessageHandler, registerHandler } from '#/network/handler/MessageHandler.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';

class OpPlayerHandler implements MessageHandler {
    handle(player: NetworkPlayer, msg: ClientMessage): void {
        const m = msg as OpPlayerMessage;
        if (typeof m.pid !== 'number' || typeof m.op !== 'number') return;
        if (m.op < 1 || m.op > 5) return;

        const target = World.shared.players.get(m.pid);
        if (!target || !target.isActive) return;
        if (target.pid === player.pid) return; // can't interact with self

        player.clearInteraction();
        player.closeModal();

        player.target = target;
        player.targetOp = ServerTriggerType.OPPLAYER1 + (m.op - 1);
        player.opcalled = true;
    }
}

class OpPlayerUHandler implements MessageHandler {
    handle(player: NetworkPlayer, msg: ClientMessage): void {
        const m = msg as OpPlayerUMessage;
        if (typeof m.pid !== 'number') return;

        const target = World.shared.players.get(m.pid);
        if (!target || !target.isActive) return;
        if (target.pid === player.pid) return;

        player.clearInteraction();
        player.closeModal();

        player.target = target;
        player.targetOp = ServerTriggerType.OPPLAYERU;
        player.lastUseItem = m.useObj;
        player.lastUseSlot = m.useSlot;
        player.opcalled = true;
    }
}

class OpPlayerTHandler implements MessageHandler {
    handle(player: NetworkPlayer, msg: ClientMessage): void {
        const m = msg as OpPlayerTMessage;
        if (typeof m.pid !== 'number') return;

        const target = World.shared.players.get(m.pid);
        if (!target || !target.isActive) return;
        if (target.pid === player.pid) return;

        player.clearInteraction();
        player.closeModal();

        player.target = target;
        player.targetOp = ServerTriggerType.OPPLAYERT;
        player.lastCom = m.spellComponent;
        player.opcalled = true;
    }
}

registerHandler('op_player', new OpPlayerHandler());
registerHandler('op_player_u', new OpPlayerUHandler());
registerHandler('op_player_t', new OpPlayerTHandler());
