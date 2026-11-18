import type { ReactNode } from 'react';
import { StudentShell } from '@/components/dashboard-shells';

export default function StudentLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <StudentShell>{children}</StudentShell>;
}
