import { useEffect, useState } from 'react';
import { adminService, AdminApiError } from '../../services/adminService';
import type { ApiEmailTemplate, ApiEmailLogEntry } from '../../services/adminService';
import DataTable from '../components/DataTable';
import { StatusBadge, EmptyState, AdminButton, ConfirmDialog } from '../components/SharedControls';
import { formatDate } from '../adminUtils';
import styles from './AdminPages.module.css';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid var(--adm-border, #e5e0d8)',
  fontFamily: 'inherit', fontSize: '0.85rem', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: 6, color: 'var(--adm-charcoal-soft)' };
const fieldStyle: React.CSSProperties = { marginBottom: 14 };

type Tab = 'compose' | 'templates' | 'log' | 'settings';

export default function EmailsPage() {
  const [tab, setTab] = useState<Tab>('compose');
  const [templates, setTemplates] = useState<ApiEmailTemplate[]>([]);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);

  useEffect(() => {
    adminService.listEmailTemplates().then(rows => { setTemplates(rows); setTemplatesLoaded(true); }).catch(() => setTemplatesLoaded(true));
  }, []);

  const TABS: { key: Tab; label: string }[] = [
    { key: 'compose', label: 'Compose' },
    { key: 'templates', label: 'Templates' },
    { key: 'log', label: 'Sent Log' },
    { key: 'settings', label: 'Notify Settings' },
  ];

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>Emails</div>
      </div>

      <div className={styles.tabsRow}>
        {TABS.map(tb => (
          <button key={tb.key} className={`${styles.tabBtn} ${tab === tb.key ? styles.tabBtnActive : ''}`} onClick={() => setTab(tb.key)}>
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'compose' && <ComposeTab templates={templates} />}
      {tab === 'templates' && <TemplatesTab templates={templates} loaded={templatesLoaded} onChange={setTemplates} />}
      {tab === 'log' && <LogTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
}

function ComposeTab({ templates }: { templates: ApiEmailTemplate[] }) {
  const [templateId, setTemplateId] = useState('');
  const [toEmail, setToEmail] = useState('');
  const [toName, setToName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const tpl = templates.find(t => t.id === id);
    if (tpl) { setSubject(tpl.subject); setBody(tpl.body); }
  };

  const send = async () => {
    setError(''); setSent(false);
    if (!toEmail.trim() || !subject.trim() || !body.trim()) { setError('Recipient email, subject, and body are required.'); return; }
    setSending(true);
    try {
      await adminService.composeEmail({ toEmail: toEmail.trim(), toName: toName.trim() || undefined, subject, body, templateId: templateId || undefined });
      setSent(true);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not send this email.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={fieldStyle}>
        <label style={labelStyle}>Start from a template (optional)</label>
        <select style={inputStyle} value={templateId} onChange={e => applyTemplate(e.target.value)}>
          <option value="">— Write from scratch —</option>
          {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 14 }}>
        <div style={{ ...fieldStyle, flex: '1 1 auto' }}>
          <label style={labelStyle}>Recipient Email</label>
          <input style={inputStyle} type="email" value={toEmail} onChange={e => setToEmail(e.target.value)} placeholder="someone@example.com" />
        </div>
        <div style={{ ...fieldStyle, flex: '1 1 auto' }}>
          <label style={labelStyle}>Recipient Name (optional)</label>
          <input style={inputStyle} value={toName} onChange={e => setToName(e.target.value)} />
        </div>
      </div>
      <div style={fieldStyle}>
        <label style={labelStyle}>Subject</label>
        <input style={inputStyle} value={subject} onChange={e => setSubject(e.target.value)} />
      </div>
      <div style={fieldStyle}>
        <label style={labelStyle}>Message</label>
        <textarea style={{ ...inputStyle, minHeight: 220, resize: 'vertical' }} value={body} onChange={e => setBody(e.target.value)} placeholder="Write it exactly like you'd type a normal email — leave a blank line between paragraphs." />
        <p style={{ fontSize: '0.72rem', color: 'var(--adm-charcoal-soft)', marginTop: 4 }}>
          Just plain writing — no HTML needed, it's formatted into a proper email automatically. If the template has a {'{{name}}'} or similar placeholder, it's already filled in above.
        </p>
      </div>
      {error && <p style={{ color: 'var(--adm-danger, #c0392b)', fontSize: '0.85rem' }}>{error}</p>}
      {sent && <p style={{ color: 'var(--adm-success, #2e7d32)', fontSize: '0.85rem' }}>Sent.</p>}
      <AdminButton variant="gold" disabled={sending} onClick={send}>{sending ? 'Sending…' : 'Send Email'}</AdminButton>
    </div>
  );
}

function TemplatesTab({ templates, loaded, onChange }: { templates: ApiEmailTemplate[]; loaded: boolean; onChange: (t: ApiEmailTemplate[]) => void }) {
  const [editing, setEditing] = useState<ApiEmailTemplate | 'new' | null>(null);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toDelete, setToDelete] = useState<ApiEmailTemplate | null>(null);

  const openEditor = (t: ApiEmailTemplate | 'new') => {
    setEditing(t);
    setError('');
    if (t === 'new') { setName(''); setSubject(''); setBody(''); }
    else { setName(t.name); setSubject(t.subject); setBody(t.body); }
  };

  const save = async () => {
    if (!name.trim() || !subject.trim() || !body.trim()) { setError('Name, subject, and body are all required.'); return; }
    setSaving(true);
    setError('');
    try {
      if (editing === 'new') {
        const row = await adminService.createEmailTemplate({ name, subject, body });
        onChange([...templates, row]);
      } else if (editing) {
        const row = await adminService.updateEmailTemplate(editing.id, { name, subject, body });
        onChange(templates.map(t => t.id === row.id ? row : t));
      }
      setEditing(null);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not save this template.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    await adminService.deleteEmailTemplate(toDelete.id).catch(() => {});
    onChange(templates.filter(t => t.id !== toDelete.id));
    setToDelete(null);
  };

  if (editing) {
    return (
      <div style={{ maxWidth: 640 }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Template Name</label>
          <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Subject</label>
          <input style={inputStyle} value={subject} onChange={e => setSubject(e.target.value)} />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Message</label>
          <textarea style={{ ...inputStyle, minHeight: 220, resize: 'vertical' }} value={body} onChange={e => setBody(e.target.value)} placeholder="Write it like a normal email — leave a blank line between paragraphs." />
          <p style={{ fontSize: '0.72rem', color: 'var(--adm-charcoal-soft)', marginTop: 4 }}>
            Plain writing only, no HTML — it's formatted automatically when sent. Use {'{{name}}'} or any other {'{{placeholder}}'} you need; whoever sends this fills those in (or they default to the recipient's name).
          </p>
        </div>
        {error && <p style={{ color: 'var(--adm-danger, #c0392b)', fontSize: '0.85rem' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 10 }}>
          <AdminButton variant="gold" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save Template'}</AdminButton>
          <AdminButton onClick={() => setEditing(null)}>Cancel</AdminButton>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <AdminButton variant="gold" onClick={() => openEditor('new')}>+ New Template</AdminButton>
      </div>
      <DataTable
        columns={[
          { key: 'name', label: 'Name', render: t => t.name },
          { key: 'subject', label: 'Subject', render: t => t.subject },
          {
            key: 'action', label: 'Action', hideOnCard: true, render: (t: ApiEmailTemplate) => (
              <div style={{ display: 'flex', gap: 8 }}>
                <AdminButton onClick={() => openEditor(t)}>Edit</AdminButton>
                <AdminButton variant="danger" onClick={() => setToDelete(t)}>Delete</AdminButton>
              </div>
            ),
          },
        ]}
        rows={loaded ? templates : []}
        keyField="id"
        emptyState={<EmptyState title="No templates yet" description={loaded ? 'Create one to reuse it when composing.' : 'Loading…'} />}
      />
      <ConfirmDialog
        open={!!toDelete}
        title="Delete this template?"
        description={toDelete ? `"${toDelete.name}" will no longer be selectable when composing.` : ''}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

function LogTab() {
  const [rows, setRows] = useState<ApiEmailLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.listEmailLog().then(setRows).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <DataTable
      columns={[
        { key: 'to', label: 'To', render: (r: ApiEmailLogEntry) => <div><div style={{ fontWeight: 700 }}>{r.to_name || '—'}</div><div style={{ fontSize: '0.72rem', color: 'var(--adm-muted)' }}>{r.to_email}</div></div> },
        { key: 'subject', label: 'Subject', render: (r: ApiEmailLogEntry) => r.subject },
        { key: 'event', label: 'Trigger', render: (r: ApiEmailLogEntry) => r.event_key || (r.sent_by ? `Staff (${r.sent_by})` : '—') },
        { key: 'status', label: 'Status', render: (r: ApiEmailLogEntry) => <StatusBadge status={r.status.toLowerCase()} label={r.status} /> },
        { key: 'sentAt', label: 'Sent', render: (r: ApiEmailLogEntry) => formatDate(new Date(r.sent_at).toISOString()) },
      ]}
      rows={loading ? [] : rows}
      keyField="id"
      emptyState={<EmptyState title="No emails sent yet" description={loading ? 'Loading…' : 'Compose one or trigger an event to see it here.'} />}
    />
  );
}

function SettingsTab() {
  const [adminEmail, setAdminEmail] = useState('');
  const [headAstrologerEmail, setHeadAstrologerEmail] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    adminService.getNotifyEmails()
      .then(r => { setAdminEmail(r.adminEmail || ''); setHeadAstrologerEmail(r.headAstrologerEmail || ''); })
      .finally(() => setLoaded(true));
  }, []);

  const save = async () => {
    setSaving(true); setError(''); setSaved(false);
    try {
      await adminService.updateNotifyEmails({ adminEmail: adminEmail.trim() || null, headAstrologerEmail: headAstrologerEmail.trim() || null });
      setSaved(true);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not save these settings.');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <p>Loading…</p>;

  return (
    <div style={{ maxWidth: 480 }}>
      <p style={{ fontSize: '0.82rem', color: 'var(--adm-charcoal-soft)', marginBottom: 18 }}>
        Whenever an automatic notification fires (e.g. an astrologer application is approved/rejected), these two addresses are cc'd in addition to the user it's actually about. Leave either blank to skip it.
      </p>
      <div style={fieldStyle}>
        <label style={labelStyle}>Admin Email</label>
        <input style={inputStyle} type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="admin@tredevastro.com" />
      </div>
      <div style={fieldStyle}>
        <label style={labelStyle}>Head Astrologer Email</label>
        <input style={inputStyle} type="email" value={headAstrologerEmail} onChange={e => setHeadAstrologerEmail(e.target.value)} placeholder="headastrologer@tredevastro.com" />
      </div>
      {error && <p style={{ color: 'var(--adm-danger, #c0392b)', fontSize: '0.85rem' }}>{error}</p>}
      {saved && <p style={{ color: 'var(--adm-success, #2e7d32)', fontSize: '0.85rem' }}>Saved.</p>}
      <AdminButton variant="gold" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</AdminButton>
    </div>
  );
}

