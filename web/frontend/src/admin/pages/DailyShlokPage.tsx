import { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { adminService, AdminApiError } from '../../services/adminService';
import type { ApiDailyShlok } from '../../services/adminService';
import DataTable from '../components/DataTable';
import Drawer from '../components/Drawer';
import { AdminButton, EmptyState } from '../components/SharedControls';
import { formatDate } from '../adminUtils';
import styles from './AdminPages.module.css';

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_FORM: ApiDailyShlok = { date: todayDateString(), textEn: '', textHi: '' };

// The line printed at the foot of the Panchang card (and of the image
// people share from it). One row per calendar day; a day with nothing
// queued falls back to the card's own built-in line, so this page never
// has to be kept full — it's for putting a fresh shlok on the days that
// matter.
export default function DailyShlokPage() {
  const { logAdminAction } = useAppContext();
  const [shloks, setShloks] = useState<ApiDailyShlok[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ApiDailyShlok | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<ApiDailyShlok>(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // One line per day, Hindi and English paired by line number — lets staff
  // paste a whole month's worth at once instead of adding 31 separate days
  // by hand. The backend shuffles the order and spreads them across the
  // next N calendar days from today (see adminService.bulkSaveDailyShloks).
  const [bulkDrawerOpen, setBulkDrawerOpen] = useState(false);
  const [bulkHi, setBulkHi] = useState('');
  const [bulkEn, setBulkEn] = useState('');
  const [bulkError, setBulkError] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);

  const bulkHiLines = bulkHi.split('\n').map(l => l.trim()).filter(Boolean);
  const bulkEnLines = bulkEn.split('\n').map(l => l.trim()).filter(Boolean);

  const load = () => {
    setLoading(true);
    adminService.listDailyShloks().then(setShloks).catch(() => setShloks([])).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, date: todayDateString() });
    setError('');
    setDrawerOpen(true);
  };

  const openEdit = (shlok: ApiDailyShlok) => {
    setEditing(shlok);
    setForm(shlok);
    setError('');
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await adminService.saveDailyShlok(form);
      logAdminAction(editing ? 'UPDATE_DAILY_SHLOK' : 'CREATE_DAILY_SHLOK', form.date);
      closeDrawer();
      load();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not save this shlok. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const openBulk = () => {
    setBulkHi('');
    setBulkEn('');
    setBulkError('');
    setBulkDrawerOpen(true);
  };

  const closeBulk = () => {
    setBulkDrawerOpen(false);
  };

  const handleBulkSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkError('');
    if (bulkHiLines.length === 0) return setBulkError('Paste at least one shlok.');
    if (bulkHiLines.length !== bulkEnLines.length) {
      return setBulkError(`Line count must match — ${bulkHiLines.length} Hindi line(s) but ${bulkEnLines.length} English line(s).`);
    }
    if (bulkHiLines.length > 31) return setBulkError('31 lines max — one month at a time.');
    setBulkSaving(true);
    try {
      const shloks = bulkHiLines.map((textHi, i) => ({ textHi, textEn: bulkEnLines[i] }));
      await adminService.bulkSaveDailyShloks(shloks);
      logAdminAction('BULK_LOAD_DAILY_SHLOK', `${shloks.length} days`);
      closeBulk();
      load();
    } catch (err) {
      setBulkError(err instanceof AdminApiError ? err.message : 'Could not load these shloks. Please try again.');
    } finally {
      setBulkSaving(false);
    }
  };

  const handleDelete = async (shlok: ApiDailyShlok) => {
    if (!window.confirm(`Remove the shlok set for ${shlok.date}? That day will fall back to the default line.`)) return;
    await adminService.deleteDailyShlok(shlok.date);
    logAdminAction('DELETE_DAILY_SHLOK', shlok.date);
    setShloks(prev => prev.filter(s => s.date !== shlok.date));
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>Daily Shlok</div>
        <div className={styles.pageSub}>The line at the bottom of the Panchang card — set a different one for each day.</div>
      </div>

      <div className={styles.toolbar}>
        <AdminButton variant="gold" onClick={openNew}>Add Shlok</AdminButton>
        <AdminButton onClick={openBulk}>Load 31 Days</AdminButton>
      </div>

      {!loading && shloks.length === 0 && (
        <EmptyState title="No shloks queued" description="Days with nothing set here show the card's default line." />
      )}

      {shloks.length > 0 && (
        <DataTable
          columns={[
            { key: 'date', label: 'Date', render: s => formatDate(s.date) },
            { key: 'textHi', label: 'Shlok (Hindi)', render: s => s.textHi },
            { key: 'textEn', label: 'Shlok (English)', render: s => s.textEn },
            {
              key: 'action', label: 'Action', hideOnCard: true, render: s => (
                <div style={{ display: 'flex', gap: 8 }}>
                  <AdminButton onClick={() => openEdit(s)}>Edit</AdminButton>
                  <AdminButton variant="danger" onClick={() => handleDelete(s)}>Delete</AdminButton>
                </div>
              ),
            },
          ]}
          rows={shloks}
          keyField="date"
        />
      )}

      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        // Add and Edit are the same save — the backend upserts on date.
        title={editing ? `Shlok for ${editing.date}` : 'Add Shlok'}
        footer={<AdminButton variant="gold" type="submit" form="shlok-form" disabled={saving}>{saving ? 'Saving...' : 'Save'}</AdminButton>}
      >
        <form id="shlok-form" onSubmit={handleSave}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Date</label>
            <input
              className={styles.formInput}
              type="date"
              required
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Shlok (Hindi)</label>
            <textarea
              className={styles.formTextarea}
              required
              placeholder="ॐ सर्वे भवन्तु सुखिनः"
              value={form.textHi}
              onChange={e => setForm({ ...form, textHi: e.target.value })}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Shlok (English)</label>
            <textarea
              className={styles.formTextarea}
              required
              placeholder="Om Sarve Bhavantu Sukhinah"
              value={form.textEn}
              onChange={e => setForm({ ...form, textEn: e.target.value })}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--adm-charcoal-soft)', marginTop: 6 }}>
              Shown when the Panchang card is in English. Saving a date that already has a shlok replaces it.
            </p>
          </div>
          {error && <p style={{ color: 'var(--adm-danger)', fontSize: '0.8rem' }}>{error}</p>}
        </form>
      </Drawer>

      <Drawer
        open={bulkDrawerOpen}
        onClose={closeBulk}
        title="Load 31 Days"
        footer={<AdminButton variant="gold" type="submit" form="bulk-shlok-form" disabled={bulkSaving}>{bulkSaving ? 'Loading...' : `Load ${bulkHiLines.length || ''} Day(s)`}</AdminButton>}
      >
        <form id="bulk-shlok-form" onSubmit={handleBulkSave}>
          <p style={{ fontSize: '0.8rem', color: 'var(--adm-charcoal-soft)', marginBottom: 12 }}>
            One shlok per line, up to 31 lines in each box — line 1 of Hindi pairs with line 1 of English, and so on.
            They're shuffled and spread one per day starting today, so a different one shows up on the Panchang card
            every day automatically. Replaces whatever was already queued for those days.
          </p>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Shloks (Hindi) — one per line</label>
            <textarea
              className={styles.formTextarea}
              style={{ minHeight: 180 }}
              required
              placeholder={'ॐ सर्वे भवन्तु सुखिनः\nॐ असतो मा सद्गमय\n...'}
              value={bulkHi}
              onChange={e => setBulkHi(e.target.value)}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Shloks (English) — one per line, same order</label>
            <textarea
              className={styles.formTextarea}
              style={{ minHeight: 180 }}
              required
              placeholder={'Om Sarve Bhavantu Sukhinah\nOm Asato Ma Sadgamaya\n...'}
              value={bulkEn}
              onChange={e => setBulkEn(e.target.value)}
            />
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--adm-charcoal-soft)', marginTop: -8, marginBottom: 12 }}>
            {bulkHiLines.length} Hindi line(s) · {bulkEnLines.length} English line(s)
          </p>
          {bulkError && <p style={{ color: 'var(--adm-danger)', fontSize: '0.8rem' }}>{bulkError}</p>}
        </form>
      </Drawer>
    </div>
  );
}
