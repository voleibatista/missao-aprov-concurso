import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiFetch, saveToken, getToken, clearToken } from '@/src/api/client';

type User = {
  user_id: string;
  name: string;
  email: string;
  xp?: number;
  streak?: number;
  concurso_id?: string | null;
  onboarded?: boolean;
  picture?: string;
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithSessionId: (sessionId: string) => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = await getToken();
    if (!token) { setUser(null); return; }
    try {
      const data = await apiFetch('/auth/me');
      setUser(data.user);
    } catch {
      await clearToken();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const login = async (email: string, password: string) => {
    const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    await saveToken(data.token);
    setUser(data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const data = await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });
    await saveToken(data.token);
    setUser(data.user);
  };

  const loginWithSessionId = async (sessionId: string) => {
    const data = await apiFetch('/auth/session', { method: 'POST', body: JSON.stringify({ session_id: sessionId }) });
    await saveToken(data.session_token);
    setUser(data.user);
  };

  const logout = async () => {
    try { await apiFetch('/auth/logout', { method: 'POST' }); } catch {}
    await clearToken();
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, refresh, login, register, loginWithSessionId, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used inside AuthProvider');
  return c;
}
