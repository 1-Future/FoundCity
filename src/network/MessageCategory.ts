// Rate-limiting categories for incoming client messages.
// Limits how many messages per category are processed each tick.
export const enum MessageCategory {
    // general client events (camera, idle, tracking, etc.)
    CLIENT_EVENT,
    // user-initiated gameplay actions (move, interact, chat, etc.)
    USER_EVENT,
    // flood-restricted events (report abuse, etc.)
    RESTRICTED_EVENT
}

// messages processed per tick per category
export const MessageCategoryLimit: Record<number, number> = {
    [MessageCategory.CLIENT_EVENT]: 20,
    [MessageCategory.USER_EVENT]: 5,
    [MessageCategory.RESTRICTED_EVENT]: 2
};
