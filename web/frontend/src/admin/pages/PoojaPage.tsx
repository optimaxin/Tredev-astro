import { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { adminService, AdminApiError } from '../../services/adminService';
import type { ApiPoojaBook, ApiPoojaSession, ApiPoojaVideo } from '../../services/adminService';
import DataTable from '../components/DataTable';
import Drawer from '../components/Drawer';
import { AdminButton, EmptyState } from '../components/SharedControls';
import { formatDateTime } from '../adminUtils';
import styles from './AdminPages.module.css';

type SubTab = 'videos' | 'sessions' | 'books';

function VideosTab() {
  const { logAdminAction } = useAppContext();
  const [rows, setRows] = useState<ApiPoojaVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => { setLoading(true); adminService.listPoojaVideos().then(setRows).catch(() => setRows([])).finally(() => setLoading(false)); };
  useEffect(load, []);

  const resetForm = () => { setTitle(''); setCategory(''); setVideoUrl(''); setThumbnailUrl(''); setError(''); };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await adminService.createPoojaVideo({ title, category, videoUrl, thumbnailUrl: thumbnailUrl.trim() || null });
      logAdminAction('CREATE_POOJA_VIDEO', title);
      setOpen(false);
      resetForm();
      load();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not add this video.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (v: ApiPoojaVideo) => {
    if (!window.confirm('Delete this video? This cannot be undone.')) return;
    await adminService.deletePoojaVideo(v.id);
    logAdminAction('DELETE_POOJA_VIDEO', v.id);
    setRows(prev => prev.filter(r => r.id !== v.id));
  };

  return (
    <div>
      <div className={styles.toolbar}>
        <AdminButton variant="gold" onClick={() => setOpen(true)}>Add Video</AdminButton>
      </div>
      {!loading && rows.length === 0 && <EmptyState title="No recorded poojas yet" description="Add a YouTube or hosted video link to show it under Recorded Pooja." />}
      {rows.length > 0 && (
        <DataTable
          columns={[
            { key: 'title', label: 'Title', render: v => v.title },
            { key: 'category', label: 'Category', render: v => v.category },
            { key: 'url', label: 'Video URL', render: v => <a href={v.videoUrl} target="_blank" rel="noreferrer">{v.videoUrl}</a> },
            { key: 'created', label: 'Added', render: v => formatDateTime(v.createdAt) },
            { key: 'action', label: 'Action', hideOnCard: true, render: v => <AdminButton variant="danger" onClick={() => handleDelete(v)}>Delete</AdminButton> },
          ]}
          rows={rows}
          keyField="id"
        />
      )}
      <Drawer open={open} onClose={() => { setOpen(false); resetForm(); }} title="Add Recorded Pooja Video"
        footer={<AdminButton variant="gold" type="submit" form="add-pooja-video-form" disabled={saving}>{saving ? 'Saving...' : 'Add'}</AdminButton>}>
        <form id="add-pooja-video-form" onSubmit={handleAdd}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Title</label>
            <input className={styles.formInput} required value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Category</label>
            <input className={styles.formInput} required placeholder="Subah ki Aarti, Ganesh Aarti, Bhajan…" value={category} onChange={e => setCategory(e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Video URL (YouTube or hosted file)</label>
            <input className={styles.formInput} type="url" required value={videoUrl} onChange={e => setVideoUrl(e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Thumbnail URL (optional)</label>
            <input className={styles.formInput} type="url" value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)} />
          </div>
          {error && <p style={{ color: 'var(--adm-danger)', fontSize: '0.8rem' }}>{error}</p>}
        </form>
      </Drawer>
    </div>
  );
}

function SessionsTab() {
  const { logAdminAction } = useAppContext();
  const [rows, setRows] = useState<ApiPoojaSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [panditName, setPanditName] = useState('');
  const [scheduledAt, setScheduledAt] = useState(''); // datetime-local
  const [meetingUrl, setMeetingUrl] = useState('');
  const [price, setPrice] = useState(''); // rupees, blank = free
  const [capacity, setCapacity] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => { setLoading(true); adminService.listPoojaSessions().then(setRows).catch(() => setRows([])).finally(() => setLoading(false)); };
  useEffect(load, []);

  const resetForm = () => { setTitle(''); setPanditName(''); setScheduledAt(''); setMeetingUrl(''); setPrice(''); setCapacity(''); setError(''); };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await adminService.createPoojaSession({
        title, panditName,
        scheduledAt: new Date(scheduledAt).getTime(),
        meetingUrl: meetingUrl.trim() || null,
        pricePaise: price.trim() ? Math.round(Number(price) * 100) : null,
        capacity: capacity.trim() ? Number(capacity) : null,
      });
      logAdminAction('CREATE_POOJA_SESSION', title);
      setOpen(false);
      resetForm();
      load();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not schedule this session.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s: ApiPoojaSession) => {
    if (!window.confirm('Delete this group pooja? This cannot be undone.')) return;
    await adminService.deletePoojaSession(s.id);
    logAdminAction('DELETE_POOJA_SESSION', s.id);
    setRows(prev => prev.filter(r => r.id !== s.id));
  };

  return (
    <div>
      <div className={styles.toolbar}>
        <AdminButton variant="gold" onClick={() => setOpen(true)}>Schedule Group Pooja</AdminButton>
      </div>
      {!loading && rows.length === 0 && <EmptyState title="No group poojas scheduled" description="Schedule a live group pooja with an external meeting link (Zoom/Google Meet)." />}
      {rows.length > 0 && (
        <DataTable
          columns={[
            { key: 'title', label: 'Title', render: s => s.title },
            { key: 'pandit', label: 'Pandit', render: s => s.panditName },
            { key: 'when', label: 'Scheduled', render: s => formatDateTime(s.scheduledAt) },
            { key: 'price', label: 'Price', render: s => (s.pricePaise ? `₹${(s.pricePaise / 100).toFixed(0)}` : 'Free') },
            { key: 'action', label: 'Action', hideOnCard: true, render: s => <AdminButton variant="danger" onClick={() => handleDelete(s)}>Delete</AdminButton> },
          ]}
          rows={rows}
          keyField="id"
        />
      )}
      <Drawer open={open} onClose={() => { setOpen(false); resetForm(); }} title="Schedule Group Pooja"
        footer={<AdminButton variant="gold" type="submit" form="add-pooja-session-form" disabled={saving}>{saving ? 'Saving...' : 'Schedule'}</AdminButton>}>
        <form id="add-pooja-session-form" onSubmit={handleAdd}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Title</label>
            <input className={styles.formInput} required placeholder="Sawan Somvar Pooja" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Pandit Name</label>
            <input className={styles.formInput} required value={panditName} onChange={e => setPanditName(e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Date &amp; Time</label>
            <input className={styles.formInput} type="datetime-local" required value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Meeting Link (Zoom/Meet, revealed only to registered users)</label>
            <input className={styles.formInput} type="url" value={meetingUrl} onChange={e => setMeetingUrl(e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Price in ₹ (blank = free)</label>
            <input className={styles.formInput} type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Capacity (optional)</label>
            <input className={styles.formInput} type="number" min="1" value={capacity} onChange={e => setCapacity(e.target.value)} />
          </div>
          {error && <p style={{ color: 'var(--adm-danger)', fontSize: '0.8rem' }}>{error}</p>}
        </form>
      </Drawer>
    </div>
  );
}

function BooksTab() {
  const { logAdminAction } = useAppContext();
  const [rows, setRows] = useState<ApiPoojaBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => { setLoading(true); adminService.listPoojaBooks().then(setRows).catch(() => setRows([])).finally(() => setLoading(false)); };
  useEffect(load, []);

  const resetForm = () => { setTitle(''); setAuthor(''); setCategory(''); setContent(''); setPdfUrl(''); setCoverImageUrl(''); setError(''); };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !pdfUrl.trim()) { setError('Provide either the aarti text or a PDF link.'); return; }
    setSaving(true);
    setError('');
    try {
      await adminService.createPoojaBook({ title, author: author.trim() || null, category, content: content.trim() || null, pdfUrl: pdfUrl.trim() || null, coverImageUrl: coverImageUrl.trim() || null });
      logAdminAction('CREATE_POOJA_BOOK', title);
      setOpen(false);
      resetForm();
      load();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not add this item.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (b: ApiPoojaBook) => {
    if (!window.confirm('Delete this item? This cannot be undone.')) return;
    await adminService.deletePoojaBook(b.id);
    logAdminAction('DELETE_POOJA_BOOK', b.id);
    setRows(prev => prev.filter(r => r.id !== b.id));
  };

  return (
    <div>
      <div className={styles.toolbar}>
        <AdminButton variant="gold" onClick={() => setOpen(true)}>Add Aarti / Book</AdminButton>
      </div>
      {!loading && rows.length === 0 && <EmptyState title="Library is empty" description="Add an aarti's text directly, or link to a hosted PDF." />}
      {rows.length > 0 && (
        <DataTable
          columns={[
            {
              key: 'cover', label: 'Cover', render: b => (
                b.coverImageUrl ? <img src={b.coverImageUrl} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} /> : '—'
              ),
            },
            { key: 'title', label: 'Title', render: b => b.title },
            { key: 'author', label: 'Author', render: b => b.author || '—' },
            { key: 'category', label: 'Category', render: b => b.category },
            { key: 'type', label: 'Format', render: b => (b.pdfUrl ? 'PDF link' : 'Text') },
            { key: 'action', label: 'Action', hideOnCard: true, render: b => <AdminButton variant="danger" onClick={() => handleDelete(b)}>Delete</AdminButton> },
          ]}
          rows={rows}
          keyField="id"
        />
      )}
      <Drawer open={open} onClose={() => { setOpen(false); resetForm(); }} title="Add Aarti / Book"
        footer={<AdminButton variant="gold" type="submit" form="add-pooja-book-form" disabled={saving}>{saving ? 'Saving...' : 'Add'}</AdminButton>}>
        <form id="add-pooja-book-form" onSubmit={handleAdd}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Title</label>
            <input className={styles.formInput} required value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Author (optional)</label>
            <input className={styles.formInput} value={author} onChange={e => setAuthor(e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Category</label>
            <input className={styles.formInput} required placeholder="Aarti, Chalisa, Vrat Katha…" value={category} onChange={e => setCategory(e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Text (shown inline in the reader)</label>
            <textarea className={styles.formInput} rows={6} value={content} onChange={e => setContent(e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Or a PDF link</label>
            <input className={styles.formInput} type="url" value={pdfUrl} onChange={e => setPdfUrl(e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Cover Image URL (optional)</label>
            <input className={styles.formInput} type="url" value={coverImageUrl} onChange={e => setCoverImageUrl(e.target.value)} />
          </div>
          {error && <p style={{ color: 'var(--adm-danger)', fontSize: '0.8rem' }}>{error}</p>}
        </form>
      </Drawer>
    </div>
  );
}

export default function PoojaPage() {
  const [tab, setTab] = useState<SubTab>('videos');
  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>Pooja Hub</div>
        <div className={styles.pageSub}>Manage recorded pooja videos, scheduled group poojas, and the aarti/book library shown under the site's "Pooja" nav item. Booking a pandit 1:1 needs no setup here — tag an astrologer's category as "Pooja" from the Astrologers page.</div>
      </div>
      <div className={styles.toolbar}>
        {(['videos', 'sessions', 'books'] as SubTab[]).map(t => (
          <AdminButton key={t} variant={tab === t ? 'gold' : 'outline'} onClick={() => setTab(t)}>
            {t === 'videos' ? 'Recorded Videos' : t === 'sessions' ? 'Group Sessions' : 'Library'}
          </AdminButton>
        ))}
      </div>
      {tab === 'videos' && <VideosTab />}
      {tab === 'sessions' && <SessionsTab />}
      {tab === 'books' && <BooksTab />}
    </div>
  );
}
