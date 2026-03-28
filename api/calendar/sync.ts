import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { events, tokens } = req.body;
  if (!tokens) return res.status(401).json({ error: "Not authenticated with Calendar" });

  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CALENDAR_CLIENT_ID,
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    `${process.env.APP_URL || ''}/api/auth/calendar/callback`
  );
  client.setCredentials(tokens);
  const calendar = google.calendar({ version: 'v3', auth: client });

  try {
    for (const event of events) {
      await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: event.summary,
          description: 'Camino Pilgrim Training Walk',
          start: { dateTime: event.start },
          end: { dateTime: event.end },
          reminders: {
            useDefault: false,
            overrides: [{ method: 'popup', minutes: 10 }]
          }
        }
      });
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error("Calendar sync error:", error);
    const message = error?.response?.data?.error?.message || "Sync failed";
    res.status(500).json({ error: message });
  }
}
