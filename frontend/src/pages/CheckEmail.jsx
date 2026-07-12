import { useState } from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';
import { account } from '@/lib/appwriteClient';

export default function CheckEmail() {
  const location = useLocation();
  const email = location.state?.email;
  const [resent, setResent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If someone lands here directly (no email in state), send them to register
  if (!email) {
    return <Navigate to="/register" replace />;
  }

  async function handleResend() {
    setError('');
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/verify-email`;
      await account.createVerification(redirectUrl);
      setResent(true);
    } catch (err) {
      setError(err.message || 'Could not resend the email. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <h1 className="text-xl font-semibold mb-1">Check your email</h1>
        <p className="text-gray-500 text-sm mb-6">
          We sent a verification link to <strong>{email}</strong>. Click it to activate your account.
        </p>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {resent ? (
          <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
            Sent again — check your inbox.
          </p>
        ) : (
          <button
            onClick={handleResend}
            disabled={loading}
            className="text-sm text-blue-600 hover:underline disabled:opacity-50"
          >
            {loading ? 'Resending...' : "Didn't get it? Resend email"}
          </button>
        )}

        <p className="text-sm text-gray-500 mt-6">
          <Link to="/login" className="text-blue-600 hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
