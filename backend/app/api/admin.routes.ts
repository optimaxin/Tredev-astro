import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import { findUserById, listAllUsers, updateUserRole, updateUserStatus } from '../repositories/userRepository.ts';
import { toPublicUser } from '../models/user.ts';
import { deactivateAstrologerByUserId, insertAstrologerForUser, updateAstrologerProfile } from '../repositories/astrologerRepository.ts';
import { toPublicAstrologerProfile } from '../models/astrologer.ts';
import { countForUser, countInProgress, listAllConsultations, listRecentWithAstrologerName } from '../repositories/consultationRepository.ts';
import { listAuditLog, logAdminAction } from '../repositories/auditLogRepository.ts';
import { register, AuthError } from '../services/authService.ts';
import { createBlogPost, deleteBlogPost } from '../repositories/blogRepository.ts';
import { toPublicBlogPost } from '../models/blogPost.ts';
import { createBroadcast, deactivateBroadcast, listAllBroadcasts } from '../repositories/broadcastRepository.ts';
import { toPublicBroadcast } from '../models/broadcast.ts';
import { countPurchasesForUser, getPurchaseStats, listAllPurchases, listRecentPurchases } from '../repositories/reportPurchaseRepository.ts';
import { countOrdersForUser, getOrderStats, listAllOrders, listRecentDeliveredOrders, updateOrderDeliveryStatus } from '../repositories/orderRepository.ts';
import { orderDisplayId, toPublicOrder } from '../models/order.ts';
import { ADMIN_SECTIONS, deleteStaffPermissions, getStaffPermissions, setStaffPermissions } from '../repositories/staffPermissionRepository.ts';
import type { AdminSectionKey } from '../repositories/staffPermissionRepository.ts';

export const adminRouter = Router();

// Every route here requires a real, JWT-verified account — unlike the older
// mock-trust realtime routes in routes.ts, there is no client-supplied
// identity trusted anywhere in this file.
//
// ADMIN always has every section. STAFF's access is per-account and
// per-section, not a single hardcoded slice — see requireSection below,
// which checks the requesting STAFF user's own row in staff_permissions
// (managed from the admin's Staff page, see the "Staff & Admin accounts"
// block near the bottom of this file). Managing staff/admin accounts
// themselves (who exists, what they can reach) is never itself a
// toggleable section — those routes stay adminOnly unconditionally.
adminRouter.use(requireAuth);
const adminOnly = requireRole('ADMIN');
const staffOrAdmin = requireRole('ADMIN', 'STAFF');

function requireSection(section: AdminSectionKey) {
  return async (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
    if (req.user!.role === 'ADMIN') return next();
    if (req.user!.role !== 'STAFF') return fail(res, 403, 'FORBIDDEN', 'Insufficient permissions');
    const sections = await getStaffPermissions(req.user!.id);
    if (!sections.includes(section)) return fail(res, 403, 'FORBIDDEN', 'You do not have access to this section');
    next();
  };
}

async function audit(req: import('express').Request, action: string, target: string) {
  const actor = await findUserById(req.user!.id);
  await logAdminAction(req.user!.id, actor?.name || req.user!.id, action, target);
}

function fail(res: import('express').Response, status: number, code: string, message: string) {
  res.status(status).json({ success: false, error: { code, message } });
}

// ── Users ────────────────────────────────────────────────────────────────

// Deliberately broader than requireSection('users'): the account list is
// shared foundational data several OTHER sections build on (Astrologers
// filters it to role=ASTROLOGIST, Staff filters it to STAFF/ADMIN, Overview
// derives KPI counts from it) — gating the read itself behind the Users
// section specifically would break those other sections for a staff member
// who has them but not Users. The actual Users-management actions below
// (suspend, role change) stay properly section-gated.
adminRouter.get('/users', staffOrAdmin, async (_req, res) => {
  const rows = await listAllUsers();
  res.json({ success: true, data: rows.map(toPublicUser) });
});

const statusSchema = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED']) });

adminRouter.patch('/users/:id/status', requireSection('users'), async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  const target = await findUserById(req.params.id as string);
  if (!target) return fail(res, 404, 'NOT_FOUND', 'User not found');
  // A STAFF account granted the Users section still can't touch another
  // Staff or Admin account's status — only an actual Admin can do that.
  if (req.user!.role === 'STAFF' && (target.role === 'ADMIN' || target.role === 'STAFF')) {
    return fail(res, 403, 'FORBIDDEN', 'Only an admin can change a Staff or Admin account');
  }
  await updateUserStatus(target.id, parsed.data.status);
  await audit(req, `user.status.${parsed.data.status.toLowerCase()}`, target.email);
  res.json({ success: true, data: { ok: true } });
});

const roleSchema = z.object({ role: z.enum(['USER', 'ASTROLOGIST', 'STAFF', 'ADMIN']) });

// STAFF can reach this route (if granted the Users section) but only to
// assign USER/ASTROLOGIST on a target that isn't itself Staff/Admin —
// granting Staff/Admin, or touching an existing Staff/Admin account at all,
// is an ADMIN-exclusive privilege, checked here rather than at the route
// level since the permitted target roles depend on who's asking.
adminRouter.patch('/users/:id/role', requireSection('users'), async (req, res) => {
  const parsed = roleSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  const target = await findUserById(req.params.id as string);
  if (!target) return fail(res, 404, 'NOT_FOUND', 'User not found');
  if (req.user!.role === 'STAFF') {
    if (parsed.data.role === 'ADMIN' || parsed.data.role === 'STAFF') return fail(res, 403, 'FORBIDDEN', 'Only an admin can grant Staff or Admin access');
    if (target.role === 'ADMIN' || target.role === 'STAFF') return fail(res, 403, 'FORBIDDEN', 'Only an admin can change a Staff or Admin account');
  }
  await updateUserRole(target.id, parsed.data.role);
  if (parsed.data.role !== 'STAFF') await deleteStaffPermissions(target.id);
  // Leaving the Astrologer role should also take them out of the public
  // bookable catalog — otherwise the catalog row is orphaned but still
  // publicly listed (see deactivateAstrologerByUserId's own comment).
  if (target.role === 'ASTROLOGIST' && parsed.data.role !== 'ASTROLOGIST') await deactivateAstrologerByUserId(target.id);
  await audit(req, `user.role.${parsed.data.role.toLowerCase()}`, target.email);
  res.json({ success: true, data: { ok: true } });
});

// One combined summary instead of 3 separate count endpoints — the Users
// drawer only ever needs all three at once (see UsersPage.tsx), and this
// keeps it to a single fetch when the drawer opens.
adminRouter.get('/users/:id/activity', requireSection('users'), async (req, res) => {
  const target = await findUserById(req.params.id as string);
  if (!target) return fail(res, 404, 'NOT_FOUND', 'User not found');
  const [reports, consultations, orders] = await Promise.all([
    countPurchasesForUser(target.id),
    countForUser(target.email),
    countOrdersForUser(target.id),
  ]);
  res.json({ success: true, data: { reports, consultations, orders } });
});

// ── Astrologers ──────────────────────────────────────────────────────────

// Admin/staff directly onboarding an astrologer — creates a real user
// account (real password, hashed) and an immediately-bookable catalog row
// in one step. Removing an astrologer reuses PATCH /users/:id/role (set
// role back to USER) rather than a dedicated endpoint — same mechanism the
// Users page already uses for role changes.
const addAstrologerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
});

adminRouter.post('/astrologers', requireSection('astrologers'), async (req, res) => {
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

// The rest of an astrologer's catalog profile — title, bio, experience,
// languages, pricing, etc. — never had an edit path at all before this;
// insertAstrologerForUser's own comment flagged it as a "complete your
// profile" follow-up that wasn't built yet. `name` isn't included: it
// mirrors the linked user account's name, which the admin UI matches
// catalog rows to accounts by (see AstrologersPage.tsx's joinedProfile).
const editAstrologerSchema = z.object({
  title: z.string().trim().min(1).max(100),
  bio: z.string().trim().max(2000),
  avatar: z.string().trim().max(500),
  languages: z.array(z.string().trim().min(1).max(40)).max(20),
  categories: z.array(z.string().trim().min(1).max(40)).max(20),
  expertise: z.array(z.string().trim().min(1).max(40)).max(20),
  consultationTypes: z.array(z.enum(['chat', 'voice', 'video'])).min(1),
  chatPrice: z.number().int().min(0).max(100000),
  callPrice: z.number().int().min(0).max(100000),
  videoPrice: z.number().int().min(0).max(100000),
  experienceYears: z.number().int().min(0).max(80),
});

adminRouter.patch('/astrologers/:id', requireSection('astrologers'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return fail(res, 422, 'VALIDATION_ERROR', 'id must be an integer');
  const parsed = editAstrologerSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  const row = await updateAstrologerProfile(id, parsed.data);
  if (!row) return fail(res, 404, 'NOT_FOUND', 'Astrologer not found');
  await audit(req, 'astrologer.profile.update', row.name);
  res.json({ success: true, data: toPublicAstrologerProfile(row) });
});

// ── Dashboard (Overview page KPIs + recent activity) ────────────────────

adminRouter.get('/dashboard-stats', requireSection('overview'), async (_req, res) => {
  const [consultationsInProgress, purchaseStats, orderStats, recentConsultations, recentPurchases, recentDeliveredOrders] = await Promise.all([
    countInProgress(),
    getPurchaseStats(),
    getOrderStats(),
    listRecentWithAstrologerName(3),
    listRecentPurchases(3),
    listRecentDeliveredOrders(3),
  ]);
  res.json({
    success: true,
    data: {
      consultationsInProgress,
      revenue: purchaseStats.total + orderStats.total,
      reportsGenerated: purchaseStats.count,
      storeOrders: orderStats.count,
      recentConsultations: recentConsultations.map(c => ({ id: c.id, userName: c.userName, astrologerName: c.astrologerName, createdAt: c.createdAt })),
      recentPurchases: recentPurchases.map(r => ({ id: r.id, userName: r.user_name, reportTitle: r.report_title, purchasedAt: Number(r.purchased_at) })),
      recentDeliveredOrders: recentDeliveredOrders.map(o => ({ id: orderDisplayId(o.id), createdAt: Number(o.created_at) })),
    },
  });
});

// ── Consultations (real bookings) ───────────────────────────────────────

const pageSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

adminRouter.get('/consultations', requireSection('consultations'), async (req, res) => {
  const parsed = pageSchema.safeParse(req.query);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  const { rows, total } = await listAllConsultations(parsed.data.page, parsed.data.limit);
  res.json({ success: true, data: rows, pagination: { ...parsed.data, total } });
});

// ── Report purchases ─────────────────────────────────────────────────────

adminRouter.get('/report-purchases', requireSection('reports'), async (req, res) => {
  const parsed = pageSchema.safeParse(req.query);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  const { rows, total } = await listAllPurchases(parsed.data.page, parsed.data.limit);
  const data = rows.map(r => ({
    id: r.id, userName: r.user_name, userEmail: r.user_email, reportTitle: r.report_title,
    bundle: r.bundle, amount: r.amount, purchasedAt: Number(r.purchased_at),
  }));
  res.json({ success: true, data, pagination: { ...parsed.data, total } });
});

// ── Orders (Store product orders) ────────────────────────────────────────

adminRouter.get('/orders', requireSection('orders'), async (req, res) => {
  const parsed = pageSchema.safeParse(req.query);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  const { rows, total } = await listAllOrders(parsed.data.page, parsed.data.limit);
  const data = rows.map(r => ({ ...toPublicOrder(r), customerName: r.user_name, customerEmail: r.user_email }));
  res.json({ success: true, data, pagination: { ...parsed.data, total } });
});

const deliveryStatusSchema = z.object({ deliveryStatus: z.enum(['PROCESSING', 'SHIPPED', 'DELIVERED']) });

adminRouter.patch('/orders/:id/delivery-status', requireSection('orders'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return fail(res, 422, 'VALIDATION_ERROR', 'id must be an integer');
  const parsed = deliveryStatusSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  const row = await updateOrderDeliveryStatus(id, parsed.data.deliveryStatus);
  if (!row) return fail(res, 404, 'NOT_FOUND', 'Order not found');
  await audit(req, `order.delivery.${parsed.data.deliveryStatus.toLowerCase()}`, orderDisplayId(id));
  res.json({ success: true, data: toPublicOrder(row) });
});

// ── Audit log ────────────────────────────────────────────────────────────

adminRouter.get('/audit-log', requireSection('audit'), async (req, res) => {
  const parsed = pageSchema.safeParse(req.query);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  res.json({ success: true, data: await listAuditLog(parsed.data.page, parsed.data.limit) });
});

// Lets the admin console log a manual note that isn't tied to any other
// state-changing action here.
const auditNoteSchema = z.object({ action: z.string().trim().min(1).max(100), target: z.string().trim().min(1).max(200) });

adminRouter.post('/audit-log', requireSection('audit'), async (req, res) => {
  const parsed = auditNoteSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  await audit(req, parsed.data.action, parsed.data.target);
  res.status(201).json({ success: true, data: { ok: true } });
});

// ── Blog posts (add/remove — editing the journal shown on the homepage) ──

// Minimums raised past a single test word (e.g. "Xyz") — not a content
// moderation system, just a floor against an obviously-unfinished post
// reaching the live homepage (see listBlogPosts' featured-first ordering
// for the other half of this fix).
const blogPostSchema = z.object({
  title: z.string().trim().min(8).max(200),
  category: z.string().trim().min(1).max(50),
  readTime: z.string().trim().min(1).max(30),
  excerpt: z.string().trim().min(30).max(500),
  content: z.string().trim().min(1).max(20000),
  tag: z.string().trim().min(1).max(50),
  featured: z.boolean().default(false),
});

adminRouter.post('/blog', requireSection('blog'), async (req, res) => {
  const parsed = blogPostSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  const row = await createBlogPost(parsed.data);
  await audit(req, 'blog.create', row.title);
  res.status(201).json({ success: true, data: toPublicBlogPost(row) });
});

adminRouter.delete('/blog/:id', requireSection('blog'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return fail(res, 422, 'VALIDATION_ERROR', 'id must be an integer');
  await deleteBlogPost(id);
  await audit(req, 'blog.delete', String(id));
  res.json({ success: true, data: { ok: true } });
});

// ── Broadcasts (site-wide admin announcements) ──────────────────────────

adminRouter.get('/broadcasts', requireSection('notifications'), async (_req, res) => {
  res.json({ success: true, data: (await listAllBroadcasts()).map(toPublicBroadcast) });
});

const broadcastSchema = z.object({ message: z.string().trim().min(1).max(500) });

adminRouter.post('/broadcasts', requireSection('notifications'), async (req, res) => {
  const parsed = broadcastSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  const row = await createBroadcast(parsed.data.message, req.user!.id);
  await audit(req, 'broadcast.create', parsed.data.message.slice(0, 80));
  res.status(201).json({ success: true, data: toPublicBroadcast(row) });
});

adminRouter.delete('/broadcasts/:id', requireSection('notifications'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return fail(res, 422, 'VALIDATION_ERROR', 'id must be an integer');
  await deactivateBroadcast(id);
  await audit(req, 'broadcast.deactivate', String(id));
  res.json({ success: true, data: { ok: true } });
});

// ── Staff & Admin accounts ───────────────────────────────────────────────
// Always adminOnly, regardless of any Staff permission toggle — who has
// admin-console access at all is not itself a delegable section.

adminRouter.get('/staff', adminOnly, async (_req, res) => {
  const rows = (await listAllUsers()).filter(u => u.role === 'STAFF' || u.role === 'ADMIN');
  const data = await Promise.all(rows.map(async u => ({
    ...toPublicUser(u),
    sections: u.role === 'ADMIN' ? [...ADMIN_SECTIONS] : await getStaffPermissions(u.id),
  })));
  res.json({ success: true, data });
});

const addStaffSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
  role: z.enum(['STAFF', 'ADMIN']),
});

// A brand new Staff account starts with this much access rather than
// nothing — matches what STAFF used to get automatically before per-account
// toggles existed, so a freshly added Staff member isn't locked out of
// everything until the admin remembers to go flip switches. Admin can
// still narrow or widen it right away from the Manage Access drawer.
const DEFAULT_STAFF_SECTIONS: AdminSectionKey[] = ['overview', 'astrologers', 'users'];

adminRouter.post('/staff', adminOnly, async (req, res) => {
  const parsed = addStaffSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  try {
    const { user } = await register(parsed.data);
    if (parsed.data.role === 'STAFF') await setStaffPermissions(user.id, DEFAULT_STAFF_SECTIONS);
    await audit(req, `${parsed.data.role.toLowerCase()}.create`, user.email);
    res.status(201).json({ success: true, data: user });
  } catch (e) {
    if (e instanceof AuthError) return fail(res, e.status, 'AUTH_ERROR', e.message);
    throw e;
  }
});

const permissionsSchema = z.object({ sections: z.array(z.enum(ADMIN_SECTIONS)) });

adminRouter.patch('/staff/:id/permissions', adminOnly, async (req, res) => {
  const parsed = permissionsSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  const target = await findUserById(req.params.id as string);
  if (!target) return fail(res, 404, 'NOT_FOUND', 'User not found');
  if (target.role !== 'STAFF') return fail(res, 400, 'NOT_STAFF', 'Only a Staff account has toggleable permissions — Admin already has full access');
  await setStaffPermissions(target.id, parsed.data.sections);
  await audit(req, 'staff.permissions.update', target.email);
  res.json({ success: true, data: { sections: parsed.data.sections } });
});

// A Staff/Admin account fetching its OWN permitted sections — the admin
// console uses this to decide what to render for a Staff session instead
// of a hardcoded section list.
adminRouter.get('/my-permissions', async (req, res) => {
  if (req.user!.role === 'ADMIN') return res.json({ success: true, data: { sections: [...ADMIN_SECTIONS] } });
  if (req.user!.role !== 'STAFF') return fail(res, 403, 'FORBIDDEN', 'Insufficient permissions');
  res.json({ success: true, data: { sections: await getStaffPermissions(req.user!.id) } });
});
