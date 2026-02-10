export function tryParseBoolean(value: unknown, defaultValue: boolean): boolean {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        return value === 'true' || value === 'yes' || value === '1';
    }
    return defaultValue;
}

export function tryParseInt(value: unknown, defaultValue: number): number {
    if (typeof value === 'number') {
        return Math.trunc(value);
    }
    if (typeof value === 'string') {
        const parsed: number = parseInt(value);
        if (!isNaN(parsed)) {
            return parsed;
        }
    }
    return defaultValue;
}

export function tryParseString(value: unknown, defaultValue: string): string {
    if (typeof value === 'string' && value.length > 0) {
        return value;
    }
    return defaultValue;
}

export function tryParseArray<T>(value: unknown, defaultValue: T[]): T[] {
    if (Array.isArray(value)) {
        return value as T[];
    }
    return defaultValue;
}
