import { Router } from 'express';
import { randomBytes, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import bcrypt from 'bcryptjs';
import { createUser, findUserByEmail, findUserById, listAllUsers, setFreeAiChatSeconds, updatePasswordHash, updateUserName, updateUserRole, updateUserStatus } from '../repositories/userRepository.ts';
import { toPublicUser } from '../models/user.ts';
import { deactivateAstrologerByUserId, deleteAstrologerCascade, findAstrologerById, findAstrologerByIdRaw, findAstrologerByUserId, listAllAstrologersRaw, setAstrologerActive, updateAstrologerProfile, updateBoostPayoutOverride } from '../repositories/astrologerRepository.ts';
import { bus } from '../websocket/bus.ts';
import { toPublicAstrologerProfile } from '../models/astrologer.ts';
import { countCompletedByAstrologerAndType, countForUser, countInProgress, findAllForAstrologer, findAllForUser, listAllConsultations, listRecentWithAstrologerName } from '../repositories/consultationRepository.ts';
import type { Consultation } from '../models/types.ts';
import { listMessagesForConsultation } from '../repositories/chatMessageRepository.ts';
import { listAuditLog, listAuditLogForTarget, logAdminAction } from '../repositories/auditLogRepository.ts';
import { listPageViewsForUser, listRecentRegisteredPageViews, listRecentAnonymousPageViews, listLeads } from '../repositories/pageViewRepository.ts';
import { register, requestPasswordReset, AuthError } from '../services/authService.ts';
import { createBlogPost, deleteBlogPost } from '../repositories/blogRepository.ts';
import { toPublicBlogPost } from '../models/blogPost.ts';
import { deleteShlok, listShloks, upsertShlok } from '../repositories/dailyShlokRepository.ts';
import { toPublicDailyShlok } from '../models/dailyShlok.ts';
import { createBroadcast, deactivateBroadcast, listAllBroadcasts } from '../repositories/broadcastRepository.ts';
import { toPublicBroadcast } from '../models/broadcast.ts';
import { countPurchasesForUser, getPurchaseStats, listAllPurchases, listRecentPurchases } from '../repositories/reportPurchaseRepository.ts';
import { countOrdersForUser, getOrderStats, listAllOrders, listRecentDeliveredOrders, updateOrderDeliveryStatus } from '../repositories/orderRepository.ts';
import { orderDisplayId, toPublicOrder } from '../models/order.ts';
import { ADMIN_SECTIONS, deleteStaffPermissions, getStaffPermissions, setStaffPermissions } from '../repositories/staffPermissionRepository.ts';
import type { AdminSectionKey } from '../repositories/staffPermissionRepository.ts';
import {
  getConversationUsage,
  getFilterOptions,
  getModelUsage,
  getOverview,
  getRequestLogs,
  getTimeseries,
  getUserUsage,
} from '../repositories/aiUsageRepository.ts';
import {
  getDimensionAverages,
  getFeedbackReasons,
  getQualityOverview,
  getQualityTrend,
  getQualityVsCost,
  getResponseDetail,
  listEvaluatedResponses,
} from '../repositories/aiEvaluationRepository.ts';
import { listPublicAstrologers, registerNewAstrologer } from '../services/realtimeStore.ts';
import { getActiveBoost } from '../repositories/boostRepository.ts';
import { getBoostPayoutSharePercent, getNotifyEmails, setBoostPayoutSharePercent, setNotifyEmails } from '../repositories/platformSettingsRepository.ts';
import { createEmailTemplate, deleteEmailTemplate, findEmailTemplateById, listEmailTemplates, updateEmailTemplate } from '../repositories/emailTemplateRepository.ts';
import { listEmailLog } from '../repositories/emailLogRepository.ts';
import { notifyEvent, notifyEventByTemplateId, sendAndLog } from '../services/notificationService.ts';
import { EMAIL_IDENTITY_KEYS } from '../services/emailService.ts';
import { config } from '../core/config.ts';
import { decideApplication, findApplicationById, listApplicationsWithUsers } from '../repositories/astrologerApplicationRepository.ts';
import { insertAstrologerForUser } from '../repositories/astrologerRepository.ts';
import { createPricingRegion, deletePricingRegion, findPricingRegionById, listPricingRegions, updatePricingRegion } from '../repositories/pricingRegionRepository.ts';
import { toPublicPricingRegion } from '../models/pricingRegion.ts';
import { deleteOverride, listOverridesForAdmin, upsertOverride } from '../repositories/astrologerRegionPriceRepository.ts';
import { parseCsv, toCsvRow } from '../services/csv.ts';
import { findCallRecordingData, listCallRecordings } from '../repositories/callRecordingRepository.ts';
import { deleteBanner } from '../repositories/bannerRepository.ts';
import { BannerError, createBanner, editBanner, listBanners } from '../services/bannerService.ts';
import {
  deletePoojaBook, deletePoojaSession, deletePoojaVideo, insertPoojaBook, insertPoojaSession, insertPoojaVideo,
  listAllPoojaSessions, listPoojaBooks, listPoojaVideos,
} from '../repositories/poojaRepository.ts';
import { deleteUnbookedSlot, insertSlot, listAllSlotsForAstrologer } from '../repositories/consultationSlotRepository.ts';
import { listAstrologyReports, findAstrologyReportById, createAstrologyReport, updateAstrologyReport, deleteAstrologyReport } from '../repositories/astrologyReportRepository.ts';
import type { AstrologyReportInput } from '../repositories/astrologyReportRepository.ts';
import { createReportChangeRequest, listPendingReportChangeRequests, findReportChangeRequestById, decideReportChangeRequest } from '../repositories/reportChangeRequestRepository.ts';

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
  // Suspending/reactivating an astrologer's account should also pull them
  // out of / back into the public bookable catalog — otherwise a suspended
  // astrologer (blocked from logging in) still shows up to users as if
  // nothing happened, same gap PATCH /users/:id/role already closes for a
  // role change (see deactivateAstrologerByUserId above).
  if (target.role === 'ASTROLOGIST') {
    const astrologer = await findAstrologerByUserId(target.id);
    if (astrologer) {
      await setAstrologerActive(astrologer.id, parsed.data.status === 'ACTIVE');
      // Live-updates anyone currently browsing the public site (and the
      // staff panel) without a refresh — see DELETE /astrologers/:id's own
      // comment on why this matters. Fired either direction; the listener
      // just re-fetches the authoritative list rather than trying to patch
      // it by hand client-side.
      bus.emitTyped('astrologer:catalog_changed', { astrologerId: astrologer.id });
    }
  }
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

const freeAiChatSchema = z.object({ seconds: z.number().int().min(0).max(24 * 60 * 60) });

// Dispute resolution for the "Ask TredevaAstro" free AI chat session — the
// Users page already finds the account by email/phone (client-side search
// over the already-loaded list), this just sets its real balance (see
// userRepository.ts's setFreeAiChatSeconds). 0 revokes it; any other value
// (typically another 300 for "one more 5-minute session") re-grants it.
adminRouter.patch('/users/:id/free-ai-chat', requireSection('users'), async (req, res) => {
  const parsed = freeAiChatSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  const target = await findUserById(req.params.id as string);
  if (!target) return fail(res, 404, 'NOT_FOUND', 'User not found');
  await setFreeAiChatSeconds(target.id, parsed.data.seconds);
  await audit(req, 'user.free_ai_chat.set', `${target.email}: ${parsed.data.seconds}s`);
  // Only the "good news" case emails the customer — staff setting this to 0
  // (revoking it) has nothing positive to announce.
  if (parsed.data.seconds > 0) {
    await notifyEventByTemplateId({
      templateId: 'tpl-free-ai-chat-granted', eventKey: 'user.free_ai_chat.granted',
      vars: { minutes: String(Math.round(parsed.data.seconds / 60)) },
      user: { email: target.email, name: target.name },
    }).catch(() => {});
  }
  res.json({ success: true, data: { seconds: parsed.data.seconds } });
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
  const [reports, consultations, orders, allConsultations, lastAction, pageViews] = await Promise.all([
    countPurchasesForUser(target.id),
    countForUser(target.email),
    countOrdersForUser(target.id),
    findAllForUser(target.email),
    listAuditLogForTarget(target.email, 1),
    listPageViewsForUser(target.id),
  ]);
  const recentChats = await buildChatAudit(allConsultations, async c => (await findAstrologerById(c.astrologerId))?.name ?? 'Unknown astrologer');
  res.json({
    success: true,
    data: {
      reports, consultations, orders, recentChats,
      lastAction: lastAction[0] ? { action: lastAction[0].action, at: lastAction[0].created_at } : null,
      recentPageViews: pageViews.map(v => ({ path: v.path, at: v.created_at, ip: v.ip_address, userAgent: v.user_agent, country: v.country })),
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

  // Anonymous applications (user_id null) have no account yet — match one by
  // the applied email if it already exists, otherwise create one on approval
  // so there's something to attach the ASTROLOGIST role / catalog row to.
  let applicant = application.user_id
    ? await findUserById(application.user_id)
    : (application.email ? await findUserByEmail(application.email) : undefined);
  let createdAccount = false;
  if (!applicant && parsed.data.decision === 'APPROVED') {
    if (!application.email) return fail(res, 422, 'VALIDATION_ERROR', 'Application has no email to create an account from');
    const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
    applicant = await createUser({
      name: application.full_name || application.email,
      email: application.email,
      passwordHash,
      phoneNumber: application.phone_number || undefined,
    });
    createdAccount = true;
  }
  if (!applicant) return fail(res, 404, 'NOT_FOUND', 'Applicant account not found');

  // Atomic PENDING->decision transition is the real guard (decideApplication
  // only flips rows still PENDING and reports whether it did) — closes the
  // race a separate "is it still PENDING?" pre-check had against a
  // double-click or two staff racing the same Approve.
  const decided = await decideApplication(application.id, parsed.data.decision);
  if (!decided) return fail(res, 409, 'ALREADY_DECIDED', 'This application was already decided');
  if (parsed.data.decision === 'APPROVED') {
    await updateUserRole(applicant.id, 'ASTROLOGIST');
    const catalogRow = await insertAstrologerForUser(applicant.id, application.full_name || applicant.name, application.expertise);
    // Carries what the applicant actually submitted (bio, languages,
    // declared experience) into the real catalog row instead of leaving it
    // at insertAstrologerForUser's bare defaults — best-effort only, so a
    // malformed "experience" string (e.g. no leading number) just falls
    // back to 0 rather than blocking the approval itself.
    const experienceYears = parseInt(application.experience, 10) || 0;
    const languages = (application.languages || '').split(',').map(l => l.trim()).filter(Boolean);
    const updated = await updateAstrologerProfile(catalogRow.id, {
      title: catalogRow.title,
      bio: application.bio || catalogRow.bio,
      avatar: catalogRow.avatar,
      languages: languages.length > 0 ? languages : JSON.parse(catalogRow.languages),
      categories: JSON.parse(catalogRow.categories),
      expertise: JSON.parse(catalogRow.expertise),
      consultationTypes: JSON.parse(catalogRow.consultation_types),
      chatPrice: catalogRow.chat_price,
      callPrice: catalogRow.call_price,
      videoPrice: catalogRow.video_price,
      experienceYears,
    });
    // Without this, the new astrologer can't go online / accept anything
    // until the process restarts — see registerNewAstrologer's own comment.
    await registerNewAstrologer(updated ?? catalogRow);
    // Freshly created account has an unusable random password — send them a
    // reset link (same flow as "forgot password") so they can actually log in.
    if (createdAccount) await requestPasswordReset(applicant.email);
  }
  await audit(req, `application.${parsed.data.decision.toLowerCase()}`, applicant.email);
  // Best-effort: a missing/deleted template (or ZeptoMail being down) should
  // never fail the decision itself — sendAndLog already turns a send
  // failure into a FAILED log row instead of throwing.
  const templateId = parsed.data.decision === 'APPROVED' ? 'tpl-application-approved' : 'tpl-application-rejected';
  const template = await findEmailTemplateById(templateId);
  if (template) {
    await notifyEvent({
      eventKey: `application.${parsed.data.decision.toLowerCase()}`,
      template,
      vars: { extra: '' },
      user: { email: applicant.email, name: applicant.name },
      alsoHeadAstrologer: parsed.data.decision === 'APPROVED',
      alsoAdmin: true,
      from: 'hiring',
    }).catch(() => {});
  }
  res.json({ success: true, data: { ok: true } });
});

// ── Astrologers ──────────────────────────────────────────────────────────
// Direct admin-onboarding ("Add Astrologer") was removed per explicit
// request in favor of the apply/approve flow, then re-added per a later
// explicit request — see POST /astrologers below. Both paths lead to the
// same account + catalog row, so nothing about the apply/approve flow
// changes. Removing an astrologer still reuses PATCH /users/:id/role (set
// role back to USER), same mechanism the Users page already uses for role
// changes.

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
  // Raw rows only (not the public-listing filter), so a removed
  // (is_active = 0) astrologer still shows up here for staff to restore —
  // listPublicAstrologers() above already drops them, which is correct for
  // the public site but wrong for the staff management table.
  const rawById = new Map(astrologers.map(a => [a.id, a]));
  // Also folds in whether each astrologer currently has an active Boost
  // (Extra/Boost Feature PDF) and their payout-share override, if staff set
  // one — there was previously no admin/staff-facing surface for any of
  // this, only the astrologer's own /me/boost view.
  const data = await Promise.all(rows.map(async r => {
    const boostPayoutOverridePercent = overrideById.get(r.id) ?? null;
    const raw = rawById.get(r.id);
    // An "orphan" catalog row (no linked user account — seed data, or an
    // account later deleted/role-changed) is_active = 1 still passes
    // listPublicAstrologers()'s filter, so it's bookable and in `rows`
    // already — but `r` itself only ever carries {id, status, activeCount,
    // maxConcurrent, queueLength}, no name. With no account to match it to,
    // the staff admin page (which iterates accounts, not catalog rows) can
    // never display or manage it without this — same reasoning as the
    // `removed` block below, just for the is_active = 1 case.
    const isOrphan = raw && raw.user_id == null;
    return {
      ...r,
      ...(isOrphan ? toPublicAstrologerProfile(raw) : {}),
      activeBoost: !!(await getActiveBoost(r.id)),
      boostPayoutOverridePercent,
      effectiveBoostPayoutSharePercent: boostPayoutOverridePercent ?? defaultPayoutShare,
      commissionPercent: raw?.commission_percent ?? 100,
      isActive: (raw?.is_active ?? 1) === 1,
    };
  }));
  // Removed astrologers are filtered out of listPublicAstrologers() entirely,
  // so they'd otherwise vanish from the staff table with no way to restore
  // them — append them here (no live/Boost state for these, they're not
  // bookable) using the same shape as the map above.
  const listedIds = new Set(rows.map(r => r.id));
  const removed = astrologers.filter(a => a.is_active !== 1 && !listedIds.has(a.id)).map(a => ({
    ...toPublicAstrologerProfile(a),
    status: 'OFFLINE' as const, activeCount: 0, maxConcurrent: 0, queueLength: 0,
    activeBoost: false,
    boostPayoutOverridePercent: a.boost_payout_override_percent,
    effectiveBoostPayoutSharePercent: a.boost_payout_override_percent ?? defaultPayoutShare,
    commissionPercent: a.commission_percent,
    isActive: false,
  }));
  res.json({ success: true, data: [...data, ...removed] });
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
  // Plain URL paste OR a base64 data: URL from the staff panel's drag-drop
  // file picker — same "no object storage, the data URL IS the hosted
  // value" convention as admin banners/pandit-application resumes (see
  // main.ts's 8mb body-limit comment, which already covers /api/admin).
  avatar: z.string().trim().max(2_000_000),
  languages: z.array(z.string().trim().min(1).max(40)).max(20),
  categories: z.array(z.string().trim().min(1).max(40)).max(20),
  expertise: z.array(z.string().trim().min(1).max(40)).max(20),
  consultationTypes: z.array(z.enum(['chat', 'voice', 'video'])).min(1),
  chatPrice: z.number().int().min(0).max(100000),
  callPrice: z.number().int().min(0).max(100000),
  videoPrice: z.number().int().min(0).max(100000),
  experienceYears: z.number().int().min(0).max(80),
  // What % of the per-minute price this astrologer actually earns — staff
  // sets the rate (chat/call/videoPrice) AND this cut together, so e.g. a
  // ₹25/min astrologer at 10% shows ₹2.5/min earned, not the full ₹25.
  commissionPercent: z.number().int().min(1).max(100).optional(),
});

adminRouter.patch('/astrologers/:id', requireSection('astrologers'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return fail(res, 422, 'VALIDATION_ERROR', 'id must be an integer');
  const parsed = editAstrologerSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  const row = await updateAstrologerProfile(id, parsed.data);
  if (!row) return fail(res, 404, 'NOT_FOUND', 'Astrologer not found');
  await audit(req, 'astrologer.profile.update', row.name);
  res.json({ success: true, data: { ...toPublicAstrologerProfile(row), commissionPercent: row.commission_percent } });
});

const activeSchema = z.object({ active: z.boolean() });

// "Remove"/"Restore" — see setAstrologerActive's own comment for why this
// is a flag flip, not a DELETE: it reuses the exact same is_active column
// the public catalog query already filters on, so nothing here ever
// destroys a consultation/review/revenue row.
adminRouter.patch('/astrologers/:id/active', requireSection('astrologers'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return fail(res, 422, 'VALIDATION_ERROR', 'id must be an integer');
  const parsed = activeSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  const row = await setAstrologerActive(id, parsed.data.active);
  if (!row) return fail(res, 404, 'NOT_FOUND', 'Astrologer not found');
  bus.emitTyped('astrologer:catalog_changed', { astrologerId: id });
  await audit(req, parsed.data.active ? 'astrologer.restore' : 'astrologer.remove', row.name);
  res.json({ success: true, data: { id: row.id, isActive: row.is_active === 1 } });
});

// Real, permanent delete — distinct from Remove above (is_active flip).
// See deleteAstrologerCascade's own comment: this also wipes their
// consultation/review/booking history, deliberately, since that's the whole
// point of this button existing separately from Remove.
adminRouter.delete('/astrologers/:id', requireSection('astrologers'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return fail(res, 422, 'VALIDATION_ERROR', 'id must be an integer');
  // Unfiltered lookup — a removed (is_active = 0) astrologer must still be
  // deletable, unlike findAstrologerById's public-facing is_active = 1 gate.
  const existing = await findAstrologerByIdRaw(id);
  if (!existing) return fail(res, 404, 'NOT_FOUND', 'Astrologer not found');
  const deleted = await deleteAstrologerCascade(id);
  if (!deleted) return fail(res, 404, 'NOT_FOUND', 'Astrologer not found');
  // A linked real account loses the Astrologer role (reverts to plain USER)
  // rather than being deleted itself — the person's login/history stays
  // intact, they just stop showing up anywhere in the staff Astrologers
  // page, which filters strictly by role === ASTROLOGIST.
  if (existing.user_id) await updateUserRole(existing.user_id, 'USER');
  // Tells every connected client — including anonymous public-site
  // visitors, who are all joined to PUBLIC_ROOM (see sockets.ts) — to drop
  // this astrologer from whatever roster they're looking at right now,
  // without needing a page refresh.
  bus.emitTyped('astrologer:catalog_changed', { astrologerId: id });
  await audit(req, 'astrologer.delete', existing.name);
  res.json({ success: true, data: { id, deleted: true } });
});

// Direct admin-onboarding, re-added per explicit request (see the removal
// comment above — the apply/approve flow stays as the public-facing path,
// this is an additional staff shortcut for onboarding someone directly).
// Reuses authService.register() for the account itself (duplicate email/
// phone checks, password hashing, role assignment all go through the one
// real path already used everywhere else), then the same
// insertAstrologerForUser + updateAstrologerProfile pair the apply/approve
// flow already uses to create and fill in the catalog row.
const createAstrologerSchema = editAstrologerSchema.extend({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(200),
});

adminRouter.post('/astrologers', requireSection('astrologers'), async (req, res) => {
  const parsed = createAstrologerSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  const { name, email, password, ...profile } = parsed.data;
  let userId: string;
  try {
    const { user } = await register({ name, email, password, role: 'ASTROLOGIST' });
    userId = user.id;
  } catch (e) {
    if (e instanceof AuthError) return fail(res, e.status, 'REGISTER_FAILED', e.message);
    throw e;
  }
  const catalogRow = await insertAstrologerForUser(userId, name, profile.expertise[0] || 'General Astrology');
  const updated = await updateAstrologerProfile(catalogRow.id, profile);
  const finalRow = updated ?? catalogRow;
  // Without this, this astrologer can't go online / accept anything until
  // the process restarts — see registerNewAstrologer's own comment.
  await registerNewAstrologer(finalRow);
  await audit(req, 'astrologer.create', email);
  res.json({ success: true, data: { ...toPublicAstrologerProfile(finalRow), commissionPercent: finalRow.commission_percent } });
});

// ── 1:1 scheduled slots (consultation_slots) ─────────────────────────────
// Real, pay-up-front appointment times for a specific astrologer — see
// consultationSlotRepository.ts's file comment for how this differs from
// the live chat/voice queue.
const createSlotSchema = z.object({
  astrologerId: z.number().int().positive(),
  scheduledAt: z.number().int().positive(),
  durationMinutes: z.number().int().min(5).max(180),
  type: z.enum(['chat', 'voice', 'video']),
  price: z.number().int().positive(),
});

adminRouter.get('/astrologers/:id/slots', requireSection('astrologers'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return fail(res, 422, 'VALIDATION_ERROR', 'id must be an integer');
  res.json({ success: true, data: await listAllSlotsForAstrologer(id) });
});

adminRouter.post('/astrologers/:id/slots', requireSection('astrologers'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return fail(res, 422, 'VALIDATION_ERROR', 'id must be an integer');
  const parsed = createSlotSchema.omit({ astrologerId: true }).safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  const slot = await insertSlot({ id: randomUUID(), astrologerId: id, createdAt: Date.now(), ...parsed.data });
  await audit(req, 'Added 1:1 slot', slot.id);
  res.status(201).json({ success: true, data: slot });
});

adminRouter.delete('/astrologers/:astroId/slots/:id', requireSection('astrologers'), async (req, res) => {
  const deleted = await deleteUnbookedSlot(String(req.params.id));
  if (!deleted) return fail(res, 409, 'ALREADY_BOOKED', 'Slot not found or already booked — booked slots cannot be deleted');
  await audit(req, 'Deleted 1:1 slot', String(req.params.id));
  res.json({ success: true, data: { ok: true } });
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

// Traffic feed for the Overview page's "Recent Traffic" panel — answers
// "where is traffic actually going" with each visit's path plus its
// fingerprint (IP/device/country). Registered and anonymous come back as
// two separate lists (see listRecentRegisteredPageViews's own comment on
// why — anonymous volume was crowding registered visits out of a single
// combined "most recent N" list). Same 'overview' section as
// dashboard-stats above — no separate permission needed.
function toTrafficEntry(v: { path: string; created_at: number; ip_address: string | null; user_agent: string | null; country: string | null; user_name: string | null; user_email: string | null }) {
  return {
    path: v.path, at: v.created_at, ip: v.ip_address, userAgent: v.user_agent, country: v.country,
    userName: v.user_name, userEmail: v.user_email,
  };
}

adminRouter.get('/traffic', requireSection('overview'), async (_req, res) => {
  const [registered, anonymous] = await Promise.all([
    listRecentRegisteredPageViews(50),
    listRecentAnonymousPageViews(50),
  ]);
  res.json({
    success: true,
    data: {
      registered: registered.map(toTrafficEntry),
      anonymous: anonymous.map(toTrafficEntry),
    },
  });
});

// Leads — one row per distinct visitor (registered or anonymous), not one
// row per page view. An anonymous visitor is recognized across repeat
// visits by their sticky device id (visitor_id, set by trackingService.ts),
// so "this device used the Flames calculator, then came back and used
// Nakshatra" shows up as one growing lead instead of two unrelated strangers.
adminRouter.get('/leads', requireSection('leads'), async (_req, res) => {
  const leads = await listLeads(100);
  res.json({
    success: true,
    data: leads.map(l => ({
      id: l.lead_id,
      userId: l.user_id,
      userName: l.user_name,
      userEmail: l.user_email,
      visitCount: l.visit_count,
      firstSeen: l.first_seen,
      lastSeen: l.last_seen,
      lastPath: l.last_path,
      ip: l.ip_address,
      userAgent: l.user_agent,
      country: l.country,
    })),
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

// ── Call recordings ──────────────────────────────────────────────────────
// Staff-only, 10-day auto-delete (see callRecordingRepository.ts and
// realtimeStore.ts's deleteExpiredCallRecordings). List returns metadata
// only; the actual audio is a separate per-recording fetch so the list
// response stays small regardless of how many recordings exist.

adminRouter.get('/call-recordings', requireSection('call-recordings'), async (req, res) => {
  const parsed = pageSchema.safeParse(req.query);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  const { rows, total } = await listCallRecordings(parsed.data.page, parsed.data.limit);
  res.json({ success: true, data: rows, pagination: { ...parsed.data, total } });
});

adminRouter.get('/call-recordings/:id/audio', requireSection('call-recordings'), async (req, res) => {
  const recording = await findCallRecordingData(String(req.params.id));
  if (!recording) return fail(res, 404, 'NOT_FOUND', 'Recording not found (it may have expired)');
  res.setHeader('Content-Type', recording.mimeType);
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(recording.data);
});

// ── Homepage banners ─────────────────────────────────────────────────────
// Staff-managed promo media for CampaignBanner.tsx's homepage carousel — up
// to 7 rows (bannerRepository.MAX_BANNERS), each with an optional
// click-through link and an optional expiry (null = never, cleaned up
// hourly from main.ts once past its expires_at). Media is base64, capped
// ~5MB raw (see bannerService.ts).

const createBannerSchema = z.object({
  mediaType: z.enum(['image', 'video']),
  mediaData: z.string().min(1),
  linkUrl: z.string().url().nullable().default(null),
  expiresAt: z.number().int().positive().nullable().default(null),
});

const editBannerSchema = z.object({
  linkUrl: z.string().url().nullable().optional(),
  expiresAt: z.number().int().positive().nullable().optional(),
});

adminRouter.get('/banners', requireSection('banners'), async (_req, res) => {
  res.json({ success: true, data: await listBanners() });
});

adminRouter.post('/banners', requireSection('banners'), async (req, res) => {
  const parsed = createBannerSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  try {
    const banner = await createBanner(parsed.data);
    await audit(req, 'Uploaded banner', banner.id);
    res.status(201).json({ success: true, data: banner });
  } catch (e) {
    if (e instanceof BannerError) return fail(res, e.status, 'BANNER_ERROR', e.message);
    throw e;
  }
});

adminRouter.patch('/banners/:id', requireSection('banners'), async (req, res) => {
  const parsed = editBannerSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  try {
    const banner = await editBanner(String(req.params.id), parsed.data);
    await audit(req, 'Updated banner', banner.id);
    res.json({ success: true, data: banner });
  } catch (e) {
    if (e instanceof BannerError) return fail(res, e.status, 'BANNER_ERROR', e.message);
    throw e;
  }
});

adminRouter.delete('/banners/:id', requireSection('banners'), async (req, res) => {
  const deleted = await deleteBanner(String(req.params.id));
  if (!deleted) return fail(res, 404, 'NOT_FOUND', 'Banner not found');
  await audit(req, 'Deleted banner', String(req.params.id));
  res.json({ success: true, data: { ok: true } });
});

// ── Pooja hub (nav "Pooja") ──────────────────────────────────────────────
// Recorded videos, scheduled group sessions, and the aarti/book library.
// "Book a Pooja" (1:1) needs no admin surface here — it's just the
// existing astrologer catalog filtered to category "Pooja" (edit an
// astrologer's categories from the Astrologers admin page).

const createPoojaVideoSchema = z.object({
  title: z.string().trim().min(1).max(150),
  category: z.string().trim().min(1).max(60),
  videoUrl: z.string().url(),
  thumbnailUrl: z.string().url().nullable().default(null),
});

adminRouter.get('/pooja/videos', requireSection('pooja'), async (_req, res) => {
  res.json({ success: true, data: await listPoojaVideos() });
});

adminRouter.post('/pooja/videos', requireSection('pooja'), async (req, res) => {
  const parsed = createPoojaVideoSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  const video = await insertPoojaVideo({ id: randomUUID(), createdAt: Date.now(), ...parsed.data });
  await audit(req, 'Added pooja video', video.id);
  res.status(201).json({ success: true, data: video });
});

adminRouter.delete('/pooja/videos/:id', requireSection('pooja'), async (req, res) => {
  if (!(await deletePoojaVideo(String(req.params.id)))) return fail(res, 404, 'NOT_FOUND', 'Video not found');
  await audit(req, 'Deleted pooja video', String(req.params.id));
  res.json({ success: true, data: { ok: true } });
});

const createPoojaSessionSchema = z.object({
  title: z.string().trim().min(1).max(150),
  panditName: z.string().trim().min(1).max(100),
  scheduledAt: z.number().int().positive(),
  meetingUrl: z.string().url().nullable().default(null),
  pricePaise: z.number().int().nonnegative().nullable().default(null),
  capacity: z.number().int().positive().nullable().default(null),
});

adminRouter.get('/pooja/sessions', requireSection('pooja'), async (_req, res) => {
  res.json({ success: true, data: await listAllPoojaSessions() });
});

adminRouter.post('/pooja/sessions', requireSection('pooja'), async (req, res) => {
  const parsed = createPoojaSessionSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  const session = await insertPoojaSession({ id: randomUUID(), createdAt: Date.now(), ...parsed.data });
  await audit(req, 'Scheduled group pooja', session.id);
  res.status(201).json({ success: true, data: session });
});

adminRouter.delete('/pooja/sessions/:id', requireSection('pooja'), async (req, res) => {
  if (!(await deletePoojaSession(String(req.params.id)))) return fail(res, 404, 'NOT_FOUND', 'Session not found');
  await audit(req, 'Deleted group pooja', String(req.params.id));
  res.json({ success: true, data: { ok: true } });
});

const createPoojaBookSchema = z.object({
  title: z.string().trim().min(1).max(150),
  author: z.string().trim().max(100).nullable().default(null),
  category: z.string().trim().min(1).max(60),
  content: z.string().trim().max(50_000).nullable().default(null),
  pdfUrl: z.string().url().nullable().default(null),
  coverImageUrl: z.string().url().nullable().default(null),
}).refine(d => !!d.content || !!d.pdfUrl, { message: 'Provide either content or a PDF link' });

adminRouter.get('/pooja/books', requireSection('pooja'), async (_req, res) => {
  res.json({ success: true, data: await listPoojaBooks() });
});

adminRouter.post('/pooja/books', requireSection('pooja'), async (req, res) => {
  const parsed = createPoojaBookSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  const book = await insertPoojaBook({ id: randomUUID(), createdAt: Date.now(), ...parsed.data });
  await audit(req, 'Added pooja book', book.id);
  res.status(201).json({ success: true, data: book });
});

adminRouter.delete('/pooja/books/:id', requireSection('pooja'), async (req, res) => {
  if (!(await deletePoojaBook(String(req.params.id)))) return fail(res, 404, 'NOT_FOUND', 'Book not found');
  await audit(req, 'Deleted pooja book', String(req.params.id));
  res.json({ success: true, data: { ok: true } });
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

// ── Report catalog (astrology_reports) — CRUD + Staff-change approval ──
//
// A STAFF account (even with the 'reports' section granted) can never apply
// a catalog change directly — every create/update/delete from a STAFF
// caller becomes a pending report_change_requests row instead, and the
// configured admin address gets emailed to come review it (see
// notificationService.ts's notifyEvent). Only an ADMIN calling these
// routes, or an ADMIN approving a pending request below, actually touches
// astrology_reports. This mirrors the astrologer-applications approval
// flow already in this file, just for the report catalog instead of new
// astrologer accounts.
function toApiReport(r: Awaited<ReturnType<typeof findAstrologyReportById>>) {
  if (!r) return undefined;
  return {
    id: r.id, title: r.title, subtitle: r.subtitle, description: r.description,
    pages: r.pages, sections: r.sections, price: r.price, originalPrice: r.original_price,
    popular: !!r.popular, color: r.color, icon: r.icon, category: r.category, displayOrder: r.display_order,
    coverColor: r.cover_color, coverPattern: r.cover_pattern, coverImage: r.cover_image,
  };
}

const reportInputSchema = z.object({
  title: z.string().trim().min(1).max(150),
  subtitle: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(5000),
  pages: z.coerce.number().int().min(1),
  sections: z.coerce.number().int().min(1),
  price: z.coerce.number().int().min(0),
  originalPrice: z.coerce.number().int().min(0).nullable().default(null),
  popular: z.boolean().default(false),
  color: z.string().trim().min(1).max(20),
  icon: z.string().trim().min(1).max(60),
  category: z.string().trim().min(1).max(60),
  displayOrder: z.coerce.number().int().default(0),
  coverColor: z.string().trim().max(20).nullable().default(null),
  coverPattern: z.string().trim().max(30).nullable().default(null),
  // Same base64-data-URL convention as AstrologersPage's avatar upload —
  // capped well under the body-size limit (see editAstrologerSchema's own
  // comment on the backend elsewhere).
  coverImage: z.string().max(3_000_000).nullable().default(null),
});

adminRouter.get('/reports', requireSection('reports'), async (_req, res) => {
  const rows = await listAstrologyReports();
  res.json({ success: true, data: rows.map(toApiReport) });
});

adminRouter.get('/reports/change-requests', adminOnly, async (_req, res) => {
  const rows = await listPendingReportChangeRequests();
  const withReport = await Promise.all(rows.map(async r => ({
    id: r.id, action: r.action, reportId: r.report_id,
    payload: r.payload ? JSON.parse(r.payload) as AstrologyReportInput : null,
    requestedBy: r.requested_by, createdAt: r.created_at,
    currentReport: r.report_id ? toApiReport(await findAstrologyReportById(r.report_id)) : undefined,
  })));
  res.json({ success: true, data: withReport });
});

adminRouter.post('/reports/change-requests/:id/decide', adminOnly, async (req, res) => {
  const approve = req.body?.approve === true;
  const change = await findReportChangeRequestById(String(req.params.id));
  if (!change || change.status !== 'PENDING') return fail(res, 404, 'NOT_FOUND', 'No pending change request found');
  if (approve) {
    if (change.action === 'DELETE' && change.report_id) {
      await deleteAstrologyReport(change.report_id);
    } else if (change.payload) {
      const input = JSON.parse(change.payload) as AstrologyReportInput;
      if (change.action === 'CREATE') await createAstrologyReport(input);
      else if (change.action === 'UPDATE' && change.report_id) await updateAstrologyReport(change.report_id, input);
    }
  }
  await decideReportChangeRequest(change.id, approve ? 'APPROVED' : 'REJECTED', req.user!.id);
  await audit(req, `report.change.${approve ? 'approved' : 'rejected'}`, change.id);
  res.json({ success: true, data: { ok: true } });
});

// Emails the configured admin address that a change is waiting — best
// effort, never blocks the actual request/response.
async function notifyAdminOfPendingReportChange(action: string, reportTitle: string, staffName: string) {
  const { adminEmail } = await getNotifyEmails();
  if (!adminEmail) return;
  await notifyEventByTemplateId({
    templateId: 'tpl-report-change-pending', eventKey: 'report.change.pending',
    vars: { action, reportTitle, staffName },
    user: { email: adminEmail, name: 'Admin' },
  }).catch(() => {});
}

adminRouter.post('/reports', requireSection('reports'), async (req, res) => {
  const parsed = reportInputSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  if (req.user!.role === 'STAFF') {
    await createReportChangeRequest('CREATE', null, parsed.data, req.user!.id);
    const requester = await findUserById(req.user!.id);
    await notifyAdminOfPendingReportChange('add', parsed.data.title, requester?.name ?? req.user!.email);
    return res.status(202).json({ success: true, data: { pending: true } });
  }
  const row = await createAstrologyReport(parsed.data);
  await audit(req, 'report.created', row.title);
  res.status(201).json({ success: true, data: toApiReport(row) });
});

adminRouter.patch('/reports/:id', requireSection('reports'), async (req, res) => {
  const id = Number(req.params.id);
  const existing = await findAstrologyReportById(id);
  if (!existing) return fail(res, 404, 'NOT_FOUND', 'Report not found');
  const parsed = reportInputSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  if (req.user!.role === 'STAFF') {
    await createReportChangeRequest('UPDATE', id, parsed.data, req.user!.id);
    const requester = await findUserById(req.user!.id);
    await notifyAdminOfPendingReportChange('update', parsed.data.title, requester?.name ?? req.user!.email);
    return res.status(202).json({ success: true, data: { pending: true } });
  }
  const row = await updateAstrologyReport(id, parsed.data);
  await audit(req, 'report.updated', parsed.data.title);
  res.json({ success: true, data: toApiReport(row) });
});

adminRouter.delete('/reports/:id', requireSection('reports'), async (req, res) => {
  const id = Number(req.params.id);
  const existing = await findAstrologyReportById(id);
  if (!existing) return fail(res, 404, 'NOT_FOUND', 'Report not found');
  if (req.user!.role === 'STAFF') {
    await createReportChangeRequest('DELETE', id, null, req.user!.id);
    const requester = await findUserById(req.user!.id);
    await notifyAdminOfPendingReportChange('delete', existing.title, requester?.name ?? req.user!.email);
    return res.status(202).json({ success: true, data: { pending: true } });
  }
  await deleteAstrologyReport(id);
  await audit(req, 'report.deleted', existing.title);
  res.json({ success: true, data: { ok: true } });
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

// ── Daily shlok (the Panchang card's footer line, one per calendar day) ──

const dailyShlokSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  textEn: z.string().trim().min(3).max(300),
  textHi: z.string().trim().min(3).max(300),
});

adminRouter.get('/daily-shlok', requireSection('shlok'), async (_req, res) => {
  res.json({ success: true, data: (await listShloks(180)).map(toPublicDailyShlok) });
});

// One PUT for both "queue a new day" and "edit that day" — a date can only
// ever hold one shlok, so the repository upserts rather than making the
// page track whether it's creating or updating.
adminRouter.put('/daily-shlok', requireSection('shlok'), async (req, res) => {
  const parsed = dailyShlokSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  const row = await upsertShlok(parsed.data);
  await audit(req, 'shlok.save', parsed.data.date);
  res.json({ success: true, data: toPublicDailyShlok(row) });
});

adminRouter.delete('/daily-shlok/:date', requireSection('shlok'), async (req, res) => {
  const date = String(req.params.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(res, 422, 'VALIDATION_ERROR', 'date must be YYYY-MM-DD');
  await deleteShlok(date);
  await audit(req, 'shlok.delete', date);
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

adminRouter.get('/settings/notify-emails', requireSection('settings'), async (_req, res) => {
  res.json({ success: true, data: await getNotifyEmails() });
});

const notifyEmailsSchema = z.object({
  adminEmail: z.string().trim().email().nullable(),
  headAstrologerEmail: z.string().trim().email().nullable(),
});

adminRouter.patch('/settings/notify-emails', requireSection('settings'), async (req, res) => {
  const parsed = notifyEmailsSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  await setNotifyEmails(parsed.data);
  await audit(req, 'settings.notify_emails.update', parsed.data.adminEmail || parsed.data.headAstrologerEmail || '—');
  res.json({ success: true, data: parsed.data });
});

// ── Email: templates, compose, and the send log ─────────────────────────
// "Hirring/compose" — staff can mail any user directly, reusing a saved
// template (editable before send) or writing one from scratch, and manage
// the saved templates themselves. Every send — from here or from
// notificationService.ts's automatic event notifications — lands in
// email_log, so this doubles as the audit trail the user asked for.

adminRouter.get('/emails/templates', requireSection('emails'), async (_req, res) => {
  res.json({ success: true, data: await listEmailTemplates() });
});

// The "Send As" choices for Compose — each key maps to a configured address
// in config.zeptomail.identities (see its own comment for the fallback
// behaviour when a dedicated mailbox hasn't been set up yet).
adminRouter.get('/emails/identities', requireSection('emails'), async (_req, res) => {
  const data = EMAIL_IDENTITY_KEYS.map(key => ({ key, name: config.zeptomail.identities[key].name }));
  res.json({ success: true, data });
});

const templateSchema = z.object({
  name: z.string().trim().min(2).max(150),
  subject: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1).max(20_000),
});

adminRouter.post('/emails/templates', requireSection('emails'), async (req, res) => {
  const parsed = templateSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  const row = await createEmailTemplate(parsed.data);
  await audit(req, 'email.template.create', row.name);
  res.status(201).json({ success: true, data: row });
});

adminRouter.put('/emails/templates/:id', requireSection('emails'), async (req, res) => {
  const parsed = templateSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  const row = await updateEmailTemplate(req.params.id as string, parsed.data);
  if (!row) return fail(res, 404, 'NOT_FOUND', 'Template not found');
  await audit(req, 'email.template.update', row.name);
  res.json({ success: true, data: row });
});

adminRouter.delete('/emails/templates/:id', requireSection('emails'), async (req, res) => {
  const existing = await findEmailTemplateById(req.params.id as string);
  const deleted = await deleteEmailTemplate(req.params.id as string);
  if (!deleted) return fail(res, 404, 'NOT_FOUND', 'Template not found');
  await audit(req, 'email.template.delete', existing?.name || req.params.id as string);
  res.json({ success: true, data: { id: req.params.id, deleted: true } });
});

const composeSchema = z.object({
  toEmail: z.string().trim().email(),
  toName: z.string().trim().max(150).optional(),
  subject: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1).max(20_000),
  templateId: z.string().trim().optional(),
  vars: z.record(z.string(), z.string()).optional(),
  fromIdentity: z.enum(EMAIL_IDENTITY_KEYS as [string, ...string[]]).optional(),
});

// Subject/body arrive already rendered from the compose screen (it lets
// staff edit the filled-in template before sending) — `vars`/`templateId`
// are only carried through for the log, not re-rendered here.
adminRouter.post('/emails/compose', requireSection('emails'), async (req, res) => {
  const parsed = composeSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  const actor = await findUserById(req.user!.id);
  await sendAndLog({
    toEmail: parsed.data.toEmail, toName: parsed.data.toName,
    subject: parsed.data.subject, body: parsed.data.body,
    templateId: parsed.data.templateId, sentBy: actor?.name || req.user!.id,
    from: parsed.data.fromIdentity as import('../services/emailService.ts').EmailIdentityKey | undefined,
  });
  await audit(req, 'email.compose.send', parsed.data.toEmail);
  res.json({ success: true, data: { ok: true } });
});

adminRouter.get('/emails/log', requireSection('emails'), async (_req, res) => {
  res.json({ success: true, data: await listEmailLog() });
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

// Full astrologer-catalog CSV — every editable field, one row per
// astrologer, so staff can review/bulk-edit the whole roster in a
// spreadsheet. Same download/re-upload convention as the region-pricing CSV
// above: astrologer_id is what import matches on, name/email are read-only
// reference columns (creating a NEW astrologer still goes through the Add
// form, since that also creates a login account/password — a CSV row alone
// can't).
adminRouter.get('/astrologers/csv-export', requireSection('astrologers'), async (_req, res) => {
  const astrologers = await listAllAstrologersRaw();
  const header = [
    'astrologer_id', 'name', 'title', 'bio', 'avatar', 'languages', 'categories', 'expertise',
    'consultation_types', 'chat_price', 'call_price', 'video_price', 'experience_years', 'commission_percent', 'is_active',
  ];
  const lines = [toCsvRow(header)];
  for (const a of astrologers) {
    lines.push(toCsvRow([
      a.id, a.name, a.title, a.bio, a.avatar,
      JSON.parse(a.languages || '[]').join('|'), JSON.parse(a.categories || '[]').join('|'), JSON.parse(a.expertise || '[]').join('|'),
      JSON.parse(a.consultation_types || '[]').join('|'),
      a.chat_price, a.call_price, a.video_price, a.experience_years, a.commission_percent, a.is_active === 1 ? 'yes' : 'no',
    ]));
  }
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="astrologers.csv"');
  res.send(lines.join('\n'));
});

// CSV import: re-upload the export above (list-type columns are
// `|`-separated, matching the export's own join) — astrologer_id matches an
// existing row, every editable field on it gets overwritten. is_active is
// imported too so a bulk edit can remove/restore astrologers the same way
// the per-row Remove/Restore button does (same underlying column).
adminRouter.post('/astrologers/csv-import', requireSection('astrologers'), async (req, res) => {
  const csv = String(req.body?.csv || '');
  if (!csv.trim()) return fail(res, 422, 'VALIDATION_ERROR', 'csv is required');
  const rows = parseCsv(csv);
  if (rows.length < 2) return fail(res, 422, 'VALIDATION_ERROR', 'CSV has no data rows');
  const header = rows[0].map(h => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const idIdx = col('astrologer_id');
  if (idIdx === -1) return fail(res, 422, 'VALIDATION_ERROR', 'CSV must have an astrologer_id column');
  const splitList = (v: string | undefined) => (v || '').split('|').map(s => s.trim()).filter(Boolean);

  let updated = 0;
  const errors: string[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    if (cols.length <= 1 && !cols[0]) continue;
    const id = Number(cols[idIdx]);
    if (!Number.isInteger(id)) { errors.push(`Row ${i + 1}: invalid astrologer_id`); continue; }
    const get = (name: string) => cols[col(name)];
    const chatPrice = Number(get('chat_price'));
    const callPrice = Number(get('call_price'));
    const videoPrice = Number(get('video_price'));
    const experienceYears = Number(get('experience_years') ?? 0);
    const commissionPercent = Number(get('commission_percent') ?? 100);
    if (![chatPrice, callPrice, videoPrice, experienceYears, commissionPercent].every(Number.isFinite)) {
      errors.push(`Row ${i + 1}: invalid numbers`);
      continue;
    }
    const consultationTypes = splitList(get('consultation_types')).filter((t): t is 'chat' | 'voice' | 'video' => t === 'chat' || t === 'voice' || t === 'video');
    const row = await updateAstrologerProfile(id, {
      title: get('title') || '', bio: get('bio') || '', avatar: get('avatar') || '',
      languages: splitList(get('languages')), categories: splitList(get('categories')), expertise: splitList(get('expertise')),
      consultationTypes: consultationTypes.length ? consultationTypes : ['chat'],
      chatPrice, callPrice, videoPrice, experienceYears, commissionPercent,
    });
    if (!row) { errors.push(`Row ${i + 1}: astrologer ${id} not found`); continue; }
    const activeCol = get('is_active');
    if (activeCol !== undefined) await setAstrologerActive(id, activeCol.trim().toLowerCase() !== 'no');
    updated++;
  }
  await audit(req, 'astrologer.import', `${updated} row(s) via CSV`);
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
    if (!await bcrypt.compare(parsed.data.currentPassword!, me.password_hash)) return fail(res, 401, 'INVALID_PASSWORD', 'Current password is incorrect');
    await updatePasswordHash(me.id, await bcrypt.hash(parsed.data.newPassword, 12));
  }
  if (parsed.data.name) await updateUserName(me.id, parsed.data.name);
  await audit(req, 'account.profile.update', me.email);
  res.json({ success: true, data: toPublicUser((await findUserById(me.id))!) });
});

// ── AI Token Meter ────────────────────────────────────────────────────
// Read-only analytics over `ai_usage`, which the Python ai-core service
// writes (see ai-core/app/llm/usage_store.py). Every route is behind the
// same requireAuth + requireSection('tokens') gate as the rest of the
// console, so a normal user cannot reach project-wide spend.
//
// Costs are returned in INR because that is what the business reports in,
// converted from the USD the provider bills using the fx rate snapshotted
// onto each row.

const usageFilterSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  userId: z.string().max(200).optional(),
  model: z.string().max(200).optional(),
  provider: z.string().max(100).optional(),
  status: z.enum(['success', 'failed']).optional(),
  conversationId: z.string().max(200).optional(),
  traffic: z.enum(['user', 'internal', 'unknown', 'all']).optional(),
});

/** Parses the shared filters, defaulting to the last 30 days. */
function parseUsageFilters(req: import('express').Request) {
  const parsed = usageFilterSchema.safeParse(req.query);
  if (!parsed.success) return null;
  const filters = { ...parsed.data };
  if (!filters.from) {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    filters.from = since.toISOString();
  }
  return filters;
}

const tokensSection = requireSection('tokens');

adminRouter.get('/ai-usage/overview', staffOrAdmin, tokensSection, async (req, res) => {
  const filters = parseUsageFilters(req);
  if (!filters) return fail(res, 422, 'VALIDATION_ERROR', 'Invalid usage filters');
  res.json({ success: true, data: await getOverview(filters) });
});

adminRouter.get('/ai-usage/timeseries', staffOrAdmin, tokensSection, async (req, res) => {
  const filters = parseUsageFilters(req);
  if (!filters) return fail(res, 422, 'VALIDATION_ERROR', 'Invalid usage filters');
  const raw = String(req.query.granularity ?? 'day');
  // Mapped onto a closed set before it can reach date_trunc.
  const granularity = raw === 'week' || raw === 'month' ? raw : 'day';
  res.json({ success: true, data: await getTimeseries(filters, granularity) });
});

adminRouter.get('/ai-usage/models', staffOrAdmin, tokensSection, async (req, res) => {
  const filters = parseUsageFilters(req);
  if (!filters) return fail(res, 422, 'VALIDATION_ERROR', 'Invalid usage filters');
  res.json({ success: true, data: await getModelUsage(filters) });
});

adminRouter.get('/ai-usage/users', staffOrAdmin, tokensSection, async (req, res) => {
  const filters = parseUsageFilters(req);
  if (!filters) return fail(res, 422, 'VALIDATION_ERROR', 'Invalid usage filters');
  res.json({
    success: true,
    data: await getUserUsage(filters, {
      search: req.query.search ? String(req.query.search).slice(0, 200) : undefined,
      sort: req.query.sort ? String(req.query.sort) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    }),
  });
});

adminRouter.get('/ai-usage/requests', staffOrAdmin, tokensSection, async (req, res) => {
  const filters = parseUsageFilters(req);
  if (!filters) return fail(res, 422, 'VALIDATION_ERROR', 'Invalid usage filters');
  res.json({
    success: true,
    data: await getRequestLogs(filters, {
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      offset: req.query.offset ? Number(req.query.offset) : undefined,
    }),
  });
});

adminRouter.get('/ai-usage/conversations', staffOrAdmin, tokensSection, async (req, res) => {
  const filters = parseUsageFilters(req);
  if (!filters) return fail(res, 422, 'VALIDATION_ERROR', 'Invalid usage filters');
  res.json({ success: true, data: await getConversationUsage(filters) });
});

// Per-user drill-down: the same shapes as above, scoped to one user, so the
// detail view reuses the aggregation rather than recomputing it differently.
adminRouter.get('/ai-usage/users/:userId', staffOrAdmin, tokensSection, async (req, res) => {
  const filters = parseUsageFilters(req);
  if (!filters) return fail(res, 422, 'VALIDATION_ERROR', 'Invalid usage filters');
  const scoped = { ...filters, userId: String(req.params.userId) };
  const [overview, models, recent, timeseries] = await Promise.all([
    getOverview(scoped),
    getModelUsage(scoped),
    getRequestLogs(scoped, { limit: 25 }),
    getTimeseries(scoped, 'day'),
  ]);
  res.json({
    success: true,
    data: { userId: String(req.params.userId), overview, models, timeseries, recentRequests: recent.rows },
  });
});

adminRouter.get('/ai-usage/filters', staffOrAdmin, tokensSection, async (_req, res) => {
  res.json({ success: true, data: await getFilterOptions() });
});

// ── AI Evaluation & Feedback ──────────────────────────────────────────
// Quality analytics over `ai_evaluations` and `ai_feedback`, both written by
// ai-core. Behind the same gate as the Token Meter, under an 'evaluation'
// section, so project-wide quality data is admin-only.
//
// Three signals are reported side by side and never merged: the automated
// reward score (a model's estimate), real user feedback (what a person said),
// and tokens/cost. Merging them would destroy the comparison the page exists
// to support.

const evaluationFilterSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  userId: z.string().max(200).optional(),
  model: z.string().max(200).optional(),
  feedbackType: z.enum(['helpful', 'not_helpful']).optional(),
  traffic: z.enum(['user', 'internal', 'unknown', 'all']).optional(),
  minReward: z.coerce.number().min(0).max(1).optional(),
  maxReward: z.coerce.number().min(0).max(1).optional(),
});

function parseEvaluationFilters(req: import('express').Request) {
  const parsed = evaluationFilterSchema.safeParse(req.query);
  if (!parsed.success) return null;
  const filters = { ...parsed.data };
  if (!filters.from) {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    filters.from = since.toISOString();
  }
  return filters;
}

const evaluationSection = requireSection('evaluation');

adminRouter.get('/ai-evaluation/overview', staffOrAdmin, evaluationSection, async (req, res) => {
  const filters = parseEvaluationFilters(req);
  if (!filters) return fail(res, 422, 'VALIDATION_ERROR', 'Invalid evaluation filters');
  const [overview, dimensions, reasons] = await Promise.all([
    getQualityOverview(filters),
    getDimensionAverages(filters),
    getFeedbackReasons(filters),
  ]);
  res.json({ success: true, data: { overview, dimensions, feedbackReasons: reasons } });
});

adminRouter.get('/ai-evaluation/trend', staffOrAdmin, evaluationSection, async (req, res) => {
  const filters = parseEvaluationFilters(req);
  if (!filters) return fail(res, 422, 'VALIDATION_ERROR', 'Invalid evaluation filters');
  const raw = String(req.query.granularity ?? 'day');
  const granularity = raw === 'week' || raw === 'month' ? raw : 'day';
  res.json({ success: true, data: await getQualityTrend(filters, granularity) });
});

adminRouter.get('/ai-evaluation/quality-vs-cost', staffOrAdmin, evaluationSection, async (req, res) => {
  const filters = parseEvaluationFilters(req);
  if (!filters) return fail(res, 422, 'VALIDATION_ERROR', 'Invalid evaluation filters');
  res.json({ success: true, data: await getQualityVsCost(filters) });
});

adminRouter.get('/ai-evaluation/responses', staffOrAdmin, evaluationSection, async (req, res) => {
  const filters = parseEvaluationFilters(req);
  if (!filters) return fail(res, 422, 'VALIDATION_ERROR', 'Invalid evaluation filters');
  res.json({
    success: true,
    data: await listEvaluatedResponses(filters, {
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      offset: req.query.offset ? Number(req.query.offset) : undefined,
    }),
  });
});

adminRouter.get('/ai-evaluation/responses/:requestId', staffOrAdmin, evaluationSection, async (req, res) => {
  const detail = await getResponseDetail(String(req.params.requestId));
  if (!detail) return fail(res, 404, 'NOT_FOUND', 'No such AI response');
  res.json({ success: true, data: detail });
});
