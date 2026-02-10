/**
 * Login service message types.
 *
 * These define the communication protocol between the WebSocket server
 * and the login processing system.
 */

// ---- Login request (client → server via WebSocket) ----

export interface LoginRequest {
    username: string;
    password: string;
}

// ---- Login response codes ----

export const enum LoginResponse {
    SUCCESS = 0,
    INVALID_CREDENTIALS = 1,
    ALREADY_LOGGED_IN = 2,
    SERVER_FULL = 3,
    ACCOUNT_BANNED = 4,
    RATE_LIMITED = 5,
    SERVER_ERROR = 6,
}

export function loginResponseText(code: LoginResponse): string {
    switch (code) {
        case LoginResponse.SUCCESS: return 'Login successful';
        case LoginResponse.INVALID_CREDENTIALS: return 'Invalid username or password';
        case LoginResponse.ALREADY_LOGGED_IN: return 'Already logged in';
        case LoginResponse.SERVER_FULL: return 'Server is full';
        case LoginResponse.ACCOUNT_BANNED: return 'Account is banned';
        case LoginResponse.RATE_LIMITED: return 'Too many login attempts';
        case LoginResponse.SERVER_ERROR: return 'Server error';
        default: return 'Unknown error';
    }
}
