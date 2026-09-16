"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button, Field, Input, Select, SelectItem, Textarea } from "@/components/ui/controls";
import { PageHeading } from "@/components/shared-pages";
import { decimal, valueOf } from "../common";
import { useAccounts, useCategories, useEntry, useProjects, useSaveEntry, useSuppliers } from "@/lib/api/hooks";

export function PagarForm({ id }: { id?: string }) {
  const router = useRouter();
  const detail = useEntry(id);
  const save = useSaveEntry(id);
  const suppliers = useSuppliers();
  const categories = useCategories();
  const projects = useProjects();
  const accounts = useAccounts();
  const [plan, setPlan] = useState("CASH");
  const [message, setMessage] = useState("");
  if (id && detail.isLoading) return <p>Carregando despesa…</p>;
  const current = detail.data;
  const financialLocked = Boolean(current?.installments.some((item) => item.status === "SETTLED"));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const common = {
      description: valueOf(form, "description"),
      counterpartyId: valueOf(form, "counterpartyId"),
      categoryId: valueOf(form, "categoryId"),
      projectId: optional(form, "projectId"),
      notes: optional(form, "notes"),
    };
    const body = id
      ? {
          ...common,
          ...(!financialLocked ? {
            accountId: valueOf(form, "accountId"),
            totalAmount: decimal(valueOf(form, "totalAmount")),
            dueDate: valueOf(form, "dueDate"),
          } : {}),
        }
      : {
          ...common,
          kind: "EXPENSE",
          plan,
          accountId: valueOf(form, "accountId"),
          totalAmount: decimal(valueOf(form, "totalAmount")),
          dueDate: valueOf(form, "dueDate"),
          installmentCount: plan === "INSTALLMENT" ? Number(valueOf(form, "installmentCount")) : undefined,
          recurrenceEndsOn: plan === "RECURRING" ? optional(form, "recurrenceEndsOn") : undefined,
        };
    try {
      await save.mutateAsync(body);
      router.push("/pagar");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar.");
    }
  }

  return <div className="page-enter mx-auto max-w-4xl">
    <PageHeading eyebrow="Financeiro" title={id ? "Editar despesa" : "Nova despesa"} description="Registre os compromissos e despesas da empresa." />
    {message && <p role="alert" className="mb-4 rounded-xl bg-surface p-3 text-sm text-danger">{message}</p>}
    {financialLocked && <p className="mb-4 rounded-xl border border-border bg-surface p-3 text-sm text-muted">Valor, vencimento e conta financeira não podem ser alterados porque este lançamento já possui uma parcela liquidada.</p>}
    <form onSubmit={submit} className="space-y-4">
      <Card><CardContent className="grid gap-5 sm:grid-cols-2">
        <Field label="Descrição" htmlFor="description"><Input id="description" name="description" required defaultValue={current?.description} /></Field>
        <Field label="Valor total" htmlFor="totalAmount"><Input id="totalAmount" name="totalAmount" inputMode="decimal" required={!financialLocked} disabled={financialLocked} defaultValue={current?.totalAmount} /></Field>
        <Field label="Fornecedor" htmlFor="counterpartyId"><Select name="counterpartyId" required defaultValue={current?.counterparty.id}>{(suppliers.data?.data ?? []).map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</Select></Field>
        <Field label="Categoria" htmlFor="categoryId"><Select name="categoryId" required defaultValue={current?.category.id}>{(categories.data?.data ?? []).filter((item) => item.kind === "EXPENSE").map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</Select></Field>
        <Field label="Conta financeira" htmlFor="accountId"><Select name="accountId" required={!financialLocked} disabled={financialLocked} defaultValue={current?.account?.id} placeholder={financialLocked && !current?.account ? "Sem conta vinculada" : "Selecione"}>{(accounts.data?.data ?? []).map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</Select></Field>
        <Field label="Projeto" htmlFor="projectId"><Select name="projectId" defaultValue={current?.project?.id ?? "none"}><SelectItem value="none">Sem projeto</SelectItem>{(projects.data?.data ?? []).map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</Select></Field>
        <Field label="Vencimento" htmlFor="dueDate"><Input id="dueDate" name="dueDate" type="date" required={!financialLocked} disabled={financialLocked} defaultValue={current?.dueDate?.slice(0, 10)} /></Field>
      </CardContent></Card>
      {!id && <Card><CardContent className="grid gap-5 sm:grid-cols-2">
        <Field label="Forma do lançamento" htmlFor="plan"><Select name="plan" value={plan} onValueChange={setPlan}><SelectItem value="CASH">À vista</SelectItem><SelectItem value="INSTALLMENT">Parcelado</SelectItem><SelectItem value="RECURRING">Recorrente</SelectItem></Select></Field>
        {plan === "INSTALLMENT" && <Field label="Quantidade de parcelas" htmlFor="installmentCount"><Input id="installmentCount" name="installmentCount" type="number" min="2" max="120" defaultValue="3" /></Field>}
        {plan === "RECURRING" && <Field label="Término opcional" htmlFor="recurrenceEndsOn"><Input id="recurrenceEndsOn" name="recurrenceEndsOn" type="date" /></Field>}
      </CardContent></Card>}
      <Card><CardContent><Field label="Observações" htmlFor="notes"><Textarea id="notes" name="notes" defaultValue={current?.notes} /></Field></CardContent><CardFooter className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => router.push("/pagar")}>Cancelar</Button><Button disabled={save.isPending}>{save.isPending ? "Salvando…" : "Salvar despesa"}</Button></CardFooter></Card>
    </form>
  </div>;
}

function optional(form: FormData, name: string) {
  const value = valueOf(form, name);
  return value && value !== "none" ? value : undefined;
}
