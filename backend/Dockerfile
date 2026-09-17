# Hugging Face Spaces (Docker SDK) image for the TredevAstro backend.
#
# Base: Microsoft's official Playwright image — Chromium + every system
# library it needs are already installed and version-matched to the
# `playwright` npm package below, so there's no separate `playwright install
# --with-deps` step to keep in sync (and no risk of the apt/sandbox issues
# that broke that step on Render — see git history). Keep this tag's
# version equal to the "playwright" version in package.json.
FROM mcr.microsoft.com/playwright:v1.63.0-jammy

WORKDIR /app

# Skip Playwright's own browser download during `npm install` — the base
# image already has Chromium at the exact version this build expects.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV NODE_ENV=production
# Hugging Face Spaces (Docker SDK) route traffic to port 7860 by default —
# see the `app_port` field in README.md. The app itself just reads $PORT
# (see app/core/config.ts), so this is the only place 7860 is hardcoded.
ENV PORT=7860

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Hugging Face's Docker Spaces run the container as a non-root user by
# convention (their own guidance) — create one and hand it ownership of
# /app instead of running as root.
RUN useradd --create-home --uid 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 7860

CMD ["npm", "start"]
