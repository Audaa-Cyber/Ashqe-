# Ashqe Setup Guide

This guide walks you through setting up Ashqe with real X OAuth, Supabase, and OpenRouter.

## Prerequisites

1. **X (Twitter) Developer Account** — https://developer.x.com
2. **Supabase Account** — https://supabase.com
3. **OpenRouter Account** — https://openrouter.ai

---

## Step 1: X Developer Setup

### Create a X Developer App

1. Go to https://developer.x.com/en/portal/dashboard
2. Click **Create Project**
3. Name it "Ashqe"
4. Create an app within the project
5. Go to **Settings** → **User authentication settings**
6. Enable **OAuth 2.0**
7. Set **Type** to **Confidential client**
8. Add these redirect URIs:
   - Development: `http://localhost:3000/api/auth/x/callback`
   - Production: `https://yourdomain.com/api/auth/x/callback`

### Copy Credentials

- **Client ID** → `X_CLIENT_ID`
- **Client Secret** → `X_CLIENT_SECRET`
- **Redirect URI** → `X_REDIRECT_URI` (use the development one for local testing)

### Set Required Scopes

In the **OAuth scopes** section, enable:
- `tweet.read` — to read your posts
- `tweet.write` — to post to X
- `users.read` — to get user info
- `offline.access` — for refresh tokens

---

## Step 2: Supabase Setup

### Create a Project

1. Go to https://supabase.com and log in
2. Click **New Project**
3. Name it "Ashqe"
4. Create the project

### Run the Schema

1. Go to **SQL Editor**
2. Copy the contents of `/lib/supabase-schema.sql`
3. Paste into a new query and run it
4. This creates all necessary tables

### Get Credentials

- **Project URL** → `SUPABASE_URL`
- **Anon Key** (public) → `SUPABASE_ANON_KEY`
- **Service Role Key** (secret) → `SUPABASE_SERVICE_KEY`

---

## Step 3: OpenRouter Setup

### Create an Account

1. Go to https://openrouter.ai
2. Sign up and log in
3. Go to **Settings** or **Keys**
4. Create an API key

### Copy Credential

- **API Key** → `OPENROUTER_API_KEY`

---

## Step 4: Add Environment Variables

Add these 7 variables to your **Vercel project settings** (Settings → Environment Variables):

```
X_CLIENT_ID=your_client_id
X_CLIENT_SECRET=your_client_secret
X_REDIRECT_URI=http://localhost:3000/api/auth/x/callback
OPENROUTER_API_KEY=your_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
```

For **development locally**, create a `.env.local` file in the project root with the same variables.

---

## Step 5: Deploy and Test

### Local Testing

```bash
npm run dev
# Visit http://localhost:3000
# Click "Connect X" → You'll be redirected to X OAuth
# After connecting, your style profile will be analyzed
# Chat with your AI agent in the dashboard
```

### Deploy to Production

1. Push to GitHub
2. Deploy on Vercel
3. Add the same environment variables in Vercel project settings
4. Update `X_REDIRECT_URI` to your production URL: `https://yourapp.vercel.app/api/auth/x/callback`

---

## How It Works

1. **User clicks "Connect X"** → redirected to X OAuth flow
2. **X returns auth code** → our API exchanges it for access token
3. **We fetch user's last 50 posts** → OpenRouter analyzes their writing style
4. **Style profile is stored in Supabase** → creates a structured voice model
5. **User lands in dashboard** → can chat with their AI agent
6. **Agent writes posts** → grounded in their actual writing style
7. **User publishes to X** → using stored OAuth token

---

## Troubleshooting

### "Authorization failed" on connect page

- Check `X_CLIENT_ID` and `X_CLIENT_SECRET` are correct
- Verify redirect URI matches exactly
- Make sure OAuth 2.0 is enabled in X Developer app

### "Chat request failed"

- Verify `OPENROUTER_API_KEY` is correct
- Check Supabase URL and keys are valid
- Ensure database tables were created from `supabase-schema.sql`

### "Style analysis timeout"

- OpenRouter might be slow on first request
- Try again in a few seconds
- Check OpenRouter account has credits

### User can't see their style profile

- Make sure `/api/analyze-style` completed successfully
- Check Supabase `style_profiles` table for the user's entry
- Verify the X user ID in the `users` table matches the OAuth response

---

## Next Steps

Once everything is connected:

1. **Add publishing** — save drafts to Supabase before publishing to X
2. **Add analytics** — track which drafted posts got published and their performance
3. **Improve voice model** — re-analyze posts after each publish to refine the style profile
4. **Add team features** — let users share agents with their team

---

## API Endpoints

### `GET /api/auth/check`
Check if user is authenticated. Returns user data and style profile.

### `POST /api/auth/x/callback`
X OAuth callback handler. Exchanges code for token, stores user, starts analysis.

### `POST /api/analyze-style`
Fetches user's last 50 posts, analyzes style with OpenRouter, stores profile.

### `POST /api/chat`
Main streaming chat endpoint. Sends message to agent, returns streamed response with SSE.

---

## Notes

- All X tokens are encrypted in Supabase (stored as encrypted text columns)
- Raw tokens are never exposed to the frontend
- User data is isolated via Row Level Security (RLS) policies
- Each user's voice model is private and never shared with other users
- Chat history is stored per user in the `conversations` table
