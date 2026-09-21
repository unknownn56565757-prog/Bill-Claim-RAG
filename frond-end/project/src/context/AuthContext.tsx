import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@/types';
import * as api from '@/api/client';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<void>;
  signUp: (data: {
    name: string;
    employeeId: string;
    email: string;
    phone: string;
    password: string;
  }) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('auth_user');
      const savedToken = sessionStorage.getItem('auth_token');
      if (saved && savedToken) {
        setUser(JSON.parse(saved));
        setToken(savedToken);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  const signIn = useCallback(async (identifier: string, password: string) => {
    const res = await api.signIn(identifier, password);
    setUser(res.user);
    setToken(res.token);
    sessionStorage.setItem('auth_user', JSON.stringify(res.user));
    sessionStorage.setItem('auth_token', res.token);
  }, []);

  const signUp = useCallback(
    async (data: {
      name: string;
      employeeId: string;
      email: string;
      phone: string;
      password: string;
    }) => {
      const res = await api.signUp(data);
      setUser(res.user);
      setToken(res.token);
      sessionStorage.setItem('auth_user', JSON.stringify(res.user));
      sessionStorage.setItem('auth_token', res.token);
    },
    []
  );

  const signOut = useCallback(() => {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem('auth_user');
    sessionStorage.removeItem('auth_token');
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
