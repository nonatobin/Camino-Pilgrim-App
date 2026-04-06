import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Client } from '@notionhq/client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.NOTION_API_KEY;
  const dbId = process.env.NOTION_BUG_REPORTS_DB_ID;

  if (!apiKey || !dbId) {
    return res.status(500).json({ error: 'Bug DB integration is not configured.' });
  }

  const notion = new Client({ auth: apiKey });
  const { title, description, severity, reporter, environment, screenshotBase64 } = req.body;

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
    const pageResponse = await notion.pages.create({
      parent: { database_id: dbId },
      properties: {
        Title: {
          title: [{ text: { content: title || 'New Bug' } }],
        },
        Status: {
          status: { name: 'New' },
        },
        Severity: {
          select: { name: severity || 'Minor' },
        },
        Description: {
          rich_text: [{ text: { content: description || '' } }],
        },
        Environment: {
          select: { name: environment || 'Web' },
        },
        Reporter: {
          rich_text: [{ text: { content: reporter || 'Unknown' } }],
        },
      },
    });

    if (uploadedImageUrl) {
      try {
        await notion.blocks.children.append({
          block_id: pageResponse.id,
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
