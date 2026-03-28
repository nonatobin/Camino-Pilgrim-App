/**
 * Camino Pilgrim App â Centralized Environment Configuration
 *
 * This module automatically detects whether the app is running in
 * development (localhost) or production (Vercel), and provides
 * the correct URLs, API keys, and feature flags for each environment.
 *
 * Adding a new feature:
 *   1. Add a VITE_ env var in Vercel dashboard (and .env.local for dev)
 *   2. Add it to the `config` object below
 *   3. Import { config } from '@/src/config/environment' wherever needed
 *
 * Adding a new feature flag:
 *   1. Add it to the `featureFlags` object below
 *   2. Control it via VITE_FF_YOUR_FLAG=true in env vars
 *   3. Import { featureFlags } from '@/src/config/environment'
 */

// ---------------------------------------------------------------------------
// Environment detection
// ---------------------------------------------------------------------------

const getEnvVar = (key: string, fallback = ''): string => {
  // Vite exposes VITE_ prefixed vars on import.meta.env
  const viteVal = (import.meta as any)?.env?.[key];
  if (viteVal !== undefined && viteVal !== '') return viteVal;

  // process.env is available for vars injected via vite.config.ts define{}
  const procVal = (typeof process !== 'undefined' && (process as any).env?.[key]);
  if (procVal !== undefined && procVal !== '') return procVal;

  return fallback;
};

export const isDev = typeof window !== 'undefined'
  && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const isProd = !isDev;

export const appUrl = isDev
  ? 'http://localhost:5173'
  : getEnvVar('VITE_APP_URL', 'https://project-ccff5.vercel.app');

// ---------------------------------------------------------------------------
// API Keys (all centralised â import from here, not scattered getEnvVar calls)
// ---------------------------------------------------------------------------

export const config = {
  // Core environment
  appUrl,
  isDev,
  isProd,
  environment: isDev ? 'development' as const : 'production' as const,

  // Google Maps + Places
  googleMapsApiKey: getEnvVar('VITE_GOOGLE_MAPS_API_KEY'),

  // Google Translate (optional â falls back to Gemini if missing)
  googleTranslateApiKey: getEnvVar('VITE_GOOGLE_TRANSLATE_API_KEY'),

  // OpenWeatherMap (optional â falls back to demo data if missing)
  openWeatherApiKey: getEnvVar('VITE_OPENWEATHER_API_KEY'),

  // Gemini AI (voice assistant, translation fallback, voice parsing)
  geminiApiKey: getEnvVar('GEMINI_API_KEY') || getEnvVar('VITE_GEMINI_API_KEY'),

  // Google Calendar OAuth (server-side, referenced for documentation)
  calendarClientId: getEnvVar('GOOGLE_CALENDAR_CLIENT_ID'),
  calendarClientSecret: getEnvVar('GOOGLE_CALENDAR_CLIENT_SECRET'),

  // OAuth callback path (consistent across environments)
  calendarCallbackPath: '/api/auth/calendar/callback',

  // Full OAuth redirect URI (auto-switches dev â prod)
  get calendarRedirectUri(): string {
    return `${this.appUrl}${this.calendarCallbackPath}`;
  },
};

// ---------------------------------------------------------------------------
// Feature Flags â toggle new features without code changes
// ---------------------------------------------------------------------------

const flag = (key: string, defaultVal = false): boolean => {
  const val = getEnvVar(key);
  if (val === 'true' || val === '1') return true;
  if (val === 'false' || val === '0') return false;
  return defaultVal;
};

export const featureFlags = {
  /** Google Translate tab in bottom nav */
  translateEnabled: flag('VITE_FF_TRANSLATE', true),

  /** Live voice assistant (Gemini 3.1 Flash Live) */
  voiceAssistantEnabled: flag('VITE_FF_VOICE_ASSISTANT', true),

  /** Camera/vision mode in voice assistant (plant/landmark ID) */
  visionEnabled: flag('VITE_FF_VISION', true),

  /** Google Calendar sync */
  calendarSyncEnabled: flag('VITE_FF_CALENDAR_SYNC', true),

  /** Nearby Places search during walk tracking */
  nearbyPlacesEnabled: flag('VITE_FF_NEARBY_PLACES', true),

  /** Weather panel during walk tracking */
  weatherEnabled: flag('VITE_FF_WEATHER', true),

  /** Route map with polyline drawing */
  routeMapEnabled: flag('VITE_FF_ROUTE_MAP', true),

  /** Family Sync tab */
  familySyncEnabled: flag('VITE_FF_FAMILY_SYNC', true),

  /** Fall detection during active tracking */
  fallDetectionEnabled: flag('VITE_FF_FALL_DETECTION', true),

  /** Beta feedback loop in voice assistant */
  betaFeedbackEnabled: flag('VITE_FF_BETA_FEEDBACK', true),
};

// ---------------------------------------------------------------------------
// Debug helper â call from browser console: window.__caminoConfig()
// ---------------------------------------------------------------------------

if (typeof window !== 'undefined') {
  (window as any).__caminoConfig = () => {
    console.table({
      environment: config.environment,
      appUrl: config.appUrl,
      calendarRedirectUri: config.calendarRedirectUri,
      googleMapsKey: config.googleMapsApiKey ? '***configured***' : 'MISSING',
      translateKey: config.googleTranslateApiKey ? '***configured***' : 'using Gemini fallback',
      weatherKey: config.openWeatherApiKey ? '***configured***' : 'using demo data',
      geminiKey: config.geminiApiKey ? '***configured***' : 'MISSING',
    });
    console.table(featureFlags);
  };

  if (isDev) {
    console.log(
      `%cð Camino Pilgrim [${config.environment}]`,
      'font-weight:bold; color:#5A5A40; font-size:14px;',
      `\n  App URL: ${config.appUrl}`,
      `\n  Calendar redirect: ${config.calendarRedirectUri}`,
      `\n  Type window.__caminoConfig() for full config`,
    );
  }
}

export default config;
