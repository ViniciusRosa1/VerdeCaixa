"use client";

import { StatusPill } from "@/components/shared-pages";
import {
  useAccountList,
  useDeactivateAccount,
} from "@/lib/api/entity-hooks";
import {
  currency,
  DirectoryInitials,
  DirectoryListView,
  DirectoryPrimaryText,
  DirectoryRowActions,
} from "../common";

const accountTypeLabels: Record<string, string> = {
  CONTA_CORRENTE: "Conta corrente",
  CONTA_POUPANCA: "Conta poupança",
  CONTA_SALARIO: "Conta salário",
  CONTA_PAGAMENTO: "Conta de pagamento",
  CONTA_PJ: "Conta PJ",
};

export function ContasFinanceirasList() {
  const query = useAccountList();
  const remove = useDeactivateAccount();
  const rows = query.data?.data ?? [];

  return (
    <DirectoryListView
      title="Contas financeiras"
      description="Saldos disponíveis em bancos e caixas."
      createHref="/contas-financeiras/novo"
      createLabel="Nova conta"
      rows={rows}
      getRowId={(row) => row.id}
      getSearchText={(row) =>
        [row.name, row.institution, accountTypeLabels[row.type]].join(" ")
      }
      gridTemplateColumns="40px minmax(0,1fr) 180px 100px 80px"
      columns={[
        {
          key: "initials",
          hideOnMobile: true,
          render: (row) => <DirectoryInitials name={row.name} />,
        },
        {
          key: "account",
          header: "Conta",
          render: (row) => (
            <DirectoryPrimaryText
              title={row.name}
              subtitle={`${row.institution} · ${accountTypeLabels[row.type]}`}
            />
          ),
        },
        {
          key: "balance",
          header: "Saldo atual",
          hideOnMobile: true,
          render: (row) => (
            <p className="font-semibold">{currency(row.balance)}</p>
          ),
        },
        {
          key: "status",
          header: "Situação",
          render: () => <StatusPill status="ACTIVE" />,
        },
        {
          key: "actions",
          header: "Ações",
          align: "end",
          render: (row) => (
            <DirectoryRowActions
              id={row.id}
              title={row.name}
              editBase="/contas-financeiras"
              onDeactivate={(id) => remove.mutateAsync(id)}
            />
          ),
        },
      ]}
      loading={query.isLoading}
      error={query.isError}
    />
  );
}
