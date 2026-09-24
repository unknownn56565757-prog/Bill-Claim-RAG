import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import * as api from '@/api/client';
import type { User } from '@/api/client';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: {
    name: string;
    email: string;
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
      const savedUser = sessionStorage.getItem('auth_user');
      const savedToken = sessionStorage.getItem('auth_token');

      if (savedUser && savedToken) {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      }
    } catch {
      sessionStorage.removeItem('auth_user');
      sessionStorage.removeItem('auth_token');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveAuth = useCallback((response: api.AuthResponse) => {
    const newUser: User = {
      id: response.user_id,
      name: response.name,
      email: response.email,
    };

    setUser(newUser);
    setToken(response.access_token);

    sessionStorage.setItem('auth_user', JSON.stringify(newUser));
    sessionStorage.setItem('auth_token', response.access_token);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const response = await api.signIn(email, password);
      saveAuth(response);
    },
    [saveAuth]
  );

  const signUp = useCallback(
    async (data: {
      name: string;
      email: string;
      password: string;
    }) => {
      const response = await api.signUp(data);
      saveAuth(response);
    },
    [saveAuth]
  );

  const signOut = useCallback(() => {
    setUser(null);
    setToken(null);

    sessionStorage.removeItem('auth_user');
    sessionStorage.removeItem('auth_token');
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}