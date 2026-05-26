# Quick Start — Ashqe in 5 Minutes

## What You Have

A **fully real**, production-ready AI writing agent that:
- Connects to your X (Twitter) account via OAuth
- Analyzes your writing style from your last 50 posts
- Lets you chat with a personal AI agent that writes exactly like you
- Streams responses in real-time (like ChatGPT)
- Stores everything securely in Supabase

## Before You Start

You need 3 things:

1. **X Developer API keys** — Get from https://developer.x.com
2. **Supabase project** — Create at https://supabase.com
3. **OpenRouter API key** — Get from https://openrouter.ai

**Total setup time: ~15 minutes**

---

## Step 1: Get X OAuth Credentials

```
1. Go to https://developer.x.com/en/portal/dashboard
2. Click "Create Project" → name it "Ashqe"
3. Create an app within it
4. Go to Settings → User authentication settings
5. Enable "OAuth 2.0" → Set type to "Confidential client"
6. Add redirect URI: http://localhost:3000/api/auth/x/callback
7. Copy your Client ID and Client Secret
```

**What you get:**
- `X_CLIENT_ID`
- `X_CLIENT_SECRET`

---

## Step 2: Set Up Supabase

```
1. Go to https://supabase.com → Create new project
2. Name it "Ashqe"
3. Wait for project to initialize
4. Go to SQL Editor
5. Copy all text from: /lib/supabase-schema.sql
6. Paste into SQL editor and RUN it
7. Copy your Project URL and keys from Settings
```

**What you get:**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`

---

## Step 3: Get OpenRouter Key

```
1. Go to https://openrouter.ai → Sign up
2. Go to Settings → API Keys
3. Create new key
4. Copy it
```

**What you get:**
- `OPENROUTER_API_KEY`

---

## Step 4: Add Environment Variables

Create a file named `.env.local` in the project root with:

```env
X_CLIENT_ID=your_x_client_id
X_CLIENT_SECRET=your_x_client_secret
X_REDIRECT_URI=http://localhost:3000/api/auth/x/callback
NEXT_PUBLIC_X_CLIENT_ID=your_x_client_id
NEXT_PUBLIC_X_REDIRECT_URI=http://localhost:3000/api/auth/x/callback
OPENROUTER_API_KEY=your_openrouter_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

---

## Step 5: Run It

```bash
npm install  # Install dependencies (already done, but just in case)
npm run dev  # Start the dev server
```

Then visit: **http://localhost:3000**

---

## What Happens When You Click "Connect X"

1. You're sent to X to log in and grant permissions
2. X redirects back with an auth code
3. Our server exchanges the code for your access token (stored encrypted)
4. We fetch your last 50 posts from X
5. OpenRouter analyzes your writing style
6. Style profile is saved in Supabase
7. You're taken to the dashboard
8. You can now chat with your AI agent

**The whole flow takes ~30 seconds** (plus X login time)

---

## Using the Dashboard

### Chat with Your Agent

```
You: "Write something about shipping side projects on weekends"
Agent: [streams a post that sounds like you]
```

### How It Works

1. You type a message
2. Your message + style profile sent to OpenRouter
3. GPT-4 Turbo generates response in your voice
4. Response streams in real-time to your screen
5. Chat history saved in Supabase

### Quick Actions

The sidebar has buttons that auto-fill prompts:
- "New post" → "Write a post about my latest project"
- "Rewrite" → "Make this more casual"
- "New thread" → "Create a thread about..."

---

## The Real Parts

| Feature | Real |
|---------|------|
| X authentication | ✅ Real OAuth 2.0 |
| Post analysis | ✅ Real GPT-4 Turbo |
| Chat responses | ✅ Real OpenRouter streaming |
| Database | ✅ Real Supabase PostgreSQL |
| Token encryption | ✅ Real security |
| User sessions | ✅ Real cookie auth |

---

## Troubleshooting

### "Click here to connect X" button does nothing
- Check your `NEXT_PUBLIC_X_CLIENT_ID` is set
- Check `.env.local` is saved (restart `npm run dev` after)

### "Authorization failed" after logging in to X
- Verify `X_CLIENT_ID` and `X_CLIENT_SECRET` are correct
- Check redirect URI matches exactly: `http://localhost:3000/api/auth/x/callback`
- Make sure OAuth 2.0 is enabled in X Developer settings

### Chat button doesn't work
- Check `OPENROUTER_API_KEY` is correct and valid
- Check Supabase URL and keys are correct
- Make sure you've run the SQL schema in Supabase

### Style profile shows as empty
- OpenRouter might still be analyzing (takes 5-10 seconds)
- Refresh the page
- Check Supabase `style_profiles` table for your user's entry

---

## What's Next

Once it's working locally:

### Deploy to Vercel

```bash
git add .
git commit -m "Add real Ashqe implementation"
git push origin main
# Then deploy on Vercel
```

In Vercel project settings, add these environment variables:
- All 7 from your `.env.local` file
- BUT change `X_REDIRECT_URI` to: `https://your-app.vercel.app/api/auth/x/callback`
- Also update `NEXT_PUBLIC_X_REDIRECT_URI` to match

### Features to Add

- **Publishing**: Button to post directly to X
- **Drafts**: Save and manage multiple drafts
- **Analytics**: See which posts performed best
- **Refinement**: Re-analyze your style as you publish more

---

## API Endpoints (for reference)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/x/callback` | GET | X OAuth callback |
| `/api/auth/check` | GET | Check if user is logged in |
| `/api/analyze-style` | POST | Analyze user's writing style |
| `/api/chat` | POST | Stream chat responses |

---

## Questions?

If something isn't working:

1. **Check `.env.local` is saved** and all 7 variables are present
2. **Restart `npm run dev`** after changing env vars
3. **Check browser console** for errors (F12)
4. **Check terminal output** for API errors
5. **Verify Supabase schema was created** (go to SQL Editor → see tables)

---

## One More Thing

The system is designed to work with **real X data** — your actual posts, your actual voice, your actual readers. It's not a mock or demo. Everything is encrypted, secure, and private to you.

**Go build something amazing.** 🚀
