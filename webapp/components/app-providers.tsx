'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import type { ApiUser } from '@/lib/api/generated';

const AuthContext = createContext<{ user: ApiUser | null; loading: boolean; login(email: string, password: string): Promise<void>; logout(): Promise<void> } | null>(null);

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } } }));
  return <QueryClientProvider client={queryClient}><AuthProvider>{children}</AuthProvider></QueryClientProvider>;
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    api<ApiUser>('/auth/me').then(setUser).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!loading && !user && pathname !== '/login') router.replace('/login');
    if (!loading && user && pathname === '/login') router.replace('/dashboard');
  }, [loading, pathname, router, user]);
  const value = {
    user, loading,
    login: async (email: string, password: string) => { const result = await api<{ user: ApiUser }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); setUser(result.user); router.push('/dashboard'); },
    logout: async () => { await api('/auth/logout', { method: 'POST' }); setUser(null); router.push('/login'); },
  };
  return <AuthContext.Provider value={value}>{loading && pathname !== '/login' ? <div className="grid min-h-screen place-items-center bg-[#F6FAF3] text-sm text-[#60705E]">Carregando seu ambiente…</div> : children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth deve ser usado dentro de AppProviders');
  return value;
}
