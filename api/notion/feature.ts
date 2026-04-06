import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Client } from '@notionhq/client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.NOTION_API_KEY;
  const dbId = process.env.NOTION_FEATURE_SUGGESTIONS_DB_ID;

  if (!apiKey || !dbId) {
    return res.status(500).json({ error: 'Feature DB integration is not configured.' });
  }

  const notion = new Client({ auth: apiKey });
  const { title, description, priority, reporter, appArea, screenshotBase64 } = req.body;

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
    // Map priority to Notion's "How Important Is This to You?" options
    const priorityMap: Record<string, string> = {
      'P1': 'Must Have — I really need this',
      'P2': 'Nice to Have — would improve my experience',
      'P3': 'Just a Thought — take it or leave it',
      'High': 'Must Have — I really need this',
      'Medium': 'Nice to Have — would improve my experience',
      'Low': 'Just a Thought — take it or leave it',
    };
    const notionPriority = priorityMap[priority] || 'Nice to Have — would improve my experience';

    // Valid app area options
    const validAreas = ['Dashboard', 'Training Plan', 'Walk Timer', 'Route Map', 'Leaderboard', 'Badges', 'Settings', 'Something New'];
    const notionArea = validAreas.includes(appArea) ? appArea : 'Something New';

    const pageResponse = await notion.pages.create({
      parent: { database_id: dbId },
      properties: {
        'Feature Idea': {
          title: [{ text: { content: title || 'New Feature' } }],
        },
        'Status': {
          select: { name: 'Under Review' },
        },
        'How Important Is This to You?': {
          select: { name: notionPriority },
        },
        'Describe Your Idea': {
          rich_text: [{ text: { content: description || '' } }],
        },
        'Your Name': {
          rich_text: [{ text: { content: reporter || 'Unknown' } }],
        },
        'Which Part of the App?': {
          select: { name: notionArea },
        },
        'Date Submitted': {
          date: { start: new Date().toISOString().split('T')[0] },
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
    console.error('Notion API Error (Feature):', error.message);
    res.status(500).json({ error: 'Failed to log feature to Notion' });
  }
}
