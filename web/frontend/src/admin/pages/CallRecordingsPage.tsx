import { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { adminService, AdminApiError } from '../../services/adminService';
import type { ApiCallRecording } from '../../services/adminService';
import DataTable from '../components/DataTable';
import { EmptyState, AdminButton } from '../components/SharedControls';
import { formatDateTime } from '../adminUtils';
import styles from './AdminPages.module.css';

// Staff/Admin-only archive of recorded voice calls (backend/app/api/
// admin.routes.ts's 'call-recordings' section). Calls are peer-to-peer
// WebRTC (see CallWindow.tsx) — the recording is captured client-side and
// uploaded once, so this page is purely a read-only list + playback, no
// edit/create actions. Rows disappear on their own once the backend's
// 10-day retention job deletes them (realtimeStore.ts's
// deleteExpiredCallRecordings) — there is deliberately no manual delete
// button here, since the whole point is a fixed, automatic retention window.
export default function CallRecordingsPage() {
  const { t } = useAppContext();
  const [recordings, setRecordings] = useState<ApiCallRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminService.listCallRecordings()
      .then(setRecordings)
      .catch(err => setError(err instanceof AdminApiError ? err.message : 'Could not load call recordings.'))
      .finally(() => setLoading(false));
  }, []);

  // Only one recording's audio is ever fetched/held in memory at a time —
  // revoking the previous object URL before creating the next one avoids
  // leaking blob URLs as staff click through several recordings.
  const play = async (recording: ApiCallRecording) => {
    if (playingUrl) URL.revokeObjectURL(playingUrl);
    setPlayingId(recording.id);
    setPlayingUrl(null);
    setError('');
    try {
      const blob = await adminService.fetchCallRecordingAudio(recording.id);
      setPlayingUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not load this recording.');
      setPlayingId(null);
    }
  };

  const formatSize = (bytes: number) => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>{t('admin_sidebar_call-recordings')}</div>
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--adm-charcoal-soft)', marginBottom: 16 }}>
        {t('admin_call_recordings_desc')}
      </p>

      {error && <p style={{ color: 'var(--adm-danger)', fontSize: '0.85rem', marginBottom: 12 }}>{error}</p>}

      {playingUrl && (
        <div style={{ marginBottom: 16, padding: 12, border: '1px solid var(--adm-border, #e5e0d8)', borderRadius: 8 }}>
          <audio controls autoPlay src={playingUrl} style={{ width: '100%' }} />
        </div>
      )}

      {!loading && recordings.length === 0 && (
        <EmptyState title={t('admin_empty_title')} description={t('admin_empty_desc')} />
      )}

      {recordings.length > 0 && (
        <DataTable
          columns={[
            { key: 'astrologer', label: t('admin_astro_col_name'), render: r => r.astrologerName },
            { key: 'user', label: t('admin_call_recordings_col_user'), render: r => `${r.userName} (${r.userEmail})` },
            { key: 'created', label: t('admin_call_recordings_col_recorded'), render: r => formatDateTime(r.createdAt) },
            { key: 'expires', label: t('admin_call_recordings_col_expires'), render: r => formatDateTime(r.expiresAt) },
            { key: 'size', label: t('admin_call_recordings_col_size'), render: r => formatSize(r.sizeBytes) },
            {
              key: 'action', label: t('admin_apps_col_action'), hideOnCard: true, render: r => (
                <AdminButton disabled={playingId === r.id && !playingUrl} onClick={() => play(r)}>
                  {playingId === r.id && !playingUrl ? '…' : t('admin_call_recordings_play')}
                </AdminButton>
              ),
            },
          ]}
          rows={recordings}
          keyField="id"
        />
      )}
    </div>
  );
}
