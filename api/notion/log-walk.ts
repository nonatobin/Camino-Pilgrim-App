import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Client } from '@notionhq/client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.NOTION_API_KEY;
  const dbId = process.env.NOTION_LEADERBOARD_DB_ID;

  if (!apiKey || !dbId) {
    return res.status(500).json({ error: 'Notion integration is not configured.' });
  }

  const notion = new Client({ auth: apiKey });
  const { userName, distance, speed, duration, type, date, avatar } = req.body;

  try {
    await notion.pages.create({
      parent: { database_id: dbId },
      properties: {
        Name: {
          title: [
            {
              text: { content: userName || 'Pilgrim' },
            },
          ],
        },
        Distance: {
          number: distance || 0,
        },
        Speed: {
          number: speed || 0,
        },
        Duration: {
          number: duration || 0,
        },
        Date: {
          date: { start: date || new Date().toISOString().split('T')[0] },
        },
        Type: {
          select: { name: type || 'manual' },
        },
        Avatar: {
          rich_text: [
            {
              text: { content: avatar || '👤' },
            },
          ],
        },
      },
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Notion API Error:', error.message);
    res.status(500).json({ error: 'Failed to log walk to Notion' });
  }
}
