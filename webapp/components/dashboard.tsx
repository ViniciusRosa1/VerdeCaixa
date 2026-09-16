"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowDownRight, ArrowUpRight, CalendarClock, ChevronRight, CircleDollarSign, Filter, RotateCcw, TrendingUp, WalletCards, X } from "lucide-react";
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { useAccounts, useDashboard } from "@/lib/api/hooks";
import { api } from "@/lib/api/client";
import { Button, Field, Input, Select, SelectItem } from "@/components/ui/controls";
import { useAuth } from "./app-providers";
import { ClientOnly } from "./client-only";

const currency = (value: string | number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
type Period = { from: string; to: string };
type KpiReport = { cashFlow: Array<{ month: string; income: string; expense: string }> };

export function Dashboard() {
  const { user } = useAuth();
  const accounts = useAccounts();
  const [accountId, setAccountId] = useState("");
  const dashboard = useDashboard(accountId);
  const [period, setPeriod] = useState<Period>({ from: "", to: "" });
  const [draft, setDraft] = useState<Period>(period);
  const [filterOpen, setFilterOpen] = useState(false);
  const hasFilter = Boolean(period.from && period.to);
  const reportParams = new URLSearchParams();
  if (hasFilter) {
    reportParams.set("from", period.from);
    reportParams.set("to", period.to);
  }
  if (accountId) reportParams.set("accountId", accountId);
  const query = reportParams.size ? `?${reportParams.toString()}` : "";
  const report = useQuery({
    queryKey: ["report", "kpis", period.from, period.to, accountId],
    queryFn: () => api<KpiReport>(`/reports/kpis${query}`),
  });
  if (dashboard.isLoading) return <Loading />;
  if (dashboard.isError || !dashboard.data) return <ErrorState />;
  const data = dashboard.data;
  const kpis = [
    { label: "Saldo disponível", value: data.balance, note: "Contas ativas", icon: WalletCards, tone: "brand" },
    { label: "A receber", value: data.receivable, note: "Parcelas pendentes", icon: ArrowUpRight, tone: "positive" },
    { label: "A pagar", value: data.payable, note: "Compromissos pendentes", icon: ArrowDownRight, tone: "neutral" },
    { label: "Saldo projetado", value: data.projected, note: "Após pendências", icon: TrendingUp, tone: "positive" },
  ];
  const flow = (report.data?.cashFlow ?? []).map((item) => ({ label: item.month, receitas: Number(item.income), despesas: Number(item.expense) }));
  const periodLabel = hasFilter
    ? `${new Date(`${period.from}T00:00:00`).toLocaleDateString("pt-BR")} a ${new Date(`${period.to}T00:00:00`).toLocaleDateString("pt-BR")}`
    : "Últimos 6 meses";
  function applyFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.from || !draft.to || draft.from > draft.to) return;
    setPeriod(draft);
    setFilterOpen(false);
  }
  return <div className="page-enter space-y-6">
    <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-sm font-medium text-muted">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(new Date())}</p><h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-ink sm:text-[28px]">Olá, {user?.name.split(" ")[0]}.</h2></div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="w-full sm:w-56">
          <label className="sr-only" htmlFor="dashboard-account">
            Conta financeira
          </label>
          <Select
            name="dashboard-account"
            value={accountId || "all"}
            onValueChange={(value) => setAccountId(value === "all" ? "" : value)}
            className="mt-0"
          >
            <SelectItem value="all">Todas as contas</SelectItem>
            {(accounts.data?.data ?? []).map((account) => <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>)}
          </Select>
        </div>
        <Dialog.Root open={filterOpen} onOpenChange={(open) => { setFilterOpen(open); if (open) setDraft(period); }}>
          <Dialog.Trigger asChild><Button variant="secondary"><Filter className="mr-2 size-4" />Filtrar</Button></Dialog.Trigger>
          <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><Dialog.Title className="text-lg font-semibold">Filtrar fluxo financeiro</Dialog.Title><Dialog.Description className="mt-1 text-sm text-muted">Escolha o período das receitas e despesas liquidadas.</Dialog.Description></div><Dialog.Close asChild><button aria-label="Fechar filtro" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface"><X className="size-4" /></button></Dialog.Close></div><form onSubmit={applyFilter} className="mt-6"><div className="grid gap-4 sm:grid-cols-2"><Field label="Data de início" htmlFor="filter-from"><Input id="filter-from" type="date" required value={draft.from} max={draft.to || undefined} onChange={(event) => setDraft((current) => ({ ...current, from: event.target.value }))} /></Field><Field label="Data de fim" htmlFor="filter-to"><Input id="filter-to" type="date" required value={draft.to} min={draft.from || undefined} onChange={(event) => setDraft((current) => ({ ...current, to: event.target.value }))} /></Field></div><div className="mt-6 flex justify-end gap-2"><Dialog.Close asChild><Button type="button" variant="secondary">Cancelar</Button></Dialog.Close><Button>Aplicar filtro</Button></div></form></Dialog.Content></Dialog.Portal>
        </Dialog.Root>
        <Button variant="secondary" disabled={!hasFilter} onClick={() => setPeriod({ from: "", to: "" })}><RotateCcw className="mr-2 size-4" />Limpar filtro</Button>
      </div>
    </section>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{kpis.map(({ label, value, note, icon: Icon, tone }) => <article key={label} className={`app-card p-5 ${tone === "brand" ? "border-brand bg-ink text-white" : ""}`}><div className="flex items-start justify-between"><p className={`text-xs font-medium ${tone === "brand" ? "text-white/60" : "text-muted"}`}>{label}</p><span className={`grid size-9 place-items-center rounded-xl ${tone === "brand" ? "bg-white/10 text-[#B9D4A2]" : "bg-surface text-brand"}`}><Icon className="size-[17px]" /></span></div><p className="mt-4 text-[25px] font-semibold tracking-[-0.04em]">{currency(value)}</p><p className={`mt-1 text-[11px] ${tone === "brand" ? "text-white/55" : "text-muted"}`}>{note}</p></article>)}</section>
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,.8fr)]">
      <article className="app-card min-w-0 p-5 sm:p-6"><div className="mb-6 flex items-start justify-between gap-4"><div><h3 className="font-semibold">Fluxo financeiro</h3><p className="mt-1 text-xs text-muted">Entradas e saídas liquidadas · {periodLabel}</p></div><span className="shrink-0 rounded-lg bg-surface px-2.5 py-1.5 text-[11px] font-medium text-brand">Regime de caixa</span></div><div className="h-[265px]"><ClientOnly><ResponsiveContainer width="100%" height="100%" minWidth={0}><LineChart data={flow} margin={{ top: 6, right: 8, left: -24, bottom: 0 }}><CartesianGrid stroke="#E5EDE0" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${value / 1000}k`} /><Tooltip formatter={(value) => currency(Number(value))} /><Line type="monotone" dataKey="receitas" stroke="#3E5A3C" strokeWidth={2} dot={flow.length <= 31} /><Line type="monotone" dataKey="despesas" stroke="#8AAE6D" strokeWidth={2} dot={flow.length <= 31} /></LineChart></ResponsiveContainer></ClientOnly></div></article>
      <article className="app-card overflow-hidden"><div className="flex items-center justify-between border-b border-border p-5"><div><h3 className="font-semibold">Movimentações recentes</h3><p className="mt-1 text-xs text-muted">Últimos lançamentos</p></div><CalendarClock className="size-5 text-accent" /></div><div className="divide-y divide-border">{data.recent.length ? data.recent.map((item) => <div key={item.id} className="flex items-center gap-3 px-5 py-3.5"><span className={`grid size-9 shrink-0 place-items-center rounded-xl ${item.kind === "INCOME" ? "bg-surface text-brand" : "bg-[#F4ECE8] text-danger"}`}>{item.kind === "INCOME" ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}</span><span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{item.description}</span><span className="block text-[11px] text-muted">{new Date(item.dueDate).toLocaleDateString("pt-BR")} · {item.counterparty}</span></span><span className="text-xs font-semibold">{currency(item.amount)}</span></div>) : <p className="px-5 py-10 text-center text-xs text-muted">Nenhuma movimentação para esta conta.</p>}</div><Link href="/agenda" className="flex min-h-11 items-center justify-center gap-1 border-t border-border text-xs font-semibold text-brand">Ver agenda completa <ChevronRight className="size-3.5" /></Link></article>
    </section>
    <section className="grid gap-5 lg:grid-cols-3"><article className="app-card p-5 lg:col-span-2"><div className="flex items-center justify-between"><div><p className="text-xs font-medium text-muted">Atenção necessária</p><p className="mt-1 text-base font-semibold">{data.overdueCount} lançamento{data.overdueCount === 1 ? "" : "s"} vencido{data.overdueCount === 1 ? "" : "s"}</p></div><span className="grid size-11 place-items-center rounded-full bg-[#F7EDEA] text-danger"><CalendarClock className="size-5" /></span></div><p className="mt-3 text-xs text-muted">{currency(data.overdueAmount)} aguardam regularização.</p></article><Link href="/relatorios" className="app-card group flex items-center gap-4 p-5"><span className="grid size-11 place-items-center rounded-xl bg-border text-brand"><CircleDollarSign className="size-5" /></span><span className="flex-1"><span className="block text-sm font-semibold">Ver relatórios</span><span className="mt-0.5 block text-xs text-muted">DRE, DFC e indicadores</span></span><ChevronRight className="size-4 text-accent" /></Link></section>
  </div>;
}

function Loading() { return <div className="grid min-h-[55vh] place-items-center text-sm text-muted">Carregando indicadores…</div>; }
function ErrorState() { return <div className="app-card p-8 text-center"><p className="font-semibold">Não foi possível carregar o painel.</p><p className="mt-1 text-sm text-muted">Verifique a conexão com a API e tente novamente.</p></div>; }
