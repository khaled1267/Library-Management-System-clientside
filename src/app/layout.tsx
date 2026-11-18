import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Providers } from '@/components/providers';
import './catalog.css';
import './dashboard.css';
import './globals.css';
import './redesign.css';

export const metadata: Metadata = {
  title: 'Barguna politecnic Library',
  description: 'Explore, borrow, and manage your campus library collection.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body><Providers>{children}</Providers></body></html>;
}
