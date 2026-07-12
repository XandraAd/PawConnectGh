import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { account } from '@/lib/appwriteClient';
import { useAuth } from '@/lib/AuthContext';

export default function VerifyEmail() {
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const userId = searchParams.get('userId');
    const secret = searchParams.get('secret');

    if (!userId || !secret) {
      setStatus('error');
      setErrorMsg('This verification link is invalid or incomplete.');
      return;
    }

    (async () => {
      try {
        await account.updateVerification(userId, secret);
        await refreshUser();
        setStatus('success');
        setTimeout(() => navigate('/'), 1500);
      } catch (err) {
        setStatus('error');
        setErrorMsg(err.message || 'This link may have expired. Please request a new one.');
      }
    })();
  }, [searchParams, navigate, refreshUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-6 text-center">
        {status === 'verifying' && (
          <>
            <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Verifying your email...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <h1 className="text-xl font-semibold mb-1">Email verified 🎉</h1>
            <p className="text-gray-500 text-sm">Taking you into the app...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="text-xl font-semibold mb-1">Verification failed</h1>
            <p className="text-gray-500 text-sm mb-4">{errorMsg}</p>
            <Link to="/login" className="text-blue-600 hover:underline text-sm">
              Back to login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
