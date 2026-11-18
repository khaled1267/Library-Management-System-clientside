import { AdminOnly } from '@/components/library';
import { ManagePage } from '@/components/catalog-pages';

export default function CategoriesRoute() {
  return <AdminOnly><ManagePage type="categories" /></AdminOnly>;
}
