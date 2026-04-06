import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.NOTION_API_KEY;
  const dbId = process.env.NOTION_LEADERBOARD_DB_ID;

  if (!apiKey || !dbId) {
    return res.status(500).json({ error: 'Notion integration is not configured.' });
  }

  const { userName, walkPoints, breathingPoints, cohort, date, notes } = req.body;

  // Valid cohort options
  const validCohorts = ['Baiona Apr 30 start', 'June starters', 'BETA Only'];
  const notionCohort = validCohorts.includes(cohort) ? cohort : 'BETA Only';

  try {
    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Notion API Error:', response.status, errorData);
      return res.status(500).json({ error: 'Failed to log walk to Notion' });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Notion API Error:', error.message);
    res.status(500).json({ error: 'Failed to log walk to Notion' });
  }
}
