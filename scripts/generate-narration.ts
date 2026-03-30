#!/usr/bin/env npx tsx
/**
 * Generate narration audio from intro_script_final.md using ElevenLabs TTS.
 *
 * Usage:
 *   # Direct ElevenLabs call (requires env vars locally or in .env.local):
 *   npx tsx scripts/generate-narration.ts
 *
 *   # Via deployed API endpoint:
 *   npx tsx scripts/generate-narration.ts --api https://your-app.vercel.app
 *
 *   # Custom output path:
 *   npx tsx scripts/generate-narration.ts --out public/audio/nona-intro.mp3
 *
 * Environment variables (direct mode):
 *   API key:  Predatory_Saltwater_Crocodile  or  ELEVENLABS_API_KEY
 *   Voice ID: ELEVEN_LABS_NONA_VOICE_ID      or  ELEVENLABS_VOICE_ID
 */

import fs from 'fs';
import path from 'path';

// Load .env.local / .env if present
try {
  const dotenv = await import('dotenv');
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
} catch {
  // dotenv already a dependency, but graceful if missing
}

const args = process.argv.slice(2);

function flag(name: string): string | undefined {
  const idx = args.indexOf(name);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

const apiBaseUrl = flag('--api');
const outputPath = flag('--out') || 'public/audio/nona-intro.mp3';

// ---------------------------------------------------------------------------
// 1. Read and clean the script
// ---------------------------------------------------------------------------

const scriptPath = path.resolve(process.cwd(), 'intro_script_final.md');
if (!fs.existsSync(scriptPath)) {
  console.error('Error: intro_script_final.md not found in project root.');
  process.exit(1);
}

const raw = fs.readFileSync(scriptPath, 'utf-8');

// Strip markdown headers, stage directions [IN BRACKETS], and blank lines
const narrationText = raw
  .split('\n')
  .filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (trimmed.startsWith('#')) return false;
    if (/^\[.*\]$/.test(trimmed)) return false;
    if (trimmed.startsWith('Source draft:')) return false;
    if (trimmed.startsWith('Estimated narration')) return false;
    return true;
  })
  .join('\n')
  .trim();

if (!narrationText) {
  console.error('Error: No narration text extracted from script.');
  process.exit(1);
}

console.log('--- Narration text ---');
console.log(narrationText);
console.log(`--- ${narrationText.length} characters ---\n`);

// ---------------------------------------------------------------------------
// 2. Generate audio
// ---------------------------------------------------------------------------

async function generateViaDirect(): Promise<Buffer> {
  const apiKey =
    process.env.Predatory_Saltwater_Crocodile || process.env.ELEVENLABS_API_KEY;
  const voiceId =
    process.env.ELEVEN_LABS_NONA_VOICE_ID || process.env.ELEVENLABS_VOICE_ID;

  if (!apiKey) {
    console.error(
      'Error: No ElevenLabs API key found.\n' +
        'Set Predatory_Saltwater_Crocodile or ELEVENLABS_API_KEY in your environment or .env.local'
    );
    process.exit(1);
  }
  if (!voiceId) {
    console.error(
      'Error: No voice ID found.\n' +
        'Set ELEVEN_LABS_NONA_VOICE_ID or ELEVENLABS_VOICE_ID in your environment or .env.local'
    );
    process.exit(1);
  }

  console.log(`Calling ElevenLabs directly (voice: ${voiceId})...`);

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: narrationText,
        model_id: 'eleven_multilingual_v2',
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
    const body = await response.text();
    console.error(`ElevenLabs error (${response.status}):`, body);
    process.exit(1);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function generateViaApi(baseUrl: string): Promise<Buffer> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/tts`;
  console.log(`Calling deployed API: ${url} ...`);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: narrationText }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`API error (${response.status}):`, body);
    process.exit(1);
  }

  return Buffer.from(await response.arrayBuffer());
}

const audio = apiBaseUrl
  ? await generateViaApi(apiBaseUrl)
  : await generateViaDirect();

// ---------------------------------------------------------------------------
// 3. Write audio file
// ---------------------------------------------------------------------------

const outDir = path.dirname(path.resolve(outputPath));
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(path.resolve(outputPath), audio);
console.log(`\nAudio saved to ${outputPath} (${(audio.length / 1024).toFixed(1)} KB)`);
