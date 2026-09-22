import { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { contentService } from '../../services/contentService';
import type { BlogPost } from '../../services/contentService';
import { adminService, AdminApiError } from '../../services/adminService';
import DataTable from '../components/DataTable';
import Drawer from '../components/Drawer';
import { AdminButton, EmptyState } from '../components/SharedControls';
import { formatDate } from '../adminUtils';
import styles from './AdminPages.module.css';

const EMPTY_FORM = { title: '', category: '', readTime: '', excerpt: '', content: '', tag: '', featured: false };

export default function BlogPostsPage() {
  const { logAdminAction } = useAppContext();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    contentService.listBlogPosts().then(setPosts).catch(() => setPosts([])).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await adminService.createBlogPost(form);
      logAdminAction('CREATE_BLOG_POST', form.title);
      setAddOpen(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not save this post. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (post: BlogPost) => {
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    await adminService.deleteBlogPost(post.id);
    logAdminAction('DELETE_BLOG_POST', post.title);
    setPosts(prev => prev.filter(p => p.id !== post.id));
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>Blog Posts</div>
        <div className={styles.pageSub}>Manage the articles shown in the homepage journal.</div>
      </div>

      <div className={styles.toolbar}>
        <AdminButton variant="gold" onClick={() => setAddOpen(true)}>Add Post</AdminButton>
      </div>

      {!loading && posts.length === 0 && <EmptyState title="No posts yet" description="Add your first blog post to show it on the homepage." />}

      {posts.length > 0 && (
        <DataTable
          columns={[
            { key: 'title', label: 'Title', render: p => p.title },
            { key: 'category', label: 'Category', render: p => p.category },
            { key: 'tag', label: 'Tag', render: p => p.tag },
            { key: 'date', label: 'Published', render: p => formatDate(p.date) },
            { key: 'featured', label: 'Featured', render: p => (p.featured ? 'Yes' : '—') },
            {
              key: 'action', label: 'Action', hideOnCard: true, render: p => (
                <AdminButton variant="danger" onClick={() => handleDelete(p)}>Delete</AdminButton>
              ),
            },
          ]}
          rows={posts}
          keyField="id"
        />
      )}

      <Drawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Blog Post"
        footer={<AdminButton variant="gold" type="submit" form="add-blog-form" disabled={saving}>{saving ? 'Saving...' : 'Publish'}</AdminButton>}
      >
        <form id="add-blog-form" onSubmit={handleAdd}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Title</label>
            <input className={styles.formInput} required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Category</label>
            <input className={styles.formInput} required placeholder="e.g. Learn, Career, Marriage" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Tag</label>
            <input className={styles.formInput} required placeholder="e.g. Nakshatra, Saturn" value={form.tag} onChange={e => setForm({ ...form, tag: e.target.value })} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Read Time</label>
            <input className={styles.formInput} required placeholder="e.g. 6 min read" value={form.readTime} onChange={e => setForm({ ...form, readTime: e.target.value })} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Excerpt</label>
            <textarea className={styles.formTextarea} required value={form.excerpt} onChange={e => setForm({ ...form, excerpt: e.target.value })} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Full Content</label>
            <textarea className={styles.formTextarea} style={{ minHeight: 160 }} required value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.radioRow}>
              <input type="checkbox" checked={form.featured} onChange={e => setForm({ ...form, featured: e.target.checked })} /> Feature this post
            </label>
          </div>
          {error && <p style={{ color: 'var(--adm-danger)', fontSize: '0.8rem' }}>{error}</p>}
        </form>
      </Drawer>
    </div>
  );
}
