import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Client } from '@notionhq/client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.NOTION_API_KEY;
  const dbId = process.env.NOTION_LEADERBOARD_DB_ID;

  if (!apiKey || !dbId) {
    return res.status(500).json({ error: 'Notion integration is not configured.' });
  }

  const notion = new Client({ auth: apiKey });

  try {
    const response = await (notion.databases as any).query({
      database_id: dbId,
      sorts: [
        {
          property: 'Score',
          direction: 'descending',
        },
      ],
    });

    const leaderboard = response.results.map((page: any) => {
      const props = page.properties;
      return {
        id: page.id,
        name: props.Person?.rich_text?.[0]?.plain_text || props.Entry?.title?.[0]?.plain_text || 'Unknown Pilgrim',
        score: props.Score?.number || 0,
        walkPoints: props['Walk Points']?.number || 0,
        breathingPoints: props['Breathing Points']?.number || 0,
        streak: props.Streak?.number || 0,
        lastActivity: props['Last Activity']?.date?.start || '',
        cohort: props.Cohort?.select?.name || '',
        notes: props.Notes?.rich_text?.[0]?.plain_text || '',
      };
    });

    res.json({ leaderboard });
  } catch (error: any) {
    console.error('Notion API Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch leaderboard from Notion' });
  }
}
