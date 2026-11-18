import { AdminOnly, IssuesPage } from '@/components/library';

export default function ReturnsRoute() {
  return <AdminOnly><IssuesPage initialStatus="returned" /></AdminOnly>;
}
