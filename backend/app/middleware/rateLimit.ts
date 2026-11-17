import type { NextFunction, Request, Response } from 'express';

// ponytail: in-memory fixed-window counter, per process. Fine for a single
// backend instance; upgrade to a shared store (Redis) if this ever runs
// behind multiple instances/load balancers.
export function rateLimit(opts: { windowMs: number; max: number }) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.resetAt < now) {
      hits.set(key, { count: 1, resetAt: now + opts.windowMs });
      return next();
    }
    if (entry.count >= opts.max) {
      return res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again shortly.' } });
    }
    entry.count++;
    next();
  };
}
