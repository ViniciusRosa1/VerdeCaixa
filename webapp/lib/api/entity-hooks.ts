"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type {
  ApiAccount,
  ApiCategory,
  ApiCounterparty,
  ApiPermission,
  ApiProject,
  ApiRole,
  ApiUser,
  Page,
} from "./generated";

type CounterpartyInput = Pick<ApiCounterparty, "name"> &
  Partial<Pick<ApiCounterparty, "document" | "email" | "phone">>;
type CategoryInput = Pick<ApiCategory, "name" | "kind"> & { parentId?: string };
type AccountInput = Pick<ApiAccount, "name" | "institution" | "type"> & {
  openingBalance: number;
};
type ProjectInput = Pick<ApiProject, "name" | "startsOn"> &
  Partial<Pick<ApiProject, "clientId" | "endsOn" | "status">>;
type UserInput = {
  name?: string;
  email?: string;
  roleId: string;
  status?: ApiUser["status"];
};
type RoleInput = Pick<ApiRole, "name" | "permissions"> & {
  description?: string;
};

function list<T>(key: string, path: string) {
  return useQuery({
    queryKey: [key],
    queryFn: () => api<Page<T>>(`${path}?limit=100`),
  });
}
function detail<T>(key: string, path: string, id?: string) {
  return useQuery({
    queryKey: [key, id],
    queryFn: () => api<T>(`${path}/${id}`),
    enabled: Boolean(id),
  });
}
function save<T>(key: string, path: string, id?: string, createPath = path) {
  const query = useQueryClient();
  return useMutation({
    mutationFn: (body: T) =>
      api(id ? `${path}/${id}` : createPath, {
        method: id ? "PATCH" : "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: async () => {
      await query.invalidateQueries({ queryKey: [key] });
    },
  });
}
function deactivate(
  key: string,
  path: string,
  method: "DELETE" | "PATCH" = "DELETE",
) {
  const query = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api(`${path}/${id}`, {
        method,
        body:
          method === "PATCH"
            ? JSON.stringify({ status: "INACTIVE" })
            : undefined,
      }),
    onSuccess: async () => {
      await query.invalidateQueries({ queryKey: [key] });
    },
  });
}

export const useClientList = () => list<ApiCounterparty>("clients", "/clients");
export const useClient = (id?: string) =>
  detail<ApiCounterparty>("client", "/clients", id);
export const useSaveClient = (id?: string) =>
  save<CounterpartyInput>("clients", "/clients", id);
export const useDeactivateClient = () => deactivate("clients", "/clients");

export const useSupplierList = () =>
  list<ApiCounterparty>("suppliers", "/suppliers");
export const useSupplier = (id?: string) =>
  detail<ApiCounterparty>("supplier", "/suppliers", id);
export const useSaveSupplier = (id?: string) =>
  save<CounterpartyInput>("suppliers", "/suppliers", id);
export const useDeactivateSupplier = () =>
  deactivate("suppliers", "/suppliers");

export const useCategoryList = () =>
  list<ApiCategory>("categories", "/categories");
export const useCategory = (id?: string) =>
  detail<ApiCategory>("category", "/categories", id);
export const useSaveCategory = (id?: string) =>
  save<CategoryInput>("categories", "/categories", id);
export const useDeactivateCategory = () =>
  deactivate("categories", "/categories");

export const useAccountList = () =>
  list<ApiAccount>("accounts", "/financial-accounts");
export const useAccount = (id?: string) =>
  detail<ApiAccount>("account", "/financial-accounts", id);
export const useSaveAccount = (id?: string) =>
  save<AccountInput>("accounts", "/financial-accounts", id);
export const useDeactivateAccount = () =>
  deactivate("accounts", "/financial-accounts");

export const useProjectList = () => list<ApiProject>("projects", "/projects");
export const useProject = (id?: string) =>
  detail<ApiProject>("project", "/projects", id);
export const useSaveProject = (id?: string) =>
  save<ProjectInput>("projects", "/projects", id);
export const useDeactivateProject = () => deactivate("projects", "/projects");

export const useUserList = () => list<ApiUser>("users", "/users");
export const useUser = (id?: string) => detail<ApiUser>("user", "/users", id);
export const useSaveUser = (id?: string) =>
  save<UserInput>("users", "/users", id, "/users/invitations");
export const useDeactivateUser = () => deactivate("users", "/users", "PATCH");
export const useResendUserInvitation = () => {
  const query = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/users/invitations/${id}/resend`, { method: "POST" }),
    onSuccess: () => query.invalidateQueries({ queryKey: ["users"] }),
  });
};

export const useRoleList = () => list<ApiRole>("roles", "/roles");
export const useRole = (id?: string) => detail<ApiRole>("role", "/roles", id);
export const useSaveRole = (id?: string) =>
  save<RoleInput>("roles", "/roles", id);
export const useDeactivateRole = () => deactivate("roles", "/roles");
export const usePermissions = () =>
  useQuery({
    queryKey: ["permissions"],
    queryFn: () => api<ApiPermission[]>("/roles/permissions"),
  });
