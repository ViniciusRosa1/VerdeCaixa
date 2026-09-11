"use client";
/* oxlint-disable typescript/unbound-method */

import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  FileBarChart,
  History,
  LayoutDashboard,
  Menu,
  Settings,
  Tags,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { BrandMark } from "./brand-mark";
import { useAuth } from "./app-providers";

const nav = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/receber", label: "Contas a receber", icon: CircleDollarSign },
  { href: "/pagar", label: "Contas a pagar", icon: WalletCards },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/fornecedores", label: "Fornecedores", icon: Building2 },
  { href: "/categorias", label: "Categorias", icon: Tags },
  {
    href: "/contas-financeiras",
    label: "Contas financeiras",
    icon: BookOpenCheck,
  },
  { href: "/projetos", label: "Projetos", icon: BriefcaseBusiness },
  { href: "/relatorios", label: "Relatórios", icon: FileBarChart },
];
const secondary = [
  { href: "/equipe", label: "Equipe", icon: Users },
  { href: "/perfis", label: "Papéis e permissões", icon: Settings },
  { href: "/historico", label: "Histórico", icon: History },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

function NavContent() {
  const pathname = usePathname();
  const item = (entry: (typeof nav)[number]) => {
    const active =
      pathname === entry.href || pathname.startsWith(`${entry.href}/`);
    const Icon = entry.icon;
    return (
      <Link
        key={entry.href}
        href={entry.href}
        className={`group flex min-h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition ${active ? "bg-[#8AAE6D] text-[#1F2A1E]" : "text-white/68 hover:bg-white/8 hover:text-white"}`}
      >
        <Icon className="size-[17px]" strokeWidth={active ? 2.3 : 1.8} />
        <span>{entry.label}</span>
      </Link>
    );
  };
  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pb-7 pt-1">
        <BrandMark />
      </div>
      <nav aria-label="Navegação principal" className="space-y-1">
        {nav.map(item)}
      </nav>
      <div className="my-5 border-t border-white/10" />
      <nav aria-label="Navegação administrativa" className="space-y-1">
        {secondary.map(item)}
      </nav>
      <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-3.5">
        <p className="text-xs font-medium text-white">Tudo em dia</p>
        <p className="mt-1 text-[11px] leading-4 text-white/55">
          Última atualização hoje, às 10:42.
        </p>
      </div>
    </div>
  );
}

const titles: Record<string, { title: string; subtitle: string }> = {
  dashboard: {
    title: "Visão geral",
    subtitle: "Acompanhe a saúde financeira da empresa.",
  },
  agenda: {
    title: "Agenda financeira",
    subtitle: "Organize pagamentos e recebimentos.",
  },
  receber: {
    title: "Contas a receber",
    subtitle: "Acompanhe entradas previstas e realizadas.",
  },
  pagar: {
    title: "Contas a pagar",
    subtitle: "Controle despesas e próximos vencimentos.",
  },
  clientes: { title: "Clientes", subtitle: "Gerencie sua base de clientes." },
  fornecedores: {
    title: "Fornecedores",
    subtitle: "Organize empresas e prestadores.",
  },
  categorias: {
    title: "Categorias",
    subtitle: "Estruture receitas e despesas.",
  },
  "contas-financeiras": {
    title: "Contas financeiras",
    subtitle: "Veja saldos de caixa e bancos.",
  },
  projetos: {
    title: "Projetos",
    subtitle: "Acompanhe resultados por iniciativa.",
  },
  relatorios: {
    title: "Relatórios",
    subtitle: "Transforme lançamentos em decisões.",
  },
  equipe: { title: "Equipe", subtitle: "Gerencie os acessos da empresa." },
  perfis: {
    title: "Papéis e permissões",
    subtitle: "Defina o que cada perfil pode fazer.",
  },
  notificacoes: {
    title: "Notificações",
    subtitle: "Seus alertas financeiros em um só lugar.",
  },
  historico: {
    title: "Histórico",
    subtitle: "Acompanhe as alterações realizadas.",
  },
  configuracoes: {
    title: "Configurações",
    subtitle: "Personalize seu ambiente financeiro.",
  },
};

function UserMenu() {
  const { user, logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");

  const signOut = async () => {
    setSigningOut(true);
    setError("");
    try {
      await logout();
    } catch {
      setError("Não foi possível sair. Tente novamente.");
    } finally {
      setSigningOut(false);
    }
  };

  return <DropdownMenu.Root>
    <DropdownMenu.Trigger asChild><button type="button" aria-label="Abrir menu do usuário" className="flex h-10 items-center gap-2 rounded-xl border border-border bg-white p-1.5 pr-2 text-left">
        <span className="grid size-7 place-items-center rounded-lg bg-[#DCE6D6] text-xs font-bold text-[#3E5A3C]">
          {user?.name
            ?.trim()
            .split(/\s+/)
            .map((part) => part[0])
            .slice(0, 2)
            .join("") || "VC"}
        </span>
        <ChevronDown className="hidden size-3.5 text-[#60705E] sm:block" />
      </button></DropdownMenu.Trigger>
      <DropdownMenu.Portal><DropdownMenu.Content sideOffset={8} align="end" className="z-50 w-64 rounded-xl border border-border bg-white p-2 text-sm shadow-lg">
          <div className="border-b border-[#DCE6D6] px-3 py-2">
            <p className="truncate font-semibold text-[#1F2A1E]">
              {user?.name}
            </p>
            <p className="truncate text-xs text-[#60705E]">{user?.email}</p>
          </div>
          <Link
            href="/configuracoes"
            className="mt-1 block rounded-lg px-3 py-2 text-[#1F2A1E] hover:bg-[#F6FAF3]"
          >
            Configurações
          </Link>
          <button
            type="button"
            disabled={signingOut}
            onClick={() => void signOut()}
            className="block w-full rounded-lg px-3 py-2 text-left text-[#B3423F] hover:bg-[#F6FAF3] disabled:opacity-50"
          >
            {signingOut ? "Saindo…" : "Sair"}
          </button>
          {error && (
            <p role="alert" className="px-3 py-2 text-xs text-[#B3423F]">
              {error}
            </p>
          )}
      </DropdownMenu.Content></DropdownMenu.Portal>
    </DropdownMenu.Root>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const path = usePathname().split("/").filter(Boolean);
  const section = path[0] || "dashboard";
  const isForm =
    path.includes("novo") || path.includes("nova") || path.includes("editar");
  const page = titles[section] ?? titles.dashboard;
  const title = isForm
    ? `${path.includes("editar") ? "Editar" : "Novo cadastro"} · ${page.title}`
    : page.title;
  return (
    <div className="min-h-screen bg-[#F6FAF3]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] bg-[#1F2A1E] px-4 py-5 lg:block">
        <NavContent />
      </aside>
      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center border-b border-[#DCE6D6] bg-white/92 px-4 backdrop-blur-md sm:px-7 lg:px-9">
          <Dialog.Root>
            <Dialog.Trigger asChild>
              <button
                className="mr-3 grid size-10 place-items-center rounded-xl border border-[#DCE6D6] text-[#1F2A1E] lg:hidden"
                aria-label="Abrir menu"
              >
                <Menu className="size-5" />
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-40 bg-[#1F2A1E]/35 backdrop-blur-[2px]" />
              <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-[284px] bg-[#1F2A1E] p-4 shadow-2xl focus:outline-none">
                <Dialog.Title className="sr-only">Menu principal</Dialog.Title>
                <Dialog.Close asChild>
                  <button
                    className="absolute right-3 top-3 grid size-9 place-items-center rounded-lg text-white/70 hover:bg-white/10"
                    aria-label="Fechar menu"
                  >
                    <X className="size-5" />
                  </button>
                </Dialog.Close>
                <NavContent />
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
          <div className="min-w-0">
            <h1 className="truncate text-[17px] font-semibold tracking-[-0.02em] text-[#1F2A1E]">
              {title}
            </h1>
            <p className="hidden truncate text-xs text-[#60705E] sm:block">
              {page.subtitle}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <span className="hidden text-right md:block">
              <span className="block text-xs font-semibold text-[#1F2A1E]">
                {user?.company?.name ?? "Verde Caixa"}
              </span>
              <span className="block text-[11px] text-[#60705E]">
                {typeof user?.role === "string" ? user.role : user?.role?.name ?? "Empresa ativa"}
              </span>
            </span>
            <Link
              href="/notificacoes"
              className="relative grid size-10 place-items-center rounded-xl border border-[#DCE6D6] bg-white text-[#3E5A3C] hover:bg-[#F6FAF3]"
              aria-label="Ver notificações"
            >
              <Bell className="size-[18px]" />
              <span className="absolute right-2 top-2 size-2 rounded-full bg-[#B3423F] ring-2 ring-white" />
            </Link>
            <UserMenu />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-7 sm:py-8 lg:px-9">
          {children}
        </main>
      </div>
    </div>
  );
}
