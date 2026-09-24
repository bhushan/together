import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = { title: 'Gather | Plan a trip together', description: 'A shared decision space for group travel.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
