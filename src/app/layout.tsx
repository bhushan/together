import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = { title: 'Together | Plan a trip with everyone', description: 'A shared decision space for group travel.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
