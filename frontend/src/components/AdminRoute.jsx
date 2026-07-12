import { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { databases, DATABASE_ID, COLLECTIONS } from '@/lib/appwriteClient';
import { useAuth } from '@/lib/AuthContext';

export default function AdminRoute() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(null); // null = still checking
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (authLoading) return; // wait for auth to resolve first

    if (!user) {
      setChecking(false);
      return;
    }

    async function checkAdmin() {
      try {
        // Profile document ID = user ID (set this way at signup)
        const profile = await databases.getDocument(DATABASE_ID, COLLECTIONS.PROFILES, user.$id);
        setIsAdmin(profile.isAdmin === true);
      } catch (err) {
        console.error('Failed to check admin status:', err);
        setIsAdmin(false); // fail closed — no profile/error means no admin access
      } finally {
        setChecking(false);
      }
    }

    checkAdmin();
  }, [user, authLoading]);

  if (authLoading || checking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
