---
title: TredevAstro Backend
emoji: 🪐
colorFrom: purple
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# TredevAstro Backend

Node.js/TypeScript + Express API — real Vedic astrology calculations
(ephemeris-based), Kundli PDF generation (Playwright), auth, payments, and
the campaign analytics dashboard. See `app/main.ts` for the entry point and
`app/core/config.ts` for the full list of environment variables this reads.

This `Dockerfile` targets Hugging Face's **Docker SDK** Space type. Push
this folder's contents as the Space's repo root (or point the Space at a
Dockerfile with this one as its build context) — HF builds the image and
routes traffic to port 7860 automatically.

## Required secrets (Space Settings → Variables and secrets)

The app throws on startup in production if any of these are missing —
there's no working default:

| Secret | Notes |
|---|---|
| `DATABASE_URL` | Postgres connection string. HF Spaces don't host a database — point this at your existing Postgres (e.g. the one already used on Render, or a free tier like Neon/Supabase). |
| `JWT_SECRET` | Access-token signing secret — any long random string. |
| `REFRESH_TOKEN_SECRET` | Refresh-token signing secret — different from `JWT_SECRET`. |
| `CAMPAIGN_ANALYTICS_USERNAME` | Login for the `/campaign-analytics` dashboard. |
| `CAMPAIGN_ANALYTICS_PASSWORD` | Password for the same. |

## Optional secrets (features degrade gracefully without them)

| Secret | Feature it enables |
|---|---|
| `CLIENT_ORIGIN` | CORS allow-list for the deployed frontend's real origin(s), comma-separated. Defaults to localhost only — **set this in production** or the frontend can't call the API. |
| `CAMPAIGN_APP_URL` | The deployed `ganesh-chaturthi` campaign app's URL — needed for Kundli PDF generation (it renders that app's print route). Defaults to `localhost:1409`, which won't resolve in production. |
| `BROWSERLESS_WS_ENDPOINT` | A hosted-browser WebSocket endpoint (e.g. Browserless.io) for PDF generation, instead of launching Chromium in this container. Not required — this image already bundles Chromium — but worth using if the Space's RAM/CPU tier is tight. |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Google/Phone sign-in verification. Paste the whole service-account JSON as one value. |
| `AWS_LOCATION_API_KEY`, `AWS_LOCATION_REGION` | Paid geocoding provider. Falls back to free Nominatim without it. |
| `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, `CASHFREE_ENV` | Cashfree payments. |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay payments. |
| `JWT_EXPIRATION`, `REFRESH_TOKEN_TTL_DAYS` | Token lifetimes — sane defaults (`15m`, `7`) apply if unset. |

`PORT` and `NODE_ENV` are already set by the Dockerfile — don't override
`PORT` or HF's routing to this Space will break.
