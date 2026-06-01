import { useEffect, useState } from 'react';
import { Logo } from '../components/shadowshare/Logo';
import { getSenderStatus, deleteFile, type SenderStatusResponse } from '../lib/api';

export function StatusPage({ fileId }: { fileId: string }) {
  const [data, setData] = useState<SenderStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const token = window.location.hash.replace(/^#/, '');

  const load = async () => {
    if (!token) {
      setError('Missing delete token in URL fragment.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await getSenderStatus(fileId, token);
      setData(response);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Unable to load sender status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = window.setInterval(load, 30000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId]);

  const handleDelete = async () => {
    if (!token) return;
    try {
      setDeleting(true);
      await deleteFile(fileId, token);
      await load();
    } catch (err) {
      console.error(err);
      setError('Failed to delete file.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{
      backgroundColor: 'var(--background)',
      backgroundImage: 'radial-gradient(circle at center, rgba(28, 32, 48, 0.4) 0%, rgba(10, 12, 18, 1) 100%)',
    }}>
      <div className="absolute top-6 left-6">
        <Logo />
      </div>

      <div className="max-w-md w-full rounded-3xl p-8 border" style={{
        backgroundColor: 'rgba(18, 21, 31, 0.85)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
      }}>
        <h2 className="mb-4" style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Sender Status
        </h2>

        {loading && <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading status...</p>}
        {error && <p style={{ color: 'var(--danger)', fontSize: '14px' }}>{error}</p>}

        {!loading && !error && data && (
          <div className="space-y-3" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            <p>Status: <strong>{data.status}</strong></p>
            <p>Downloads: <strong>{data.downloadCount}</strong></p>
            <p>Expires: <strong>{data.expiresAt || 'n/a'}</strong></p>
            <p>First Accessed: <strong>{data.firstAccessedAt || 'Not yet'}</strong></p>
            <p>Burn After Read: <strong>{data.burnAfterRead ? 'Yes' : 'No'}</strong></p>

            <button
              onClick={handleDelete}
              disabled={deleting || data.status !== 'active'}
              className="w-full h-11 rounded-md mt-4"
              style={{
                backgroundColor: data.status === 'active' ? 'var(--danger)' : 'var(--elevated)',
                color: 'white',
                opacity: deleting ? 0.7 : 1,
              }}
            >
              {deleting ? 'Deleting...' : 'Delete Permanently'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
