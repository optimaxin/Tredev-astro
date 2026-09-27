import type { NextFunction, Request, Response } from 'express';
import { authenticate } from '../services/authService.ts';
import type { Role } from '../models/user.ts';

declare global {
  namespace Express {
    interface Request {
      // Populated only by requireAuth/optionalAuth from a verified token +
      // the users row — never from anything the client sends.
      user?: { id: string; role: Role; email: string };
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing bearer token' } });
  const user = await authenticate(header.slice('Bearer '.length));
  if (!user) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired access token' } });
  req.user = user;
  next();
}

// Like requireAuth, but never rejects — sets req.user if a valid bearer
// token is present, otherwise just continues unauthenticated. For routes
// that work for anonymous visitors but personalize when logged in (e.g. a
// user's loyalty-adjusted price).
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  // Invalid/expired token on an optional route — just treat as anonymous.
  if (header?.startsWith('Bearer ')) req.user = (await authenticate(header.slice('Bearer '.length))) ?? undefined;
  next();
}

// Server-side role check — the client-supplied role is never trusted; req.user.role
// is re-read from the users row on every request (see authenticate).
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }
    next();
  };
}
