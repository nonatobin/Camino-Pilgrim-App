import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createOAuthClient } from '../../_lib/oauth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code } = req.query;
  const client = createOAuthClient(req);

  try {
    const { tokens } = await client.getToken(code as string);
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'CALENDAR_AUTH_SUCCESS', tokens: ${JSON.stringify(tokens)} }, '*');
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
}
