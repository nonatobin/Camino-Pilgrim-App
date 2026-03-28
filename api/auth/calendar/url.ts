import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CALENDAR_CLIENT_ID,
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    `${process.env.APP_URL || req.headers.origin || ''}/api/auth/calendar/callback`
  );
  const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    prompt: 'consent'
  });
  res.json({ url });
}
