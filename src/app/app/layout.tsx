import type { ReactNode } from 'react';
import { LegacyAppRedirect } from '@/components/dashboard-shells';

export default function LibraryLayout({ children }: Readonly<{ children: ReactNode }>) {
  void children;
  return <LegacyAppRedirect />;
}
