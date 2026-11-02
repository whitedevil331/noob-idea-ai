'use client';

import { useEffect } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // If chunk load error, automatically reload to fetch fresh build assets
    if (
      error.name === 'ChunkLoadError' ||
      error.message?.includes('Loading chunk') ||
      error.message?.includes('ChunkLoadError')
    ) {
      const lastReload = sessionStorage.getItem('chunk_reload_ts');
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 8000) {
        sessionStorage.setItem('chunk_reload_ts', now.toString());
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4 shadow-xs">
        <AlertCircle className="w-6 h-6 text-amber-600" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">
        Workspace Updated
      </h2>
      <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
        A new production build was deployed. Reload to get the latest assets.
      </p>
      <button
        onClick={() => {
          if (typeof window !== 'undefined') {
            window.location.reload();
          } else {
            reset();
          }
        }}
        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-2 shadow-sm"
      >
        <RefreshCw className="w-4 h-4 text-slate-950" />
        <span>Reload Application</span>
      </button>
    </div>
  );
}
