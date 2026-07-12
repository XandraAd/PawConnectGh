import { createContext, useContext, useEffect, useState } from 'react';
import { account } from '../lib/appwriteClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const currentUser = await account.get();
      setUser(currentUser);
    } catch {
      setUser(null); // no active session
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await account.deleteSession('current');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, setUser, logout, refreshUser: checkUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
