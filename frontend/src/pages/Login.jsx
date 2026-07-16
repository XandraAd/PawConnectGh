import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { account } from '../lib/appwriteClient';
import { useAuth } from '@/lib/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, loading: authLoading, refreshUser } = useAuth();

  // If already logged in, go to home
  if (!authLoading && user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await account.createEmailPasswordSession(email, password);
      await refreshUser();
      navigate('/');
    } catch (err) {
      if (err.message?.includes('session is active')) {
        await refreshUser();
        navigate('/');
        return;
      }
      setError(err.message || 'Login failed. Check your email and password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm bg-card rounded-2xl shadow-lg border border-border/50 p-6">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <img
            src="/Paws_Connect_Logo.png"
            alt="Paws Connect"
            className="w-16 h-16 object-contain"
          />
        </div>

        <h1 className="text-2xl font-jakarta font-bold text-foreground text-center mb-1">
          Welcome back
        </h1>
        <p className="text-muted-foreground text-sm text-center mb-6">
          Log in to Paws Connect
        </p>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm font-jakarta text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm font-jakarta text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="••••••••"
            />
          </div>

          <div className="text-right">
            <Link to="/forgot-password" className="text-sm text-primary hover:underline">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white rounded-xl py-2.5 font-jakarta font-semibold hover:opacity-90 disabled:opacity-50 transition"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="text-sm text-muted-foreground text-center mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary hover:underline font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}