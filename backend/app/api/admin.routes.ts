import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import bcrypt from 'bcryptjs';
import { findUserById, listAllUsers, updatePasswordHash, updateUserName, updateUserRole, updateUserStatus } from '../repositories/userRepository.ts';
import { toPublicUser } from '../models/user.ts';
import { deactivateAstrologerByUserId, findAstrologerById, listAllAstrologersRaw, updateAstrologerProfile, updateBoostPayoutOverride } from '../repositories/astrologerRepository.ts';
import { toPublicAstrologerProfile } from '../models/astrologer.ts';
import { countCompletedByAstrologerAndType, countForUser, countInProgress, findAllForAstrologer, findAllForUser, listAllConsultations, listRecentWithAstrologerName } from '../repositories/consultationRepository.ts';
import type { Consultation } from '../models/types.ts';
import { listMessagesForConsultation } from '../repositories/chatMessageRepository.ts';
import { listAuditLog, listAuditLogForTarget, logAdminAction } from '../repositories/auditLogRepository.ts';
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
import { listPublicAstrologers } from '../services/realtimeStore.ts';
import { getActiveBoost } from '../repositories/boostRepository.ts';
import { getBoostPayoutSharePercent, setBoostPayoutSharePercent } from '../repositories/platformSettingsRepository.ts';
import { decideApplication, findApplicationById, listApplicationsWithUsers } from '../repositories/astrologerApplicationRepository.ts';
import { insertAstrologerForUser } from '../repositories/astrologerRepository.ts';
import { createPricingRegion, deletePricingRegion, findPricingRegionById, listPricingRegions, updatePricingRegion } from '../repositories/pricingRegionRepository.ts';
import { toPublicPricingRegion } from '../models/pricingRegion.ts';
import { deleteOverride, listOverridesForAdmin, upsertOverride } from '../repositories/astrologerRegionPriceRepository.ts';
import { parseCsv, toCsvRow } from '../services/csv.ts';

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

// Chat-audit payload for the Users/Astrologers profile drawer — the most
// recent few consultations for that person, each with its full message
// transcript, so a staff/admin reviewer can see who they were talking to
// and what was actually said without needing to be a chat participant
// (listMessagesForConsultation has no participant check, unlike
// chatService.listMessages, which is exactly why the audit surface uses it
// directly instead of going through the chat service).
const CHAT_AUDIT_CONSULTATIONS = 3;
const CHAT_AUDIT_MESSAGES = 30;

async function buildChatAudit(consultations: Consultation[], partnerName: (c: Consultation) => Promise<string> | string) {
  return Promise.all(consultations.slice(0, CHAT_AUDIT_CONSULTATIONS).map(async c => ({
    consultationId: c.id,
    partnerName: await partnerName(c),
    type: c.type,
    status: c.status,
    startedAt: c.startedAt,
    endedAt: c.endedAt,
    messages: (await listMessagesForConsultation(c.id)).slice(-CHAT_AUDIT_MESSAGES)
      .map(m => ({ senderRole: m.senderRole, messageType: m.messageType, content: m.content, createdAt: m.createdAt })),
  })));
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
// keeps it to a single fetch when the drawer opens. Also carries the chat
// audit trail (recentChats) and the most recent admin-logged action against
// this user (lastAction) — no revenue/money figures anywhere in here, this
// is purely the "who did they talk to and what happened" surface Staff uses
// to audit for miscommunication (see POST /audit-log for raising a warning).
adminRouter.get('/users/:id/activity', requireSection('users'), async (req, res) => {
  const target = await findUserById(req.params.id as string);
  if (!target) return fail(res, 404, 'NOT_FOUND', 'User not found');
  const [reports, consultations, orders, allConsultations, lastAction] = await Promise.all([
    countPurchasesForUser(target.id),
    countForUser(target.email),
    countOrdersForUser(target.id),
    findAllForUser(target.email),
    listAuditLogForTarget(target.email, 1),
  ]);
  const recentChats = await buildChatAudit(allConsultations, async c => (await findAstrologerById(c.astrologerId))?.name ?? 'Unknown astrologer');
  res.json({
    success: true,
    data: {
      reports, consultations, orders, recentChats,
      lastAction: lastAction[0] ? { action: lastAction[0].action, at: lastAction[0].created_at } : null,
    },
  });
});

// ── Astrologer applications ─────────────────────────────────────────────
// The actual "add an astrologer" path now that direct admin-onboarding is
// gone (see the Astrologers section comment below): a user applies from
// the public site (POST /api/astrologers/applications), and this is where
// that application gets approved or rejected. astrologerApplicationRepository
// already had listApplicationsWithUsers/decideApplication and
// insertAstrologerForUser was already written for exactly this — none of
// it had a route in front of it before now.

adminRouter.get('/applications', requireSection('applications'), async (_req, res) => {
  res.json({ success: true, data: await listApplicationsWithUsers() });
});

const decideApplicationSchema = z.object({ decision: z.enum(['APPROVED', 'REJECTED']) });

adminRouter.post('/applications/:id/decide', requireSection('applications'), async (req, res) => {
  const parsed = decideApplicationSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  const application = await findApplicationById(req.params.id as string);
  if (!application) return fail(res, 404, 'NOT_FOUND', 'Application not found');
  if (application.status !== 'PENDING') return fail(res, 409, 'ALREADY_DECIDED', 'This application was already decided');
  const applicant = await findUserById(application.user_id);
  if (!applicant) return fail(res, 404, 'NOT_FOUND', 'Applicant account not found');

  await decideApplication(application.id, parsed.data.decision);
  if (parsed.data.decision === 'APPROVED') {
    await updateUserRole(applicant.id, 'ASTROLOGIST');
    await insertAstrologerForUser(applicant.id, applicant.name, application.expertise);
  }
  await audit(req, `application.${parsed.data.decision.toLowerCase()}`, applicant.email);
  res.json({ success: true, data: { ok: true } });
});

// ── Astrologers ──────────────────────────────────────────────────────────
// Direct admin-onboarding ("Add Astrologer") was removed per explicit
// request — astrologer accounts come from the apply/approve flow now.
// Removing one still reuses PATCH /users/:id/role (set role back to USER),
// same mechanism the Users page already uses for role changes.

// Real per-astrologer revenue, replacing the old `price * totalConsultations`
// estimate the Astrologers page used to show (which used the CHAT price
// for every consultation type, and counted every consultation regardless
// of whether it was ever actually completed). Grouped by type and summed
// from each session's own locked price_per_min (set at booking time by
// pricingEngine.ts, reflecting whatever offer/loyalty/Boost applied then) —
// same methodology chat.routes.ts's mine-as-astrologer uses.
// Who's actually online/available/busy/away right now — from the same
// in-memory realtime state that drives the public booking page's live
// badges (realtimeStore.ts), not anything derived from account status.
// Staff-visible: no money in here, just live availability.
adminRouter.get('/astrologers/status', requireSection('astrologers'), async (_req, res) => {
  const [rows, astrologers, defaultPayoutShare] = await Promise.all([
    listPublicAstrologers(), listAllAstrologersRaw(), getBoostPayoutSharePercent(),
  ]);
  const overrideById = new Map(astrologers.map(a => [a.id, a.boost_payout_override_percent]));
  // Also folds in whether each astrologer currently has an active Boost
  // (Extra/Boost Feature PDF) and their payout-share override, if staff set
  // one — there was previously no admin/staff-facing surface for any of
  // this, only the astrologer's own /me/boost view.
  const data = await Promise.all(rows.map(async r => {
    const boostPayoutOverridePercent = overrideById.get(r.id) ?? null;
    return {
      ...r,
      activeBoost: !!(await getActiveBoost(r.id)),
      boostPayoutOverridePercent,
      effectiveBoostPayoutSharePercent: boostPayoutOverridePercent ?? defaultPayoutShare,
    };
  }));
  res.json({ success: true, data });
});

const boostPayoutOverrideSchema = z.object({ percent: z.number().int().min(0).max(100).nullable() });

// Per-astrologer override of the global Boost payout share — null clears it
// (falls back to /settings/boost-payout's platform default). Lives under
// Astrologers, not Settings, since it's staff acting on one specific
// astrologer rather than a platform-wide number.
adminRouter.patch('/astrologers/:id/boost-payout', requireSection('astrologers'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return fail(res, 422, 'VALIDATION_ERROR', 'id must be an integer');
  const parsed = boostPayoutOverrideSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  const row = await updateBoostPayoutOverride(id, parsed.data.percent);
  if (!row) return fail(res, 404, 'NOT_FOUND', 'Astrologer not found');
  await audit(req, 'astrologer.boost_payout.update', `${row.name}: ${parsed.data.percent ?? 'default'}%`);
  res.json({ success: true, data: { boostPayoutOverridePercent: row.boost_payout_override_percent } });
});

// Money, unconditionally admin-only — a Staff account never sees this even
// if granted the Astrologers section, unlike every other route in this
// block. Revenue is the one thing Staff is never delegated (see also
// dashboard-stats below, which strips its own revenue figure for STAFF).
adminRouter.get('/astrologers/revenue', adminOnly, async (_req, res) => {
  const [astrologers, counts] = await Promise.all([listAllAstrologersRaw(), countCompletedByAstrologerAndType()]);

  const byAstrologer: Record<number, { chatCount: number; chatRevenue: number; voiceCount: number; voiceRevenue: number; videoCount: number; videoRevenue: number; astrologerPayout: number }> = {};
  for (const a of astrologers) byAstrologer[a.id] = { chatCount: 0, chatRevenue: 0, voiceCount: 0, voiceRevenue: 0, videoCount: 0, videoRevenue: 0, astrologerPayout: 0 };
  for (const c of counts) {
    const bucket = byAstrologer[c.astrologerId];
    if (!bucket) continue;
    // c.revenue is the SUM of each completed session's own locked
    // price_per_min — already offer/loyalty-adjusted, not the astrologer's
    // current catalog price. c.astrologerPayout additionally applies each
    // Boost-attributed session's own locked payout share (see
    // countCompletedByAstrologerAndType) — equal to c.revenue for anything
    // not Boost-attributed.
    if (c.type === 'chat') { bucket.chatCount += c.count; bucket.chatRevenue += c.revenue; }
    else if (c.type === 'voice') { bucket.voiceCount += c.count; bucket.voiceRevenue += c.revenue; }
    else if (c.type === 'video') { bucket.videoCount += c.count; bucket.videoRevenue += c.revenue; }
    bucket.astrologerPayout += c.astrologerPayout;
  }

  const data = astrologers.map(a => {
    const b = byAstrologer[a.id]!;
    const totalRevenue = b.chatRevenue + b.voiceRevenue + b.videoRevenue;
    return {
      astrologerId: a.id, astrologerName: a.name,
      chatCount: b.chatCount, chatRevenue: b.chatRevenue,
      voiceCount: b.voiceCount, voiceRevenue: b.voiceRevenue,
      videoCount: b.videoCount, videoRevenue: b.videoRevenue,
      totalRevenue,
      // Boost-adjusted split — equal to totalRevenue/0 when nothing here was
      // ever Boost-attributed (see comment above).
      astrologerPayout: b.astrologerPayout,
      platformShare: totalRevenue - b.astrologerPayout,
    };
  }).sort((x, y) => y.totalRevenue - x.totalRevenue);

  res.json({ success: true, data });
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

// Same audit surface as /users/:id/activity, mirrored for the Astrologers
// profile drawer — no revenue here either, just chat/last-action audit.
adminRouter.get('/astrologers/:id/activity', requireSection('astrologers'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return fail(res, 422, 'VALIDATION_ERROR', 'id must be an integer');
  const astro = await findAstrologerById(id);
  if (!astro) return fail(res, 404, 'NOT_FOUND', 'Astrologer not found');
  const [allConsultations, lastAction] = await Promise.all([
    findAllForAstrologer(id),
    listAuditLogForTarget(astro.name, 1),
  ]);
  const recentChats = await buildChatAudit(allConsultations, c => c.userName || c.userEmail);
  res.json({
    success: true,
    data: {
      consultations: allConsultations.length,
      recentChats,
      lastAction: lastAction[0] ? { action: lastAction[0].action, at: lastAction[0].created_at } : null,
    },
  });
});

// ── Dashboard (Overview page KPIs + recent activity) ────────────────────

adminRouter.get('/dashboard-stats', requireSection('overview'), async (req, res) => {
  const [consultationsInProgress, purchaseStats, orderStats, recentConsultations, recentPurchases, recentDeliveredOrders] = await Promise.all([
    countInProgress(),
    getPurchaseStats(),
    getOrderStats(),
    listRecentWithAstrologerName(3),
    listRecentPurchases(3),
    listRecentDeliveredOrders(3),
  ]);
  // Staff never sees the revenue figure — same rule as GET
  // /astrologers/revenue, just enforced by omission instead of a route
  // gate since this KPI set is otherwise legitimately Staff-visible.
  res.json({
    success: true,
    data: {
      consultationsInProgress,
      ...(req.user!.role === 'STAFF' ? {} : { revenue: purchaseStats.total + orderStats.total }),
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

// ── Platform settings ────────────────────────────────────────────────────

adminRouter.get('/settings/boost-payout', requireSection('settings'), async (_req, res) => {
  res.json({ success: true, data: { percent: await getBoostPayoutSharePercent() } });
});

const boostPayoutSchema = z.object({ percent: z.number().int().min(0).max(100) });

// Only affects Boosts activated AFTER this change — see boostRepository.ts's
// activateBoost, which locks the value in at that moment.
adminRouter.patch('/settings/boost-payout', requireSection('settings'), async (req, res) => {
  const parsed = boostPayoutSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  await setBoostPayoutSharePercent(parsed.data.percent);
  await audit(req, 'settings.boost_payout.update', `${parsed.data.percent}%`);
  res.json({ success: true, data: { percent: parsed.data.percent } });
});

// ── Pricing regions (region-wise consultation pricing) ──────────────────
// A visitor's IP-detected country (geoLocation.ts) is matched against a
// region's country codes, and that region's multiplier is applied on top of
// an astrologer's own price everywhere a price is shown or charged — see
// pricingEngine.ts's computeRegionAdjustedPrice and its 3 call sites
// (astrologers.routes.ts's catalog + effective-price, and
// realtimeStore.ts's createConsultation).

adminRouter.get('/pricing-regions', requireSection('pricing'), async (_req, res) => {
  const rows = await listPricingRegions();
  res.json({ success: true, data: rows.map(toPublicPricingRegion) });
});

const pricingRegionSchema = z.object({
  name: z.string().trim().min(1).max(100),
  countryCodes: z.array(z.string().trim().length(2)).min(1),
  priceMultiplier: z.number().positive().max(100),
});

adminRouter.post('/pricing-regions', requireSection('pricing'), async (req, res) => {
  const parsed = pricingRegionSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  const row = await createPricingRegion(parsed.data.name, parsed.data.countryCodes.map(c => c.toUpperCase()), parsed.data.priceMultiplier);
  await audit(req, 'pricing_region.create', `${row.name} (${row.country_codes.join(', ')}) x${row.price_multiplier}`);
  res.status(201).json({ success: true, data: toPublicPricingRegion(row) });
});

adminRouter.patch('/pricing-regions/:id', requireSection('pricing'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return fail(res, 422, 'VALIDATION_ERROR', 'id must be an integer');
  const parsed = pricingRegionSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  const row = await updatePricingRegion(id, parsed.data.name, parsed.data.countryCodes.map(c => c.toUpperCase()), parsed.data.priceMultiplier);
  if (!row) return fail(res, 404, 'NOT_FOUND', 'Region not found');
  await audit(req, 'pricing_region.update', `${row.name} (${row.country_codes.join(', ')}) x${row.price_multiplier}`);
  res.json({ success: true, data: toPublicPricingRegion(row) });
});

adminRouter.delete('/pricing-regions/:id', requireSection('pricing'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return fail(res, 422, 'VALIDATION_ERROR', 'id must be an integer');
  const target = await findPricingRegionById(id);
  if (!target) return fail(res, 404, 'NOT_FOUND', 'Region not found');
  await deletePricingRegion(id);
  await audit(req, 'pricing_region.delete', target.name);
  res.json({ success: true, data: { ok: true } });
});

// ── Per-astrologer, per-region price overrides ──────────────────────────
// A region's multiplier is a quick global knob; this is staff's exact,
// final price for one astrologer in one region — set by hand, one at a
// time, or in bulk via the CSV template/import below. Whichever exists for
// an (astrologer, region) pair wins over the multiplier — see
// pricingEngine.ts's computePriceWithOverride.

adminRouter.get('/astrologer-region-prices', requireSection('pricing'), async (_req, res) => {
  const rows = await listOverridesForAdmin();
  res.json({
    success: true,
    data: rows.map(r => ({
      astrologerId: r.astrologer_id,
      astrologerName: r.astrologer_name,
      regionId: r.region_id,
      regionName: r.region_name,
      chatPrice: r.chat_price,
      callPrice: r.call_price,
      videoPrice: r.video_price,
      updatedAt: Number(r.updated_at),
    })),
  });
});

const overrideSchema = z.object({
  astrologerId: z.number().int(),
  regionId: z.number().int(),
  chatPrice: z.number().nonnegative(),
  callPrice: z.number().nonnegative(),
  videoPrice: z.number().nonnegative(),
});

adminRouter.post('/astrologer-region-prices', requireSection('pricing'), async (req, res) => {
  const parsed = overrideSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  const { astrologerId, regionId, chatPrice, callPrice, videoPrice } = parsed.data;
  const astro = await findAstrologerById(astrologerId);
  if (!astro) return fail(res, 404, 'NOT_FOUND', 'Astrologer not found');
  const region = await findPricingRegionById(regionId);
  if (!region) return fail(res, 404, 'NOT_FOUND', 'Region not found');
  await upsertOverride(astrologerId, regionId, chatPrice, callPrice, videoPrice);
  await audit(req, 'astrologer_region_price.set', `${astro.name} / ${region.name}: chat ₹${chatPrice}, call ₹${callPrice}, video ₹${videoPrice}`);
  res.json({ success: true, data: { astrologerId, astrologerName: astro.name, regionId, regionName: region.name, chatPrice, callPrice, videoPrice, updatedAt: Date.now() } });
});

adminRouter.delete('/astrologer-region-prices/:astrologerId/:regionId', requireSection('pricing'), async (req, res) => {
  const astrologerId = Number(req.params.astrologerId);
  const regionId = Number(req.params.regionId);
  if (!Number.isInteger(astrologerId) || !Number.isInteger(regionId)) return fail(res, 422, 'VALIDATION_ERROR', 'ids must be integers');
  await deleteOverride(astrologerId, regionId);
  await audit(req, 'astrologer_region_price.remove', `astrologer #${astrologerId} / region #${regionId}`);
  res.json({ success: true, data: { ok: true } });
});

// CSV template: one row per astrologer × region, pre-filled with today's
// value (an existing override, else the astrologer's own plain price) so
// staff edits a real spreadsheet in one sitting instead of a blank one.
// astrologer_id/region_id are what import actually matches on; name/
// experience/category are there only so staff can read the sheet.
adminRouter.get('/astrologer-region-prices/csv-template', requireSection('pricing'), async (_req, res) => {
  const [astrologers, regions, overrides] = await Promise.all([
    listAllAstrologersRaw(), listPricingRegions(), listOverridesForAdmin(),
  ]);
  const overrideMap = new Map(overrides.map(o => [`${o.astrologer_id}:${o.region_id}`, o]));
  const header = ['astrologer_id', 'astrologer_name', 'experience_years', 'category', 'region_id', 'region_name', 'chat_price', 'call_price', 'video_price'];
  const lines = [toCsvRow(header)];
  for (const a of astrologers) {
    const category = (JSON.parse(a.categories || '[]')[0]) || '';
    for (const r of regions) {
      const o = overrideMap.get(`${a.id}:${r.id}`);
      lines.push(toCsvRow([
        a.id, a.name, a.experience_years, category, r.id, r.name,
        o ? o.chat_price : a.chat_price,
        o ? o.call_price : a.call_price,
        o ? o.video_price : a.video_price,
      ]));
    }
  }
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="astrologer-region-pricing.csv"');
  res.send(lines.join('\n'));
});

// CSV import: staff downloads the template above, edits the price columns in
// a spreadsheet, and re-uploads the same file — astrologer_id/region_id
// columns are matched, every other column is ignored.
adminRouter.post('/astrologer-region-prices/csv-import', requireSection('pricing'), async (req, res) => {
  const csv = String(req.body?.csv || '');
  if (!csv.trim()) return fail(res, 422, 'VALIDATION_ERROR', 'csv is required');
  const rows = parseCsv(csv);
  if (rows.length < 2) return fail(res, 422, 'VALIDATION_ERROR', 'CSV has no data rows');
  const header = rows[0].map(h => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const aIdx = col('astrologer_id'), rIdx = col('region_id'), chatIdx = col('chat_price'), callIdx = col('call_price'), videoIdx = col('video_price');
  if ([aIdx, rIdx, chatIdx, callIdx, videoIdx].some(i => i === -1)) {
    return fail(res, 422, 'VALIDATION_ERROR', 'CSV must have astrologer_id, region_id, chat_price, call_price, video_price columns');
  }
  let updated = 0;
  const errors: string[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    if (cols.length <= 1 && !cols[0]) continue;
    const astrologerId = Number(cols[aIdx]);
    const regionId = Number(cols[rIdx]);
    const chatPrice = Number(cols[chatIdx]);
    const callPrice = Number(cols[callIdx]);
    const videoPrice = Number(cols[videoIdx]);
    if (![astrologerId, regionId, chatPrice, callPrice, videoPrice].every(Number.isFinite)) {
      errors.push(`Row ${i + 1}: invalid numbers`);
      continue;
    }
    await upsertOverride(astrologerId, regionId, chatPrice, callPrice, videoPrice);
    updated++;
  }
  await audit(req, 'astrologer_region_price.import', `${updated} row(s) via CSV`);
  res.json({ success: true, data: { updated, errors } });
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
const DEFAULT_STAFF_SECTIONS: AdminSectionKey[] = ['overview', 'applications', 'astrologers', 'users'];

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

// ── My account (Staff/Admin editing their own name/password) ───────────────
// There was previously no "who am I, can I edit it" surface for a Staff/Admin
// account at all — this is self-service only (own row, own JWT identity),
// distinct from the Staff page's admin-on-someone-else management above.
const updateMeSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(8).max(200).optional(),
}).refine(d => d.name || d.newPassword, { message: 'Nothing to update' })
  .refine(d => !d.newPassword || d.currentPassword, { message: 'Current password is required to set a new password' });

adminRouter.patch('/me', staffOrAdmin, async (req, res) => {
  const parsed = updateMeSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  const me = await findUserById(req.user!.id);
  if (!me) return fail(res, 404, 'NOT_FOUND', 'Account not found');
  if (parsed.data.newPassword) {
    if (!bcrypt.compareSync(parsed.data.currentPassword!, me.password_hash)) return fail(res, 401, 'INVALID_PASSWORD', 'Current password is incorrect');
    await updatePasswordHash(me.id, bcrypt.hashSync(parsed.data.newPassword, 12));
  }
  if (parsed.data.name) await updateUserName(me.id, parsed.data.name);
  await audit(req, 'account.profile.update', me.email);
  res.json({ success: true, data: toPublicUser((await findUserById(me.id))!) });
});
