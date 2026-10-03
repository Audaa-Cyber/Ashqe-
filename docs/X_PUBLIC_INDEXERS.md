# Ashqe public X intelligence providers

Ashqe keeps **official X OAuth for owned-account actions** (posting, replies, account-scoped data) and uses optional third-party public-data indexers for discovery and intelligence.

The implementation lives in:
- `lib/x/public-indexers.ts` — provider abstraction + fallback
- `lib/x/signal-engine.ts` — deterministic signal scoring
- `app/api/signals/ingest/route.ts` — authenticated ingestion into Radar signals

## Supported providers

### FxTwitter / FxEmbed
No Ashqe API key is required.

FxTwitter is the X/Twitter public API exposed by the open-source FxEmbed project. Its current API v2 exposes search, posts, threads, conversations, profiles, followers/following, quotes, reposts, trends and typeahead. Ashqe uses its public `/2/search` surface as the zero-configuration discovery path, with cursor pagination. FxEmbed documents a 1,000-request/minute API-v2 limit per IP; availability and upstream coverage can still change.

This provider is deliberately read-only. Ashqe does **not** send X auth cookies, `auth_token`, `ct0`, or OAuth credentials to FxTwitter.

### TwexAPI
Runtime secret: `TWEXAPI_API_KEY`

Public search uses TwexAPI's advanced-search endpoint with cursor support. TwexAPI documents public reads without an X cookie and provides a free trial allocation; usage/pricing can change, so treat the trial as an onboarding allowance rather than a guaranteed permanent free tier.

### SocialData
Runtime secret: `SOCIALDATA_API_KEY`

Public search uses SocialData's live search endpoint and supports X search operators plus cursors. SocialData currently documents up to three requests/minute without charge; requests beyond that are billed, and the service is pay-as-you-go.

### RelayX
Runtime secret: `RELAYX_API_KEY`

Public search uses RelayX's public-data API. RelayX documents free trial credits and a pay-as-you-go model.

## Provider strategy

Ashqe tries the preferred configured provider first, then falls through to the other configured providers if a request fails.

This gives the intelligence layer:
- provider independence
- no dependence on the user's OAuth token for public discovery
- cursor-ready search
- a place to add future indexers without changing the Radar API
- graceful provider failure instead of taking the whole Radar down

**Important:** these providers are independent third parties and are not X Corp products. Their availability, pricing, rate limits and terms can change.

## Full-potential roadmap

The adapter is intentionally broader than a single search endpoint. The next provider capabilities to wire into Ashqe are:

1. profile hydration
2. user timelines
3. mentions
4. replies / conversation trees
5. quotes and retweeters
6. followers / following graph
7. lists and communities
8. Spaces
9. trends
10. monitoring/webhooks
11. deduplicated signal storage
12. evidence-backed opportunity scoring

The official X API remains the write/action surface.
