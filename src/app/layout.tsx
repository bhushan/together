import type { Metadata, Viewport } from 'next';
import { Fraunces, Instrument_Sans } from 'next/font/google';
import './styles.css';

// Fraunces carries the voice: warm, slightly wonky, and set large.
const display = Fraunces({
  subsets: ['latin'],
  axes: ['SOFT', 'WONK', 'opsz'],
  variable: '--font-fraunces',
  display: 'swap',
});

// Instrument Sans does the work: forms, tables, numbers.
const sans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Together: plan one trip with everyone',
  description: 'One link for the group. Everyone’s dates, budgets and no-go destinations in one place, and options that have already cleared all of them.',
};

export const viewport: Viewport = { themeColor: '#0c1e22' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
