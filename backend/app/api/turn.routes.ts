import { Router } from 'express';
import { requireAuth } from '../middleware/auth.ts';
import { rateLimit } from '../middleware/rateLimit.ts';
import { config } from '../core/config.ts';

export const turnRouter = Router();

const limiter = rateLimit({ windowMs: 60_000, max: 20 });

// Short-lived (1hr) TURN credentials minted per call, instead of shipping one
// static long-lived secret to every browser — see CallWindow.tsx's old
// ICE_SERVERS comment for why a fixed demo TURN server isn't good enough for
// real traffic (no auth/rate-limit control on who uses it).
turnRouter.get('/credentials', requireAuth, limiter, async (_req, res) => {
  const { keyId, apiToken } = config.cloudflareTurn;
  if (!keyId || !apiToken) {
    // Not configured (e.g. local dev) — STUN-only. Calls between two peers
    // that are both behind a strict NAT may fail to connect without TURN;
    // same-network/dev testing still works fine.
    res.json({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    return;
  }
  try {
    const cfRes = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: 3600 }),
    });
    if (!cfRes.ok) throw new Error(`Cloudflare TURN request failed: ${cfRes.status}`);
    const data = await cfRes.json() as { iceServers: RTCIceServerLike };
    res.json({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, data.iceServers] });
  } catch (err) {
    console.error('Cloudflare TURN credential fetch failed:', err);
    res.json({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
  }
});

// Matches Cloudflare's response shape — this backend has no DOM lib, so
// RTCIceServer itself isn't available to import here.
interface RTCIceServerLike {
  urls: string | string[];
  username: string;
  credential: string;
}
