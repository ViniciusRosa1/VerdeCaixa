"use client";

import { StatusPill } from "@/components/shared-pages";
import {
  useCategoryList,
  useDeactivateCategory,
} from "@/lib/api/entity-hooks";
import {
  DirectoryInitials,
  DirectoryListView,
  DirectoryPrimaryText,
  DirectoryRowActions,
} from "../common";

export function CategoriasList() {
  const query = useCategoryList();
  const remove = useDeactivateCategory();
  const rows = query.data?.data ?? [];

  return (
    <DirectoryListView
      title="Categorias"
      description="Classificação dos lançamentos financeiros."
      createHref="/categorias/novo"
      createLabel="Nova categoria"
      rows={rows}
      getRowId={(row) => row.id}
      getSearchText={(row) =>
        [
          row.name,
          row.kind === "INCOME" ? "Receita" : "Despesa",
          `${row.children?.length ?? 0} subcategorias`,
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
          key: "category",
          header: "Categoria",
          render: (row) => (
            <DirectoryPrimaryText
              title={row.name}
              subtitle={row.kind === "INCOME" ? "Receita" : "Despesa"}
            />
          ),
        },
        {
          key: "subcategories",
          header: "Subcategorias",
          hideOnMobile: true,
          render: (row) => (
            <p className="text-xs text-muted">
              {row.children?.length ?? 0} subcategorias
            </p>
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
              editBase="/categorias"
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
