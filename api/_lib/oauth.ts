/**
 * Shared OAuth helper for Vercel serverless functions.
 *
 * Automatically resolves the correct redirect URI based on:
 *   1. APP_URL env var (if explicitly set — most reliable for production)
 *   2. VERCEL_URL env var (auto-set by Vercel on every deployment)
 *   3. The request's Origin / Host header (fallback)
 *   4. localhost:5173 (last-resort dev default)
 *
 * This means you NEVER have to manually swap URLs between dev and prod.
 *
 * Usage in any /api route:
 *   import { createOAuthClient, getRedirectUri } from '../_lib/oauth';
 *   const client = createOAuthClient(req);
 */

import type { VercelRequest } from '@vercel/node';
import { OAuth2Client } from 'google-auth-library';

const CALLBACK_PATH = '/api/auth/calendar/callback';

/**
 * Resolve the base URL of the running app, in priority order.
 */
export function getAppBaseUrl(req?: VercelRequest): string {
    // 1. Explicit APP_URL — user controls this, highest priority
  if (process.env.APP_URL) {
        return process.env.APP_URL.replace(/\/$/, '');
  }

  // 2. VERCEL_URL — auto-injected by Vercel (does NOT include protocol)
  if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
  }

  // 3. Infer from the incoming request headers
  if (req) {
        const origin = req.headers.origin;
        if (origin) return origin.replace(/\/$/, '');

      const host = req.headers.host;
        if (host) {
                const protocol = host.includes('localhost') ? 'http' : 'https';
                return `${protocol}://${host}`;
        }
  }

  // 4. Last-resort default for local dev
  return 'http://localhost:5173';
}

export function getRedirectUri(req?: VercelRequest): string {
    return `${getAppBaseUrl(req)}${CALLBACK_PATH}`;
}

export function createOAuthClient(req?: VercelRequest) {
    return new OAuth2Client(
          process.env.GOOGLE_CALENDAR_CLIENT_ID,
          process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
          getRedirectUri(req)
        );
}
