import { useState } from 'react';
import { Link } from 'react-router-dom';
import { account } from '@/lib/appwriteClient';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // This URL must match a route in your app that renders ResetPassword.jsx
      // Appwrite appends userId and secret as query params automatically.
      const redirectUrl = `${window.location.origin}/reset-password`;
      await account.createRecovery(email, redirectUrl);
      setSent(true);
    } catch (err) {
      setError(err.message || 'Could not send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-6">
        <h1 className="text-2xl font-semibold mb-1">Reset your password</h1>
        <p className="text-gray-500 text-sm mb-6">
          We'll email you a link to reset it.
        </p>

        {sent ? (
          <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-3">
            Check your inbox — if an account exists for <strong>{email}</strong>, a reset link is on its way.
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white rounded-lg py-2.5 font-medium hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          </>
        )}

        <p className="text-sm text-gray-500 text-center mt-6">
          Remembered it?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
