import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { account } from '@/lib/appwriteClient';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Appwrite appends these to the redirect URL after the user clicks the email link
  const userId = searchParams.get('userId');
  const secret = searchParams.get('secret');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!userId || !secret) {
      setError('This reset link is invalid or expired. Please request a new one.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await account.updateRecovery(userId, secret, password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message || 'Could not reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-6">
        <h1 className="text-2xl font-semibold mb-1">Set a new password</h1>
        <p className="text-gray-500 text-sm mb-6">Choose something you haven't used before.</p>

        {success ? (
          <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-3">
            Password updated! Redirecting you to login...
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="At least 8 characters"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Repeat password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white rounded-lg py-2.5 font-medium hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </>
        )}

        <p className="text-sm text-gray-500 text-center mt-6">
          <Link to="/login" className="text-blue-600 hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
