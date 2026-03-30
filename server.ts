import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import cookieSession from "cookie-session";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieSession({
    name: 'session',
    keys: [process.env.SESSION_SECRET || 'camino-secret-key'],
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: true,
    sameSite: 'none'
  }));

  const getOAuth2Client = () => {
    if (!process.env.APP_URL) {
      console.warn("APP_URL not set, redirect URI might be incorrect");
    }
    return new google.auth.OAuth2(
      process.env.GOOGLE_CALENDAR_CLIENT_ID,
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      `${process.env.APP_URL || ''}/auth/calendar/callback`
    );
  };

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // OAuth URL for Calendar
  app.get("/api/auth/calendar/url", (req, res) => {
    const client = getOAuth2Client();
    const url = client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar.events'],
      prompt: 'consent'
    });
    res.json({ url });
  });

  // OAuth Callback for Calendar
  app.get("/auth/calendar/callback", async (req, res) => {
    const { code } = req.query;
    const client = getOAuth2Client();
    try {
      const { tokens } = await client.getToken(code as string);
      (req.session as any).tokens = tokens;
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'CALENDAR_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Calendar OAuth error:", error);
      res.status(500).send("Authentication failed");
    }
  });

  // Sync to Calendar
  app.post("/api/calendar/sync", async (req, res) => {
    const tokens = (req.session as any).tokens;
    if (!tokens) return res.status(401).json({ error: "Not authenticated with Calendar" });

    const { events } = req.body; // Array of { summary, start, end }
    const client = getOAuth2Client();
    client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: client });

    try {
      for (const event of events) {
        await calendar.events.insert({
          calendarId: 'primary',
          requestBody: {
            summary: event.summary,
            description: 'Camino Pilgrim Training Walk',
            start: { dateTime: event.start },
            end: { dateTime: event.end },
            reminders: {
              useDefault: false,
              overrides: [
                { method: 'popup', minutes: 10 }
              ]
            }
          }
        });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Calendar sync error:", error);
      const message = error?.response?.data?.error?.message || "Sync failed";
      res.status(500).json({ error: message });
    }
  });

  // ElevenLabs TTS proxy (keeps API key server-side)
  app.post("/api/tts", async (req, res) => {
    const apiKey = process.env.Predatory_Saltwater_Crocodile || process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "ElevenLabs API key not configured." });

    const { text, voiceId, modelId } = req.body ?? {};
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: 'Missing or empty "text" field.' });
    }
    if (text.length > 5000) {
      return res.status(400).json({ error: "Text exceeds 5000 character limit." });
    }

    const resolvedVoiceId = voiceId || process.env.ELEVEN_LABS_NONA_VOICE_ID || process.env.ELEVENLABS_VOICE_ID;
    if (!resolvedVoiceId) return res.status(500).json({ error: "Voice ID not configured." });

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${resolvedVoiceId}`, {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
        body: JSON.stringify({
          text: text.trim(),
          model_id: modelId || "eleven_multilingual_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.4, use_speaker_boost: true },
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        console.error("ElevenLabs error:", response.status, body);
        return res.status(response.status).json({ error: "ElevenLabs API request failed.", detail: body });
      }

      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Cache-Control", "public, max-age=86400");
      const buf = Buffer.from(await response.arrayBuffer());
      return res.send(buf);
    } catch (err) {
      console.error("TTS request failed:", err);
      return res.status(500).json({ error: "Internal server error during TTS generation." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
