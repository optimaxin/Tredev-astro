import { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { adminService, AdminApiError } from '../../services/adminService';
import type { ApiPricingRegion } from '../../services/adminService';
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
    </div>
  );
}
