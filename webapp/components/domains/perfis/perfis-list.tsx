"use client";

import { StatusPill } from "@/components/shared-pages";
import { useDeactivateRole, useRoleList } from "@/lib/api/entity-hooks";
import {
  DirectoryInitials,
  DirectoryListView,
  DirectoryPrimaryText,
  DirectoryRowActions,
} from "../common";

export function PerfisList() {
  const query = useRoleList();
  const remove = useDeactivateRole();
  const rows = query.data?.data ?? [];

  return (
    <DirectoryListView
      title="Papéis e permissões"
      description="Conjuntos de acesso da equipe."
      createHref="/perfis/novo"
      createLabel="Novo papel"
      rows={rows}
      getRowId={(row) => row.id}
      getSearchText={(row) =>
        [row.name, row.description, `${row.users} usuários`]
          .filter(Boolean)
          .join(" ")
      }
      gridTemplateColumns="40px minmax(0,1fr) 160px 100px 80px"
      columns={[
        {
          key: "initials",
          hideOnMobile: true,
          render: (row) => <DirectoryInitials name={row.name} />,
        },
        {
          key: "role",
          header: "Papel",
          render: (row) => (
            <DirectoryPrimaryText title={row.name} subtitle={row.description} />
          ),
        },
        {
          key: "users",
          header: "Usuários",
          hideOnMobile: true,
          render: (row) => (
            <p className="text-xs text-muted">{row.users} usuário(s)</p>
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
              editBase="/perfis"
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
