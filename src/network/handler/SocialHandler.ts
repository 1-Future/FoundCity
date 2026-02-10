import NetworkPlayer from '#/engine/entity/NetworkPlayer.js';
import { ClientMessage, FriendListAddMessage, FriendListDelMessage, IgnoreListAddMessage, IgnoreListDelMessage } from '#/network/ClientMessage.js';
import { MessageHandler, registerHandler } from '#/network/handler/MessageHandler.js';
import { toBase37 } from '#/util/JString.js';

class FriendListAddHandler implements MessageHandler {
    handle(player: NetworkPlayer, msg: ClientMessage): void {
        const m = msg as FriendListAddMessage;
        if (!m.username || typeof m.username !== 'string') return;
        if (player.socialProtect) return;

        const hash = toBase37(m.username.toLowerCase());
        if (hash === 0n) return;
        if (hash === player.hash64) return; // can't add self

        // max 200 friends
        if (player.friendList.length >= 200) return;
        if (player.friendList.includes(hash)) return;

        player.friendList.push(hash);
        player.socialProtect = true;
    }
}

class FriendListDelHandler implements MessageHandler {
    handle(player: NetworkPlayer, msg: ClientMessage): void {
        const m = msg as FriendListDelMessage;
        if (!m.username || typeof m.username !== 'string') return;
        if (player.socialProtect) return;

        const hash = toBase37(m.username.toLowerCase());
        if (hash === 0n) return;

        const index = player.friendList.indexOf(hash);
        if (index !== -1) {
            player.friendList.splice(index, 1);
        }
        player.socialProtect = true;
    }
}

class IgnoreListAddHandler implements MessageHandler {
    handle(player: NetworkPlayer, msg: ClientMessage): void {
        const m = msg as IgnoreListAddMessage;
        if (!m.username || typeof m.username !== 'string') return;
        if (player.socialProtect) return;

        const hash = toBase37(m.username.toLowerCase());
        if (hash === 0n) return;
        if (hash === player.hash64) return; // can't ignore self

        // max 100 ignores
        if (player.ignoreList.length >= 100) return;
        if (player.ignoreList.includes(hash)) return;

        player.ignoreList.push(hash);
        player.socialProtect = true;
    }
}

class IgnoreListDelHandler implements MessageHandler {
    handle(player: NetworkPlayer, msg: ClientMessage): void {
        const m = msg as IgnoreListDelMessage;
        if (!m.username || typeof m.username !== 'string') return;
        if (player.socialProtect) return;

        const hash = toBase37(m.username.toLowerCase());
        if (hash === 0n) return;

        const index = player.ignoreList.indexOf(hash);
        if (index !== -1) {
            player.ignoreList.splice(index, 1);
        }
        player.socialProtect = true;
    }
}

registerHandler('friend_list_add', new FriendListAddHandler());
registerHandler('friend_list_del', new FriendListDelHandler());
registerHandler('ignore_list_add', new IgnoreListAddHandler());
registerHandler('ignore_list_del', new IgnoreListDelHandler());
