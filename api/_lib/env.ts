/**
 * Shared environment loader for Vercel serverless functions.
 *
 * Vercel dashboard env vars take priority (they're already in process.env).
 * This file provides a fallback by loading the .env file from the repo root
 * for any vars that aren't already set — useful during beta when dashboard
 * env vars might not be configured yet.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}
