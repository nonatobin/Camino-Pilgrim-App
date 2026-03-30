import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * POST /api/tts
 *
 * Server-side ElevenLabs text-to-speech proxy.
 * Keeps the API key on the server — never exposed to the client.
 *
 * Body: { text: string, voiceId?: string, modelId?: string }
 * Returns: audio/mpeg stream
 *
 * Environment variables (checked in priority order):
 *   API key:  Predatory_Saltwater_Crocodile  →  ELEVENLABS_API_KEY
 *   Voice ID: ELEVEN_LABS_NONA_VOICE_ID      →  ELEVENLABS_VOICE_ID
 */

const MAX_TEXT_LENGTH = 5000;

function getApiKey(): string | undefined {
  return process.env.Predatory_Saltwater_Crocodile || process.env.ELEVENLABS_API_KEY;
}

function getVoiceId(override?: string): string | undefined {
  return override || process.env.ELEVEN_LABS_NONA_VOICE_ID || process.env.ELEVENLABS_VOICE_ID;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return res.status(500).json({
      error: 'ElevenLabs API key not configured. Set Predatory_Saltwater_Crocodile or ELEVENLABS_API_KEY.',
    });
  }

  const { text, voiceId, modelId } = req.body ?? {};

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'Missing or empty "text" field.' });
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return res.status(400).json({
      error: `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters.`,
    });
  }

  const resolvedVoiceId = getVoiceId(voiceId);
  if (!resolvedVoiceId) {
    return res.status(500).json({
      error: 'Voice ID not configured. Set ELEVEN_LABS_NONA_VOICE_ID or ELEVENLABS_VOICE_ID.',
    });
  }

  const resolvedModel = modelId || 'eleven_multilingual_v2';

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${resolvedVoiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: text.trim(),
          model_id: resolvedModel,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.4,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('ElevenLabs API error:', response.status, errorBody);
      return res.status(response.status).json({
        error: 'ElevenLabs API request failed.',
        detail: errorBody,
      });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const arrayBuffer = await response.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    console.error('TTS request failed:', err);
    return res.status(500).json({ error: 'Internal server error during TTS generation.' });
  }
}
