import { AdminOnly, StudentsPage } from '@/components/library';

export default function StudentsRoute() {
  return <AdminOnly><StudentsPage /></AdminOnly>;
}
