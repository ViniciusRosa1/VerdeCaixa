"use client";

import { useState } from "react";
import { FinancialEntryListView } from "../financial-entry-list-view";
import {
  useAccounts,
  useCancelEntry,
  useEntries,
  useSettleEntry,
} from "@/lib/api/hooks";
import type { ApiEntry } from "@/lib/api/generated";

export function PagarList() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Todos");
  const result = useEntries("EXPENSE", query, status);
  const accounts = useAccounts();
  const settle = useSettleEntry();
  const cancel = useCancelEntry();
  async function settleEntry(entry: ApiEntry) {
    const accountId = accounts.data?.data[0]?.id;
    const installmentId = entry.installments.find(
      (item) => item.status === "PENDING",
    )?.id;
    if (!accountId)
      throw new Error("Cadastre uma conta financeira antes de liquidar.");
    if (!installmentId)
      throw new Error("Nenhuma parcela pendente foi encontrada.");
    return settle.mutateAsync({ accountId, installmentId });
  }
  return (
    <FinancialEntryListView
      title="Contas a pagar"
      description="Acompanhe compromissos e despesas liquidadas."
      createHref="/pagar/novo"
      createLabel="Nova despesa"
      editBase="/pagar"
      entries={result.data?.data ?? []}
      loading={result.isLoading}
      error={result.isError}
      query={query}
      onQuery={setQuery}
      status={status}
      onStatus={setStatus}
      accountName={accounts.data?.data[0]?.name}
      onSettle={settleEntry}
      onDelete={(entry) => cancel.mutateAsync(entry.id)}
    />
  );
}
