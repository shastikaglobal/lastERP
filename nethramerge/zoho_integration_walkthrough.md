# Zoho Mail Integration Module

This module provides a robust, OAuth 2.0 based integration with Zoho Mail, replacing the previous SMTP/IMAP app-password method. It allows for secure, scalable email synchronization and management directly within the Shastika ERP.

## 🚀 Components Implemented

1.  **Database Schema** (`supabase/migrations/20240515000000_zoho_mail_integration.sql`):
    *   `zoho_accounts`: Stores encrypted OAuth tokens and expiry metadata.
    *   `emails`: Centralized storage for synced messages.
    *   `email_attachments`: tracks file links in Supabase Storage.
2.  **Edge Function** (`supabase/functions/zoho-oauth/index.ts`):
    *   Handles the `authorization_code` exchange.
    *   Secures tokens in the database.
    *   Manages user-to-account mapping.
3.  **Service Class** (`src/services/ZohoMailService.ts`):
    *   Production-ready TypeScript class.
    *   **Auto-Refresh**: Automatically detects expired tokens and refreshes them using the `refresh_token` before any API call.
    *   **Modular**: Methods for `sendEmail`, `fetchEmails`, `syncEmails`.
4.  **Frontend UI** (`src/pages/system/ZohoIntegration.tsx`):
    *   Management dashboard for connecting Zoho accounts.
    *   Real-time status tracking and manual sync trigger.

## 🛠️ Setup Instructions

### 1. Zoho API Configuration
1.  Visit the [Zoho API Console](https://api-console.zoho.in/).
2.  Add a **Server-based Application**.
3.  **Client Name**: Shastika ERP.
4.  **Authorized Redirect URI**: `https://[YOUR_PROJECT_ID].supabase.co/functions/v1/zoho-oauth`.
5.  Copy the **Client ID** and **Client Secret**.

### 2. Environment Variables
Add these to your local `.env` and Supabase Secrets:

```bash
# Supabase Secrets (set via CLI: supabase secrets set ...)
ZOHO_CLIENT_ID=your_id
ZOHO_CLIENT_SECRET=your_secret
FRONTEND_URL=https://your-app.vercel.app

# Local .env (Vite)
VITE_ZOHO_CLIENT_ID=your_id
```

### 3. Register the Route
Add the integration page to your router (e.g., `src/App.tsx`):

```tsx
<Route path="/system/integrations/zoho" element={<ZohoIntegration />} />
```

## 🔒 Security & Best Practices
- **Token Storage**: Tokens are stored in a dedicated table with RLS.
- **Async Processing**: The sync logic is designed to be triggered via Cron or background workers.
- **API Limits**: Zoho Mail API has rate limits; the service class is structured to allow for easy implementation of backoff strategies.
