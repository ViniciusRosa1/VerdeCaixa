"use client";

import Link from "next/link";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  type CSSProperties,
  useMemo,
  useState,
  type FormEventHandler,
  type ReactNode,
} from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeading } from "@/components/shared-pages";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/controls";

export type DirectoryColumn<T> = {
  key: string;
  header?: ReactNode;
  render(row: T): ReactNode;
  align?: "start" | "end";
  hideOnMobile?: boolean;
};

export function DirectoryListView<T>({
  title,
  description,
  createHref,
  createLabel,
  rows,
  columns,
  gridTemplateColumns,
  getRowId,
  getSearchText,
  loading,
  error,
}: {
  title: string;
  description: string;
  createHref: string;
  createLabel: string;
  rows: T[];
  columns: DirectoryColumn<T>[];
  gridTemplateColumns: string;
  getRowId(row: T): string;
  getSearchText(row: T): string;
  loading: boolean;
  error: boolean;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  const filtered = useMemo(
    () =>
      normalizedQuery
        ? rows.filter((row) =>
            getSearchText(row)
              .toLocaleLowerCase("pt-BR")
              .includes(normalizedQuery),
          )
        : rows,
    [getSearchText, normalizedQuery, rows],
  );
  const gridStyle = {
    "--directory-grid": gridTemplateColumns,
  } as CSSProperties;

  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="Cadastros"
        title={title}
        description={description}
      />
      <div className="mb-4 flex justify-end">
        <Button asChild>
          <Link href={createHref}>
            <Plus className="mr-2 size-4" />
            {createLabel}
          </Link>
        </Button>
      </div>
      <Card className="overflow-hidden">
        <div className="border-b border-border p-4">
          <label className="relative block">
            <span className="sr-only">Pesquisar</span>
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar..."
              className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm outline-none focus:border-accent"
            />
          </label>
        </div>
        {loading ? (
          <State text="Carregando dados…" />
        ) : error ? (
          <State text="Não foi possível carregar os dados." />
        ) : filtered.length ? (
          <div className="divide-y divide-border">
            <div
              className="hidden items-center gap-4 bg-surface px-5 py-3 text-xs font-semibold text-muted sm:grid sm:grid-cols-[var(--directory-grid)]"
              style={gridStyle}
            >
              {columns.map((column) => (
                <span
                  key={column.key}
                  aria-hidden={column.header ? undefined : true}
                  className={column.align === "end" ? "text-right" : undefined}
                >
                  {column.header}
                </span>
              ))}
            </div>
            {filtered.map((row) => (
              <article
                key={getRowId(row)}
                className="grid gap-4 p-4 sm:grid-cols-[var(--directory-grid)] sm:items-center sm:px-5"
                style={gridStyle}
              >
                {columns.map((column) => (
                  <div
                    key={column.key}
                    className={`min-w-0 ${column.hideOnMobile ? "hidden sm:block" : ""} ${column.align === "end" ? "sm:justify-self-end" : ""}`}
                  >
                    {column.render(row)}
                  </div>
                ))}
              </article>
            ))}
          </div>
        ) : (
          <State
            text={
              normalizedQuery
                ? "Nenhum resultado encontrado"
                : "Nenhum registro cadastrado"
            }
          />
        )}
      </Card>
    </div>
  );
}

export function DirectoryInitials({ name }: { name: string }) {
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface text-sm font-bold text-brand">
      {name.slice(0, 2).toLocaleUpperCase("pt-BR")}
    </span>
  );
}

export function DirectoryPrimaryText({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string | null;
}) {
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold">{title}</p>
      {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
    </div>
  );
}

export function DirectoryRowActions({
  id,
  title,
  editBase,
  onDeactivate,
}: {
  id: string;
  title: string;
  editBase: string;
  onDeactivate(id: string): Promise<unknown>;
}) {
  return (
    <div className="flex gap-1 sm:justify-end">
      <Link
        href={`${editBase}/${id}/editar`}
        className="grid size-9 place-items-center rounded-lg border border-border"
        aria-label={`Editar ${title}`}
      >
        <Pencil className="size-3.5" />
      </Link>
      <ConfirmDialog
        destructive
        title={`Desativar ${title}?`}
        description="O registro deixará de aparecer em novas seleções."
        confirmLabel="Desativar"
        onConfirm={() => onDeactivate(id)}
        trigger={
          <button
            className="grid size-9 place-items-center rounded-lg border border-border text-danger"
            aria-label={`Desativar ${title}`}
          >
            <Trash2 className="size-3.5" />
          </button>
        }
      />
    </div>
  );
}

export function FormPage({
  title,
  description = "Mantenha os dados essenciais organizados.",
  backHref,
  message,
  children,
  pending,
  onSubmit,
}: {
  title: string;
  description?: string;
  backHref: string;
  message?: string;
  children: ReactNode;
  pending: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
}) {
  return (
    <div className="page-enter mx-auto max-w-4xl">
      <PageHeading eyebrow="Cadastro" title={title} description={description} />
      {message && (
        <Card className="mb-4 border-accent">
          <CardContent className="py-3 text-sm text-success" role="status">
            {message}
          </CardContent>
        </Card>
      )}
      <Card>
        <form onSubmit={onSubmit}>
          {children}
          <CardFooter className="flex justify-end gap-2">
            <Button asChild variant="secondary">
              <Link href={backHref}>Cancelar</Link>
            </Button>
            <Button disabled={pending}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export const valueOf = (form: FormData, name: string) =>
  typeof form.get(name) === "string" ? String(form.get(name)).trim() : "";
export const decimal = (value: string) =>
  Number(value.replace(/\./g, "").replace(",", "."));
export const currency = (value: string | number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(value),
  );

function State({ text }: { text: string }) {
  return (
    <CardContent className="py-12 text-center text-sm text-muted">
      {text}
    </CardContent>
  );
}
