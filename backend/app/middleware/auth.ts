import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../services/authService.ts';
import type { Role } from '../models/user.ts';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: Role };
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing bearer token' } });
  try {
    const payload = verifyAccessToken(header.slice('Bearer '.length));
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired access token' } });
  }
}

// Like requireAuth, but never rejects — sets req.user if a valid bearer
// token is present, otherwise just continues unauthenticated. For routes
// that work for anonymous visitors but personalize when logged in (e.g. a
// user's loyalty-adjusted price).
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const payload = verifyAccessToken(header.slice('Bearer '.length));
      req.user = { id: payload.sub, role: payload.role };
    } catch {
      // Invalid/expired token on an optional route — just treat as anonymous.
    }
  }
  next();
}

// Server-side role check — the client-supplied role is never trusted, only
// the role embedded in the signed JWT from login/register (section 7).
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }
    next();
  };
}
