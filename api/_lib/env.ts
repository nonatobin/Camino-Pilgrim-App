/**
 * Shared environment loader for Vercel serverless functions.
 *
 * Vercel dashboard env vars take priority (they're already in process.env).
 * This file provides a fallback by loading the .env file from the repo root
 * for any vars that aren't already set — useful during beta when dashboard
 * env vars might not be configured yet.
 *
 * Uses plain fs/path (no dotenv dependency) to avoid bundling issues.
 */
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

try {
  const envPath = resolve(process.cwd(), '.env');
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      // Strip surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      // Only set if not already defined (Vercel dashboard takes priority)
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
} catch (e) {
  // Silently ignore — env vars may already be set via Vercel dashboard
}
