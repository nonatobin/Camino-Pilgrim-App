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
          property: 'Distance',
          direction: 'descending',
        },
      ],
    });

    const leaderboard = response.results.map((page: any) => {
      const props = page.properties;
      return {
        id: page.id,
        name: props.Name?.title?.[0]?.plain_text || 'Unknown Pilgrim',
        distance: props.Distance?.number || 0,
        speed: props.Speed?.number || 0,
        duration: props.Duration?.number || 0,
        date: props.Date?.date?.start || '',
        type: props.Type?.select?.name || 'manual',
        avatar: props.Avatar?.rich_text?.[0]?.plain_text || '👤',
      };
    });

    res.json({ leaderboard });
  } catch (error: any) {
    console.error('Notion API Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch leaderboard from Notion' });
  }
}
