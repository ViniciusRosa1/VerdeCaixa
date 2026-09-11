-- Keep the global permission catalog available independently of the demo seed.
-- Fixed UUIDs make this migration deterministic; conflicts are resolved by code
-- so it is also safe when the seed populated the table first.
INSERT INTO "Permission" ("id", "code", "description")
VALUES
  ('10000000-0000-4000-8000-000000000001', 'company.view', 'Visualizar empresa'),
  ('10000000-0000-4000-8000-000000000002', 'company.manage', 'Editar empresa'),
  ('10000000-0000-4000-8000-000000000003', 'entries.view', 'Visualizar lançamentos'),
  ('10000000-0000-4000-8000-000000000004', 'entries.create', 'Criar lançamentos'),
  ('10000000-0000-4000-8000-000000000005', 'entries.edit', 'Editar lançamentos'),
  ('10000000-0000-4000-8000-000000000006', 'entries.settle', 'Liquidar lançamentos'),
  ('10000000-0000-4000-8000-000000000007', 'entries.cancel', 'Cancelar lançamentos'),
  ('10000000-0000-4000-8000-000000000008', 'directories.view', 'Visualizar cadastros'),
  ('10000000-0000-4000-8000-000000000009', 'directories.manage', 'Gerenciar cadastros'),
  ('10000000-0000-4000-8000-000000000010', 'projects.view', 'Visualizar projetos'),
  ('10000000-0000-4000-8000-000000000011', 'projects.manage', 'Gerenciar projetos'),
  ('10000000-0000-4000-8000-000000000012', 'reports.view', 'Visualizar relatórios'),
  ('10000000-0000-4000-8000-000000000013', 'reports.export', 'Exportar relatórios'),
  ('10000000-0000-4000-8000-000000000014', 'team.view', 'Visualizar equipe'),
  ('10000000-0000-4000-8000-000000000015', 'team.manage', 'Gerenciar equipe'),
  ('10000000-0000-4000-8000-000000000016', 'roles.view', 'Visualizar papéis'),
  ('10000000-0000-4000-8000-000000000017', 'roles.manage', 'Gerenciar papéis'),
  ('10000000-0000-4000-8000-000000000018', 'audit.view', 'Visualizar auditoria')
ON CONFLICT ("code") DO UPDATE
SET "description" = EXCLUDED."description";

-- Accounts registered before the catalog existed have an Administrator role
-- without RolePermission rows. Grant every catalog permission to those roles.
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" AS r
CROSS JOIN "Permission" AS p
WHERE r."isSystem" = true
  AND r."name" = 'Administrador'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
