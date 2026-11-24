import { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { adminService, AdminApiError } from '../../services/adminService';
import type { ApiReportPurchase, ApiAstrologyReport, ApiReportChangeRequest, AstrologyReportInput, ApiPendingResult } from '../../services/adminService';
import DataTable from '../components/DataTable';
import Drawer from '../components/Drawer';
import { StatCard, EmptyState, AdminButton } from '../components/SharedControls';
import styles from './AdminPages.module.css';

const BUNDLE_LABEL: Record<string, string> = {
  'report-only': 'Report Only',
  'report-qa': 'Report + Expert Q&A',
  'report-consult': 'Report + Consultation',
};

// Same preset keys as the public Reports section's COVER_PATTERNS — kept as
// a plain duplicate list here (not imported from the public bundle) so this
// admin chunk doesn't pull in the public Reports section's code.
const COVER_PATTERN_OPTIONS = ['none', 'dots', 'stripes', 'grid', 'waves'];

const EMPTY_FORM: AstrologyReportInput = {
  title: '', subtitle: '', description: '', pages: 10, sections: 5, price: 499, originalPrice: null,
  popular: false, color: '#C7A15A', icon: 'career', category: 'Career', displayOrder: 0,
  coverColor: null, coverPattern: null, coverImage: null,
};

function reportToForm(r: ApiAstrologyReport): AstrologyReportInput {
  const { id, ...rest } = r;
  return rest;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function isPending(result: unknown): result is ApiPendingResult {
  return !!result && typeof result === 'object' && (result as ApiPendingResult).pending === true;
}

export default function ReportsPage() {
  const { t, currentUser } = useAppContext();
  const isAdmin = currentUser?.role === 'ADMIN';
  const [view, setView] = useState<'purchases' | 'catalog' | 'approvals'>('purchases');

  const [purchases, setPurchases] = useState<ApiReportPurchase[]>([]);
  const [loading, setLoading] = useState(true);

  const [catalog, setCatalog] = useState<ApiAstrologyReport[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [changeRequests, setChangeRequests] = useState<ApiReportChangeRequest[]>([]);

  const [editTarget, setEditTarget] = useState<ApiAstrologyReport | 'new' | null>(null);
  const [form, setForm] = useState<AstrologyReportInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveNotice, setSaveNotice] = useState('');

  const loadCatalog = () => {
    setCatalogLoading(true);
    Promise.all([
      adminService.listReportsCatalog(),
      isAdmin ? adminService.listReportChangeRequests() : Promise.resolve([]),
    ])
      .then(([rows, pending]) => { setCatalog(rows); setChangeRequests(pending); })
      .catch(() => {})
      .finally(() => setCatalogLoading(false));
  };

  useEffect(() => {
    adminService.listReportPurchases().then(setPurchases).catch(() => setPurchases([])).finally(() => setLoading(false));
    loadCatalog();
  }, []);

  const revenue = purchases.reduce((sum, r) => sum + r.amount, 0);

  const openEdit = (target: ApiAstrologyReport | 'new') => {
    setForm(target === 'new' ? EMPTY_FORM : reportToForm(target));
    setSaveError('');
    setEditTarget(target);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      const result = editTarget === 'new'
        ? await adminService.createReportCatalogEntry(form)
        : await adminService.updateReportCatalogEntry((editTarget as ApiAstrologyReport).id, form);
      setEditTarget(null);
      setSaveNotice(isPending(result)
        ? 'Submitted for admin approval — this won\'t go live until approved.'
        : '');
      loadCatalog();
    } catch (err) {
      setSaveError(err instanceof AdminApiError ? err.message : 'Could not save this report.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r: ApiAstrologyReport) => {
    if (!window.confirm(`Delete "${r.title}" from the catalog?`)) return;
    try {
      const result = await adminService.deleteReportCatalogEntry(r.id);
      setSaveNotice(isPending(result) ? 'Deletion submitted for admin approval.' : '');
      loadCatalog();
    } catch (err) {
      window.alert(err instanceof AdminApiError ? err.message : 'Could not delete this report.');
    }
  };

  const handleDecide = async (id: string, approve: boolean) => {
    try {
      await adminService.decideReportChangeRequest(id, approve);
      loadCatalog();
    } catch (err) {
      window.alert(err instanceof AdminApiError ? err.message : 'Could not record this decision.');
    }
  };

  const coverFileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>{t('admin_reports_title')}</div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.viewToggle}>
          <AdminButton variant={view === 'purchases' ? 'gold' : 'outline'} onClick={() => setView('purchases')}>Purchases</AdminButton>
          <AdminButton variant={view === 'catalog' ? 'gold' : 'outline'} onClick={() => setView('catalog')}>Catalog</AdminButton>
          {isAdmin && (
            <AdminButton variant={view === 'approvals' ? 'gold' : 'outline'} onClick={() => setView('approvals')}>
              Pending Approvals{changeRequests.length > 0 ? ` (${changeRequests.length})` : ''}
            </AdminButton>
          )}
        </div>
        {view === 'catalog' && (
          <AdminButton variant="gold" onClick={() => openEdit('new')}>Add Report</AdminButton>
        )}
      </div>

      {saveNotice && <p style={{ fontSize: '0.82rem', marginBottom: 12, color: 'var(--adm-gold-dark, #8a6a22)' }}>{saveNotice}</p>}

      {view === 'purchases' && (
        <>
          <div className={styles.kpiGrid}>
            <StatCard icon="▤" label={t('admin_reports_kpi_total')} value={purchases.length} />
            {currentUser?.role !== 'STAFF' && <StatCard icon="₹" label={t('admin_reports_kpi_revenue')} value={`₹${revenue.toLocaleString()}`} />}
          </div>

          {!loading && (
            <DataTable
              columns={[
                { key: 'user', label: t('admin_reports_col_user'), render: r => r.userName },
                { key: 'report', label: t('admin_reports_col_report'), render: r => r.reportTitle },
                { key: 'bundle', label: 'Bundle', render: r => BUNDLE_LABEL[r.bundle] || r.bundle },
                { key: 'price', label: t('admin_reports_col_price'), render: r => `₹${r.amount}` },
                { key: 'date', label: t('admin_reports_col_date'), render: r => new Date(r.purchasedAt).toLocaleDateString() },
              ]}
              rows={purchases}
              keyField="id"
              emptyState={<EmptyState title={t('admin_empty_title')} description={t('admin_empty_desc')} />}
            />
          )}
        </>
      )}

      {view === 'catalog' && !catalogLoading && (
        catalog.length === 0 ? (
          <EmptyState title={t('admin_empty_title')} description={t('admin_empty_desc')} />
        ) : (
          <DataTable
            columns={[
              {
                key: 'cover', label: 'Cover', render: r => (
                  <div style={{
                    width: 44, height: 44, borderRadius: 8,
                    background: r.coverImage ? `url(${r.coverImage}) center/cover` : (r.coverColor || r.color),
                  }} />
                ),
              },
              { key: 'title', label: t('admin_reports_col_report'), render: r => r.title },
              { key: 'category', label: 'Category', render: r => r.category },
              { key: 'price', label: t('admin_reports_col_price'), render: r => `₹${r.price}${r.originalPrice ? ` (was ₹${r.originalPrice})` : ''}` },
              { key: 'popular', label: 'Popular', render: r => r.popular ? '★' : '—' },
              {
                key: 'action', label: t('admin_apps_col_action'), hideOnCard: true, render: r => (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <AdminButton onClick={() => openEdit(r)}>{t('admin_action_edit')}</AdminButton>
                    <AdminButton variant="danger" onClick={() => handleDelete(r)}>Delete</AdminButton>
                  </div>
                ),
              },
            ]}
            rows={catalog}
            keyField="id"
          />
        )
      )}

      {view === 'approvals' && isAdmin && (
        changeRequests.length === 0 ? (
          <EmptyState title={t('admin_empty_title')} description="No pending report-catalog changes." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {changeRequests.map(c => (
              <div key={c.id} className={styles.section} style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <strong>{c.action}</strong> — {c.payload?.title ?? c.currentReport?.title ?? `Report #${c.reportId}`}
                    <div style={{ fontSize: '0.78rem', color: 'var(--adm-charcoal-soft)', marginTop: 2 }}>
                      Requested {new Date(c.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <AdminButton variant="gold" onClick={() => handleDecide(c.id, true)}>Approve</AdminButton>
                    <AdminButton variant="danger" onClick={() => handleDecide(c.id, false)}>Reject</AdminButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <Drawer
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={editTarget === 'new' ? 'Add Report' : `Edit — ${(editTarget as ApiAstrologyReport)?.title ?? ''}`}
        footer={<AdminButton variant="gold" type="submit" form="edit-report-form" disabled={saving}>{saving ? '…' : t('admin_action_save')}</AdminButton>}
      >
        <form id="edit-report-form" onSubmit={handleSave}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Title</label>
            <input className={styles.formInput} required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Subtitle</label>
            <input className={styles.formInput} required value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Description</label>
            <textarea className={styles.formTextarea} required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Category</label>
            <input className={styles.formInput} required value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className={styles.formLabel}>Pages</label>
              <input type="number" min={1} className={styles.formInput} value={form.pages} onChange={e => setForm({ ...form, pages: Number(e.target.value) || 0 })} />
            </div>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className={styles.formLabel}>Sections</label>
              <input type="number" min={1} className={styles.formInput} value={form.sections} onChange={e => setForm({ ...form, sections: Number(e.target.value) || 0 })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className={styles.formLabel}>Price (₹)</label>
              <input type="number" min={0} className={styles.formInput} value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) || 0 })} />
            </div>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className={styles.formLabel}>Original Price (₹, optional)</label>
              <input type="number" min={0} className={styles.formInput} value={form.originalPrice ?? ''} onChange={e => setForm({ ...form, originalPrice: e.target.value ? Number(e.target.value) : null })} />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              <input type="checkbox" checked={form.popular} onChange={e => setForm({ ...form, popular: e.target.checked })} style={{ marginRight: 6 }} />
              Mark as "Most Popular"
            </label>
          </div>

          <div style={{ marginTop: 10, paddingTop: 14, borderTop: '1px solid var(--adm-border, #e5e0d8)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.84rem', marginBottom: 10 }}>Cover</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div className={styles.formGroup} style={{ flex: 1 }}>
                <label className={styles.formLabel}>Card accent color</label>
                <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} style={{ width: '100%', height: 36 }} />
              </div>
              <div className={styles.formGroup} style={{ flex: 1 }}>
                <label className={styles.formLabel}>Cover color override (optional)</label>
                <input type="color" value={form.coverColor || form.color} onChange={e => setForm({ ...form, coverColor: e.target.value })} style={{ width: '100%', height: 36 }} />
              </div>
              <div className={styles.formGroup} style={{ width: 90 }}>
                <label className={styles.formLabel}>Icon (emoji)</label>
                <input className={styles.formInput} value={form.icon} maxLength={8} onChange={e => setForm({ ...form, icon: e.target.value })} style={{ textAlign: 'center', fontSize: '1.2rem' }} />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Background pattern</label>
              <select className={styles.formInput} value={form.coverPattern || 'none'} onChange={e => setForm({ ...form, coverPattern: e.target.value === 'none' ? null : e.target.value })}>
                {COVER_PATTERN_OPTIONS.map(p => <option key={p} value={p}>{p === 'none' ? 'None' : p[0].toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Cover image (optional — overrides the pattern)</label>
              <div
                onClick={() => coverFileInputRef.current?.click()}
                style={{
                  padding: '14px 10px', borderRadius: 8, textAlign: 'center', cursor: 'pointer',
                  border: '1.5px dashed var(--adm-border, #e5e0d8)', fontSize: '0.78rem', color: 'var(--adm-muted, #8a8678)',
                }}
              >
                {form.coverImage ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                    <img src={form.coverImage} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} />
                    <span>Image selected — click to replace</span>
                  </div>
                ) : 'Click to upload a cover image'}
                <input
                  ref={coverFileInputRef} type="file" accept="image/*" hidden
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (file) setForm({ ...form, coverImage: await fileToDataUrl(file) });
                    e.target.value = '';
                  }}
                />
              </div>
              {form.coverImage && (
                <AdminButton type="button" variant="outline" style={{ marginTop: 8 }} onClick={() => setForm({ ...form, coverImage: null })}>Remove image</AdminButton>
              )}
            </div>
          </div>

          {saveError && <p style={{ color: 'var(--adm-danger)', fontSize: '0.8rem' }}>{saveError}</p>}
        </form>
      </Drawer>
    </div>
  );
}
