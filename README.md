# Ashqe-

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_TxXqRubL4096UFTZRqiFBasdQfnh)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.

<a href="https://v0.app/chat/api/kiro/clone/Audaa-Cyber/Ashqe-" alt="Open in Kiro"><img src="https://pdgvvgmkdvyeydso.public.blob.vercel-storage.com/open%20in%20kiro.svg?sanitize=true" /></a>


## Production setup

Ashqe is an X intelligence operating system. Production requires Supabase, X OAuth 2.0 PKCE, OpenRouter, and optionally Tavily + Telegram.

### Environment
Copy .env.example into the deployment environment. Never expose server secrets to the browser. Set X_REDIRECT_URI to the exact deployed callback URL /api/x/callback and register that exact URL in the X Developer Console.

Set a strong random X_TOKEN_ENCRYPTION_KEY so X access/refresh tokens are encrypted at rest. Existing unencrypted tokens remain readable for migration; newly issued and refreshed tokens are encrypted.

### Database migrations
Run, in order, SUPABASE_MIGRATION_0002.sql, SUPABASE_MIGRATION_0003.sql, SUPABASE_MIGRATION_0004.sql, and SUPABASE_MIGRATION_0005.sql in Supabase.

### Research
Set TAVILY_API_KEY for live web research. Ashqe stores research findings as signals with source URLs. OPENROUTER_API_KEY is required for synthesis and agent execution.

### Telegram
Set TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET. Generate a one-time account link from the authenticated Ashqe API, then send the returned /connect command to the bot. The bot supports /brief, /autonomous, /pause, and /resume.

### Autonomous execution
Autonomous mode is OFF by default. Users control a master switch, post/reply permissions, daily caps, allowed hours, and an emergency stop. Every action is policy-checked and written to ashqe_action_log. Automated replies additionally require recipient opt-in and the required X approval; the application does not bypass those requirements.

### Scheduled jobs
Vercel Cron calls /api/cron/run every 15 minutes. CRON_SECRET must be configured. Research jobs create signals and can send Telegram briefs. Post/reply jobs pass through the same server-side execution policy before touching X.

### Safe X diagnostics
GET /api/x/diagnostics reports only whether required configuration variables exist and what callback URL Ashqe expects. It never returns credentials or tokens.

### Crypto billing
Ashqe billing is crypto-only: USDC and USDT on Solana and Base, plus Arc where the selected token contract is explicitly configured. Payment requests are short-lived, server-created, and bound to a plan, chain, token, exact amount and receiving wallet. The server verifies the canonical token contract, recipient, successful transaction, exact-or-greater amount, confirmations, replay/idempotency and payment expiry before activating a subscription. A scheduled /api/cron/billing reconciliation job covers users who pay without keeping the checkout page open.

Configure ASHQE_SOLANA_PAYMENT_WALLET, ASHQE_BASE_PAYMENT_WALLET, and ASHQE_ARC_PAYMENT_WALLET. Configure RPC URLs and confirmation policy. Never put wallet private keys in the application. Arc currently has native USDC at 0x3600000000000000000000000000000000000000; an Arc USDT address is intentionally not invented and must be supplied/configured only after you verify the exact token contract you want to accept. Solana native USDC/USDT and Base USDC/USDT are allowlisted in lib/billing/config.ts.

Apply SUPABASE_MIGRATION_0006.sql after migrations 0002–0005. The /billing page creates payment intents and shows the exact network/token/recipient. Access is activated only after server-side onchain verification.

<!-- production verification checkpoint -->
