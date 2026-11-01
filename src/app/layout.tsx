import type { Metadata } from 'next';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase';

export const metadata: Metadata = {
  title: 'Noob Idea AI - Turn Simple Sparks into Giants',
  description:
    'Noob Idea AI - Turn Simple Sparks into Giants. Instant AI assessment for the next generation of builders.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Auto-recover from stale Webpack chunks when new builds deploy
              window.addEventListener('error', function(e) {
                if (e && e.message && (e.message.indexOf('Loading chunk') !== -1 || e.message.indexOf('ChunkLoadError') !== -1)) {
                  var last = sessionStorage.getItem('chunk_reload_ts');
                  var now = Date.now();
                  if (!last || now - parseInt(last, 10) > 8000) {
                    sessionStorage.setItem('chunk_reload_ts', now.toString());
                    window.location.reload();
                  }
                }
              });
              window.addEventListener('unhandledrejection', function(e) {
                var reason = e && e.reason;
                var msg = (reason && (reason.message || reason.name || String(reason))) || '';
                if (msg.indexOf('Loading chunk') !== -1 || msg.indexOf('ChunkLoadError') !== -1) {
                  var last = sessionStorage.getItem('chunk_reload_ts');
                  var now = Date.now();
                  if (!last || now - parseInt(last, 10) > 8000) {
                    sessionStorage.setItem('chunk_reload_ts', now.toString());
                    window.location.reload();
                  }
                }
              });
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased selection:bg-amber-500/20">
        <FirebaseClientProvider>
          {children}
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
