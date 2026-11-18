'use client';

import { AdminDashboard, StudentDashboard } from '@/components/library';
import { useAuth } from '@/components/providers';

export default function DashboardPage() {
  const { user } = useAuth();
  if (!user) return <div className="loading">Loading your dashboard...</div>;
  return user.role === 'admin' ? <AdminDashboard /> : <StudentDashboard />;
}
