# Environment Setup Guide — Camino Pilgrim App

> **Security rule:** Never commit real API keys. The `.gitignore` already blocks `.env*` files (except `.env.example`). Follow this guide to configure your keys locally and in production.

---

## Quick Start (Local Development)

### 1. Copy the template

```bash
cp .env.example .env.local
```

### 2. Open `.env.local` and paste your keys

```dotenv
# Required — Maps & Places
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-key-here

# Required — Gemini AI (voice assistant & parsing)
VITE_GEMINI_API_KEY=your-gemini-api-key-here

# Optional — Google Translate (falls back to Gemini if blank)
VITE_GOOGLE_TRANSLATE_API_KEY=

# Optional — Weather (shows demo data if blank)
VITE_OPENWEATHER_API_KEY=your-openweather-key-here

# Optional — Calendar sync
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
```

### 3. Start the dev server

```bash
npm install
npm run dev
```

Vite automatically loads variables from `.env.local` at `http://localhost:5173`.

---

## Where to Get Each Key

| Variable | Provider | Link | Notes |
|---|---|---|---|
| `VITE_GOOGLE_MAPS_API_KEY` | Google Cloud Console | [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials) | Enable **Maps JavaScript API** and **Places API (New)** |
| `VITE_GEMINI_API_KEY` | Google AI Studio | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | Used for LiveAssistant, voiceParser, Translate fallback |
| `VITE_GOOGLE_TRANSLATE_API_KEY` | Google Cloud Console | [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials) | Enable **Cloud Translation API** — optional |
| `VITE_OPENWEATHER_API_KEY` | OpenWeatherMap | [openweathermap.org/api](https://openweathermap.org/api) | Free tier is sufficient |
| `GOOGLE_CALENDAR_CLIENT_ID` | Google Cloud Console | [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials) | Create **OAuth 2.0 Client ID** (Web application) |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | Google Cloud Console | Same as above | Paired with the Client ID |

---

## Production Deployment (Vercel)

1. Go to your Vercel project dashboard.
2. Navigate to **Settings → Environment Variables**.
3. Add each key/value pair individually.
4. Redeploy to apply changes.

> Variables prefixed with `VITE_` are exposed to the browser (client-side).  
> Variables **without** the prefix (e.g., `GOOGLE_CALENDAR_CLIENT_SECRET`) stay server-only.

---

## Security Checklist

- [ ] `.env.local` is listed in `.gitignore` — confirmed via the `.env*` glob rule
- [ ] No real keys appear in `.env.example` — only blank placeholders
- [ ] Real keys are **never** committed to Git
- [ ] Production keys are set in Vercel dashboard, not in code
- [ ] If you accidentally commit a key, **revoke and regenerate it immediately**

---

## Verifying Your Setup

After pasting your keys and running `npm run dev`:

| Feature | How to Verify |
|---|---|
| Google Maps | Route map loads on the map tab |
| Gemini AI | Voice assistant responds to prompts |
| Translate | Translation tab returns results (falls back to Gemini if key is blank) |
| Weather | Weather widget shows live data instead of demo data |
| Calendar | Calendar sync connects via Google OAuth flow |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Keys not loading | Make sure the file is named `.env.local` (not `.env.example`) and restart the dev server |
| `VITE_` variable is `undefined` | Vite requires a full restart after changing env files — stop and re-run `npm run dev` |
| API returns 403 | Check that the correct Google Cloud APIs are **enabled** for your project |
| Maps shows "For development purposes only" | Your Google Maps API key may need billing enabled or the correct HTTP referrer restrictions |
| Weather shows demo data | `VITE_OPENWEATHER_API_KEY` is blank or invalid |

---

## Feature Flags

You can toggle features on/off in your `.env.local` without code changes:

```dotenv
VITE_FF_TRANSLATE=true
VITE_FF_VOICE_ASSISTANT=true
VITE_FF_VISION=true
VITE_FF_CALENDAR_SYNC=true
VITE_FF_NEARBY_PLACES=true
VITE_FF_WEATHER=true
VITE_FF_ROUTE_MAP=true
VITE_FF_FAMILY_SYNC=true
VITE_FF_FALL_DETECTION=true
VITE_FF_BETA_FEEDBACK=true
```

Set any flag to `false` to disable that feature.

---

*Last updated: March 29, 2026*
