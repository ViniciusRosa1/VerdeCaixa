"use client";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, ChevronRight, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";

const statusLabel: Record<string, string> = {
  PENDING: "Pendente",
  OVERDUE: "Vencido",
  SETTLED: "Liquidado",
  CANCELED: "Cancelado",
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
  PAUSED: "Pausado",
};
export function PageHeading({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[.12em] text-accent">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em]">
          {title}
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm text-muted">{description}</p>
      </div>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white"
        >
          <Plus className="size-4" />
          {actionLabel}
        </Link>
      )}
    </header>
  );
}
export function StatusPill({ status }: { status: string }) {
  const label = statusLabel[status] ?? status;
  const tone = ["Liquidado", "Ativo", "Concluído"].includes(label)
    ? "bg-[#E7F1DF] text-success"
    : ["Vencido", "Inativo", "Cancelado"].includes(label)
      ? "bg-[#F7EDEA] text-danger"
      : label === "Em andamento"
        ? "bg-[#E8F0F4] text-[#356278]"
        : "bg-[#F4F0DF] text-[#806B25]";
  return (
    <span
      className={`inline-flex h-6 w-fit shrink-0 items-center whitespace-nowrap rounded-full px-2.5 text-[11px] font-semibold ${tone}`}
    >
      {label}
    </span>
  );
}

type AgendaItem = {
  id: string;
  kind: "INCOME" | "EXPENSE";
  description: string;
  counterparty: string;
  category: string;
  dueDate: string;
  amount: string;
};
type AgendaData = {
  overdue: AgendaItem[];
  today: AgendaItem[];
  upcoming: AgendaItem[];
};
export function AgendaPage() {
  const result = useQuery({
    queryKey: ["agenda"],
    queryFn: () => api<AgendaData>("/agenda"),
  });
  if (result.isLoading) return <State text="Carregando agenda…" />;
  if (result.isError || !result.data)
    return <State text="Não foi possível carregar a agenda." />;
  const groups: Array<[string, AgendaItem[]]> = [
    ["Vencidos", result.data.overdue],
    ["Hoje", result.data.today],
    ["Próximos 7 dias", result.data.upcoming],
  ];
  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="Planejamento"
        title="Agenda financeira"
        description="Veja o que precisa da sua atenção e planeje os próximos dias."
      />
      <div className="space-y-5">
        {groups.map(([title, items]) => (
          <section key={title}>
            <div className="mb-2.5 flex items-center gap-2">
              <h3 className="text-sm font-semibold">{title}</h3>
              <span className="text-xs text-muted">{items.length}</span>
            </div>
            <Card className="divide-y divide-border">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-4">
                  <span
                    className={`grid size-10 place-items-center rounded-xl ${item.kind === "INCOME" ? "bg-surface text-brand" : "bg-[#F4ECE8] text-danger"}`}
                  >
                    {item.kind === "INCOME" ? (
                      <ArrowUpRight className="size-4" />
                    ) : (
                      <ArrowDownRight className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {item.description}
                    </p>
                    <p className="text-xs text-muted">
                      {item.counterparty} · {item.category}
                    </p>
                  </div>
                  <span className="hidden text-xs sm:block">
                    {new Date(item.dueDate).toLocaleDateString("pt-BR")}
                  </span>
                  <strong className="text-sm">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(Number(item.amount))}
                  </strong>
                  <ChevronRight className="size-4" />
                </div>
              ))}
              {!items.length && (
                <CardContent className="text-center text-sm text-muted">
                  Nenhum lançamento
                </CardContent>
              )}
            </Card>
          </section>
        ))}
      </div>
    </div>
  );
}
function State({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="py-12 text-center text-sm text-muted">
        {text}
      </CardContent>
    </Card>
  );
}
