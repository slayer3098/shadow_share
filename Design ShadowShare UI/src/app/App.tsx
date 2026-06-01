import React, { useState, useEffect } from 'react';
import { UploadPage, UploadData } from './pages/UploadPage';
import { ProgressPage } from './pages/ProgressPage';
import { SuccessPage } from './pages/SuccessPage';
import { ViewerPage } from './pages/ViewerPage';
import { StatusPage } from './pages/StatusPage';
import { NotFoundPage } from './pages/NotFoundPage';

type ThemeMode = 'dark' | 'light';

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';

  const stored = window.localStorage.getItem('shadowshare.theme');
  if (stored === 'dark' || stored === 'light') return stored;

  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

type AppState =
  | { type: 'upload' }
  | { type: 'progress'; uploadData: UploadData }
  | { type: 'success'; shareLink: string; deleteLink: string; expiresAt: string; ttl: string }
  | { type: 'viewer'; fileId: string }
  | { type: 'status'; fileId: string }
  | { type: '404' };

export default function App() {
  const [state, setState] = useState<AppState>({ type: 'upload' });
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    window.localStorage.setItem('shadowshare.theme', theme);
  }, [theme]);

  useEffect(() => {
    const path = window.location.pathname;
    // Accept both /v/:id and /v/:id/ (trailing slash)
    const viewerMatch = path.match(/^\/v\/([a-zA-Z0-9-]+)(?:\/)?$/);
    if (viewerMatch) {
      setState({ type: 'viewer', fileId: viewerMatch[1] });
      return;
    }

    const statusMatch = path.match(/^\/status\/([a-zA-Z0-9-]+)$/);
    if (statusMatch) {
      setState({ type: 'status', fileId: statusMatch[1] });
    }
  }, []);

  const handleUpload = (uploadData: UploadData) => {
    setState({ type: 'progress', uploadData });
  };

  const handleProgressComplete = (shareLink: string, deleteLink: string, expiresAt: string, ttl: string) => {
    setState({ type: 'success', shareLink, deleteLink, expiresAt, ttl });
  };

  const handleReset = () => {
    setState({ type: 'upload' });
  };

  const handleToggleTheme = () => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  };

  let content;
  if (state.type === 'upload') {
    content = <UploadPage onUpload={handleUpload} theme={theme} onToggleTheme={handleToggleTheme} />;
  } else if (state.type === 'progress') {
    content = <ProgressPage uploadData={state.uploadData} onComplete={handleProgressComplete} />;
  } else if (state.type === 'success') {
    content = (
      <SuccessPage
        shareLink={state.shareLink}
        deleteLink={state.deleteLink}
        expiresAt={state.expiresAt}
        ttl={state.ttl}
        onReset={handleReset}
      />
    );
  } else if (state.type === 'viewer') {
    content = <ViewerPage fileId={state.fileId} />;
  } else if (state.type === 'status') {
    content = <StatusPage fileId={state.fileId} />;
  } else {
    content = <NotFoundPage />;
  }

  return (
    <AppErrorBoundary>
      {content}
    </AppErrorBoundary>
  );
}

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('AppErrorBoundary caught:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center px-6">
          <div className="max-w-md w-full rounded-3xl p-10 border text-center" style={{ backgroundColor: 'rgba(18,21,31,0.95)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--danger)' }}>An error occurred</h2>
            <pre style={{ textAlign: 'left', marginTop: '12px', color: 'var(--text-muted)', fontSize: '12px', whiteSpace: 'pre-wrap' }}>{this.state.error.message}</pre>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '12px' }}>Open the browser console for details.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
