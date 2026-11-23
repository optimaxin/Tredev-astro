import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useRealtime } from '../../realtime/RealtimeContext';
import type { AuthUser } from '../../context/AppContext';
import { astrologerService } from '../../services/astrologerService';
import type { UiAstrologer, ApiAstrologerProfile } from '../../services/astrologerService';
import { adminService, AdminApiError } from '../../services/adminService';
import type { ApiAstrologerRevenue, ApiAstrologerActivity, ApiAstrologerStatus } from '../../services/adminService';
import DataTable from '../components/DataTable';
import Drawer from '../components/Drawer';
import { StatusBadge, SearchInput, EmptyState, AdminButton, ChatAuditPanel } from '../components/SharedControls';
import styles from './AdminPages.module.css';

// ApiAstrologerStatus carries the full public-profile fields too (see
// admin.routes.ts's GET /astrologers/status) under the catalog's own field
// names (experienceYears, chatPrice, etc.) rather than UiAstrologer's
// shortened ones — this reshapes one into the other so joinedProfile below
// can treat a "removed" astrologer (status-only, see its own comment) the
// same as a normal catalog entry.
function statusAsUiAstrologer(s: ApiAstrologerStatus): UiAstrologer {
  // Only ever called on a row that matched by `.name`, which means this is
  // the Removed-astrologer case where these otherwise-optional fields are
  // actually populated (see the type's own comment) — safe to assert.
  return {
    id: s.id, name: s.name!, title: s.title!, rating: s.rating!, reviews: s.reviewCount!,
    experience: s.experienceYears!, consultations: s.consultationCount!, languages: s.languages!,
    price: s.chatPrice!, avatar: s.avatar!, about: s.bio!, category: s.categories!, specialization: s.expertise!,
    activeOfferPercent: s.activeOfferPercent!,
  };
}

// Matched by name against the real astrologer catalog — every astrologer
// account (seeded roster or one created through the real apply/approve
// flow) has exactly one catalog row with that account's real name.
// `catalog` (the public listing) never includes a Removed astrologer
// (is_active = 0 is filtered out server-side, same as the public site) —
// `liveStatus` is the fallback since GET /astrologers/status additionally
// appends removed rows (with their full profile) so staff can still see who
// they're about to Restore instead of a blank card.
function joinedProfile(account: AuthUser, catalog: UiAstrologer[], liveStatus: Record<number, ApiAstrologerStatus>) {
  const fromStatus = Object.values(liveStatus).find(s => s.name === account.name);
  const profile = catalog.find(a => a.name === account.name) ?? (fromStatus ? statusAsUiAstrologer(fromStatus) : undefined);
  return {
    id: profile?.id,
    rating: profile?.rating ?? 0,
    experience: profile?.experience ?? 0,
    languages: profile?.languages ?? [],
    consultations: profile?.consultations ?? 0,
    price: profile?.price ?? 0,
    specialization: profile?.specialization ?? [],
    about: profile?.about ?? '—',
    avatar: profile?.avatar,
    activeOfferPercent: profile?.activeOfferPercent ?? 0,
  };
}

const CONSULTATION_TYPES = ['chat', 'voice', 'video'] as const;

interface EditForm {
  title: string;
  bio: string;
  avatar: string;
  experienceYears: string;
  languages: string;   // comma-separated in the form, split into string[] on save
  categories: string;
  expertise: string;
  consultationTypes: string[];
  chatPrice: string;
  callPrice: string;
  videoPrice: string;
  // What % of the per-minute price this astrologer actually earns — e.g.
  // ₹25/min at 10% means ₹2.50/min shows up in their own Earnings tab, not
  // the full ₹25.
  commissionPercent: string;
}

const EMPTY_EDIT_FORM: EditForm = {
  title: '', bio: '', avatar: '', experienceYears: '0',
  languages: '', categories: '', expertise: '',
  consultationTypes: ['chat', 'voice', 'video'],
  chatPrice: '0', callPrice: '0', videoPrice: '0',
  commissionPercent: '100',
};

interface CreateForm extends EditForm {
  name: string;
  email: string;
  password: string;
}

const EMPTY_CREATE_FORM: CreateForm = { ...EMPTY_EDIT_FORM, name: '', email: '', password: '' };

// commissionPercent isn't on astrologerService's ApiAstrologerProfile (that's
// the PUBLIC catalog shape) — passed in separately from liveStatus, the one
// place the staff panel already has it (see GET /astrologers/status).
function profileToForm(p: ApiAstrologerProfile, commissionPercent: number): EditForm {
  return {
    title: p.title, bio: p.bio, avatar: p.avatar, experienceYears: String(p.experienceYears),
    languages: p.languages.join(', '), categories: p.categories.join(', '), expertise: p.expertise.join(', '),
    consultationTypes: p.consultationTypes,
    chatPrice: String(p.chatPrice), callPrice: String(p.callPrice), videoPrice: String(p.videoPrice),
    commissionPercent: String(commissionPercent),
  };
}

const splitList = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean);

// Same base64-data-URL convention as BannersPage.tsx / ApplyAstrologerPage.tsx
// — this app has no object-storage service, so a dropped image file becomes
// the `avatar` value directly (see editAstrologerSchema's own comment on the
// backend for the body-size story).
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Shared by both the Edit and Create drawers — a plain URL still works (the
// text input), but staff can also drag an image file straight in, or click
// to browse, same as BannersPage.tsx's media picker.
function AvatarField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [dragOver, setDragOver] = useState(false);
  const onFile = async (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;
    onChange(await fileToDataUrl(file));
  };
  return (
    <div>
      <input className={styles.formInput} value={value.startsWith('data:') ? '' : value} onChange={e => onChange(e.target.value)} placeholder="https://… (or drop an image below)" />
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); onFile(e.dataTransfer.files?.[0]); }}
        style={{
          marginTop: 8, padding: '14px 10px', borderRadius: 8, textAlign: 'center', cursor: 'pointer',
          border: `1.5px dashed ${dragOver ? 'var(--adm-gold, #b58a3b)' : 'var(--adm-border, #e5e0d8)'}`,
          fontSize: '0.78rem', color: 'var(--adm-muted, #8a8678)', position: 'relative',
        }}
      >
        {value.startsWith('data:') ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
            <img src={value} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
            <span>Image selected — drop another to replace</span>
          </div>
        ) : 'Drag & drop an image here, or click to choose'}
        <input
          type="file" accept="image/*"
          onChange={e => onFile(e.target.files?.[0])}
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
        />
      </div>
    </div>
  );
}

const ZERO_REVENUE: ApiAstrologerRevenue = {
  astrologerId: -1, astrologerName: '', chatCount: 0, chatRevenue: 0, voiceCount: 0, voiceRevenue: 0, videoCount: 0, videoRevenue: 0, totalRevenue: 0,
  astrologerPayout: 0, platformShare: 0,
};

export default function AstrologersPage() {
  const { t, accounts, suspendAccount, restoreAccount, updateAccountRole, currentUser, refreshAdminData } = useAppContext();
  // So a second staff member's suspend/restore/delete from another tab/
  // session shows up here too without a manual refresh — same event the
  // public listing reacts to (see RealtimeContext's own comment).
  const { catalogVersion } = useRealtime();
  // Revenue is an ADMIN-only view — Staff never sees it here regardless of
  // whether they've been granted the Astrologers section, mirrors the
  // backend's GET /astrologers/revenue being adminOnly now.
  const isAdmin = currentUser?.role === 'ADMIN';
  const [view, setView] = useState<'cards' | 'table' | 'revenue'>('cards');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AuthUser | null>(null);
  const [profileTab, setProfileTab] = useState('overview');
  const [catalog, setCatalog] = useState<UiAstrologer[]>([]);
  const [revenue, setRevenue] = useState<ApiAstrologerRevenue[]>([]);
  const [liveStatus, setLiveStatus] = useState<Record<number, ApiAstrologerStatus>>({});
  const [activity, setActivity] = useState<ApiAstrologerActivity | null>(null);
  const [activityError, setActivityError] = useState('');
  // Staff-set per-astrologer Boost payout-share override — draft input for
  // whichever astrologer's drawer is currently open.
  const [boostPayoutDraft, setBoostPayoutDraft] = useState('');
  const [boostPayoutSaving, setBoostPayoutSaving] = useState(false);
  const [boostPayoutError, setBoostPayoutError] = useState('');

  // Editing the rest of the catalog profile (experience years, bio,
  // languages, pricing, etc.) — previously had no edit path at all; "Edit"
  // and "View" both just opened the same read-only drawer.
  const [editTarget, setEditTarget] = useState<AuthUser | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_EDIT_FORM);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Direct admin-onboarding — creates the account (role ASTROLOGIST) and
  // its catalog profile in one call (backend/app/api/admin.routes.ts's
  // POST /astrologers). The apply/approve flow (Applications page) still
  // exists unchanged; this is a staff shortcut for onboarding someone
  // directly without them applying first.
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE_FORM);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState('');

  const toggleCreateConsultationType = (type: string) => {
    setCreateForm(prev => ({
      ...prev,
      consultationTypes: prev.consultationTypes.includes(type)
        ? prev.consultationTypes.filter(t => t !== type)
        : [...prev.consultationTypes, type],
    }));
  };

  const handleCreateSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSaving(true);
    setCreateError('');
    try {
      await adminService.createAstrologer({
        name: createForm.name, email: createForm.email, password: createForm.password,
        title: createForm.title, bio: createForm.bio, avatar: createForm.avatar,
        languages: splitList(createForm.languages), categories: splitList(createForm.categories), expertise: splitList(createForm.expertise),
        consultationTypes: createForm.consultationTypes,
        chatPrice: Number(createForm.chatPrice) || 0, callPrice: Number(createForm.callPrice) || 0, videoPrice: Number(createForm.videoPrice) || 0,
        experienceYears: Number(createForm.experienceYears) || 0,
        commissionPercent: Math.min(100, Math.max(1, Number(createForm.commissionPercent) || 100)),
      });
      await Promise.all([refreshAdminData(), astrologerService.list({ limit: 50 }).then(r => setCatalog(r.data))]);
      setCreateOpen(false);
      setCreateForm(EMPTY_CREATE_FORM);
    } catch (err) {
      setCreateError(err instanceof AdminApiError ? err.message : 'Could not create this astrologer.');
    } finally {
      setCreateSaving(false);
    }
  };

  const openEdit = async (account: AuthUser) => {
    const id = joinedProfile(account, catalog, liveStatus).id;
    if (id === undefined) { setEditError('No catalog entry found for this astrologer.'); return; }
    setEditTarget(account);
    setEditError('');
    setEditLoading(true);
    try {
      const profile = await astrologerService.getRaw(id);
      if (profile) setEditForm(profileToForm(profile, liveStatus[id]?.commissionPercent ?? 100));
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Could not load this astrologer\'s profile.');
    } finally {
      setEditLoading(false);
    }
  };

  const toggleConsultationType = (type: string) => {
    setEditForm(prev => ({
      ...prev,
      consultationTypes: prev.consultationTypes.includes(type)
        ? prev.consultationTypes.filter(t => t !== type)
        : [...prev.consultationTypes, type],
    }));
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    const id = joinedProfile(editTarget, catalog, liveStatus).id;
    if (id === undefined) return;
    setEditSaving(true);
    setEditError('');
    try {
      const updated = await adminService.updateAstrologerProfile(id, {
        title: editForm.title,
        bio: editForm.bio,
        avatar: editForm.avatar,
        languages: splitList(editForm.languages),
        categories: splitList(editForm.categories),
        expertise: splitList(editForm.expertise),
        consultationTypes: editForm.consultationTypes,
        chatPrice: Number(editForm.chatPrice) || 0,
        callPrice: Number(editForm.callPrice) || 0,
        videoPrice: Number(editForm.videoPrice) || 0,
        experienceYears: Number(editForm.experienceYears) || 0,
        commissionPercent: Math.min(100, Math.max(1, Number(editForm.commissionPercent) || 100)),
      });
      // Reflect the save immediately in the list/cards without a full
      // reload — adapt() lives in astrologerService, so just re-map here.
      setCatalog(prev => prev.map(c => c.id === updated.id ? {
        ...c, title: updated.title, rating: updated.rating, reviews: updated.reviewCount,
        experience: updated.experienceYears, languages: updated.languages, price: updated.chatPrice,
        avatar: updated.avatar, about: updated.bio, category: updated.categories, specialization: updated.expertise,
      } : c));
      setLiveStatus(prev => prev[id] ? { ...prev, [id]: { ...prev[id], commissionPercent: updated.commissionPercent } } : prev);
      setEditTarget(null);
    } catch (err) {
      setEditError(err instanceof AdminApiError ? err.message : 'Could not save these changes.');
    } finally {
      setEditSaving(false);
    }
  };

  // One Suspend/Activate toggle, not two separate controls — Suspend simply
  // means "take this astrologer off the public site". For a real account,
  // that's suspendAccount/restoreAccount (which the backend now also
  // cascades into astrologers.is_active — see PATCH /users/:id/status's own
  // comment), and goes purely by email: it does NOT need a matched catalog
  // `id` at all (the backend looks the astrologer up by user_id). Only the
  // orphan path (no real account — see isOrphanAccount above) needs an id,
  // since setAstrologerActive operates directly on the catalog row. Keying
  // "busy" by email rather than catalog id also means a real account whose
  // name doesn't match any catalog row (so `id` is undefined — see
  // joinedProfile's name-matching comment) can still be suspended; the old
  // id-keyed version left Suspend permanently disabled for exactly those
  // accounts, which looked like "suspend doesn't work" even though the
  // backend call never needed the id in the first place.
  // Re-fetches catalog + live status afterward either way, since both paths
  // change whether this astrologer shows up in the "removed" half of GET
  // /astrologers/status.
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const handleSuspendToggle = async (a: AuthUser, id: number | undefined, suspend: boolean) => {
    setBusyEmail(a.email);
    try {
      if (isOrphanAccount(a)) {
        if (id === undefined) return;
        await adminService.setAstrologerActive(id, !suspend);
      } else if (suspend) {
        await suspendAccount(a.email);
      } else {
        await restoreAccount(a.email);
      }
      const [catalogRes, statusRows] = await Promise.all([
        astrologerService.list({ limit: 50 }),
        adminService.getAstrologerStatuses(),
      ]);
      setCatalog(catalogRes.data);
      setLiveStatus(Object.fromEntries(statusRows.map(r => [r.id, r])));
    } finally {
      setBusyEmail(null);
    }
  };

  const handleDeleteAstrologer = async (id: number, name: string, email: string) => {
    if (!window.confirm(`Permanently delete ${name}? This also permanently deletes ALL their consultations, reviews, and booking history. This cannot be undone. Use Suspend instead if you just want to hide them.`)) return;
    setBusyEmail(email);
    try {
      await adminService.deleteAstrologer(id);
      const [catalogRes, statusRows] = await Promise.all([
        astrologerService.list({ limit: 50 }),
        adminService.getAstrologerStatuses(),
      ]);
      setCatalog(catalogRes.data);
      setLiveStatus(Object.fromEntries(statusRows.map(r => [r.id, r])));
      if (selected && joinedProfile(selected, catalogRes.data, Object.fromEntries(statusRows.map(r => [r.id, r]))).id === id) setSelected(null);
    } catch (err) {
      // window.alert, not a page-top paragraph easy to miss while scrolled
      // down a long roster — same reasoning as every other destructive
      // admin-page delete's confirm (see BannersPage/PoojaPage's own).
      window.alert(err instanceof AdminApiError ? err.message : `Could not delete ${name}.`);
    } finally {
      setBusyEmail(null);
    }
  };

  // A real account whose name matches no catalog row at all (no astrologer
  // profile was ever created for it — e.g. a test/demo account whose role
  // was switched to ASTROLOGIST directly, never run through "Add
  // Astrologer") has nothing for adminService.deleteAstrologer to delete:
  // there's no catalog id. Delete used to just stay disabled forever for
  // these, with no way to clean them up. This takes the account out of the
  // Astrologer roster the same way leaving the role is undone elsewhere —
  // by changing its role back to USER — rather than adding a new
  // destructive "delete the user account" endpoint for what's really just a
  // bad role assignment.
  const handleRemoveOrphanRole = async (a: AuthUser) => {
    if (!window.confirm(`${a.name} has no astrologer profile set up, so there's nothing in the catalog to delete. Remove their Astrologer role instead (they'll become a normal user)?`)) return;
    setBusyEmail(a.email);
    try {
      await updateAccountRole(a.email, 'USER');
    } catch (err) {
      window.alert(err instanceof AdminApiError ? err.message : `Could not update ${a.name}'s role.`);
    } finally {
      setBusyEmail(null);
    }
  };

  useEffect(() => {
    astrologerService.list({ limit: 50 }).then(r => setCatalog(r.data)).catch(() => {});
    if (isAdmin) adminService.getAstrologerRevenue().then(setRevenue).catch(() => {});
    adminService.getAstrologerStatuses()
      .then(rows => setLiveStatus(Object.fromEntries(rows.map(r => [r.id, r]))))
      .catch(() => {});
  }, [isAdmin, catalogVersion]);

  // Reset the Boost payout override draft whenever a different astrologer's
  // drawer opens, seeded from their current override (blank = using the
  // platform default).
  useEffect(() => {
    const id = selected ? joinedProfile(selected, catalog, liveStatus).id : undefined;
    const override = id !== undefined ? liveStatus[id]?.boostPayoutOverridePercent : null;
    setBoostPayoutDraft(override != null ? String(override) : '');
    setBoostPayoutError('');
  }, [selected, catalog, liveStatus]);

  const saveBoostPayoutOverride = async (astrologerId: number, clear: boolean) => {
    setBoostPayoutSaving(true);
    setBoostPayoutError('');
    try {
      const percent = clear ? null : Number(boostPayoutDraft);
      if (!clear && (Number.isNaN(percent) || percent! < 0 || percent! > 100)) {
        setBoostPayoutError('Enter a number between 0 and 100.');
        return;
      }
      await adminService.updateAstrologerBoostPayout(astrologerId, percent);
      // Re-fetch rather than patch the local cache — the effective %
      // when clearing an override depends on the platform default, which
      // this component doesn't otherwise track.
      const rows = await adminService.getAstrologerStatuses();
      setLiveStatus(Object.fromEntries(rows.map(r => [r.id, r])));
      if (clear) setBoostPayoutDraft('');
    } catch (err) {
      setBoostPayoutError(err instanceof AdminApiError ? err.message : 'Could not save this override.');
    } finally {
      setBoostPayoutSaving(false);
    }
  };

  // Fetched fresh per astrologer when the profile drawer opens — same
  // pattern as UsersPage's activity fetch.
  useEffect(() => {
    const id = selected ? joinedProfile(selected, catalog, liveStatus).id : undefined;
    if (id === undefined) { setActivity(null); return; }
    setActivity(null);
    setActivityError('');
    adminService.getAstrologerActivity(id)
      .then(setActivity)
      .catch(() => setActivityError('Could not load this astrologer\'s activity.'));
  }, [selected, catalog]);

  const astrologers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const real = accounts
      .filter(a => a.role === 'ASTROLOGIST')
      .filter(a => !q || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q));
    // Dummy/orphan catalog rows with no linked user account (old seed data,
    // or an account later deleted/role-changed) are otherwise completely
    // invisible here — this page is account-driven and joinedProfile only
    // matches a catalog/liveStatus row to an EXISTING account by name. GET
    // /astrologers/status now fills in full profile fields (name included)
    // for these (see its own comment), so synthesize a minimal pseudo-account
    // per orphan name so staff can still see and manage (Remove/Restore/
    // Delete) it the same way as any real astrologer.
    const realNames = new Set(real.map(a => a.name));
    const seen = new Set<string>();
    const orphans: AuthUser[] = [];
    for (const s of Object.values(liveStatus)) {
      if (!s.name || realNames.has(s.name) || seen.has(s.name)) continue;
      seen.add(s.name);
      if (q && !s.name.toLowerCase().includes(q)) continue;
      orphans.push({ id: `orphan-${s.id}`, name: s.name, email: `orphan-${s.id}@no-account.local`, role: 'ASTROLOGIST', status: 'ACTIVE' });
    }
    return [...real, ...orphans];
  }, [accounts, search, liveStatus]);

  const isOrphanAccount = (a: AuthUser) => a.id.startsWith('orphan-');

  // Suspend/Activate only needs a catalog id for an orphan account (see
  // handleSuspendToggle's own comment) — a real account suspends by email
  // regardless of whether its name happens to match a catalog row.
  const suspendDisabled = (a: AuthUser, id: number | undefined) =>
    busyEmail === a.email || (isOrphanAccount(a) && id === undefined);

  // Delete either removes the catalog row (id present) or, for a real
  // account with no catalog row at all, falls back to clearing its
  // Astrologer role (see handleRemoveOrphanRole) — only truly disabled for
  // an orphan pseudo-account somehow missing even its id (nothing at all to
  // act on: no catalog row, no real user account either).
  const deleteDisabled = (a: AuthUser, id: number | undefined) =>
    busyEmail === a.email || (isOrphanAccount(a) && id === undefined);
  const handleDeleteClick = (a: AuthUser, id: number | undefined) =>
    id !== undefined ? handleDeleteAstrologer(id, a.name, a.email) : handleRemoveOrphanRole(a);

  // Whole-roster CSV — download every astrologer's editable fields, bulk-edit
  // in a spreadsheet, re-upload. Same download/re-upload convention as
  // PricingRegionsPage's region-pricing CSV.
  const [csvBusy, setCsvBusy] = useState(false);
  const [csvMessage, setCsvMessage] = useState('');
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadAstrologersCsv = async () => {
    setCsvBusy(true);
    setCsvMessage('');
    try {
      const blob = await adminService.downloadAstrologersCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'astrologers.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setCsvMessage(err instanceof AdminApiError ? err.message : 'Could not download the astrologers CSV.');
    } finally {
      setCsvBusy(false);
    }
  };

  const handleImportAstrologersCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setCsvBusy(true);
    setCsvMessage('');
    try {
      const text = await file.text();
      const result = await adminService.importAstrologersCsv(text);
      setCsvMessage(result.errors.length ? `Updated ${result.updated} — ${result.errors.length} row(s) skipped: ${result.errors.join('; ')}` : `Updated ${result.updated} astrologer(s).`);
      const [catalogRes, statusRows] = await Promise.all([astrologerService.list({ limit: 50 }), adminService.getAstrologerStatuses()]);
      setCatalog(catalogRes.data);
      setLiveStatus(Object.fromEntries(statusRows.map(r => [r.id, r])));
    } catch (err) {
      setCsvMessage(err instanceof AdminApiError ? err.message : 'Could not import this CSV.');
    } finally {
      setCsvBusy(false);
    }
  };

  // Real per-type revenue (chat/voice/video, each at that astrologer's own
  // price, counted only from completed consultations) — replaces the old
  // `price * totalConsultations` estimate, which used the CHAT price for
  // every consultation type and counted consultations that were never
  // actually completed.
  const revenueFor = (astrologerId: number | undefined): ApiAstrologerRevenue =>
    revenue.find(r => r.astrologerId === astrologerId) ?? ZERO_REVENUE;

  // Whether staff has Removed this astrologer from the bookable catalog —
  // separate from both the live ONLINE/OFFLINE status and the account's own
  // ACTIVE/SUSPENDED (login) status.
  const isActiveFor = (astrologerId: number | undefined) => liveStatus[astrologerId ?? -1]?.isActive ?? true;

  // Live realtime availability (see ApiAstrologerStatus) — separate from the
  // account ACTIVE/SUSPENDED StatusBadge, which only reflects moderation.
  const liveStatusFor = (astrologerId: number | undefined) => liveStatus[astrologerId ?? -1]?.status ?? 'OFFLINE';
  const liveStatusBadge = (astrologerId: number | undefined) => {
    const s = liveStatusFor(astrologerId).toLowerCase();
    return <StatusBadge status={s} label={t(`admin_astro_status_${s}`)} />;
  };
  // Offer/Boost — see Extra/Astrologer Offers Feature and Boost Feature
  // PDFs; both were fully implemented backend + astrologer-dashboard side
  // but had no visibility anywhere in the admin/staff console until now.
  const boostBadge = (astrologerId: number | undefined) =>
    liveStatus[astrologerId ?? -1]?.activeBoost ? <StatusBadge status="boost_active" label="Boost active" /> : null;
  const offerBadge = (percent: number) =>
    percent > 0 ? <StatusBadge status="offer_active" label={`${percent}% OFF active`} /> : null;

  const TABS = [
    { key: 'overview', labelKey: 'admin_astro_tab_overview' },
    { key: 'schedule', labelKey: 'admin_astro_tab_schedule' },
    { key: 'reviews', labelKey: 'admin_astro_tab_reviews' },
    ...(isAdmin ? [{ key: 'earnings', labelKey: 'admin_astro_tab_earnings' }] : []),
    { key: 'consultations', labelKey: 'admin_astro_tab_consultations' },
    { key: 'audit', labelKey: 'admin_astro_tab_audit' },
    { key: 'documents', labelKey: 'admin_astro_tab_documents' },
  ];

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>{t('admin_astro_title')}</div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.viewToggle}>
          <AdminButton variant={view === 'cards' ? 'gold' : 'outline'} onClick={() => setView('cards')}>{t('admin_astro_view_cards')}</AdminButton>
          <AdminButton variant={view === 'table' ? 'gold' : 'outline'} onClick={() => setView('table')}>{t('admin_astro_view_table')}</AdminButton>
          {isAdmin && <AdminButton variant={view === 'revenue' ? 'gold' : 'outline'} onClick={() => setView('revenue')}>{t('admin_astro_view_revenue')}</AdminButton>}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <SearchInput value={search} onChange={setSearch} placeholder={t('admin_search_name_email')} />
          <AdminButton disabled={csvBusy} onClick={handleDownloadAstrologersCsv}>Download CSV</AdminButton>
          <AdminButton disabled={csvBusy} onClick={() => csvFileInputRef.current?.click()}>Upload CSV</AdminButton>
          <input ref={csvFileInputRef} type="file" accept=".csv,text/csv" hidden onChange={handleImportAstrologersCsv} />
          <AdminButton variant="gold" onClick={() => { setCreateForm(EMPTY_CREATE_FORM); setCreateError(''); setCreateOpen(true); }}>
            {t('admin_astro_add')}
          </AdminButton>
        </div>
      </div>

      {csvMessage && <p style={{ fontSize: '0.82rem', marginBottom: 12 }}>{csvMessage}</p>}

      {astrologers.length === 0 && (
        <EmptyState title={t('admin_empty_title')} description={t('admin_empty_desc')} />
      )}

      {astrologers.length > 0 && view === 'revenue' && (
        <DataTable
          columns={[
            { key: 'name', label: t('admin_astro_col_name'), render: a => a.name },
            { key: 'chat', label: t('admin_astro_revenue_chat'), render: a => `₹${revenueFor(joinedProfile(a, catalog, liveStatus).id).chatRevenue.toLocaleString()} (${revenueFor(joinedProfile(a, catalog, liveStatus).id).chatCount})` },
            { key: 'voice', label: t('admin_astro_revenue_voice'), render: a => `₹${revenueFor(joinedProfile(a, catalog, liveStatus).id).voiceRevenue.toLocaleString()} (${revenueFor(joinedProfile(a, catalog, liveStatus).id).voiceCount})` },
            { key: 'video', label: t('admin_astro_revenue_video'), render: a => `₹${revenueFor(joinedProfile(a, catalog, liveStatus).id).videoRevenue.toLocaleString()} (${revenueFor(joinedProfile(a, catalog, liveStatus).id).videoCount})` },
            { key: 'total', label: t('admin_astro_revenue_total'), render: a => <strong>₹{revenueFor(joinedProfile(a, catalog, liveStatus).id).totalRevenue.toLocaleString()}</strong> },
            { key: 'payout', label: 'Astrologer Payout', render: a => `₹${revenueFor(joinedProfile(a, catalog, liveStatus).id).astrologerPayout.toLocaleString()}` },
            { key: 'platformShare', label: 'Platform Share', render: a => `₹${revenueFor(joinedProfile(a, catalog, liveStatus).id).platformShare.toLocaleString()}` },
          ]}
          rows={astrologers}
          keyField="email"
        />
      )}

      {astrologers.length > 0 && view === 'cards' && (
        <div className={styles.astroCardGrid}>
          {astrologers.map(a => {
            const p = joinedProfile(a, catalog, liveStatus);
            const active = isActiveFor(p.id);
            return (
              <div key={a.email} className={styles.astroCard}>
                <div className={styles.astroCardHeader}>
                  {p.avatar ? <img src={p.avatar} alt={a.name} className={styles.astroAvatar} /> : <div className={styles.astroAvatar}>{a.name.charAt(0)}</div>}
                  <div className={styles.astroCardHeaderText}>
                    <div className={styles.astroCardName}>{a.name}</div>
                    <div className={styles.astroCardMeta} title={a.email}>{a.email}</div>
                  </div>
                </div>
                <div className={styles.astroCardStats}>
                  <div><span className={styles.astroStatLabel}>{t('admin_astro_col_rating')}: </span><span className={styles.astroStatValue}>★ {p.rating}</span></div>
                  <div><span className={styles.astroStatLabel}>{t('admin_astro_col_experience')}: </span><span className={styles.astroStatValue}>{p.experience}y</span></div>
                  <div><span className={styles.astroStatLabel}>{t('admin_astro_col_consultations')}: </span><span className={styles.astroStatValue}>{p.consultations.toLocaleString()}</span></div>
                  {isAdmin && <div><span className={styles.astroStatLabel}>{t('admin_astro_col_earnings')}: </span><span className={styles.astroStatValue}>₹{revenueFor(p.id).totalRevenue.toLocaleString()}</span></div>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <StatusBadge status={active ? 'active' : 'suspended'} label={active ? 'Active' : 'Suspended'} />
                  {liveStatusBadge(p.id)}
                  {boostBadge(p.id)}
                  {offerBadge(p.activeOfferPercent)}
                </div>
                <div className={styles.astroCardActions}>
                  <AdminButton onClick={() => { setSelected(a); setProfileTab('overview'); }}>{t('admin_action_view')}</AdminButton>
                  <AdminButton onClick={() => openEdit(a)}>{t('admin_action_edit')}</AdminButton>
                  {active
                    ? <AdminButton variant="danger" disabled={suspendDisabled(a, p.id)} onClick={() => handleSuspendToggle(a, p.id, true)}>{t('admin_action_suspend')}</AdminButton>
                    : <AdminButton variant="gold" disabled={suspendDisabled(a, p.id)} onClick={() => handleSuspendToggle(a, p.id, false)}>{t('admin_action_activate')}</AdminButton>}
                  <AdminButton variant="danger" disabled={deleteDisabled(a, p.id)} onClick={() => handleDeleteClick(a, p.id)}>Delete</AdminButton>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {astrologers.length > 0 && view === 'table' && (
        <DataTable
          columns={[
            { key: 'name', label: t('admin_astro_col_name'), render: a => a.name },
            { key: 'rating', label: t('admin_astro_col_rating'), render: a => `★ ${joinedProfile(a, catalog, liveStatus).rating}` },
            { key: 'experience', label: t('admin_astro_col_experience'), render: a => `${joinedProfile(a, catalog, liveStatus).experience}y` },
            { key: 'languages', label: t('admin_astro_col_languages'), render: a => joinedProfile(a, catalog, liveStatus).languages.join(', ') || '—' },
            { key: 'consultations', label: t('admin_astro_col_consultations'), render: a => joinedProfile(a, catalog, liveStatus).consultations.toLocaleString() },
            ...(isAdmin ? [{ key: 'earnings', label: t('admin_astro_col_earnings'), render: (a: AuthUser) => `₹${revenueFor(joinedProfile(a, catalog, liveStatus).id).totalRevenue.toLocaleString()}` }] : []),
            { key: 'liveStatus', label: t('admin_astro_col_live_status'), render: a => liveStatusBadge(joinedProfile(a, catalog, liveStatus).id) },
            {
              key: 'promotions', label: 'Promotions', render: a => {
                const p = joinedProfile(a, catalog, liveStatus);
                return <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{boostBadge(p.id)}{offerBadge(p.activeOfferPercent)}</div>;
              },
            },
            {
              key: 'status', label: t('admin_astro_col_status'), render: a => {
                const active = isActiveFor(joinedProfile(a, catalog, liveStatus).id);
                return <StatusBadge status={active ? 'active' : 'suspended'} label={active ? 'Active' : 'Suspended'} />;
              },
            },
            {
              key: 'action', label: t('admin_apps_col_action'), hideOnCard: true, render: a => {
                const p = joinedProfile(a, catalog, liveStatus);
                const active = isActiveFor(p.id);
                return (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <AdminButton onClick={() => { setSelected(a); setProfileTab('overview'); }}>{t('admin_action_view')}</AdminButton>
                    <AdminButton onClick={() => openEdit(a)}>{t('admin_action_edit')}</AdminButton>
                    {active
                      ? <AdminButton variant="danger" disabled={suspendDisabled(a, p.id)} onClick={() => handleSuspendToggle(a, p.id, true)}>{t('admin_action_suspend')}</AdminButton>
                      : <AdminButton variant="gold" disabled={suspendDisabled(a, p.id)} onClick={() => handleSuspendToggle(a, p.id, false)}>{t('admin_action_activate')}</AdminButton>}
                    <AdminButton variant="danger" disabled={deleteDisabled(a, p.id)} onClick={() => handleDeleteClick(a, p.id)}>Delete</AdminButton>
                  </div>
                );
              }
            },
          ]}
          rows={astrologers}
          keyField="email"
        />
      )}

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.name || ''} wide>
        {selected && (() => {
          const p = joinedProfile(selected, catalog, liveStatus);
          return (
            <>
              <div className={styles.tabsRow}>
                {TABS.map(tab => (
                  <button key={tab.key} className={`${styles.tabBtn} ${profileTab === tab.key ? styles.tabBtnActive : ''}`} onClick={() => setProfileTab(tab.key)}>
                    {t(tab.labelKey)}
                  </button>
                ))}
              </div>

              {profileTab === 'overview' && (
                <>
                  <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>Email</span><span className={styles.drawerFieldValue}>{selected.email}</span></div>
                  <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_astro_col_live_status')}</span><span className={styles.drawerFieldValue}>{liveStatusBadge(p.id)}</span></div>
                  {(liveStatus[p.id ?? -1]?.activeBoost || p.activeOfferPercent > 0) && (
                    <div className={styles.drawerField}>
                      <span className={styles.drawerFieldLabel}>Promotions</span>
                      <span className={styles.drawerFieldValue} style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {boostBadge(p.id)}
                        {offerBadge(p.activeOfferPercent)}
                      </span>
                    </div>
                  )}
                  <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_astro_col_rating')}</span><span className={styles.drawerFieldValue}>★ {p.rating}</span></div>
                  <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_astro_col_experience')}</span><span className={styles.drawerFieldValue}>{p.experience} yrs</span></div>
                  <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_astro_col_languages')}</span><span className={styles.drawerFieldValue}>{p.languages.join(', ') || '—'}</span></div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--adm-charcoal-soft)', marginTop: 14, lineHeight: 1.5 }}>{p.about}</p>

                  <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--adm-border, #e5e0d8)' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: 6 }}>Boost Payout Override</div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--adm-charcoal-soft)', marginBottom: 10 }}>
                      What this astrologer keeps on a Boost-attributed session. Leave blank to use the platform default
                      {liveStatus[p.id ?? -1] && !liveStatus[p.id ?? -1]?.boostPayoutOverridePercent && ` (currently ${liveStatus[p.id ?? -1]?.effectiveBoostPayoutSharePercent}%)`}.
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <input
                        type="number" min={0} max={100}
                        className={styles.formInput} style={{ width: 90 }}
                        value={boostPayoutDraft}
                        placeholder="Default"
                        onChange={e => setBoostPayoutDraft(e.target.value)}
                      />
                      <span style={{ fontSize: '0.82rem' }}>%</span>
                      <AdminButton variant="gold" disabled={boostPayoutSaving || p.id === undefined || !boostPayoutDraft} onClick={() => p.id !== undefined && saveBoostPayoutOverride(p.id, false)}>
                        {boostPayoutSaving ? '…' : 'Save'}
                      </AdminButton>
                      {liveStatus[p.id ?? -1]?.boostPayoutOverridePercent != null && (
                        <AdminButton variant="outline" disabled={boostPayoutSaving || p.id === undefined} onClick={() => p.id !== undefined && saveBoostPayoutOverride(p.id, true)}>
                          Reset to default
                        </AdminButton>
                      )}
                    </div>
                    {boostPayoutError && <p style={{ color: 'var(--adm-danger, #c0392b)', fontSize: '0.8rem', marginTop: 8 }}>{boostPayoutError}</p>}
                  </div>
                </>
              )}
              {profileTab === 'schedule' && <EmptyState title={t('admin_empty_title')} description={t('admin_empty_desc')} />}
              {profileTab === 'reviews' && <EmptyState title={t('admin_empty_title')} description={t('admin_empty_desc')} />}
              {profileTab === 'earnings' && (() => {
                const rev = revenueFor(p.id);
                return (
                  <>
                    <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_astro_revenue_chat')}</span><span className={styles.drawerFieldValue}>₹{rev.chatRevenue.toLocaleString()} ({rev.chatCount})</span></div>
                    <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_astro_revenue_voice')}</span><span className={styles.drawerFieldValue}>₹{rev.voiceRevenue.toLocaleString()} ({rev.voiceCount})</span></div>
                    <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_astro_revenue_video')}</span><span className={styles.drawerFieldValue}>₹{rev.videoRevenue.toLocaleString()} ({rev.videoCount})</span></div>
                    <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_astro_revenue_total')}</span><span className={styles.drawerFieldValue}><strong>₹{rev.totalRevenue.toLocaleString()}</strong></span></div>
                    {rev.astrologerPayout !== rev.totalRevenue && (
                      <>
                        <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>Astrologer Payout</span><span className={styles.drawerFieldValue}>₹{rev.astrologerPayout.toLocaleString()}</span></div>
                        <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>Platform Share (Boost)</span><span className={styles.drawerFieldValue}>₹{rev.platformShare.toLocaleString()}</span></div>
                      </>
                    )}
                  </>
                );
              })()}
              {profileTab === 'consultations' && (
                <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_astro_col_consultations')}</span><span className={styles.drawerFieldValue}>{p.consultations.toLocaleString()}</span></div>
              )}
              {profileTab === 'audit' && (
                <ChatAuditPanel
                  recentChats={activity ? activity.recentChats : activityError ? [] : null}
                  lastAction={activity?.lastAction ?? null}
                  loadError={activityError}
                  onRaiseWarning={note => adminService.logNote('audit.warning', `${selected.name} (astrologer): ${note}`).then(() => {})}
                />
              )}
              {profileTab === 'documents' && <EmptyState title={t('admin_apps_no_docs')} />}
            </>
          );
        })()}
      </Drawer>


      <Drawer
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={editTarget ? `${t('admin_action_edit')} — ${editTarget.name}` : ''}
        footer={<AdminButton variant="gold" type="submit" form="edit-astrologer-form" disabled={editLoading || editSaving}>{editSaving ? '…' : t('admin_action_save')}</AdminButton>}
      >
        {editLoading ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--adm-charcoal-soft)' }}>Loading…</p>
        ) : (
          <form id="edit-astrologer-form" onSubmit={handleEditSave}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{t('admin_astro_edit_title')}</label>
              <input className={styles.formInput} required value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{t('admin_astro_edit_bio')}</label>
              <textarea className={styles.formTextarea} value={editForm.bio} onChange={e => setEditForm({ ...editForm, bio: e.target.value })} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{t('admin_astro_edit_avatar')}</label>
              <AvatarField value={editForm.avatar} onChange={avatar => setEditForm({ ...editForm, avatar })} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{t('admin_astro_edit_experience')}</label>
              <input type="number" min={0} max={80} className={styles.formInput} value={editForm.experienceYears} onChange={e => setEditForm({ ...editForm, experienceYears: e.target.value })} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{t('admin_astro_col_languages')}</label>
              <input className={styles.formInput} value={editForm.languages} onChange={e => setEditForm({ ...editForm, languages: e.target.value })} placeholder="Hindi, English, …" />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{t('admin_astro_edit_categories')}</label>
              <input className={styles.formInput} value={editForm.categories} onChange={e => setEditForm({ ...editForm, categories: e.target.value })} placeholder="Love, Marriage, Career, …" />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{t('admin_astro_edit_expertise')}</label>
              <input className={styles.formInput} value={editForm.expertise} onChange={e => setEditForm({ ...editForm, expertise: e.target.value })} placeholder="Vedic Astrology, Numerology, …" />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{t('admin_astro_edit_consultation_types')}</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                {CONSULTATION_TYPES.map(type => (
                  <AdminButton key={type} type="button" variant={editForm.consultationTypes.includes(type) ? 'gold' : 'outline'} onClick={() => toggleConsultationType(type)}>
                    {type}
                  </AdminButton>
                ))}
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{t('admin_astro_edit_chat_price')}</label>
              <input type="number" min={0} className={styles.formInput} value={editForm.chatPrice} onChange={e => setEditForm({ ...editForm, chatPrice: e.target.value })} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{t('admin_astro_edit_call_price')}</label>
              <input type="number" min={0} className={styles.formInput} value={editForm.callPrice} onChange={e => setEditForm({ ...editForm, callPrice: e.target.value })} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{t('admin_astro_edit_video_price')}</label>
              <input type="number" min={0} className={styles.formInput} value={editForm.videoPrice} onChange={e => setEditForm({ ...editForm, videoPrice: e.target.value })} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Astrologer's Cut (%)</label>
              <input type="number" min={1} max={100} className={styles.formInput} value={editForm.commissionPercent} onChange={e => setEditForm({ ...editForm, commissionPercent: e.target.value })} />
              <p style={{ fontSize: '0.72rem', color: 'var(--adm-muted)', marginTop: 4 }}>
                What % of the per-minute price this astrologer actually earns — e.g. at ₹{editForm.chatPrice || 0}/min and {editForm.commissionPercent || 100}%, they earn ₹{((Number(editForm.chatPrice) || 0) * (Number(editForm.commissionPercent) || 100) / 100).toFixed(2)}/min on chat.
              </p>
            </div>
            {editError && <p style={{ color: 'var(--adm-danger)', fontSize: '0.8rem' }}>{editError}</p>}
          </form>
        )}
      </Drawer>

      <Drawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t('admin_astro_add')}
        footer={<AdminButton variant="gold" type="submit" form="create-astrologer-form" disabled={createSaving}>{createSaving ? '…' : t('admin_action_save')}</AdminButton>}
      >
        <form id="create-astrologer-form" onSubmit={handleCreateSave}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Name</label>
            <input className={styles.formInput} required value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Email</label>
            <input type="email" className={styles.formInput} required value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Initial Password</label>
            <input type="text" className={styles.formInput} required minLength={8} value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} placeholder="At least 8 characters" />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('admin_astro_edit_title')}</label>
            <input className={styles.formInput} required value={createForm.title} onChange={e => setCreateForm({ ...createForm, title: e.target.value })} placeholder="e.g. Vedic Astrologer" />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('admin_astro_edit_bio')}</label>
            <textarea className={styles.formTextarea} value={createForm.bio} onChange={e => setCreateForm({ ...createForm, bio: e.target.value })} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('admin_astro_edit_avatar')}</label>
            <AvatarField value={createForm.avatar} onChange={avatar => setCreateForm({ ...createForm, avatar })} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('admin_astro_edit_experience')}</label>
            <input type="number" min={0} max={80} className={styles.formInput} value={createForm.experienceYears} onChange={e => setCreateForm({ ...createForm, experienceYears: e.target.value })} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('admin_astro_col_languages')}</label>
            <input className={styles.formInput} value={createForm.languages} onChange={e => setCreateForm({ ...createForm, languages: e.target.value })} placeholder="Hindi, English, …" />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('admin_astro_edit_categories')}</label>
            <input className={styles.formInput} value={createForm.categories} onChange={e => setCreateForm({ ...createForm, categories: e.target.value })} placeholder="Love, Marriage, Career, …" />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('admin_astro_edit_expertise')}</label>
            <input className={styles.formInput} value={createForm.expertise} onChange={e => setCreateForm({ ...createForm, expertise: e.target.value })} placeholder="Vedic Astrology, Numerology, …" />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('admin_astro_edit_consultation_types')}</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              {CONSULTATION_TYPES.map(type => (
                <AdminButton key={type} type="button" variant={createForm.consultationTypes.includes(type) ? 'gold' : 'outline'} onClick={() => toggleCreateConsultationType(type)}>
                  {type}
                </AdminButton>
              ))}
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('admin_astro_edit_chat_price')}</label>
            <input type="number" min={0} className={styles.formInput} value={createForm.chatPrice} onChange={e => setCreateForm({ ...createForm, chatPrice: e.target.value })} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('admin_astro_edit_call_price')}</label>
            <input type="number" min={0} className={styles.formInput} value={createForm.callPrice} onChange={e => setCreateForm({ ...createForm, callPrice: e.target.value })} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('admin_astro_edit_video_price')}</label>
            <input type="number" min={0} className={styles.formInput} value={createForm.videoPrice} onChange={e => setCreateForm({ ...createForm, videoPrice: e.target.value })} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Astrologer's Cut (%)</label>
            <input type="number" min={1} max={100} className={styles.formInput} value={createForm.commissionPercent} onChange={e => setCreateForm({ ...createForm, commissionPercent: e.target.value })} />
            <p style={{ fontSize: '0.72rem', color: 'var(--adm-muted)', marginTop: 4 }}>
              What % of the per-minute price this astrologer actually earns — e.g. at ₹{createForm.chatPrice || 0}/min and {createForm.commissionPercent || 100}%, they earn ₹{((Number(createForm.chatPrice) || 0) * (Number(createForm.commissionPercent) || 100) / 100).toFixed(2)}/min on chat.
            </p>
          </div>
          {createError && <p style={{ color: 'var(--adm-danger)', fontSize: '0.8rem' }}>{createError}</p>}
        </form>
      </Drawer>

    </div>
  );
}
