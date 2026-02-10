import ConfigStore from '#/config/ConfigStore.js';

/**
 * Font type — character metrics for text rendering / width calculations.
 * Server uses stringWidth() for chat splitting and interface text fitting.
 * Ref: lostcity-ref cache/config/FontType.ts (177 lines)
 */
export interface FontType {
    id: number;
    debugname?: string;
    charAdvance: number[];       // advance width per character (256 entries)
    height: number;
}

export const FontStore = new ConfigStore<FontType>();

/**
 * Calculate the pixel width of a string in this font.
 * Handles <col> tags by skipping them.
 */
export function stringWidth(font: FontType, str: string): number {
    let width = 0;
    let i = 0;
    while (i < str.length) {
        if (str[i] === '<') {
            // skip tags like <col=ff0000>
            const end = str.indexOf('>', i);
            if (end !== -1) {
                i = end + 1;
                continue;
            }
        }
        const code = str.charCodeAt(i);
        if (code >= 0 && code < 256) {
            width += font.charAdvance[code] ?? 0;
        }
        i++;
    }
    return width;
}

/**
 * Split text into lines that fit within maxWidth pixels.
 */
export function splitLines(font: FontType, str: string, maxWidth: number): string[] {
    const lines: string[] = [];
    const words = str.split(' ');
    let current = '';

    for (const word of words) {
        const test = current.length > 0 ? current + ' ' + word : word;
        if (stringWidth(font, test) > maxWidth && current.length > 0) {
            lines.push(current);
            current = word;
        } else {
            current = test;
        }
    }
    if (current.length > 0) {
        lines.push(current);
    }
    return lines;
}
