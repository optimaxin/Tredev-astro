import { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { adminService, AdminApiError } from '../../services/adminService';
import type { ApiPricingRegion, ApiAstrologerRegionPrice } from '../../services/adminService';
import { astrologerService } from '../../services/astrologerService';
import type { UiAstrologer } from '../../services/astrologerService';
import DataTable from '../components/DataTable';
import Drawer from '../components/Drawer';
import { AdminButton, ConfirmDialog, EmptyState } from '../components/SharedControls';
import styles from './AdminPages.module.css';

// Region-wise consultation pricing (backend/app/api/admin.routes.ts's
// /pricing-regions, requireSection('pricing')). A visitor's IP-detected
// country is matched against a region's countries, and that region's
// multiplier is applied on top of an astrologer's own price everywhere a
// price is shown or charged (catalog listing, the pre-booking effective
// price, and the actual session charge) — see backend/app/services/
// pricingEngine.ts's computeRegionAdjustedPrice. A country covered by no
// region here uses the default multiplier of 1 (today's plain price).
type FormState = { name: string; countryCodes: string; priceMultiplier: string };
const EMPTY_FORM: FormState = { name: '', countryCodes: '', priceMultiplier: '1' };

// DataTable needs one real key field per row; an override's real identity is
// the (astrologerId, regionId) pair, so this stitches those into one string.
type OverrideRow = ApiAstrologerRegionPrice & { id: string };
const withId = (o: ApiAstrologerRegionPrice): OverrideRow => ({ ...o, id: `${o.astrologerId}:${o.regionId}` });

export default function PricingRegionsPage() {
  const { t } = useAppContext();
  const [regions, setRegions] = useState<ApiPricingRegion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<ApiPricingRegion | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<ApiPricingRegion | null>(null);

  const load = () => {
    setLoading(true);
    adminService.listPricingRegions()
      .then(setRegions)
      .catch(err => setError(err instanceof AdminApiError ? err.message : 'Could not load pricing regions.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openAdd = () => { setForm(EMPTY_FORM); setFormError(''); setEditing('new'); };
  const openEdit = (r: ApiPricingRegion) => {
    setForm({ name: r.name, countryCodes: r.countryCodes.join(', '), priceMultiplier: String(r.priceMultiplier) });
    setFormError('');
    setEditing(r);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const countryCodes = form.countryCodes.split(',').map(c => c.trim().toUpperCase()).filter(Boolean);
    const priceMultiplier = Number(form.priceMultiplier);
    if (countryCodes.some(c => c.length !== 2)) { setFormError(t('admin_pricing_error_country_code')); return; }
    if (!Number.isFinite(priceMultiplier) || priceMultiplier <= 0) { setFormError(t('admin_pricing_error_multiplier')); return; }

    setSaving(true);
    setFormError('');
    try {
      const patch = { name: form.name.trim(), countryCodes, priceMultiplier };
      const saved = editing === 'new'
        ? await adminService.createPricingRegion(patch)
        : await adminService.updatePricingRegion((editing as ApiPricingRegion).id, patch);
      setRegions(prev => editing === 'new' ? [...prev, saved] : prev.map(r => r.id === saved.id ? saved : r));
      setEditing(null);
    } catch (err) {
      setFormError(err instanceof AdminApiError ? err.message : 'Could not save this region.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    try {
      await adminService.deletePricingRegion(removeTarget.id);
      setRegions(prev => prev.filter(r => r.id !== removeTarget.id));
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not remove this region.');
    } finally {
      setRemoveTarget(null);
    }
  };

  // ── Per-astrologer, per-region overrides ────────────────────────────────
  // A region's multiplier above is a quick global knob; this is staff's
  // exact, final price for one astrologer in one region — set by hand here,
  // one at a time, or in bulk via the CSV template/import. Whichever exists
  // wins over the multiplier (backend/app/services/pricingEngine.ts's
  // computePriceWithOverride).
  const [astrologers, setAstrologers] = useState<UiAstrologer[]>([]);
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [overridesLoading, setOverridesLoading] = useState(true);
  const [overrideError, setOverrideError] = useState('');
  const [overrideEditing, setOverrideEditing] = useState<OverrideRow | 'new' | null>(null);
  const [overrideForm, setOverrideForm] = useState({ astrologerId: '', regionId: '', chatPrice: '', callPrice: '', videoPrice: '' });
  const [overrideFormError, setOverrideFormError] = useState('');
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [overrideRemoveTarget, setOverrideRemoveTarget] = useState<OverrideRow | null>(null);
  const [csvBusy, setCsvBusy] = useState(false);
  const [csvMessage, setCsvMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadOverrides = () => {
    setOverridesLoading(true);
    adminService.listAstrologerRegionPrices()
      .then(rows => setOverrides(rows.map(withId)))
      .catch(err => setOverrideError(err instanceof AdminApiError ? err.message : 'Could not load astrologer overrides.'))
      .finally(() => setOverridesLoading(false));
  };

  useEffect(() => {
    loadOverrides();
    astrologerService.list({ limit: 50 }).then(r => setAstrologers(r.data)).catch(() => {});
  }, []);

  const openAddOverride = () => {
    setOverrideForm({ astrologerId: '', regionId: regions[0] ? String(regions[0].id) : '', chatPrice: '', callPrice: '', videoPrice: '' });
    setOverrideFormError('');
    setOverrideEditing('new');
  };
  const openEditOverride = (o: OverrideRow) => {
    setOverrideForm({ astrologerId: String(o.astrologerId), regionId: String(o.regionId), chatPrice: String(o.chatPrice), callPrice: String(o.callPrice), videoPrice: String(o.videoPrice) });
    setOverrideFormError('');
    setOverrideEditing(o);
  };

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    const astrologerId = Number(overrideForm.astrologerId);
    const regionId = Number(overrideForm.regionId);
    const chatPrice = Number(overrideForm.chatPrice);
    const callPrice = Number(overrideForm.callPrice);
    const videoPrice = Number(overrideForm.videoPrice);
    if (!astrologerId || !regionId) { setOverrideFormError(t('admin_pricing_override_error_select')); return; }
    if (![chatPrice, callPrice, videoPrice].every(n => Number.isFinite(n) && n >= 0)) { setOverrideFormError(t('admin_pricing_override_error_prices')); return; }

    setOverrideSaving(true);
    setOverrideFormError('');
    try {
      const saved = withId(await adminService.setAstrologerRegionPrice(astrologerId, regionId, chatPrice, callPrice, videoPrice));
      setOverrides(prev => {
        const exists = prev.some(o => o.id === saved.id);
        return exists ? prev.map(o => o.id === saved.id ? saved : o) : [...prev, saved];
      });
      setOverrideEditing(null);
    } catch (err) {
      setOverrideFormError(err instanceof AdminApiError ? err.message : 'Could not save this price.');
    } finally {
      setOverrideSaving(false);
    }
  };

  const handleRemoveOverride = async () => {
    if (!overrideRemoveTarget) return;
    try {
      await adminService.deleteAstrologerRegionPrice(overrideRemoveTarget.astrologerId, overrideRemoveTarget.regionId);
      setOverrides(prev => prev.filter(o => o.id !== overrideRemoveTarget.id));
    } catch (err) {
      setOverrideError(err instanceof AdminApiError ? err.message : 'Could not remove this override.');
    } finally {
      setOverrideRemoveTarget(null);
    }
  };

  const handleDownloadCsv = async () => {
    setCsvBusy(true);
    setCsvMessage('');
    try {
      const blob = await adminService.downloadAstrologerRegionPriceCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'astrologer-region-pricing.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setCsvMessage(err instanceof AdminApiError ? err.message : 'Could not download the CSV template.');
    } finally {
      setCsvBusy(false);
    }
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setCsvBusy(true);
    setCsvMessage('');
    try {
      const text = await file.text();
      const result = await adminService.importAstrologerRegionPriceCsv(text);
      const base = `${t('admin_pricing_csv_import_result')} ${result.updated}`;
      setCsvMessage(result.errors.length ? `${base} — ${result.errors.length} row(s) skipped: ${result.errors.join('; ')}` : base);
      loadOverrides();
    } catch (err) {
      setCsvMessage(err instanceof AdminApiError ? err.message : 'Could not import this CSV.');
    } finally {
      setCsvBusy(false);
    }
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>{t('admin_pricing_title')}</div>
        <div className={styles.pageSub}>{t('admin_pricing_desc')}</div>
      </div>

      <div className={styles.toolbar}>
        <AdminButton variant="gold" onClick={openAdd}>{t('admin_pricing_action_add')}</AdminButton>
      </div>

      {error && <p style={{ color: '#c0392b', fontSize: '0.85rem', marginBottom: 12 }}>{error}</p>}

      <DataTable
        columns={[
          { key: 'name', label: t('admin_pricing_col_name'), render: (r: ApiPricingRegion) => <div style={{ fontWeight: 700 }}>{r.name}</div> },
          { key: 'countries', label: t('admin_pricing_col_countries'), render: (r: ApiPricingRegion) => r.countryCodes.join(', ') },
          { key: 'multiplier', label: t('admin_pricing_col_multiplier'), render: (r: ApiPricingRegion) => `×${r.priceMultiplier}` },
          {
            key: 'action', label: t('admin_apps_col_action'), hideOnCard: true, render: (r: ApiPricingRegion) => (
              <div style={{ display: 'flex', gap: 6 }}>
                <AdminButton onClick={() => openEdit(r)}>{t('admin_action_edit')}</AdminButton>
                <AdminButton variant="danger" onClick={() => setRemoveTarget(r)}>{t('admin_action_remove')}</AdminButton>
              </div>
            ),
          },
        ]}
        rows={loading ? [] : regions}
        keyField="id"
        emptyState={<EmptyState title={t('admin_empty_title')} description={loading ? 'Loading…' : t('admin_pricing_empty_desc')} />}
      />

      <Drawer
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? t('admin_pricing_add_title') : t('admin_pricing_edit_title')}
        footer={<AdminButton variant="gold" disabled={saving} type="submit" form="pricing-region-form">{saving ? '…' : t('admin_action_save')}</AdminButton>}
      >
        <form id="pricing-region-form" onSubmit={handleSave}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('admin_pricing_field_name')}</label>
            <input className={styles.formInput} required placeholder="United States" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('admin_pricing_field_countries')}</label>
            <input className={styles.formInput} required placeholder="US, CA" value={form.countryCodes} onChange={e => setForm({ ...form, countryCodes: e.target.value })} />
            <p style={{ fontSize: '0.72rem', color: 'var(--adm-muted)', marginTop: 4 }}>{t('admin_pricing_field_countries_hint')}</p>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('admin_pricing_field_multiplier')}</label>
            <input className={styles.formInput} required type="number" step="0.05" min="0.05" placeholder="1.5" value={form.priceMultiplier} onChange={e => setForm({ ...form, priceMultiplier: e.target.value })} />
            <p style={{ fontSize: '0.72rem', color: 'var(--adm-muted)', marginTop: 4 }}>{t('admin_pricing_field_multiplier_hint')}</p>
          </div>
          {formError && <p style={{ color: 'var(--adm-danger)', fontSize: '0.8rem' }}>{formError}</p>}
        </form>
      </Drawer>

      <ConfirmDialog
        open={!!removeTarget}
        title={t('admin_pricing_confirm_remove_title')}
        description={t('admin_pricing_confirm_remove_desc')}
        confirmLabel={t('admin_action_remove')}
        cancelLabel={t('admin_action_cancel')}
        variant="danger"
        onConfirm={handleRemove}
        onCancel={() => setRemoveTarget(null)}
      />

      <div className={styles.pageHeader} style={{ marginTop: 32 }}>
        <div className={styles.pageTitle}>{t('admin_pricing_override_title')}</div>
        <div className={styles.pageSub}>{t('admin_pricing_override_desc')}</div>
      </div>

      <div className={styles.toolbar} style={{ flexWrap: 'wrap', gap: 8 }}>
        <AdminButton variant="gold" onClick={openAddOverride}>{t('admin_pricing_override_action_add')}</AdminButton>
        <AdminButton disabled={csvBusy} onClick={handleDownloadCsv}>{t('admin_pricing_csv_download')}</AdminButton>
        <AdminButton disabled={csvBusy} onClick={() => fileInputRef.current?.click()}>{t('admin_pricing_csv_upload')}</AdminButton>
        <input ref={fileInputRef} type="file" accept=".csv,text/csv" hidden onChange={handleImportCsv} />
      </div>

      {csvMessage && <p style={{ fontSize: '0.82rem', marginBottom: 12 }}>{csvMessage}</p>}
      {overrideError && <p style={{ color: '#c0392b', fontSize: '0.85rem', marginBottom: 12 }}>{overrideError}</p>}

      <DataTable
        columns={[
          { key: 'astrologer', label: t('admin_pricing_override_col_astrologer'), render: (o: OverrideRow) => <div style={{ fontWeight: 700 }}>{o.astrologerName}</div> },
          { key: 'region', label: t('admin_pricing_col_name'), render: (o: OverrideRow) => o.regionName },
          { key: 'chat', label: t('admin_pricing_override_col_chat'), render: (o: OverrideRow) => `₹${o.chatPrice}` },
          { key: 'call', label: t('admin_pricing_override_col_call'), render: (o: OverrideRow) => `₹${o.callPrice}` },
          { key: 'video', label: t('admin_pricing_override_col_video'), render: (o: OverrideRow) => `₹${o.videoPrice}` },
          {
            key: 'action', label: t('admin_apps_col_action'), hideOnCard: true, render: (o: OverrideRow) => (
              <div style={{ display: 'flex', gap: 6 }}>
                <AdminButton onClick={() => openEditOverride(o)}>{t('admin_action_edit')}</AdminButton>
                <AdminButton variant="danger" onClick={() => setOverrideRemoveTarget(o)}>{t('admin_action_remove')}</AdminButton>
              </div>
            ),
          },
        ]}
        rows={overridesLoading ? [] : overrides}
        keyField="id"
        emptyState={<EmptyState title={t('admin_empty_title')} description={overridesLoading ? 'Loading…' : t('admin_pricing_override_empty_desc')} />}
      />

      <Drawer
        open={!!overrideEditing}
        onClose={() => setOverrideEditing(null)}
        title={overrideEditing === 'new' ? t('admin_pricing_override_add_title') : t('admin_pricing_override_edit_title')}
        footer={<AdminButton variant="gold" disabled={overrideSaving} type="submit" form="astrologer-override-form">{overrideSaving ? '…' : t('admin_action_save')}</AdminButton>}
      >
        <form id="astrologer-override-form" onSubmit={handleSaveOverride}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('admin_pricing_override_field_astrologer')}</label>
            <select
              className={styles.formInput}
              required
              disabled={overrideEditing !== 'new'}
              value={overrideForm.astrologerId}
              onChange={e => setOverrideForm({ ...overrideForm, astrologerId: e.target.value })}
            >
              <option value="">—</option>
              {astrologers.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('admin_pricing_field_name')}</label>
            <select
              className={styles.formInput}
              required
              disabled={overrideEditing !== 'new'}
              value={overrideForm.regionId}
              onChange={e => setOverrideForm({ ...overrideForm, regionId: e.target.value })}
            >
              <option value="">—</option>
              {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('admin_pricing_override_field_chat')}</label>
            <input className={styles.formInput} required type="number" min="0" value={overrideForm.chatPrice} onChange={e => setOverrideForm({ ...overrideForm, chatPrice: e.target.value })} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('admin_pricing_override_field_call')}</label>
            <input className={styles.formInput} required type="number" min="0" value={overrideForm.callPrice} onChange={e => setOverrideForm({ ...overrideForm, callPrice: e.target.value })} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('admin_pricing_override_field_video')}</label>
            <input className={styles.formInput} required type="number" min="0" value={overrideForm.videoPrice} onChange={e => setOverrideForm({ ...overrideForm, videoPrice: e.target.value })} />
          </div>
          {overrideFormError && <p style={{ color: 'var(--adm-danger)', fontSize: '0.8rem' }}>{overrideFormError}</p>}
        </form>
      </Drawer>

      <ConfirmDialog
        open={!!overrideRemoveTarget}
        title={t('admin_pricing_override_confirm_remove_title')}
        description={t('admin_pricing_override_confirm_remove_desc')}
        confirmLabel={t('admin_action_remove')}
        cancelLabel={t('admin_action_cancel')}
        variant="danger"
        onConfirm={handleRemoveOverride}
        onCancel={() => setOverrideRemoveTarget(null)}
      />
    </div>
  );
}
