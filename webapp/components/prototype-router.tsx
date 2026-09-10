"use client";

import { RegisterPage } from "./register-page";
import { Dashboard } from "./dashboard";
import { FinancialForm, DirectoryForm, SettingsPage } from "./forms";
import {
  LoginPage,
  NotificationsPage,
  HistoryPage,
  NotFoundPage,
} from "./misc-pages";
import { ReportPage, ReportsHub } from "./reports";
import { AgendaPage, DirectoryList, FinancialList } from "./shared-pages";

export function PrototypeRouter({ path }: { path: string[] }) {
  const [section = "dashboard", second] = path;
  const isForm = second === "novo" || second === "nova" || second === "editar";
  const editing = second === "editar";
  if (section === "criar-conta") return <RegisterPage />;
  if (section === "login") return <LoginPage />;
  if (section === "dashboard") return <Dashboard />;
  if (section === "agenda") return <AgendaPage />;
  if (section === "receber" || section === "pagar")
    return isForm ? (
      <FinancialForm kind={section} editing={editing} />
    ) : (
      <FinancialList kind={section} />
    );
  if (
    [
      "clientes",
      "fornecedores",
      "categorias",
      "contas-financeiras",
      "projetos",
      "equipe",
      "perfis",
    ].includes(section)
  ) {
    const kind = section as
      | "clientes"
      | "fornecedores"
      | "categorias"
      | "contas-financeiras"
      | "projetos"
      | "equipe"
      | "perfis";
    return isForm ? (
      <DirectoryForm kind={kind} editing={editing} />
    ) : (
      <DirectoryList kind={kind} />
    );
  }
  if (section === "relatorios")
    return second ? <ReportPage kind={second} /> : <ReportsHub />;
  if (section === "notificacoes") return <NotificationsPage />;
  if (section === "historico") return <HistoryPage />;
  if (section === "configuracoes") return <SettingsPage />;
  return <NotFoundPage />;
}
