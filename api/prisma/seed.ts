import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;
const adminPassword = process.env.ADMIN_PASSWORD;
if (!connectionString) throw new Error('DATABASE_URL é obrigatória para executar o seed.');
if (!adminPassword) throw new Error('ADMIN_PASSWORD é obrigatória; nenhuma senha padrão é gravada no projeto.');
const configuredAdminPassword: string = adminPassword;

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const permissions = [
  ['company.view', 'Visualizar empresa'], ['company.manage', 'Editar empresa'],
  ['entries.view', 'Visualizar lançamentos'], ['entries.create', 'Criar lançamentos'], ['entries.edit', 'Editar lançamentos'], ['entries.settle', 'Liquidar lançamentos'], ['entries.cancel', 'Cancelar lançamentos'],
  ['directories.view', 'Visualizar cadastros'], ['directories.manage', 'Gerenciar cadastros'],
  ['projects.view', 'Visualizar projetos'], ['projects.manage', 'Gerenciar projetos'],
  ['reports.view', 'Visualizar relatórios'], ['reports.export', 'Exportar relatórios'],
  ['team.view', 'Visualizar equipe'], ['team.manage', 'Gerenciar equipe'],
  ['roles.view', 'Visualizar papéis'], ['roles.manage', 'Gerenciar papéis'], ['audit.view', 'Visualizar auditoria'],
] as const;

async function main() {
  const company = await prisma.company.upsert({
    where: { document: '42.018.336/0001-70' },
    update: {},
    create: { name: 'Lenke Consultoria', document: '42.018.336/0001-70', financialEmail: 'financeiro@lenke.com.br' },
  });
  for (const [code, description] of permissions) await prisma.permission.upsert({ where: { code }, update: { description }, create: { code, description } });
  const allPermissions = await prisma.permission.findMany();
  const adminRole = await prisma.role.upsert({
    where: { companyId_name: { companyId: company.id, name: 'Administrador' } },
    update: {},
    create: { companyId: company.id, publicCode: 'ROL-001', name: 'Administrador', description: 'Acesso total', isSystem: true, permissions: { create: allPermissions.map((item) => ({ permissionId: item.id })) } },
  });
  const viewCodes = ['company.view', 'entries.view', 'directories.view', 'projects.view', 'reports.view'];
  const viewPermissions = allPermissions.filter((item) => viewCodes.includes(item.code));
  await prisma.role.upsert({ where: { companyId_name: { companyId: company.id, name: 'Consulta' } }, update: {}, create: { companyId: company.id, publicCode: 'ROL-003', name: 'Consulta', description: 'Somente visualização', permissions: { create: viewPermissions.map((item) => ({ permissionId: item.id })) } } });
  const admin = await prisma.user.upsert({
    where: { email: (process.env.ADMIN_EMAIL ?? 'admin@verdecaixa.local').toLowerCase() },
    update: { passwordHash: await argon2.hash(configuredAdminPassword, { type: argon2.argon2id }) },
    create: { companyId: company.id, roleId: adminRole.id, name: process.env.ADMIN_NAME ?? 'Administrador', email: (process.env.ADMIN_EMAIL ?? 'admin@verdecaixa.local').toLowerCase(), passwordHash: await argon2.hash(configuredAdminPassword, { type: argon2.argon2id }) },
  });

  const counterparties = [
    ['CLI-001', 'CLIENT', 'Grupo Horizonte', '18.240.881/0001-42', 'financeiro@horizonte.com'],
    ['CLI-002', 'CLIENT', 'Clínica Bem Viver', '29.813.450/0001-03', 'contato@bemviver.com'],
    ['CLI-003', 'CLIENT', 'Aurora Alimentos', '04.103.225/0001-96', 'adm@aurora.com'],
    ['FOR-001', 'SUPPLIER', 'Edifício Central', '07.122.908/0001-75', 'cobranca@central.com'],
    ['FOR-002', 'SUPPLIER', 'Nuvem Brasil', '31.502.779/0001-61', 'financeiro@nuvembrasil.com'],
    ['FOR-003', 'SUPPLIER', 'Papel & Cia', '12.471.082/0001-10', 'vendas@papelecia.com'],
  ] as const;
  for (const [publicCode, kind, name, document, email] of counterparties) await prisma.counterparty.upsert({ where: { companyId_publicCode: { companyId: company.id, publicCode } }, update: {}, create: { companyId: company.id, publicCode, kind, name, document, email } });
  const clients = await prisma.counterparty.findMany({ where: { companyId: company.id, kind: 'CLIENT' }, orderBy: { publicCode: 'asc' } });
  const suppliers = await prisma.counterparty.findMany({ where: { companyId: company.id, kind: 'SUPPLIER' }, orderBy: { publicCode: 'asc' } });

  const categoryRows = [['CAT-001', 'Serviços', 'INCOME'], ['CAT-002', 'Consultoria', 'INCOME'], ['CAT-003', 'Treinamentos', 'INCOME'], ['CAT-004', 'Estrutura', 'EXPENSE'], ['CAT-005', 'Tecnologia', 'EXPENSE'], ['CAT-006', 'Administrativo', 'EXPENSE'], ['CAT-007', 'Marketing', 'EXPENSE']] as const;
  for (const [publicCode, name, kind] of categoryRows) await prisma.category.upsert({ where: { companyId_publicCode: { companyId: company.id, publicCode } }, update: {}, create: { companyId: company.id, publicCode, name, kind } });
  const categories = await prisma.category.findMany({ where: { companyId: company.id } });

  for (const [publicCode, name, institution, openingBalance] of [['CON-001', 'Conta principal', 'Banco Vereda', 84290.55], ['CON-002', 'Conta de recebimentos', 'Banco Horizonte', 28140.20], ['CON-003', 'Caixa pequeno', 'Interno', 1580]] as const) {
    await prisma.financialAccount.upsert({ where: { companyId_publicCode: { companyId: company.id, publicCode } }, update: {}, create: { companyId: company.id, publicCode, name, institution, type: institution === 'Interno' ? 'CASH' : 'BANK', openingBalance } });
  }
  const project = await prisma.project.upsert({ where: { companyId_publicCode: { companyId: company.id, publicCode: 'PRJ-001' } }, update: {}, create: { companyId: company.id, publicCode: 'PRJ-001', name: 'Expansão 2026', clientId: clients[0]!.id, startsOn: new Date('2026-01-01T00:00:00Z'), endsOn: new Date('2026-12-31T00:00:00Z') } });

  const entries = [
    ['REC-1042', 'INCOME', 'RECURRING', 'Mensalidade de assessoria', clients[0]!.id, 'Serviços', 12800, '2026-09-08'],
    ['REC-1038', 'INCOME', 'INSTALLMENT', 'Implantação financeira', clients[1]!.id, 'Consultoria', 7400, '2026-09-05'],
    ['PAG-0884', 'EXPENSE', 'RECURRING', 'Aluguel do escritório', suppliers[0]!.id, 'Estrutura', 6800, '2026-09-06'],
    ['PAG-0881', 'EXPENSE', 'RECURRING', 'Serviços de nuvem', suppliers[1]!.id, 'Tecnologia', 2180, '2026-09-04'],
  ] as const;
  for (const [publicCode, kind, plan, description, counterpartyId, categoryName, amount, due] of entries) {
    const category = categories.find((item) => item.name === categoryName)!;
    await prisma.financialEntry.upsert({
      where: { companyId_publicCode: { companyId: company.id, publicCode } }, update: {},
      create: { companyId: company.id, publicCode, createdById: admin.id, kind, plan, description, counterpartyId, categoryId: category.id, projectId: publicCode.includes('1042') || publicCode.includes('0881') ? project.id : undefined, totalAmount: amount, installments: { create: { sequence: 1, dueDate: new Date(`${due}T00:00:00Z`), amount } }, recurrence: plan === 'RECURRING' ? { create: { startsOn: new Date(`${due}T00:00:00Z`), generatedUntil: new Date(`${due}T00:00:00Z`) } } : undefined },
    });
  }
  for (const [entity, value] of [['INCOME', 1042], ['EXPENSE', 884], ['CLIENT', 3], ['SUPPLIER', 3], ['CATEGORY', 7], ['ACCOUNT', 3], ['PROJECT', 1], ['ROLE', 3], ['USER', 1]] as const) {
    await prisma.sequenceCounter.upsert({ where: { companyId_entity: { companyId: company.id, entity } }, update: { value }, create: { companyId: company.id, entity, value } });
  }
}

await main().finally(() => prisma.$disconnect());
