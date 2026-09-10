"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { ArrowLeft, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, ApiClientError } from "@/lib/api/client";
import {
  useCategories,
  useClients,
  useCompany,
  useDirectory,
  useEntry,
  useProjects,
  useSaveDirectory,
  useSaveEntry,
  useSuppliers,
} from "@/lib/api/hooks";
import { PageHeading } from "./shared-pages";

const inputClass =
  "mt-1.5 h-11 w-full rounded-xl border border-[#CBD9C4] bg-white px-3 text-sm text-[#1F2A1E] outline-none focus:border-[#8AAE6D]";
const labelClass = "block text-xs font-semibold text-[#4F5E4D]";
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className={labelClass}>
      {label}
      {children}
    </label>
  );
}
function useEditId(editing: boolean) {
  return useSyncExternalStore(
    () => () => undefined,
    () =>
      editing ? new URLSearchParams(window.location.search).get("id") : null,
    () => null,
  );
}
const valueOf = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
};
const decimal = (value: string) =>
  Number(value.replace(/\./g, "").replace(",", "."));

export function FinancialForm({
  kind,
  editing = false,
}: {
  kind: "receber" | "pagar";
  editing?: boolean;
}) {
  const router = useRouter();
  const id = useEditId(editing);
  const current = useEntry(id);
  const save = useSaveEntry(id);
  const [planChoice, setPlan] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const clients = useClients();
  const suppliers = useSuppliers();
  const counterparties = kind === "receber" ? clients : suppliers;
  const categories = useCategories();
  const projects = useProjects();
  const plan = planChoice ?? current.data?.plan ?? "CASH";
  const submit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    const form = new FormData(event.currentTarget);
    const body = editing
      ? {
          description: valueOf(form, "description"),
          counterpartyId: valueOf(form, "counterpartyId"),
          categoryId: valueOf(form, "categoryId"),
          projectId: valueOf(form, "projectId") || undefined,
          notes: valueOf(form, "notes") || undefined,
        }
      : {
          kind: kind === "receber" ? "INCOME" : "EXPENSE",
          plan,
          description: valueOf(form, "description"),
          counterpartyId: valueOf(form, "counterpartyId"),
          categoryId: valueOf(form, "categoryId"),
          projectId: valueOf(form, "projectId") || undefined,
          totalAmount: decimal(valueOf(form, "totalAmount")),
          dueDate: valueOf(form, "dueDate"),
          installmentCount:
            plan === "INSTALLMENT"
              ? Number(valueOf(form, "installmentCount"))
              : undefined,
          recurrenceEndsOn:
            plan === "RECURRING"
              ? valueOf(form, "recurrenceEndsOn") || undefined
              : undefined,
          notes: valueOf(form, "notes") || undefined,
        };
    try {
      await save.mutateAsync(body);
      setMessage("Lançamento salvo com sucesso.");
      setTimeout(() => router.push(`/${kind}`), 500);
    } catch (error) {
      setMessage(
        error instanceof ApiClientError
          ? error.message
          : "Não foi possível salvar o lançamento.",
      );
    }
  };
  const entry = current.data;
  const categoryRows = (categories.data?.data ?? []).filter(
    (row) => row.kind === (kind === "receber" ? "INCOME" : "EXPENSE"),
  );
  return (
    <div className="page-enter mx-auto max-w-5xl">
      <Link
        href={`/${kind}`}
        className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-[#60705E]"
      >
        <ArrowLeft className="size-4" />
        Voltar para a listagem
      </Link>
      <PageHeading
        eyebrow="Lançamento"
        title={`${editing ? "Editar" : "Nova"} ${kind === "receber" ? "receita" : "despesa"}`}
        description="Informe os dados do compromisso financeiro."
      />
      {message && (
        <div
          className={`mb-4 rounded-xl px-4 py-3 text-sm ${save.isError ? "bg-[#F7EDEA] text-[#A14E42]" : "bg-[#E8F1E1] text-[#356333]"}`}
        >
          {message}
        </div>
      )}
      {editing && current.isLoading ? (
        <Loading />
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <section className="app-card p-5 sm:p-6">
            <h3 className="text-sm font-semibold">Informações do lançamento</h3>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Descrição">
                  <input
                    name="description"
                    className={inputClass}
                    required
                    defaultValue={entry?.description}
                  />
                </Field>
              </div>
              <Field label={kind === "receber" ? "Cliente" : "Fornecedor"}>
                <select
                  name="counterpartyId"
                  className={inputClass}
                  required
                  defaultValue={entry?.counterparty.id}
                >
                  <option value="">Selecione</option>
                  {counterparties.data?.data.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                    </option>
                  ))}
                </select>
              </Field>
              {!editing && (
                <Field label="Valor">
                  <input
                    name="totalAmount"
                    inputMode="decimal"
                    className={inputClass}
                    required
                    placeholder="0,00"
                  />
                </Field>
              )}
              <Field label="Categoria">
                <select
                  name="categoryId"
                  className={inputClass}
                  required
                  defaultValue={entry?.category.id}
                >
                  <option value="">Selecione</option>
                  {categoryRows.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Projeto">
                <select
                  name="projectId"
                  className={inputClass}
                  defaultValue={entry?.project?.id}
                >
                  <option value="">Sem projeto</option>
                  {projects.data?.data.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                    </option>
                  ))}
                </select>
              </Field>
              {!editing && (
                <Field label="Primeiro vencimento">
                  <input
                    name="dueDate"
                    type="date"
                    className={inputClass}
                    required
                  />
                </Field>
              )}
            </div>
          </section>
          {!editing && (
            <section className="app-card p-5 sm:p-6">
              <h3 className="text-sm font-semibold">Forma do lançamento</h3>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  ["CASH", "À vista"],
                  ["INSTALLMENT", "Parcelado"],
                  ["RECURRING", "Recorrente"],
                ].map(([value, label]) => (
                  <label
                    key={value}
                    className={`cursor-pointer rounded-2xl border p-4 ${plan === value ? "border-[#8AAE6D] bg-[#F2F7EE]" : ""}`}
                  >
                    <input
                      className="sr-only"
                      type="radio"
                      value={value}
                      checked={plan === value}
                      onChange={() => setPlan(value)}
                    />
                    <span className="text-sm font-semibold">{label}</span>
                  </label>
                ))}
              </div>
              {plan === "INSTALLMENT" && (
                <Field label="Quantidade de parcelas">
                  <input
                    name="installmentCount"
                    type="number"
                    min="2"
                    max="120"
                    defaultValue="3"
                    className={inputClass}
                  />
                </Field>
              )}
              {plan === "RECURRING" && (
                <Field label="Término opcional">
                  <input
                    name="recurrenceEndsOn"
                    type="date"
                    className={inputClass}
                  />
                </Field>
              )}
            </section>
          )}
          <section className="app-card p-5 sm:p-6">
            <Field label="Observações">
              <textarea
                name="notes"
                className={`${inputClass} min-h-24 py-3`}
                defaultValue={entry?.notes}
              />
            </Field>
          </section>
          <div className="flex justify-end gap-2">
            <Link
              href={`/${kind}`}
              className="inline-flex h-11 items-center rounded-xl border px-5 text-sm font-semibold"
            >
              Cancelar
            </Link>
            <button
              disabled={save.isPending}
              className="h-11 rounded-xl bg-[#3E5A3C] px-6 text-sm font-semibold text-white disabled:opacity-60"
            >
              {save.isPending ? "Salvando…" : "Salvar lançamento"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

const formMeta: Record<string, { singular: string; back: string }> = {
  clientes: { singular: "cliente", back: "/clientes" },
  fornecedores: { singular: "fornecedor", back: "/fornecedores" },
  categorias: { singular: "categoria", back: "/categorias" },
  "contas-financeiras": {
    singular: "conta financeira",
    back: "/contas-financeiras",
  },
  projetos: { singular: "projeto", back: "/projetos" },
  equipe: { singular: "pessoa", back: "/equipe" },
  perfis: { singular: "papel", back: "/perfis" },
};

export function DirectoryForm({
  kind,
  editing = false,
}: {
  kind: keyof typeof formMeta;
  editing?: boolean;
}) {
  const router = useRouter();
  const id = useEditId(editing);
  const list = useDirectory(kind);
  const save = useSaveDirectory(kind, id);
  const meta = formMeta[kind];
  const [message, setMessage] = useState("");
  const current = list.data?.data.find((row) => row.id === id);
  const clients = useClients();
  const roles = useDirectory("perfis");
  const permissions = useQuery({
    queryKey: ["permissions"],
    queryFn: () =>
      api<Array<{ code: string; description: string }>>("/roles/permissions"),
    enabled: kind === "perfis",
  });
  const submit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    let body: Record<string, unknown>;
    if (kind === "clientes" || kind === "fornecedores")
      body = {
        name: valueOf(form, "name"),
        document: valueOf(form, "document") || undefined,
        email: valueOf(form, "email") || undefined,
        phone: valueOf(form, "phone") || undefined,
      };
    else if (kind === "categorias")
      body = { name: valueOf(form, "name"), kind: valueOf(form, "kind") };
    else if (kind === "contas-financeiras")
      body = {
        name: valueOf(form, "name"),
        institution: valueOf(form, "institution"),
        type: valueOf(form, "type"),
        openingBalance: decimal(valueOf(form, "openingBalance")),
      };
    else if (kind === "projetos")
      body = {
        name: valueOf(form, "name"),
        clientId: valueOf(form, "clientId") || undefined,
        startsOn: valueOf(form, "startsOn"),
        endsOn: valueOf(form, "endsOn") || undefined,
        status: valueOf(form, "status") || undefined,
      };
    else if (kind === "equipe")
      body = editing
        ? {
            name: valueOf(form, "name"),
            roleId: valueOf(form, "roleId"),
            status: valueOf(form, "status"),
          }
        : {
            name: valueOf(form, "name"),
            email: valueOf(form, "email"),
            roleId: valueOf(form, "roleId"),
          };
    else
      body = {
        name: valueOf(form, "name"),
        description: valueOf(form, "description") || undefined,
        permissions: form.getAll("permissions").map(String),
      };
    try {
      await save.mutateAsync(body);
      setMessage("Cadastro salvo com sucesso.");
      setTimeout(() => router.push(meta.back), 500);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Não foi possível salvar.",
      );
    }
  };
  return (
    <div className="page-enter mx-auto max-w-4xl">
      <Link
        href={meta.back}
        className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-[#60705E]"
      >
        <ArrowLeft className="size-4" />
        Voltar para a listagem
      </Link>
      <PageHeading
        eyebrow="Cadastro"
        title={`${editing ? "Editar" : "Novo"} ${meta.singular}`}
        description="Mantenha os dados essenciais organizados."
      />
      {message && (
        <div className="mb-4 rounded-xl bg-[#E8F1E1] px-4 py-3 text-sm text-[#356333]">
          {message}
        </div>
      )}
      <form onSubmit={submit} className="app-card p-5 sm:p-7">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={kind === "equipe" ? "Nome completo" : "Nome"}>
            <input
              name="name"
              required
              className={inputClass}
              defaultValue={current?.name}
            />
          </Field>
          {(kind === "clientes" || kind === "fornecedores") && (
            <>
              <Field label="CPF ou CNPJ">
                <input
                  name="document"
                  className={inputClass}
                  defaultValue={current?.document}
                />
              </Field>
              <Field label="E-mail">
                <input
                  name="email"
                  type="email"
                  className={inputClass}
                  defaultValue={current?.email}
                />
              </Field>
              <Field label="Telefone">
                <input
                  name="phone"
                  className={inputClass}
                  defaultValue={current?.phone}
                />
              </Field>
            </>
          )}
          {kind === "categorias" && (
            <Field label="Tipo">
              <select
                name="kind"
                className={inputClass}
                defaultValue={current?.kind}
              >
                <option value="INCOME">Receita</option>
                <option value="EXPENSE">Despesa</option>
              </select>
            </Field>
          )}
          {kind === "contas-financeiras" && (
            <>
              <Field label="Instituição">
                <input
                  name="institution"
                  required
                  className={inputClass}
                  defaultValue={current?.institution}
                />
              </Field>
              <Field label="Tipo">
                <select
                  name="type"
                  className={inputClass}
                  defaultValue={current?.type}
                >
                  <option value="CONTA_CORRENTE">Conta corrente</option>
                  <option value="CONTA_POUPANCA">Conta poupança</option>
                  <option value="CONTA_SALARIO">Conta salário</option>
                  <option value="CONTA_PAGAMENTO">Conta de pagamento</option>
                  <option value="CONTA_PJ">Conta PJ</option>
                </select>
              </Field>
              <Field label="Saldo inicial">
                <input
                  name="openingBalance"
                  required
                  className={inputClass}
                  defaultValue={current?.openingBalance}
                />
              </Field>
            </>
          )}
          {kind === "projetos" && (
            <>
              <Field label="Cliente">
                <select
                  name="clientId"
                  className={inputClass}
                  defaultValue={current?.clientId}
                >
                  <option value="">Sem cliente</option>
                  {clients.data?.data.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Data inicial">
                <input
                  name="startsOn"
                  type="date"
                  required
                  className={inputClass}
                  defaultValue={current?.startsOn?.slice(0, 10)}
                />
              </Field>
              <Field label="Data final">
                <input
                  name="endsOn"
                  type="date"
                  className={inputClass}
                  defaultValue={current?.endsOn?.slice(0, 10)}
                />
              </Field>
              <Field label="Situação">
                <select
                  name="status"
                  className={inputClass}
                  defaultValue={current?.status}
                >
                  <option value="IN_PROGRESS">Em andamento</option>
                  <option value="COMPLETED">Concluído</option>
                  <option value="PAUSED">Pausado</option>
                </select>
              </Field>
            </>
          )}
          {kind === "equipe" && (
            <>
              <Field label="E-mail">
                <input
                  name="email"
                  type="email"
                  required={!editing}
                  disabled={editing}
                  className={inputClass}
                  defaultValue={current?.email}
                />
              </Field>
              <Field label="Papel">
                <select
                  name="roleId"
                  required
                  className={inputClass}
                  defaultValue={current?.roleId}
                >
                  {roles.data?.data.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </Field>
              {editing && (
                <Field label="Situação">
                  <select
                    name="status"
                    className={inputClass}
                    defaultValue={current?.status}
                  >
                    <option value="ACTIVE">Ativo</option>
                    <option value="INACTIVE">Inativo</option>
                  </select>
                </Field>
              )}
            </>
          )}
          {kind === "perfis" && (
            <>
              <Field label="Descrição">
                <input
                  name="description"
                  className={inputClass}
                  defaultValue={current?.description}
                />
              </Field>
              <div className="sm:col-span-2">
                <p className={labelClass}>Permissões</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {permissions.data?.map((p) => (
                    <label
                      key={p.code}
                      className="flex gap-2 rounded-lg border p-3 text-xs"
                    >
                      <input
                        type="checkbox"
                        name="permissions"
                        value={p.code}
                        defaultChecked={current?.permissions?.includes(p.code)}
                      />
                      {p.description}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        <div className="mt-7 flex justify-end gap-2 border-t pt-5">
          <Link
            href={meta.back}
            className="inline-flex h-11 items-center rounded-xl border px-5 text-sm font-semibold"
          >
            Cancelar
          </Link>
          <button
            disabled={save.isPending}
            className="h-11 rounded-xl bg-[#3E5A3C] px-6 text-sm font-semibold text-white"
          >
            {save.isPending ? "Salvando…" : "Salvar cadastro"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function SettingsPage() {
  const company = useCompany();
  const [message, setMessage] = useState("");
  const submit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await api("/company", {
        method: "PATCH",
        body: JSON.stringify({
          name: valueOf(f, "name"),
          document: valueOf(f, "document") || undefined,
          financialEmail: valueOf(f, "financialEmail") || undefined,
          logoUrl: valueOf(f, "logoUrl") || undefined,
          currency: "BRL",
          timezone: "America/Sao_Paulo",
          reminderEnabled: f.get("reminderEnabled") === "on",
          reminderDaysBefore: Number(valueOf(f, "reminderDaysBefore")),
        }),
      });
      setMessage("Configurações salvas.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Não foi possível salvar.",
      );
    }
  };
  if (company.isLoading) return <Loading />;
  const c = company.data;
  return (
    <div className="page-enter mx-auto max-w-5xl">
      <PageHeading
        eyebrow="Empresa"
        title="Configurações"
        description="Personalize a empresa e seus lembretes."
      />
      {message && (
        <div className="mb-4 rounded-xl bg-[#E8F1E1] p-3 text-sm">
          {message}
        </div>
      )}
      <form onSubmit={submit} className="app-card p-5 sm:p-7">
        <h3 className="text-base font-semibold">Identidade da empresa</h3>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Nome">
              <input
                name="name"
                required
                className={inputClass}
                defaultValue={c?.name}
              />
            </Field>
          </div>
          <Field label="CNPJ">
            <input
              name="document"
              className={inputClass}
              defaultValue={c?.document}
            />
          </Field>
          <Field label="E-mail financeiro">
            <input
              name="financialEmail"
              type="email"
              className={inputClass}
              defaultValue={c?.financialEmail}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="URL da logomarca">
              <input
                name="logoUrl"
                type="url"
                className={inputClass}
                defaultValue={c?.logoUrl}
              />
            </Field>
          </div>
          <Field label="Dias de antecedência">
            <input
              name="reminderDaysBefore"
              type="number"
              min="0"
              max="90"
              className={inputClass}
              defaultValue={c?.reminderDaysBefore}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              name="reminderEnabled"
              type="checkbox"
              defaultChecked={c?.reminderEnabled}
            />
            Enviar lembretes
          </label>
        </div>
        <div className="mt-6 flex gap-3 rounded-xl bg-[#F6FAF3] p-4">
          <Info className="size-4 text-[#3E5A3C]" />
          <p className="text-xs text-[#60705E]">
            A URL da logomarca será usada no cabeçalho e nos relatórios.
          </p>
        </div>
        <div className="mt-7 flex justify-end border-t pt-5">
          <button className="h-11 rounded-xl bg-[#3E5A3C] px-6 text-sm font-semibold text-white">
            Salvar alterações
          </button>
        </div>
      </form>
    </div>
  );
}

function Loading() {
  return (
    <div className="p-12 text-center text-sm text-[#60705E]">Carregando…</div>
  );
}
