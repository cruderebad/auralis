import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!session) {
        navigate('/');
      } else if (profile && profile.role !== 'admin') {
        navigate('/dashboard');
      }
    }
  }, [session, profile, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#6B46C1] animate-spin" />
      </div>
    );
  }

  if (!session || (profile && profile.role !== 'admin')) {
    return null;
  }

  return <>{children}</>;
}
