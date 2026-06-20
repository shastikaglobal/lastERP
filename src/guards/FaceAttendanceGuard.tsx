import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

type Props = {
  children: React.ReactNode;
};

export default function FaceAttendanceGuard({ children }: Props) {
  const { profile, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-gray-400">Loading...</div>;
  }

  if (!profile?.email) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
