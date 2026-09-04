import { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { adminService, AdminApiError, ADMIN_SECTIONS } from '../../services/adminService';
import type { ApiStaffMember, AdminSectionKey } from '../../services/adminService';
import DataTable from '../components/DataTable';
import Drawer from '../components/Drawer';
import { AdminButton, ConfirmDialog, EmptyState, ToggleSwitch } from '../components/SharedControls';
import styles from './AdminPages.module.css';

// Add/remove Staff and Admin accounts, and toggle exactly which admin
// console sections a given Staff account can reach — real backend
// (backend/app/api/admin.routes.ts's adminOnly-only /staff routes).
// Always ADMIN-only: a Staff session never even sees this page (see
// AdminConsole.tsx / AdminSidebar.tsx — 'staff' is never in a Staff
// account's own allowed-sections list).
export default function StaffPage() {
  const { t, currentUser } = useAppContext();
  const [members, setMembers] = useState<ApiStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<{ name: string; email: string; password: string; role: 'STAFF' | 'ADMIN' }>({ name: '', email: '', password: '', role: 'STAFF' });
  const [formError, setFormError] = useState('');
  const [accessTarget, setAccessTarget] = useState<ApiStaffMember | null>(null);
  const [pendingSections, setPendingSections] = useState<AdminSectionKey[]>([]);
  const [savingAccess, setSavingAccess] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<ApiStaffMember | null>(null);

  const isAdmin = currentUser?.role === 'ADMIN';

  const load = () => {
    setLoading(true);
    adminService.listStaff()
      .then(setMembers)
      .catch(err => setError(err instanceof AdminApiError ? err.message : 'Could not load the team.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openAccess = (m: ApiStaffMember) => {
    setAccessTarget(m);
    setPendingSections(m.sections);
  };

  const toggleSection = (key: AdminSectionKey) => {
    setPendingSections(prev => prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]);
  };

  const saveAccess = async () => {
    if (!accessTarget) return;
    setSavingAccess(true);
    try {
      await adminService.updateStaffPermissions(accessTarget.id, pendingSections);
      setMembers(prev => prev.map(m => m.id === accessTarget.id ? { ...m, sections: pendingSections } : m));
      setAccessTarget(null);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not update access.');
    } finally {
      setSavingAccess(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      await adminService.addStaffMember(form.name, form.email, form.password, form.role);
      setAddOpen(false);
      setForm({ name: '', email: '', password: '', role: 'STAFF' });
      load();
    } catch (err) {
      setFormError(err instanceof AdminApiError ? err.message : 'Could not create this account.');
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    try {
      await adminService.updateUserRole(removeTarget.id, 'USER');
      setMembers(prev => prev.filter(m => m.id !== removeTarget.id));
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not remove this account.');
    } finally {
      setRemoveTarget(null);
    }
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>{t('admin_staff_title')}</div>
        {isAdmin && <AdminButton variant="gold" onClick={() => setAddOpen(true)}>{t('admin_staff_action_add')}</AdminButton>}
      </div>

      {error && <p style={{ color: '#c0392b', fontSize: '0.85rem', marginBottom: 12 }}>{error}</p>}

      <DataTable
        columns={[
          { key: 'member', label: t('admin_staff_col_member'), render: (m: ApiStaffMember) => (<div><div style={{ fontWeight: 700 }}>{m.name}</div><div style={{ fontSize: '0.72rem', color: 'var(--adm-muted)' }}>{m.email}</div></div>) },
          { key: 'role', label: t('admin_staff_col_role'), render: (m: ApiStaffMember) => m.role === 'ADMIN' ? t('admin_staff_role_admin') : t('admin_staff_role_staff') },
          { key: 'access', label: t('admin_staff_col_access'), render: (m: ApiStaffMember) => m.role === 'ADMIN' ? t('admin_staff_access_full') : `${m.sections.length}/${ADMIN_SECTIONS.length}` },
          {
            key: 'action', label: t('admin_apps_col_action'), hideOnCard: true, render: (m: ApiStaffMember) => (
              <div style={{ display: 'flex', gap: 6 }}>
                {m.role === 'STAFF' && <AdminButton onClick={() => openAccess(m)}>{t('admin_staff_action_manage_access')}</AdminButton>}
                {isAdmin && m.id !== currentUser?.id && <AdminButton variant="danger" onClick={() => setRemoveTarget(m)}>{t('admin_action_remove')}</AdminButton>}
              </div>
            ),
          },
        ]}
        rows={loading ? [] : members}
        keyField="id"
        emptyState={<EmptyState title={t('admin_empty_title')} description={loading ? 'Loading…' : t('admin_empty_desc')} />}
      />

      <Drawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={t('admin_staff_add_title')}
        footer={<AdminButton variant="gold" type="submit" form="add-staff-form">{t('admin_action_confirm')}</AdminButton>}
      >
        <form id="add-staff-form" onSubmit={handleAdd}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('admin_staff_add_name')}</label>
            <input className={styles.formInput} required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('admin_staff_add_email')}</label>
            <input type="email" className={styles.formInput} required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('admin_staff_add_password')}</label>
            <input type="password" className={styles.formInput} required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('admin_staff_add_role')}</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <AdminButton type="button" variant={form.role === 'STAFF' ? 'gold' : 'outline'} onClick={() => setForm({ ...form, role: 'STAFF' })}>{t('admin_staff_role_staff')}</AdminButton>
              <AdminButton type="button" variant={form.role === 'ADMIN' ? 'gold' : 'outline'} onClick={() => setForm({ ...form, role: 'ADMIN' })}>{t('admin_staff_role_admin')}</AdminButton>
            </div>
          </div>
          {formError && <p style={{ color: 'var(--adm-danger)', fontSize: '0.8rem' }}>{formError}</p>}
        </form>
      </Drawer>

      <Drawer
        open={!!accessTarget}
        onClose={() => setAccessTarget(null)}
        title={accessTarget?.name || ''}
        footer={<AdminButton variant="gold" disabled={savingAccess} onClick={saveAccess}>{savingAccess ? '…' : t('admin_action_save')}</AdminButton>}
      >
        <div className={styles.drawerSectionTitle}>{t('admin_staff_access_title')}</div>
        <p style={{ fontSize: '0.8rem', color: 'var(--adm-charcoal-soft)', marginBottom: 8 }}>{t('admin_staff_access_desc')}</p>
        {ADMIN_SECTIONS.map(key => (
          <ToggleSwitch
            key={key}
            label={t(`admin_sidebar_${key}`)}
            checked={pendingSections.includes(key)}
            onChange={() => toggleSection(key)}
          />
        ))}
      </Drawer>

      <ConfirmDialog
        open={!!removeTarget}
        title={t('admin_staff_confirm_remove_title')}
        description={t('admin_staff_confirm_remove_desc')}
        confirmLabel={t('admin_action_remove')}
        cancelLabel={t('admin_action_cancel')}
        variant="danger"
        onConfirm={handleRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
}
