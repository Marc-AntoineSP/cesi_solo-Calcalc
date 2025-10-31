/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable max-len */
import { randomBytes } from 'node:crypto';

import { parse as parseCookie, serialize as serializeCookie } from 'cookie';
import { Pool } from 'pg';

import type { Role } from './types.js';

export interface dbSession {
    id:string;
    userId:number;
    data: {
        csrf:string;
        flash?: string;
    };
    created_at: Date;
    updated_at: Date;
    expires_at: Date;
    u_id: number;
    u_name: string;
    u_role: Role;
}

export interface Session {
    id:string;
    data:NonNullable<dbSession['data']>;
    user: {
        id:number;
        username:string;
        role:Role;
    };
    expiresAt: Date;
}

const COOKIE_NAME = process.env.SID;
const SESSION_DAYS = Number(process.env.SESSION_DAYS);
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

const base64url = (buf:Buffer) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

export const generateSessionId = (b = 32):string => base64url(randomBytes(b));

export const parseCookies = (cookieHeader?: string): Record<string, string> => Object.fromEntries(
  Object.entries(
    (parseCookie(cookieHeader ?? '') as Record<string, string | undefined>),
  ).filter((e): e is [string, string] => typeof e[1] === 'string'),
);

export const makeSession = async (pool: Pool) => {
  async function getSession(sessionId?: string | null): Promise<Session | null> {
    if (!sessionId) return null;

    const q = `
    SELECT
      s.id, s.user_id AS "userId", s.data, s.created_at, s.updated_at, s.expires_at,
      u.id AS u_id, u.username AS u_name, u.role AS u_role
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = $1 AND s.expires_at > now()
    LIMIT 1
  `;

    const { rows } = await pool.query<dbSession>(q, [sessionId]);
    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      data: (row.data ?? { csrf: generateSessionId(16), flash: null }) as Session['data'],
      user: { id: row.u_id, username: row.u_name, role: row.u_role },
      expiresAt: row.expires_at,
    };
  }

  async function destroySession(sid: string): Promise<void> {
    await pool.query('DELETE FROM sessions WHERE id = $1', [sid]);
  }

  async function createSession(sessionParam : {userId:number}): Promise<{sid:string; csrf:string; expiresAt:Date}> {
    const sid = generateSessionId(32);
    const csrf = generateSessionId(16);
    const expiresAt = new Date(Date.now() + SESSION_MS);
    const data = { csrf, flash: null };
    await pool.query(`
            INSERT INTO sessions (id, user_id, data, expires_at)
            VALUES ($1, $2, $3, $4)
        `, [sid, sessionParam.userId, JSON.stringify(data), expiresAt]);
    return { sid, csrf, expiresAt };
  }

  function getCsrfFromSession(sess: Session | null): string | null {
    return sess?.data?.csrf ?? null;
  }

  function validateCsrf(options : {sess: Session | null, token: string | null | undefined, csrfCookie: string | undefined | null}): boolean {
    const sessionCsrf = options.sess?.data?.csrf ?? null;
    const token = options.token ?? null;
    const csrfCookie = options.csrfCookie ?? null;
    return Boolean(sessionCsrf && token && csrfCookie && sessionCsrf === token && sessionCsrf === csrfCookie);
  }

  async function saveSessionData(sid: string, data: Session['data']): Promise<void> {
    await pool.query('UPDATE sessions SET data = $2 WHERE id = $1', [sid, JSON.stringify(data)]);
  }

  return {
    COOKIE_NAME,
    SESSION_MS,
    serializeCookie,
    getSession,
    destroySession,
    createSession,
    saveSessionData,
    getCsrfFromSession,
    validateCsrf,
  };
};
