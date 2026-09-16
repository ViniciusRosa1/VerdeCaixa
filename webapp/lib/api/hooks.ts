"use client";
/* oxlint-disable typescript/no-explicit-any */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type {
  ApiAccount,
  ApiCategory,
  ApiCompany,
  ApiCounterparty,
  ApiEntry,
  ApiProject,
  ApiUser,
  DashboardData,
  Page,
} from "./generated";

export const useDashboard = (accountId = "") =>
  useQuery({
    queryKey: ["dashboard", accountId],
    queryFn: () =>
      api<DashboardData>(
        `/dashboard${accountId ? `?accountId=${encodeURIComponent(accountId)}` : ""}`,
      ),
  });
export const useEntries = (
  kind: "INCOME" | "EXPENSE",
  search = "",
  status = "",
) =>
  useQuery({
    queryKey: ["entries", kind, search, status],
    queryFn: () =>
      api<Page<ApiEntry>>(
        `/financial-entries?kind=${kind}&limit=100&search=${encodeURIComponent(search)}${status && status !== "Todos" ? `&status=${status}` : ""}`,
      ),
  });
export const useEntry = (id?: string | null) =>
  useQuery({
    queryKey: ["entry", id],
    queryFn: () => api<ApiEntry>(`/financial-entries/${id}`),
    enabled: Boolean(id),
  });
export const useClients = () =>
  useQuery({
    queryKey: ["clients"],
    queryFn: () => api<Page<ApiCounterparty>>("/clients?limit=100"),
  });
export const useSuppliers = () =>
  useQuery({
    queryKey: ["suppliers"],
    queryFn: () => api<Page<ApiCounterparty>>("/suppliers?limit=100"),
  });
export const useCategories = () =>
  useQuery({
    queryKey: ["categories"],
    queryFn: () => api<Page<ApiCategory>>("/categories?limit=100"),
  });
export const useAccounts = () =>
  useQuery({
    queryKey: ["accounts"],
    queryFn: () => api<Page<ApiAccount>>("/financial-accounts?limit=100"),
  });
export const useProjects = () =>
  useQuery({
    queryKey: ["projects"],
    queryFn: () => api<Page<ApiProject>>("/projects?limit=100"),
  });
export const useCompany = () =>
  useQuery({
    queryKey: ["company"],
    queryFn: () => api<ApiCompany>("/company"),
  });
export const useUsers = () =>
  useQuery({
    queryKey: ["users"],
    queryFn: () => api<Page<ApiUser>>("/users?limit=100"),
  });

export function useSettleEntry() {
  const query = useQueryClient();
  return useMutation({
    mutationFn: ({
      installmentId,
      accountId,
    }: {
      installmentId: string;
      accountId: string;
    }) =>
      api(`/financial-installments/${installmentId}/settlements`, {
        method: "POST",
        body: JSON.stringify({ accountId }),
      }),
    onSuccess: () => query.invalidateQueries(),
  });
}

export function useReverseSettlement() {
  const query = useQueryClient();
  return useMutation({
    mutationFn: (installmentId: string) =>
      api(`/financial-installments/${installmentId}/settlements`, {
        method: "DELETE",
      }),
    onSuccess: () => query.invalidateQueries(),
  });
}

export function useSaveEntry(id?: string | null) {
  const query = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api(`/financial-entries${id ? `/${id}` : ""}`, {
        method: id ? "PATCH" : "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => query.invalidateQueries(),
  });
}

export function useCancelEntry() {
  const query = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api(`/financial-entries/${id}`, { method: "DELETE" }),
    onSuccess: () => query.invalidateQueries(),
  });
}
