'use client';
/* oxlint-disable typescript/no-explicit-any */

import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight, CalendarClock, ChevronRight, CircleDollarSign, Plus, TrendingUp, WalletCards } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { useDashboard } from '@/lib/api/hooks';
import { api } from '@/lib/api/client';
import { useAuth } from './app-providers';
import { ClientOnly } from './client-only';

const currency = (value: string | number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));

export function Dashboard() {
  const { user } = useAuth();
  const dashboard = useDashboard();
  const report = useQuery({ queryKey: ['report', 'kpis'], queryFn: () => api<any>('/reports/kpis') });
  if (dashboard.isLoading) return <Loading />;
  if (dashboard.isError || !dashboard.data) return <ErrorState />;
  const data = dashboard.data;
  const kpis = [
    { label: 'Saldo disponível', value: data.balance, note: 'Contas ativas', icon: WalletCards, tone: 'brand' },
    { label: 'A receber', value: data.receivable, note: 'Parcelas pendentes', icon: ArrowUpRight, tone: 'positive' },
    { label: 'A pagar', value: data.payable, note: 'Compromissos pendentes', icon: ArrowDownRight, tone: 'neutral' },
    { label: 'Saldo projetado', value: data.projected, note: 'Após pendências', icon: TrendingUp, tone: 'positive' },
  ];
  const flow = (report.data?.cashFlow ?? []).map((item: any) => ({ month: item.month, receitas: Number(item.income), despesas: Number(item.expense) }));
  return <div className="page-enter space-y-6">
    <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-[#60705E]">{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date())}</p><h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-[#1F2A1E] sm:text-[28px]">Olá, {user?.name.split(' ')[0]}.</h2></div><div className="flex gap-2"><Link href="/pagar/novo" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#CBD9C4] bg-white px-4 text-sm font-semibold text-[#3E5A3C]"><Plus className="size-4" />Despesa</Link><Link href="/receber/novo" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#3E5A3C] px-4 text-sm font-semibold text-white"><Plus className="size-4" />Receita</Link></div></section>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{kpis.map(({ label, value, note, icon: Icon, tone }) => <article key={label} className={`app-card p-5 ${tone === 'brand' ? 'border-[#3E5A3C] bg-[#1F2A1E] text-white' : ''}`}><div className="flex items-start justify-between"><p className={`text-xs font-medium ${tone === 'brand' ? 'text-white/60' : 'text-[#60705E]'}`}>{label}</p><span className={`grid size-9 place-items-center rounded-xl ${tone === 'brand' ? 'bg-white/10 text-[#B9D4A2]' : 'bg-[#EEF4EA] text-[#3E5A3C]'}`}><Icon className="size-[17px]" /></span></div><p className="mt-4 text-[25px] font-semibold tracking-[-0.04em]">{currency(value)}</p><p className={`mt-1 text-[11px] ${tone === 'brand' ? 'text-white/55' : 'text-[#738071]'}`}>{note}</p></article>)}</section>
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,.8fr)]">
      <article className="app-card min-w-0 p-5 sm:p-6"><div className="mb-6 flex items-start justify-between"><div><h3 className="font-semibold">Fluxo financeiro</h3><p className="mt-1 text-xs text-[#60705E]">Entradas e saídas liquidadas nos últimos 6 meses</p></div><span className="rounded-lg bg-[#F6FAF3] px-2.5 py-1.5 text-[11px] font-medium text-[#3E5A3C]">Regime de caixa</span></div><div className="h-[265px]"><ClientOnly><ResponsiveContainer width="100%" height="100%" minWidth={0}><AreaChart data={flow} margin={{ top: 6, right: 0, left: -24, bottom: 0 }}><CartesianGrid stroke="#E5EDE0" strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month" axisLine={false} tickLine={false}/><YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`}/><Tooltip formatter={(value) => currency(Number(value))}/><Area type="monotone" dataKey="receitas" stroke="#3E5A3C" fill="#3E5A3C22"/><Area type="monotone" dataKey="despesas" stroke="#8AAE6D" fill="#8AAE6D22"/></AreaChart></ResponsiveContainer></ClientOnly></div></article>
      <article className="app-card overflow-hidden"><div className="flex items-center justify-between border-b border-[#E5EDE0] p-5"><div><h3 className="font-semibold">Movimentações recentes</h3><p className="mt-1 text-xs text-[#60705E]">Últimos lançamentos</p></div><CalendarClock className="size-5 text-[#8AAE6D]" /></div><div className="divide-y divide-[#EAF0E6]">{data.recent.map((item) => <div key={item.id} className="flex items-center gap-3 px-5 py-3.5"><span className={`grid size-9 shrink-0 place-items-center rounded-xl ${item.kind === 'INCOME' ? 'bg-[#E8F1E1] text-[#3E5A3C]' : 'bg-[#F4ECE8] text-[#9B5645]'}`}>{item.kind === 'INCOME' ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}</span><span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{item.description}</span><span className="block text-[11px] text-[#748172]">{new Date(item.dueDate).toLocaleDateString('pt-BR')} · {item.counterparty}</span></span><span className="text-xs font-semibold">{currency(item.amount)}</span></div>)}</div><Link href="/agenda" className="flex min-h-11 items-center justify-center gap-1 border-t border-[#E5EDE0] text-xs font-semibold text-[#3E5A3C]">Ver agenda completa <ChevronRight className="size-3.5" /></Link></article>
    </section>
    <section className="grid gap-5 lg:grid-cols-3"><article className="app-card p-5 lg:col-span-2"><div className="flex items-center justify-between"><div><p className="text-xs font-medium text-[#60705E]">Atenção necessária</p><p className="mt-1 text-base font-semibold">{data.overdueCount} lançamento{data.overdueCount === 1 ? '' : 's'} vencido{data.overdueCount === 1 ? '' : 's'}</p></div><span className="grid size-11 place-items-center rounded-full bg-[#F7EDEA] text-[#A14E42]"><CalendarClock className="size-5" /></span></div><p className="mt-3 text-xs text-[#71806F]">{currency(data.overdueAmount)} aguardam regularização.</p></article><Link href="/relatorios" className="app-card group flex items-center gap-4 p-5"><span className="grid size-11 place-items-center rounded-xl bg-[#DCE6D6] text-[#3E5A3C]"><CircleDollarSign className="size-5" /></span><span className="flex-1"><span className="block text-sm font-semibold">Ver relatórios</span><span className="mt-0.5 block text-xs text-[#60705E]">DRE, DFC e indicadores</span></span><ChevronRight className="size-4 text-[#8AAE6D]" /></Link></section>
  </div>;
}

function Loading() { return <div className="grid min-h-[55vh] place-items-center text-sm text-[#60705E]">Carregando indicadores…</div>; }
function ErrorState() { return <div className="app-card p-8 text-center"><p className="font-semibold">Não foi possível carregar o painel.</p><p className="mt-1 text-sm text-[#60705E]">Verifique a conexão com a API e tente novamente.</p></div>; }
