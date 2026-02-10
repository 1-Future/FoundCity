/**
 * Database type definitions.
 *
 * Simplified from lostcity-ref — no Kysely, no MySQL.
 * Uses plain interfaces for SQLite table schemas.
 */

export interface AccountRow {
    id: number;
    username: string;
    password: string; // bcrypt hash
    email: string;
    staffModLevel: number;
    bannedUntil: number | null; // unix timestamp or null
    mutedUntil: number | null;
    createdAt: number;
}

export interface AccountLoginRow {
    accountId: number;
    profile: string;
    world: number;
    loggedIn: number; // 0 = no, node ID = yes
    lastLoginTime: number;
    lastLogoutTime: number;
}

export interface SessionRow {
    uuid: string;
    accountId: number;
    profile: string;
    world: number;
    ip: string;
    createdAt: number;
}

export interface FriendRow {
    accountId: number;
    friendAccountId: number;
    profile: string;
}

export interface IgnoreRow {
    accountId: number;
    ignoredUsername: string;
    profile: string;
}

export interface AccountSessionRow {
    accountId: number;
    world: number;
    profile: string;
    sessionUuid: string;
    timestamp: number;
    coord: number;
    event: string;
    eventType: number;
}

export interface WealthEventRow {
    id: number;
    world: number;
    profile: string;
    timestamp: number;
    eventType: number;
    senderAccountId: number;
    senderItems: string; // JSON
    senderValue: number;
    recipientAccountId: number | null;
    recipientItems: string | null;
    recipientValue: number | null;
}

export interface ReportRow {
    id: number;
    reporterAccountId: number;
    offenderAccountId: number;
    reason: number;
    coord: number;
    timestamp: number;
}

export interface IpBanRow {
    ip: string;
    bannedAt: number;
    reason: string;
}
