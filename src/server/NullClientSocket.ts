/**
 * Null WebSocket for bots/testing. Does not send or receive data.
 *
 * Implements the minimum WebSocket interface needed by NetworkPlayer.
 */

export const enum ReadyState {
    CONNECTING = 0,
    OPEN = 1,
    CLOSING = 2,
    CLOSED = 3,
}

export class NullClientSocket {
    readyState: number = ReadyState.CLOSED;

    send(_data: string | Buffer): void {
        // no-op
    }

    close(): void {
        this.readyState = ReadyState.CLOSED;
    }
}
