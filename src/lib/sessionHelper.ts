/* eslint-disable import/no-extraneous-dependencies */
import { randomBytes } from 'node:crypto';

import { parse as parseCookie, serialize as serializeCookie } from 'cookie';
import { Pool } from 'pg';

export type Role = 'admin' | 'user';

export interface SessionUser {
  id: number;
  username: string;
  role: Role;
}

const COOKIE_NAME = process.env.SID ?? 'sid';
const SESSION_DAYS = Number(process.env.SESSION_DAYS ?? '7');
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;
const isProd = process.env.NODE_ENV === 'developpement';

const b64url = (buf: Buffer) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

const genId = (bytes = 32) => b64url(randomBytes(bytes));

export const parseCookies = (cookieHeader?: string): Record<string, string> => Object.fromEntries(
  Object.entries(parseCookie(cookieHeader ?? '') as Record<string, string | undefined>)
    .filter((e): e is [string, string] => typeof e[1] === 'string'),
);

export function makeSessionCookie(sid: string): string {
  return serializeCookie(COOKIE_NAME, sid, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    maxAge: Math.floor(SESSION_MS / 1000),
  });
}

export function clearSessionCookie(): string {
  return serializeCookie(COOKIE_NAME, '', { path: '/', maxAge: 0 });
}

export async function getSession(pool: Pool, sid?: string | null): Promise<SessionUser | null> {
  if (!sid) return null;
  const q = `
    SELECT u.id, u.username, u.role
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = $1 AND s.expires_at > now()
    LIMIT 1
  `;
  const { rows } = await pool.query<SessionUser>(q, [sid]);
  return rows[0] ?? null;
}

export async function createSession(pool: Pool, userId: number): Promise<{ sid: string }> {
  const sid = genId(32);
  const expiresAt = new Date(Date.now() + SESSION_MS);
  await pool.query(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES ($1,$2,$3)',
    [sid, userId, expiresAt],
  );
  return { sid };
}

export async function destroySession(pool: Pool, sid: string): Promise<void> {
  await pool.query('DELETE FROM sessions WHERE id = $1', [sid]);
}

export const COOKIE = COOKIE_NAME;
