name: cloudbridge-auth
description: Automates Google Cloud OAuth setup, consent screen configuration, and credential generation using the Browser Subagent. Use this skill whenever the user needs to authorize a new app, configure Firebase Auth, or set up Google Sign-in.

# CloudBridge Auth Skill

This skill automates the Google Cloud authorization process.

## Instructions for Browser Subagent

### Self-Healing Navigation (CRITICAL)
Navigate console.cloud.google.com using semantic visual understanding. Scan the DOM for text content, ARIA labels, and navigation landmarks (e.g., 'APIs & Services', 'OAuth consent screen') instead of relying on brittle, hardcoded CSS selectors or absolute coordinates.

### Zero-Friction UI
Operate autonomously and only ask the user a question in the chat when a human decision is strictly required (e.g., asking for an App Name or specific API scopes).

### Step 1 - Project Check
Visually detect if a project is selected in the top bar. If no project exists, ask the user for a name and autonomously navigate the menus to create a new one.

### Step 2 - Navigate to OAuth
Use semantic search to locate the hamburger menu, select 'APIs & Services', and click 'OAuth consent screen'. If the UI redirects to an 'OAuth Overview' page, autonomously look for 'Branding' or 'Audience' tabs to configure settings.

### Step 3 - Configure Consent
Select the 'External' user type, auto-fill the user's logged-in email for support and developer contact, and apply any specific scopes requested by the user before clicking Save and Continue.

### Step 4 - Generate Credentials & Apply URIs
Navigate to 'Credentials' > 'Create Credentials' > 'OAuth client ID'. Input any Authorized redirect URIs provided by the user (such as the AI Studio /auth/handler URLs) to ensure the environment is authorized. Once the Client ID and Secret are generated, securely read the visible credential values from the DOM and provide them to the user or save them securely.
