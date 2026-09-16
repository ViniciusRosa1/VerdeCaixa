"use client";

import { useState } from "react";
import { FinancialEntryListView } from "../financial-entry-list-view";
import { useCancelEntry, useEntries, useSettleEntry } from "@/lib/api/hooks";
import type { ApiEntry } from "@/lib/api/generated";

export function ReceberList() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Todos");
  const result = useEntries("INCOME", query, status);
  const settle = useSettleEntry();
  const cancel = useCancelEntry();
  async function settleEntry(entry: ApiEntry) {
    const accountId = entry.account?.id;
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
      title="Contas a receber"
      description="Controle os valores que sua empresa tem a receber."
      createHref="/receber/novo"
      createLabel="Nova receita"
      editBase="/receber"
      entries={result.data?.data ?? []}
      loading={result.isLoading}
      error={result.isError}
      query={query}
      onQuery={setQuery}
      status={status}
      onStatus={setStatus}
      onSettle={settleEntry}
      onDelete={(entry) => cancel.mutateAsync(entry.id)}
    />
  );
}
