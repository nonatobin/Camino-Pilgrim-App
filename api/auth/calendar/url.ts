import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createOAuthClient } from '../../_lib/oauth';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const client = createOAuthClient(req);
  const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    prompt: 'consent'
  });
  res.json({ url });
}
