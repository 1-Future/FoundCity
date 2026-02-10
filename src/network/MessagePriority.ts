// Priority levels for outgoing server messages.
// BUFFERED messages are counted toward the buffer-full limit.
// IMMEDIATE messages are always sent regardless of buffer state.
export const enum MessagePriority {
    BUFFERED,
    IMMEDIATE
}
