import type { Metadata } from 'next';
import { Outfit, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase';
import { Analytics } from '@vercel/analytics/next';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta' });

export const metadata: Metadata = {
  title: 'Noob Idea AI - Turn Simple Sparks into Giants',
  description: 'AI-powered idea assessment for the next generation of builders.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${plusJakarta.variable}`}>
      <body className="font-body antialiased selection:bg-yellow-200">
        <FirebaseClientProvider>
          {children}
        </FirebaseClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
