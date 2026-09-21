import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function ProtectedRoute({
  children,
  requireApprover,
}: {
  children: ReactNode;
  requireApprover?: boolean;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="skeleton h-8 w-48 rounded-lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  if (requireApprover && user.role !== 'approver') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
