import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.NOTION_API_KEY;
  const dbId = process.env.NOTION_BUG_REPORTS_DB_ID;

  if (!apiKey || !dbId) {
    return res.status(500).json({ error: 'Bug DB integration is not configured.' });
  }

  const { title, description, severity, reporter, environment, stepsToReproduce, screenshotBase64 } = req.body;

  let uploadedImageUrl = null;

  if (screenshotBase64) {
    try {
      const base64Data = screenshotBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const blob = new Blob([buffer], { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('file', blob, 'screenshot.jpg');

      const uploadRes = await fetch('https://file.io/?expires=14d', {
        method: 'POST',
        body: formData
      });

      const ioData = await uploadRes.json();
      if (ioData.success) {
        uploadedImageUrl = ioData.link;
      }
    } catch (e: any) {
      console.warn('Screenshot upload proxy failed:', e.message);
    }
  }

  try {
    // Map severity to Notion's "How Bad Is It?" options
    const severityMap: Record<string, string> = {
      'Critical': 'Showstopper — I cannot use the app',
      'Major': 'Annoying — it works but something is off',
      'Minor': 'Minor — small cosmetic issue',
    };
    const notionSeverity = severityMap[severity] || 'Minor — small cosmetic issue';

    // Map environment to Notion's "Your Device" options
    const deviceMap: Record<string, string> = {
      'Web': 'Other',
      'iOS': 'iPhone',
      'Android': 'Android Phone',
      'iPad': 'iPad / Tablet',
      'Windows': 'Computer (Windows)',
      'Mac': 'Computer (Mac)',
    };
    const notionDevice = deviceMap[environment] || 'Other';

    const notionHeaders = {
      'Authorization': `Bearer ${apiKey}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    };

    const pageResponse = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: notionHeaders,
      body: JSON.stringify({
        parent: { database_id: dbId },
        properties: {
          'Bug Report': {
            title: [{ text: { content: title || 'New Bug' } }],
          },
          'Status': {
            select: { name: 'New' },
          },
          'How Bad Is It?': {
            select: { name: notionSeverity },
          },
          'What Happened?': {
            rich_text: [{ text: { content: description || '' } }],
          },
          'Your Device': {
            select: { name: notionDevice },
          },
          'Your Name': {
            rich_text: [{ text: { content: reporter || 'Unknown' } }],
          },
          'Steps to Reproduce': {
            rich_text: [{ text: { content: stepsToReproduce || '' } }],
          },
          'Date Reported': {
            date: { start: new Date().toISOString().split('T')[0] },
          },
        },
      }),
    });

    if (!pageResponse.ok) {
      const errorData = await pageResponse.text();
      console.error('Notion API Error (Bug):', pageResponse.status, errorData);
      return res.status(500).json({ error: 'Failed to log bug to Notion' });
    }

    const pageData = await pageResponse.json();

    if (uploadedImageUrl) {
      try {
        await fetch(`https://api.notion.com/v1/blocks/${pageData.id}/children`, {
          method: 'PATCH',
          headers: notionHeaders,
          body: JSON.stringify({
            children: [
              {
                object: 'block',
                type: 'heading_3',
                heading_3: {
                  rich_text: [{ type: 'text', text: { content: 'Attached Screenshot' } }]
                }
              },
              {
                object: 'block',
                type: 'image',
                image: {
                  type: 'external',
                  external: { url: uploadedImageUrl }
                }
              }
            ]
          }),
        });
      } catch (e: any) {
         console.warn('Failed to append image block to Notion:', e.message);
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Notion API Error (Bug):', error.message);
    res.status(500).json({ error: 'Failed to log bug to Notion' });
  }
}
