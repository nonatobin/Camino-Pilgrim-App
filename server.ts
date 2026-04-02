import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import cookieSession from "cookie-session";
import * as dotenv from "dotenv";
import { Client as NotionClient } from "@notionhq/client";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Notion Client (only if key exists)
const notion = process.env.NOTION_API_KEY ? new NotionClient({ auth: process.env.NOTION_API_KEY }) : null;
const NOTION_DB_ID = process.env.NOTION_LEADERBOARD_DB_ID;

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

  // Fetch Leaderboard from Notion
  app.get("/api/notion/leaderboard", async (req, res) => {
    if (!notion || !NOTION_DB_ID) {
      return res.status(500).json({ error: "Notion integration is not configured." });
    }

    try {
      const response = await (notion.databases as any).query({
        database_id: NOTION_DB_ID,
        sorts: [
          {
            property: "Distance",
            direction: "descending",
          },
        ],
      });

      const leaderboard = response.results.map((page: any) => {
        const props = page.properties;
        return {
          id: page.id,
          name: props.Name?.title?.[0]?.plain_text || "Unknown Pilgrim",
          distance: props.Distance?.number || 0,
          speed: props.Speed?.number || 0,
          duration: props.Duration?.number || 0,
          date: props.Date?.date?.start || "",
          type: props.Type?.select?.name || "manual",
          avatar: props.Avatar?.rich_text?.[0]?.plain_text || "👤",
        };
      });

      res.json({ leaderboard });
    } catch (error: any) {
      console.error("Notion API Error:", error.message);
      res.status(500).json({ error: "Failed to fetch leaderboard from Notion" });
    }
  });

  // Log a new walk to Notion
  app.post("/api/notion/log-walk", async (req, res) => {
    if (!notion || !NOTION_DB_ID) {
      return res.status(500).json({ error: "Notion integration is not configured." });
    }

    const { userName, distance, speed, duration, type, date, avatar } = req.body;

    try {
      await notion.pages.create({
        parent: { database_id: NOTION_DB_ID },
        properties: {
          Name: {
            title: [
              {
                text: { content: userName || "Pilgrim" },
              },
            ],
          },
          Distance: {
            number: distance || 0,
          },
          Speed: {
            number: speed || 0,
          },
          Duration: {
            number: duration || 0,
          },
          Date: {
            date: { start: date || new Date().toISOString().split("T")[0] },
          },
          Type: {
            select: { name: type || "manual" },
          },
          Avatar: {
            rich_text: [
              {
                text: { content: avatar || "👤" },
              },
            ],
          },
        },
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Notion API Error:", error.message);
      res.status(500).json({ error: "Failed to log walk to Notion" });
    }
  });

  // Log a Bug to Notion
  app.post("/api/notion/bug", async (req, res) => {
    if (!notion || !process.env.NOTION_BUG_DB_ID) {
      return res.status(500).json({ error: "Bug DB integration is not configured." });
    }

    const { title, description, severity, reporter, environment } = req.body;

    try {
      await notion.pages.create({
        parent: { database_id: process.env.NOTION_BUG_DB_ID },
        properties: {
          Title: {
            title: [{ text: { content: title || "New Bug" } }],
          },
          Status: {
            status: { name: "New" },
          },
          Severity: {
            select: { name: severity || "Minor" },
          },
          Description: {
            rich_text: [{ text: { content: description || "" } }],
          },
          Environment: {
            select: { name: environment || "Web" },
          },
          Reporter: {
            rich_text: [{ text: { content: reporter || "Unknown" } }],
          },
        },
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Notion API Error (Bug):", error.message);
      res.status(500).json({ error: "Failed to log bug to Notion" });
    }
  });

  // Log a Feature to Notion
  app.post("/api/notion/feature", async (req, res) => {
    if (!notion || !process.env.NOTION_FEATURE_DB_ID) {
      return res.status(500).json({ error: "Feature DB integration is not configured." });
    }

    const { title, description, priority, reporter } = req.body;

    try {
      await notion.pages.create({
        parent: { database_id: process.env.NOTION_FEATURE_DB_ID },
        properties: {
          Title: {
            title: [{ text: { content: title || "New Feature" } }],
          },
          Status: {
            status: { name: "New" },
          },
          Priority: {
            select: { name: priority || "P2" },
          },
          Description: {
            rich_text: [{ text: { content: description || "" } }],
          },
          Reporter: {
            rich_text: [{ text: { content: reporter || "Unknown" } }],
          },
        },
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Notion API Error (Feature):", error.message);
      res.status(500).json({ error: "Failed to log feature to Notion" });
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
