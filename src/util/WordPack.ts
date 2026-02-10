// Simplified chat text utilities.
// The original RS WordPack uses a binary nibble-encoding scheme for chat over
// the RS protocol. Since we use JSON over WebSocket, we don't need binary
// pack/unpack. We keep toSentenceCase for chat formatting and the valid
// character set for input validation.

// prettier-ignore
const VALID_CHARS: string[] = [
    ' ',
    'e', 't', 'a', 'o', 'i', 'h', 'n', 's', 'r', 'd', 'l', 'u', 'm',
    'w', 'c', 'y', 'f', 'g', 'p', 'b', 'v', 'k', 'x', 'j', 'q', 'z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    ' ', '!', '?', '.', ',', ':', ';', '(', ')', '-',
    '&', '*', '\\', '\'', '@', '#', '+', '=', '\u00a3', '$', '%', '"', '[', ']'
];

export function toSentenceCase(input: string): string {
    const chars: string[] = [...input.toLowerCase()];
    let punctuation: boolean = true;
    for (let index: number = 0; index < chars.length; index++) {
        const char: string = chars[index];
        if (punctuation && char >= 'a' && char <= 'z') {
            chars[index] = char.toUpperCase();
            punctuation = false;
        }
        if (char === '.' || char === '!') {
            punctuation = true;
        }
    }
    return chars.join('');
}

export function sanitizeChat(input: string, maxLength: number = 80): string {
    if (input.length > maxLength) {
        input = input.substring(0, maxLength);
    }
    return toSentenceCase(input);
}

export function isValidChatChar(char: string): boolean {
    return VALID_CHARS.includes(char.toLowerCase());
}
