"use client";

import { ArrowRight, Building2, CheckCircle2, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api/client";
import { useAuth } from "./app-providers";

function AuthCard({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
  return <main className="grid min-h-screen place-items-center bg-[#F6FAF3] p-6">
    <section className="w-full max-w-md rounded-3xl border border-[#DCE6D6] bg-white p-7 shadow-sm sm:p-9">
      <span className="grid size-12 place-items-center rounded-2xl bg-[#E8F1E1] text-[#3E5A3C]">{icon}</span>
      <h1 className="mt-5 text-2xl font-semibold text-[#1F2A1E]">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-[#60705E]">{description}</p>
      <div className="mt-7">{children}</div>
    </section>
  </main>;
}

export function ChangeInitialPasswordPage() {
  const { changeInitialPassword } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    if (password !== confirmation) return setError("As senhas não coincidem.");
    setBusy(true); setError("");
    try {
      const next = new URLSearchParams(window.location.search).get("next") ?? undefined;
      await changeInitialPassword(password, next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível alterar a senha.");
    } finally { setBusy(false); }
  };
  return <AuthCard icon={<KeyRound className="size-5" />} title="Crie uma nova senha" description="A senha recebida por e-mail é temporária. Defina uma senha pessoal para continuar.">
    {error && <p role="alert" className="mb-4 rounded-xl bg-[#F7EDEA] px-4 py-3 text-sm text-[#A14E42]">{error}</p>}
    <form className="space-y-4" onSubmit={submit}>
      <label className="block text-xs font-semibold">Nova senha<input name="password" type="password" minLength={8} maxLength={128} required className="mt-1.5 h-12 w-full rounded-xl border bg-white px-3 text-sm" /></label>
      <label className="block text-xs font-semibold">Confirme a nova senha<input name="confirmation" type="password" minLength={8} maxLength={128} required className="mt-1.5 h-12 w-full rounded-xl border bg-white px-3 text-sm" /></label>
      <button disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#3E5A3C] text-sm font-semibold text-white disabled:opacity-60">{busy ? "Salvando…" : "Salvar e continuar"}<ArrowRight className="size-4" /></button>
    </form>
  </AuthCard>;
}

export function CompanySelectionPage() {
  const { user, selectCompany, logout } = useAuth();
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState("");
  const choose = async (id: string) => {
    setBusy(id); setError("");
    try { await selectCompany(id); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível selecionar a empresa."); setBusy(undefined); }
  };
  return <AuthCard icon={<Building2 className="size-5" />} title="Escolha uma empresa" description="Selecione o ambiente que deseja acessar agora. Você poderá trocar novamente pelo cabeçalho.">
    {error && <p role="alert" className="mb-4 rounded-xl bg-[#F7EDEA] px-4 py-3 text-sm text-[#A14E42]">{error}</p>}
    <div className="space-y-3">
      {(user?.companies ?? []).map((membership) => <button key={membership.id} disabled={Boolean(busy)} onClick={() => void choose(membership.id)} className="flex w-full items-center gap-3 rounded-2xl border border-[#DCE6D6] p-4 text-left hover:bg-[#F6FAF3] disabled:opacity-60">
        <span className="grid size-10 place-items-center rounded-xl bg-[#E8F1E1] text-[#3E5A3C]"><Building2 className="size-4" /></span>
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{membership.company.name}</span><span className="block truncate text-xs text-[#60705E]">{membership.role}</span></span>
        <ArrowRight className="size-4 text-[#60705E]" />
      </button>)}
      {!user?.companies?.length && <p className="rounded-xl bg-[#F6FAF3] p-4 text-sm text-[#60705E]">Você não possui empresas ativas. Solicite acesso a um administrador.</p>}
    </div>
    <button type="button" onClick={() => void logout()} className="mt-6 w-full text-center text-sm font-semibold text-[#60705E]">Sair da conta</button>
  </AuthCard>;
}

export function AcceptInvitationPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);
  const accept = async () => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) return setError("O link do convite está incompleto.");
    setBusy(true); setError("");
    try {
      await api("/users/invitations/accept", { method: "POST", body: JSON.stringify({ token }) });
      setAccepted(true);
      const nextUser = await refreshUser();
      setTimeout(() => router.replace(nextUser.nextStep === "READY" ? "/dashboard" : "/selecionar-empresa"), 600);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível aceitar o convite.");
    } finally { setBusy(false); }
  };
  return <AuthCard icon={accepted ? <CheckCircle2 className="size-5" /> : <Building2 className="size-5" />} title={accepted ? "Acesso liberado" : "Aceitar convite"} description={accepted ? "A empresa foi adicionada à sua conta." : `Confirme o acesso usando a conta ${user?.email ?? "informada no convite"}.`}>
    {error && <p role="alert" className="mb-4 rounded-xl bg-[#F7EDEA] px-4 py-3 text-sm text-[#A14E42]">{error}</p>}
    {!accepted && <button disabled={busy || !user} onClick={() => void accept()} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#3E5A3C] text-sm font-semibold text-white disabled:opacity-60">{busy ? "Aceitando…" : "Aceitar e continuar"}<ArrowRight className="size-4" /></button>}
  </AuthCard>;
}
