import NetworkPlayer from '#/engine/entity/NetworkPlayer.js';
import { ClientMessage, MoveClickMessage } from '#/network/ClientMessage.js';
import { MessageHandler, registerHandler } from '#/network/handler/MessageHandler.js';

class MoveClickHandler implements MessageHandler {
    handle(player: NetworkPlayer, msg: ClientMessage): void {
        const m = msg as MoveClickMessage;
        if (typeof m.x !== 'number' || typeof m.z !== 'number') return;

        player.clearInteraction();
        player.closeModal();

        player.userPath = [m.x, m.z];
        player.queueWaypoint(m.x, m.z);
    }
}

registerHandler('move_click', new MoveClickHandler());
