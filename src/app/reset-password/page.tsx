import { Suspense } from 'react';
import { RecoveryPage } from '@/components/library';

export default function ResetPasswordPage() {
  return <Suspense fallback={<div className="loading">Opening password recovery...</div>}><RecoveryPage reset /></Suspense>;
}
