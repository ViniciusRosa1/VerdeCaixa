"use client";

import { StatusPill } from "@/components/shared-pages";
import {
  useDeactivateSupplier,
  useSupplierList,
} from "@/lib/api/entity-hooks";
import {
  DirectoryInitials,
  DirectoryListView,
  DirectoryPrimaryText,
  DirectoryRowActions,
} from "../common";

export function FornecedoresList() {
  const query = useSupplierList();
  const remove = useDeactivateSupplier();
  const rows = query.data?.data ?? [];

  return (
    <DirectoryListView
      title="Fornecedores"
      description="Fornecedores e prestadores ligados às despesas."
      createHref="/fornecedores/novo"
      createLabel="Novo fornecedor"
      rows={rows}
      getRowId={(row) => row.id}
      getSearchText={(row) =>
        [row.name, row.document, row.email].filter(Boolean).join(" ")
      }
      gridTemplateColumns="40px minmax(0,1fr) 224px 100px 80px"
      columns={[
        {
          key: "initials",
          hideOnMobile: true,
          render: (row) => <DirectoryInitials name={row.name} />,
        },
        {
          key: "identification",
          header: "Identificação",
          render: (row) => (
            <DirectoryPrimaryText title={row.name} subtitle={row.document} />
          ),
        },
        {
          key: "contact",
          header: "Contato",
          hideOnMobile: true,
          render: (row) => (
            <p className="truncate text-xs text-muted">{row.email}</p>
          ),
        },
        {
          key: "status",
          header: "Situação",
          render: (row) => (
            <StatusPill status={row.deactivatedAt ? "INACTIVE" : "ACTIVE"} />
          ),
        },
        {
          key: "actions",
          header: "Ações",
          align: "end",
          render: (row) => (
            <DirectoryRowActions
              id={row.id}
              title={row.name}
              editBase="/fornecedores"
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
