import { AdminOnly } from '@/components/library';
import { ManagePage } from '@/components/catalog-pages';

export default function AuthorsRoute() {
  return <AdminOnly><ManagePage type="authors" /></AdminOnly>;
}
