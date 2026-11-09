import type { CookieOptions, Response } from 'express';
import { envs, isProduction } from '../config/envs.js';

const sameSite: CookieOptions['sameSite'] = isProduction ? 'none' : 'lax';
const secure = isProduction || envs.COOKIE_SECURE;

const baseOptions: CookieOptions = {
  httpOnly: true,
  secure,
  sameSite,
  path: '/',
  ...(envs.COOKIE_DOMAIN ? { domain: envs.COOKIE_DOMAIN } : {}),
};

const oneDayMs = 24 * 60 * 60 * 1000;

export function setAuthCookies(res: Response, token: string): void {
  res.cookie('revia_at', token, {
    ...baseOptions,
    maxAge: oneDayMs,
  });
  res.cookie('revia_session', '1', {
    ...baseOptions,
    httpOnly: false,
    maxAge: oneDayMs,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie('revia_at', baseOptions);
  res.clearCookie('revia_session', {
    ...baseOptions,
    httpOnly: false,
  });
}

export function oauthStateCookieOptions(): CookieOptions {
  return {
    ...baseOptions,
    maxAge: 10 * 60 * 1000,
    sameSite: 'lax',
  };
}
