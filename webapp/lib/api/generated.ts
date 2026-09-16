/**
 * Bootstrap contract. Regenerate from the running NestJS OpenAPI document with
 * `npm run api:types`; this file intentionally contains the shared wire shapes
 * needed by the client before the first database-backed generation.
 */
export interface ApiError {
  code: string;
  message: string;
  errors?: string[];
  statusCode: number;
  timestamp: string;
}
export interface Page<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; pages: number };
}
export interface ApiUser {
  id: string;
  userId?: string;
  name: string;
  email: string;
  roleId: string;
  status: "ACTIVE" | "INACTIVE" | "PENDING";
  role: ApiRole | string;
  membershipId?: string;
  mustChangePassword?: boolean;
  nextStep?: "CHANGE_PASSWORD" | "SELECT_COMPANY" | "READY";
  companies?: ApiMembership[];
  company?: ApiCompany;
}
export interface ApiMembership {
  id: string;
  companyId: string;
  company: ApiCompany;
  roleId: string;
  role: string;
}
export interface ApiRole {
  id: string;
  publicCode: string;
  name: string;
  description?: string;
  isSystem: boolean;
  permissions: string[];
  users: number;
}
export interface ApiPermission { id?: string; code: string; description: string }
export interface ApiCompany {
  id: string;
  name: string;
  document?: string;
  financialEmail?: string;
  currency: string;
  timezone: string;
  logoUrl?: string;
  reminderEnabled: boolean;
  reminderDaysBefore: number;
}
export interface ApiCounterparty {
  id: string;
  publicCode: string;
  kind: "CLIENT" | "SUPPLIER" | "BOTH";
  name: string;
  document?: string;
  email?: string;
  phone?: string;
  deactivatedAt?: string;
}
export interface ApiCategory {
  id: string;
  publicCode: string;
  name: string;
  kind: "INCOME" | "EXPENSE";
  parentId?: string;
  children?: ApiCategory[];
}
export interface ApiAccount {
  id: string;
  publicCode: string;
  name: string;
  institution: string;
  type:
    | "CONTA_CORRENTE"
    | "CONTA_POUPANCA"
    | "CONTA_SALARIO"
    | "CONTA_PAGAMENTO"
    | "CONTA_PJ";
  openingBalance: string;
  balance: string;
}
export interface ApiProject {
  id: string;
  publicCode: string;
  name: string;
  clientId?: string;
  client?: ApiCounterparty;
  startsOn: string;
  endsOn?: string;
  status: "IN_PROGRESS" | "COMPLETED" | "PAUSED";
  result: string;
}
export interface ApiInstallment {
  id: string;
  sequence: number;
  dueDate: string;
  amount: string;
  status: "PENDING" | "SETTLED" | "CANCELED";
  settlement?: { settledAt: string; amount: string };
}
export interface ApiEntry {
  id: string;
  publicCode: string;
  kind: "INCOME" | "EXPENSE";
  plan: "CASH" | "INSTALLMENT" | "RECURRING";
  description: string;
  totalAmount: string;
  status: "PENDING" | "OVERDUE" | "SETTLED" | "CANCELED";
  dueDate: string;
  counterparty: ApiCounterparty;
  category: ApiCategory;
  account?: ApiAccount | null;
  project?: ApiProject;
  installments: ApiInstallment[];
  notes?: string;
}
export interface DashboardData {
  balance: string;
  receivable: string;
  payable: string;
  projected: string;
  overdueCount: number;
  overdueAmount: string;
  recent: Array<{
    id: string;
    publicCode: string;
    kind: "INCOME" | "EXPENSE";
    description: string;
    counterparty: string;
    dueDate: string;
    amount: string;
    status: string;
  }>;
}
