import { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { adminService, AdminApiError } from '../../services/adminService';
import type { ApiBanner } from '../../services/adminService';
import DataTable from '../components/DataTable';
import Drawer from '../components/Drawer';
import { AdminButton, EmptyState } from '../components/SharedControls';
import { formatDateTime } from '../adminUtils';
import styles from './AdminPages.module.css';

const MAX_BANNERS = 7;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function BannersPage() {
  const { logAdminAction } = useAppContext();
  const [banners, setBanners] = useState<ApiBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState(''); // datetime-local string, or '' when "never"
  const [neverExpires, setNeverExpires] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    adminService.listBanners().then(setBanners).catch(() => setBanners([])).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const resetForm = () => {
    setFile(null);
    setLinkUrl('');
    setExpiresAt('');
    setNeverExpires(true);
    setError('');
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError('Choose an image or video file.'); return; }
    setSaving(true);
    setError('');
    try {
      const mediaData = await fileToDataUrl(file);
      const mediaType: 'image' | 'video' = file.type.startsWith('video/') ? 'video' : 'image';
      await adminService.createBanner({
        mediaType,
        mediaData,
        linkUrl: linkUrl.trim() || null,
        expiresAt: neverExpires ? null : new Date(expiresAt).getTime(),
      });
      logAdminAction('CREATE_BANNER', file.name);
      setAddOpen(false);
      resetForm();
      load();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not upload this banner. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (banner: ApiBanner) => {
    if (!window.confirm('Delete this banner? This cannot be undone.')) return;
    await adminService.deleteBanner(banner.id);
    logAdminAction('DELETE_BANNER', banner.id);
    setBanners(prev => prev.filter(b => b.id !== banner.id));
  };

  const atLimit = banners.length >= MAX_BANNERS;

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>Homepage Banners</div>
        <div className={styles.pageSub}>Manage the promo carousel on the homepage — image or video, an optional click-through link, and an optional expiry. Up to {MAX_BANNERS} at a time.</div>
      </div>

      <div className={styles.toolbar}>
        <AdminButton variant="gold" disabled={atLimit} onClick={() => setAddOpen(true)}>
          {atLimit ? `Limit reached (${MAX_BANNERS}/${MAX_BANNERS})` : 'Add Banner'}
        </AdminButton>
      </div>

      {!loading && banners.length === 0 && <EmptyState title="No banners yet" description="Add your first banner to show it on the homepage carousel." />}

      {banners.length > 0 && (
        <DataTable
          columns={[
            {
              key: 'preview', label: 'Preview', render: b => (
                b.mediaType === 'video'
                  ? <video src={b.mediaData} style={{ width: 80, height: 45, objectFit: 'cover', borderRadius: 4 }} muted />
                  : <img src={b.mediaData} alt="" style={{ width: 80, height: 45, objectFit: 'cover', borderRadius: 4 }} />
              ),
            },
            { key: 'link', label: 'Link', render: b => b.linkUrl || '—' },
            { key: 'created', label: 'Uploaded', render: b => formatDateTime(b.createdAt) },
            { key: 'expires', label: 'Expires', render: b => (b.expiresAt ? formatDateTime(b.expiresAt) : 'Never') },
            {
              key: 'action', label: 'Action', hideOnCard: true, render: b => (
                <AdminButton variant="danger" onClick={() => handleDelete(b)}>Delete</AdminButton>
              ),
            },
          ]}
          rows={banners}
          keyField="id"
        />
      )}

      <Drawer
        open={addOpen}
        onClose={() => { setAddOpen(false); resetForm(); }}
        title="Add Banner"
        footer={<AdminButton variant="gold" type="submit" form="add-banner-form" disabled={saving}>{saving ? 'Uploading...' : 'Upload'}</AdminButton>}
      >
        <form id="add-banner-form" onSubmit={handleAdd}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Image or Video (max ~5MB)</label>
            <input
              className={styles.formInput}
              type="file"
              accept="image/*,video/*"
              required
              onChange={e => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Click-through Link (optional)</label>
            <input
              className={styles.formInput}
              type="url"
              placeholder="https://…"
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.radioRow}>
              <input type="checkbox" checked={neverExpires} onChange={e => setNeverExpires(e.target.checked)} /> Never expires
            </label>
          </div>
          {!neverExpires && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Remove after</label>
              <input
                className={styles.formInput}
                type="datetime-local"
                required={!neverExpires}
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
              />
            </div>
          )}
          {error && <p style={{ color: 'var(--adm-danger)', fontSize: '0.8rem' }}>{error}</p>}
        </form>
      </Drawer>
    </div>
  );
}
