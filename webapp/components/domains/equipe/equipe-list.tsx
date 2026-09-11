"use client";

import { StatusPill } from "@/components/shared-pages";
import { useDeactivateUser, useUserList } from "@/lib/api/entity-hooks";
import {
  DirectoryInitials,
  DirectoryListView,
  DirectoryPrimaryText,
  DirectoryRowActions,
} from "../common";

export function EquipeList() {
  const query = useUserList();
  const remove = useDeactivateUser();
  const rows = query.data?.data ?? [];

  return (
    <DirectoryListView
      title="Equipe"
      description="Pessoas com acesso ao financeiro."
      createHref="/equipe/novo"
      createLabel="Convidar pessoa"
      rows={rows}
      getRowId={(row) => row.id}
      getSearchText={(row) =>
        [
          row.name,
          row.email,
          typeof row.role === "string" ? row.role : row.role.name,
          row.status,
        ].join(" ")
      }
      gridTemplateColumns="40px minmax(0,1fr) 180px 100px 80px"
      columns={[
        {
          key: "initials",
          hideOnMobile: true,
          render: (row) => <DirectoryInitials name={row.name} />,
        },
        {
          key: "person",
          header: "Pessoa",
          render: (row) => (
            <DirectoryPrimaryText title={row.name} subtitle={row.email} />
          ),
        },
        {
          key: "role",
          header: "Perfil",
          hideOnMobile: true,
          render: (row) => (
            <p className="truncate text-xs text-muted">
              {typeof row.role === "string" ? row.role : row.role.name}
            </p>
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
              editBase="/equipe"
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
