import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ID, Permission, Role } from 'appwrite';
import { account, databases, DATABASE_ID, COLLECTIONS } from '@/lib/appwriteClient';
import { useAuth } from '@/lib/AuthContext';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      // 1. Create the account
      const newUser = await account.create(ID.unique(), email, password, name);

      // 2. Log them in immediately after signup
      await account.createEmailPasswordSession(email, password);

      // 3. Create their profile document — using the user's own ID as the
      // document ID keeps a clean 1:1 link and makes lookups trivial.
      // Read is public (any), but only this user can ever update/delete
      // their own profile (e.g. flip isAdmin, isBreeder).
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.PROFILES,
        newUser.$id,
        {
          userId: newUser.$id,
          username: email.split('@')[0],
          fullName: name,
          isBreeder: false,
          isFeatured: false,
          isAdmin: false,
        },
        [
          Permission.read(Role.any()),
          Permission.update(Role.user(newUser.$id)),
          Permission.delete(Role.user(newUser.$id)),
        ]
      );

      // 4. Send verification email — link points to /verify-email in this app
      const redirectUrl = `${window.location.origin}/verify-email`;
      await account.createVerification(redirectUrl);

      await refreshUser();
      navigate('/check-email', { state: { email } });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-6">
        <h1 className="text-2xl font-semibold mb-1">Create your account</h1>
        <p className="text-gray-500 text-sm mb-6">Join PawConnect</p>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ama Owusu"
            />
          </div>

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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="At least 8 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
