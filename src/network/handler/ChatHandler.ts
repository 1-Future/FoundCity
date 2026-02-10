import NetworkPlayer from '#/engine/entity/NetworkPlayer.js';
import { PlayerInfoMask } from '#/engine/entity/Player.js';
import { ClientMessage, MessagePublicMessage, MessagePrivateMessage, ChatSetModeMessage } from '#/network/ClientMessage.js';
import { MessageHandler, registerHandler } from '#/network/handler/MessageHandler.js';
import World from '#/engine/World.js';
import { sanitizeChat } from '#/util/WordPack.js';

class MessagePublicHandler implements MessageHandler {
    handle(player: NetworkPlayer, msg: ClientMessage): void {
        const m = msg as MessagePublicMessage;
        if (!m.text || typeof m.text !== 'string') return;

        const text = sanitizeChat(m.text);
        if (text.length === 0 || text.length > 80) return;

        player.chat = text;
        player.masks |= PlayerInfoMask.CHAT;
    }
}

class MessagePrivateHandler implements MessageHandler {
    handle(player: NetworkPlayer, msg: ClientMessage): void {
        const m = msg as MessagePrivateMessage;
        if (!m.target || !m.text) return;

        const text = sanitizeChat(m.text);
        if (text.length === 0 || text.length > 80) return;

        const target = World.getPlayerByHash64(BigInt(m.target.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0)));
        if (!target) {
            player.write({ type: 'message_game', text: 'That player is not online.' });
            return;
        }

        target.write({
            type: 'message_private',
            from: player.username,
            text,
            staffModLevel: player.staffModLevel,
        });
    }
}

class ChatSetModeHandler implements MessageHandler {
    handle(_player: NetworkPlayer, _msg: ClientMessage): void {
        // store chat modes on player if needed
    }
}

registerHandler('message_public', new MessagePublicHandler());
registerHandler('message_private', new MessagePrivateHandler());
registerHandler('chat_set_mode', new ChatSetModeHandler());
