import geoip from 'geoip-lite';
import type { Request } from 'express';
import { config } from '../core/config.ts';

// Best-effort client IP — X-Forwarded-For (set by a real reverse proxy) via
// Express's own req.ip, falling back to the raw socket address. req.ip only
// honors X-Forwarded-For when `app.set('trust proxy', ...)` is configured
// (see main.ts) — without it, every request behind a proxy resolves to the
// proxy's own IP, not the visitor's.
export function clientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || '';
}

// Country-level IP geolocation via a bundled offline database (geoip-lite) —
// no API key, no network call, no rate limit, so it's safe to call on every
// pricing-relevant request. Accurate at country level for the large
// majority of traffic; a VPN/corporate proxy can mask the real country,
// which is an accepted limitation for a pricing signal at this scale.
export function countryFromIp(ip: string): string | null {
  const clean = ip.replace(/^::ffff:/, ''); // IPv4-mapped IPv6, common behind Express
  if (clean === '127.0.0.1' || clean === '::1' || clean === '') return null; // localhost/dev — no geo data
  return geoip.lookup(clean)?.country ?? null;
}

export function countryFromRequest(req: Request): string | null {
  // Dev/staging-only override for testing region pricing locally. A
  // loopback/private-LAN IP (127.0.0.1, 192.168.x.x, ...) never resolves to
  // any real country — geoip-lite has no geographic data for those ranges
  // — so every local request during development would otherwise always
  // see the default, unadjusted price. That makes the whole feature look
  // broken while testing even though it works correctly for a real
  // visitor's real public IP once deployed. Disabled outright in
  // production so it can never be used to under/overpay for real.
  if (config.nodeEnv !== 'production') {
    const override = req.query.debugCountry;
    if (typeof override === 'string' && override.length === 2) return override.toUpperCase();
  }
  return countryFromIp(clientIp(req));
}
