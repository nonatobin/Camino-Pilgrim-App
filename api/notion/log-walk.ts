import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * POST /api/notion/log-walk
 *
 * Accepts training walk data from ActiveTracking (distance, duration, pace)
 * and logs it to the Notion Leaderboard database with computed walk points.
 *
 * Walk points formula: 1 point per 0.5 miles walked (minimum 1 point).
 * Notes field captures the full training summary (time, distance, pace).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.NOTION_API_KEY;
  const dbId = process.env.NOTION_LEADERBOARD_DB_ID;

  if (!apiKey || !dbId) {
    return res.status(500).json({ error: 'Notion integration is not configured.' });
  }

  const {
    userName,
    date,
    distance,      // miles (number)
    speed,         // mph (number)
    duration,      // seconds (number)
    startTime,     // ISO string
    endTime,       // ISO string
    walkPoints,    // optional override
    breathingPoints,
    cohort,
    notes,
  } = req.body;

  // Compute walk points from distance: 1 point per 0.5 miles, minimum 1
  const computedWalkPoints = walkPoints || Math.max(1, Math.round((distance || 0) / 0.5));
  const bPoints = breathingPoints || 0;
  const totalScore = computedWalkPoints + bPoints;

  // Format duration for human-readable notes
  const durationSec = duration || 0;
  const hours = Math.floor(durationSec / 3600);
  const minutes = Math.floor((durationSec % 3600) / 60);
  const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  const distStr = (distance || 0).toFixed(2);
  const paceStr = (speed || 0).toFixed(1);

  // Build training summary for notes
  const trainingNotes = notes || `Walk: ${distStr} mi in ${timeStr} | Pace: ${paceStr} mph | Start: ${startTime || 'N/A'} | End: ${endTime || 'N/A'}`;

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
                text: { content: `${userName || 'Pilgrim'} — ${distStr} mi (${timeStr})` },
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
            number: computedWalkPoints,
          },
          'Breathing Points': {
            number: bPoints,
          },
          'Score': {
            number: totalScore,
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
                text: { content: trainingNotes },
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

    res.json({ success: true, walkPoints: computedWalkPoints, totalScore });
  } catch (error: any) {
    console.error('Notion API Error:', error.message);
    res.status(500).json({ error: 'Failed to log walk to Notion' });
  }
}
