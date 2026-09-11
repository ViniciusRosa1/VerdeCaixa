"use client";

import { StatusPill } from "@/components/shared-pages";
import { useDeactivateProject, useProjectList } from "@/lib/api/entity-hooks";
import {
  currency,
  DirectoryInitials,
  DirectoryListView,
  DirectoryPrimaryText,
  DirectoryRowActions,
} from "../common";

export function ProjetosList() {
  const query = useProjectList();
  const remove = useDeactivateProject();
  const rows = query.data?.data ?? [];

  return (
    <DirectoryListView
      title="Projetos"
      description="Resultados por iniciativa."
      createHref="/projetos/novo"
      createLabel="Novo projeto"
      rows={rows}
      getRowId={(row) => row.id}
      getSearchText={(row) =>
        [row.name, row.client?.name, row.status].filter(Boolean).join(" ")
      }
      gridTemplateColumns="40px minmax(0,1fr) 180px 120px 80px"
      columns={[
        {
          key: "initials",
          hideOnMobile: true,
          render: (row) => <DirectoryInitials name={row.name} />,
        },
        {
          key: "project",
          header: "Projeto",
          render: (row) => (
            <DirectoryPrimaryText
              title={row.name}
              subtitle={row.client?.name ?? "Sem cliente"}
            />
          ),
        },
        {
          key: "result",
          header: "Início e resultado",
          hideOnMobile: true,
          render: (row) => (
            <div>
              <p className="truncate text-xs text-muted">
                {new Date(row.startsOn).toLocaleDateString("pt-BR")}
              </p>
              <p className="font-semibold">{currency(row.result)}</p>
            </div>
          ),
        },
        {
          key: "status",
          header: "Situação",
          render: (row) => <StatusPill status={row.status} />,
        },
        {
          key: "actions",
          header: "Ações",
          align: "end",
          render: (row) => (
            <DirectoryRowActions
              id={row.id}
              title={row.name}
              editBase="/projetos"
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
