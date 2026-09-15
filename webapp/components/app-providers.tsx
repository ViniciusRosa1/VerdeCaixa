"use client";

import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import type { ApiUser } from "@/lib/api/generated";

type AuthContextValue = {
  user: ApiUser | null;
  loading: boolean;
  login(email: string, password: string, next?: string): Promise<void>;
  logout(): Promise<void>;
  changeInitialPassword(password: string, next?: string): Promise<void>;
  selectCompany(membershipId: string): Promise<void>;
  refreshUser(): Promise<ApiUser>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  } }));
  return <QueryClientProvider client={queryClient}><AuthProvider>{children}</AuthProvider></QueryClientProvider>;
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const anonymousPage = pathname === "/login" || pathname === "/criar-conta";
  const invitePage = pathname === "/convites/aceitar";
  const identityPage = anonymousPage || invitePage || pathname === "/trocar-senha" || pathname === "/selecionar-empresa";

  useEffect(() => {
    api<ApiUser>("/auth/me").then(setUser).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      if (!anonymousPage) {
        const next = invitePage ? `${pathname}${window.location.search}` : undefined;
        router.replace(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
      }
      return;
    }
    if (user.nextStep === "CHANGE_PASSWORD" && pathname !== "/trocar-senha") {
      const next = invitePage ? `${pathname}${window.location.search}` : undefined;
      router.replace(next ? `/trocar-senha?next=${encodeURIComponent(next)}` : "/trocar-senha");
      return;
    }
    if (user.nextStep === "SELECT_COMPANY" && pathname !== "/selecionar-empresa" && !invitePage) {
      router.replace("/selecionar-empresa");
      return;
    }
    if (user.nextStep === "READY" && ["/login", "/criar-conta", "/trocar-senha", "/selecionar-empresa"].includes(pathname)) router.replace("/dashboard");
  }, [anonymousPage, invitePage, loading, pathname, router, user]);

  const navigate = (nextUser: ApiUser, next?: string) => {
    if (nextUser.nextStep === "CHANGE_PASSWORD") {
      router.push(next ? `/trocar-senha?next=${encodeURIComponent(next)}` : "/trocar-senha");
    } else if (next?.startsWith("/convites/aceitar")) {
      router.push(next);
    } else if (nextUser.nextStep === "SELECT_COMPANY") {
      router.push("/selecionar-empresa");
    } else {
      router.push("/dashboard");
    }
  };

  const refreshUser = async () => {
    const result = await api<{ user: ApiUser }>("/auth/refresh", { method: "POST" });
    setUser(result.user);
    return result.user;
  };

  const value: AuthContextValue = {
    user,
    loading,
    login: async (email, password, next) => {
      const result = await api<{ user: ApiUser }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      setUser(result.user);
      navigate(result.user, next);
    },
    logout: async () => {
      await api("/auth/logout", { method: "POST" });
      queryClient.clear();
      setUser(null);
      router.push("/login");
    },
    changeInitialPassword: async (password, next) => {
      const result = await api<{ user: ApiUser }>("/auth/change-initial-password", { method: "POST", body: JSON.stringify({ password }) });
      queryClient.clear();
      setUser(result.user);
      navigate(result.user, next);
    },
    selectCompany: async (membershipId) => {
      const result = await api<{ user: ApiUser }>("/auth/select-company", { method: "POST", body: JSON.stringify({ membershipId }) });
      queryClient.clear();
      setUser(result.user);
      router.push("/dashboard");
    },
    refreshUser,
  };

  const redirecting = !loading && user && user.nextStep !== "READY" && !identityPage;
  return <AuthContext.Provider value={value}>
    {(loading && !anonymousPage) || redirecting ? (
      <div className="grid min-h-screen place-items-center bg-[#F6FAF3] text-sm text-[#60705E]">Carregando seu ambiente…</div>
    ) : children}
  </AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth deve ser usado dentro de AppProviders");
  return value;
}
