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
  const { userName, walkPoints, breathingPoints, cohort, date, notes } = req.body;

  // Valid cohort options
  const validCohorts = ['Baiona Apr 30 start', 'June starters', 'BETA Only'];
  const notionCohort = validCohorts.includes(cohort) ? cohort : 'BETA Only';

  try {
    await notion.pages.create({
      parent: { database_id: dbId },
      properties: {
        'Entry': {
          title: [
            {
              text: { content: userName || 'Pilgrim' },
            },
          ],
        },
        'Person': {
          rich_text: [
            {
              text: { content: userName || 'Pilgrim' },
            },
          ],
        },
        'Walk Points': {
          number: walkPoints || 1,
        },
        'Breathing Points': {
          number: breathingPoints || 0,
        },
        'Score': {
          number: (walkPoints || 1) + (breathingPoints || 0),
        },
        'Streak': {
          number: 1,
        },
        'Last Activity': {
          date: { start: date || new Date().toISOString().split('T')[0] },
        },
        'Cohort': {
          select: { name: notionCohort },
        },
        'Notes': {
          rich_text: [
            {
              text: { content: notes || '' },
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
