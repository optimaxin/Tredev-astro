import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import { findUserById, listAllUsers, updateUserRole, updateUserStatus } from '../repositories/userRepository.ts';
import { toPublicUser } from '../models/user.ts';
import { decideApplication, findApplicationById, listApplicationsWithUsers } from '../repositories/astrologerApplicationRepository.ts';
import { insertAstrologerForUser } from '../repositories/astrologerRepository.ts';
import { listAllConsultations } from '../repositories/consultationRepository.ts';
import { listAuditLog, logAdminAction } from '../repositories/auditLogRepository.ts';
import { register, AuthError } from '../services/authService.ts';

export const adminRouter = Router();

// Every route here requires a real, JWT-verified ADMIN account — unlike the
// older mock-trust realtime routes in routes.ts, there is no client-supplied
// identity trusted anywhere in this file.
adminRouter.use(requireAuth, requireRole('ADMIN'));

async function audit(req: import('express').Request, action: string, target: string) {
  const actor = await findUserById(req.user!.id);
  await logAdminAction(req.user!.id, actor?.name || req.user!.id, action, target);
}

function fail(res: import('express').Response, status: number, code: string, message: string) {
  res.status(status).json({ success: false, error: { code, message } });
}

// ── Users ────────────────────────────────────────────────────────────────

adminRouter.get('/users', async (_req, res) => {
  const rows = await listAllUsers();
  res.json({ success: true, data: rows.map(toPublicUser) });
});

const statusSchema = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED']) });

adminRouter.patch('/users/:id/status', async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  const target = await findUserById(req.params.id);
  if (!target) return fail(res, 404, 'NOT_FOUND', 'User not found');
  await updateUserStatus(target.id, parsed.data.status);
  await audit(req, `user.status.${parsed.data.status.toLowerCase()}`, target.email);
  res.json({ success: true, data: { ok: true } });
});

const roleSchema = z.object({ role: z.enum(['USER', 'ASTROLOGIST', 'ADMIN']) });

adminRouter.patch('/users/:id/role', async (req, res) => {
  const parsed = roleSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  const target = await findUserById(req.params.id);
  if (!target) return fail(res, 404, 'NOT_FOUND', 'User not found');
  await updateUserRole(target.id, parsed.data.role);
  await audit(req, `user.role.${parsed.data.role.toLowerCase()}`, target.email);
  res.json({ success: true, data: { ok: true } });
});

// Admin directly onboarding an astrologer, bypassing the public
// apply→approve flow — creates a real user account (real password, hashed)
// and an immediately-bookable catalog row in one step.
const addAstrologerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
});

adminRouter.post('/astrologers', async (req, res) => {
  const parsed = addAstrologerSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  try {
    const { user } = await register({ ...parsed.data, role: 'ASTROLOGIST' });
    await insertAstrologerForUser(user.id, user.name, 'General Astrology');
    await audit(req, 'astrologer.create', user.email);
    res.status(201).json({ success: true, data: user });
  } catch (e) {
    if (e instanceof AuthError) return fail(res, e.status, 'AUTH_ERROR', e.message);
    throw e;
  }
});

// ── Astrologer applications ─────────────────────────────────────────────

adminRouter.get('/astrologer-applications', async (_req, res) => {
  res.json({ success: true, data: await listApplicationsWithUsers() });
});

adminRouter.post('/astrologer-applications/:id/approve', async (req, res) => {
  const application = await findApplicationById(req.params.id);
  if (!application) return fail(res, 404, 'NOT_FOUND', 'Application not found');
  if (application.status !== 'PENDING') return fail(res, 400, 'ALREADY_DECIDED', 'This application was already decided');
  const applicant = await findUserById(application.user_id);
  if (!applicant) return fail(res, 404, 'NOT_FOUND', 'Applicant account no longer exists');

  await updateUserRole(applicant.id, 'ASTROLOGIST');
  await insertAstrologerForUser(applicant.id, applicant.name, application.expertise);
  await decideApplication(application.id, 'APPROVED');
  await audit(req, 'application.approve', applicant.email);
  res.json({ success: true, data: { ok: true } });
});

adminRouter.post('/astrologer-applications/:id/reject', async (req, res) => {
  const application = await findApplicationById(req.params.id);
  if (!application) return fail(res, 404, 'NOT_FOUND', 'Application not found');
  if (application.status !== 'PENDING') return fail(res, 400, 'ALREADY_DECIDED', 'This application was already decided');
  await decideApplication(application.id, 'REJECTED');
  const applicant = await findUserById(application.user_id);
  await audit(req, 'application.reject', applicant?.email || application.user_id);
  res.json({ success: true, data: { ok: true } });
});

// ── Consultations (real bookings, replacing the old fake admin rows) ────

const pageSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

adminRouter.get('/consultations', async (req, res) => {
  const parsed = pageSchema.safeParse(req.query);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  const { rows, total } = await listAllConsultations(parsed.data.page, parsed.data.limit);
  res.json({ success: true, data: rows, pagination: { ...parsed.data, total } });
});

// ── Audit log ────────────────────────────────────────────────────────────

adminRouter.get('/audit-log', async (req, res) => {
  const parsed = pageSchema.safeParse(req.query);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  res.json({ success: true, data: await listAuditLog(parsed.data.page, parsed.data.limit) });
});

// Lets the admin console log a manual note (e.g. "requested more info from
// an applicant") that isn't tied to any other state-changing action here.
const auditNoteSchema = z.object({ action: z.string().trim().min(1).max(100), target: z.string().trim().min(1).max(200) });

adminRouter.post('/audit-log', async (req, res) => {
  const parsed = auditNoteSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  await audit(req, parsed.data.action, parsed.data.target);
  res.status(201).json({ success: true, data: { ok: true } });
});
