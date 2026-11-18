import { Suspense } from 'react';
import { RecoveryPage } from '@/components/library';

export default function ForgotPasswordPage() {
  return <Suspense fallback={<div className="loading">Opening account help...</div>}><RecoveryPage /></Suspense>;
}
