import NetworkPlayer from '#/engine/entity/NetworkPlayer.js';
import { ClientMessage } from '#/network/ClientMessage.js';

/**
 * Handler for a specific client message type.
 * Each handler validates the message and queues appropriate game actions.
 */
export interface MessageHandler {
    handle(player: NetworkPlayer, msg: ClientMessage): void;
}

/**
 * Registry of all message handlers, keyed by message type string.
 */
const handlers: Map<string, MessageHandler> = new Map();

export function registerHandler(type: string, handler: MessageHandler): void {
    handlers.set(type, handler);
}

export function getHandler(type: string): MessageHandler | undefined {
    return handlers.get(type);
}

export function handleClientMessage(player: NetworkPlayer, msg: ClientMessage): void {
    const handler = handlers.get(msg.type);
    if (handler) {
        handler.handle(player, msg);
    }
}
