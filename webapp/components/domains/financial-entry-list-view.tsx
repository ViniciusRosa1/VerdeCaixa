"use client";
import Link from "next/link";
import { Check, Pencil, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeading, StatusPill } from "@/components/shared-pages";
import { Card, CardContent } from "@/components/ui/card";
import { Button, Select, SelectItem } from "@/components/ui/controls";
import type { ApiEntry } from "@/lib/api/generated";
import { currency } from "./common";

export function FinancialEntryListView({
  title,
  description,
  createHref,
  createLabel,
  editBase,
  entries,
  loading,
  error,
  query,
  onQuery,
  status,
  onStatus,
  onSettle,
  onDelete,
}: {
  title: string;
  description: string;
  createHref: string;
  createLabel: string;
  editBase: string;
  entries: ApiEntry[];
  loading: boolean;
  error: boolean;
  query: string;
  onQuery(value: string): void;
  status: string;
  onStatus(value: string): void;
  onSettle(entry: ApiEntry): Promise<unknown>;
  onDelete(entry: ApiEntry): Promise<unknown>;
}) {
  const [actionError, setActionError] = useState("");
  async function action(callback: () => Promise<unknown>) {
    setActionError("");
    try {
      await callback();
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "Não foi possível concluir a operação.";
      setActionError(message);
      throw cause;
    }
  }
  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="Financeiro"
        title={title}
        description={description}
      />
      {actionError && (
        <Card className="mb-4 border-danger">
          <CardContent className="py-3 text-sm text-danger">
            {actionError}
          </CardContent>
        </Card>
      )}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Pesquisar</span>
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm"
              placeholder="Pesquisar..."
            />
          </label>
          <div className="w-full sm:w-48">
            <label className="sr-only" htmlFor="status">
              Situação
            </label>
            <Select
              name="status"
              value={status}
              onValueChange={onStatus}
              className="mt-0"
            >
              <SelectItem value="Todos">Todos</SelectItem>
              <SelectItem value="PENDING">Pendente</SelectItem>
              <SelectItem value="OVERDUE">Vencido</SelectItem>
              <SelectItem value="SETTLED">Liquidado</SelectItem>
            </Select>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link href={createHref}>{createLabel}</Link>
          </Button>
        </div>
        {loading ? (
          <State text="Carregando dados…" />
        ) : error ? (
          <State text="Não foi possível carregar os dados." />
        ) : entries.length ? (
          <div className="divide-y divide-border">
            <div className="hidden grid-cols-[minmax(0,1fr)_140px_140px_120px_112px] items-center gap-3 bg-surface px-4 py-3 text-xs font-semibold text-muted md:grid">
              <span>Lançamento</span>
              <span>Vencimento</span>
              <span>Categoria</span>
              <span>Situação / valor</span>
              <span className="text-right">Ações</span>
            </div>
            {entries.map((entry) => (
              <article
                key={entry.id}
                className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_140px_140px_120px_112px] md:items-center"
              >
                <div>
                  <p className="font-medium">{entry.description}</p>
                  <p className="text-xs text-muted">
                    {entry.publicCode} · {entry.counterparty.name} ·{" "}
                    {entry.account?.name ?? "Sem conta financeira"}
                  </p>
                </div>
                <span className="text-sm">
                  {new Date(entry.dueDate).toLocaleDateString("pt-BR")}
                </span>
                <span className="text-sm">{entry.category.name}</span>
                <div>
                  <StatusPill status={entry.status} />
                  <p className="mt-1 font-semibold">
                    {currency(entry.totalAmount)}
                  </p>
                </div>
                <div className="flex gap-1 md:justify-end">
                  <Link
                    href={`${editBase}/${entry.id}/editar`}
                    className="grid size-9 place-items-center rounded-lg border border-border"
                    aria-label="Editar"
                  >
                    <Pencil className="size-4" />
                  </Link>
                  {["PENDING", "OVERDUE"].includes(entry.status) && (
                    <>
                      <ConfirmDialog
                        title="Confirmar liquidação?"
                        description={
                          entry.account
                            ? `O valor será liquidado na conta ${entry.account.name}.`
                            : "Informe a conta financeira do lançamento antes de liquidar."
                        }
                        onConfirm={() => action(() => onSettle(entry))}
                        trigger={
                          <button
                            className="grid size-9 place-items-center rounded-lg border border-border text-brand"
                            aria-label="Liquidar"
                          >
                            <Check className="size-4" />
                          </button>
                        }
                      />
                      {!entry.installments.some(
                        (item) => item.status === "SETTLED",
                      ) && <ConfirmDialog
                        destructive
                        title="Excluir lançamento?"
                        description="O lançamento será cancelado e deixará de aparecer nas listagens."
                        confirmLabel="Excluir"
                        onConfirm={() => action(() => onDelete(entry))}
                        trigger={
                          <button
                            className="grid size-9 place-items-center rounded-lg border border-border text-danger"
                            aria-label="Excluir lançamento"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        }
                      />}
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <State text="Nenhum resultado encontrado" />
        )}
      </Card>
    </div>
  );
}
function State({ text }: { text: string }) {
  return (
    <CardContent className="py-12 text-center text-sm text-muted">
      {text}
    </CardContent>
  );
}
