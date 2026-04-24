import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// ─── Generic fetch helpers ────────────────────────────────────────────────────

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error ?? "Request failed");
  }
  return res.json();
}

function post<T>(url: string, data: unknown) {
  return apiFetch<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

function put<T>(url: string, data: unknown) {
  return apiFetch<T>(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

function del(url: string) {
  return apiFetch<{ ok: boolean }>(url, { method: "DELETE" });
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function useDashboard() {
  return useQuery({ queryKey: ["dashboard"], queryFn: () => apiFetch("/api/dashboard") });
}

export function usePeriodProfit(month: number, year: number) {
  return useQuery({
    queryKey: ["analytics", "period", month, year],
    queryFn: () =>
      apiFetch<{
        salesRevenue: number;
        costOfGoods: number;
        operatingExpenses: number;
        shippingDiscounts: number;
        freeItemsValue: number;
        trueNetProfit: number;
        margin: string;
      }>(`/api/analytics/period?month=${month}&year=${year}`),
  });
}

export function useTrend(groupBy: string, dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ["analytics", "trend", groupBy, dateFrom, dateTo],
    queryFn: () =>
      apiFetch<{ data: { period: string; revenue: number; profit: number }[] }>(
        `/api/analytics/trend?groupBy=${groupBy}&dateFrom=${dateFrom}&dateTo=${dateTo}`,
      ),
    enabled: !!dateFrom && !!dateTo,
  });
}

// ─── Categories ───────────────────────────────────────────────────────────────

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: () => apiFetch<any[]>("/api/categories") });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) => post("/api/categories", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); toast.success("Category created"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string }) =>
      put(`/api/categories/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); toast.success("Category updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/api/categories/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); toast.success("Category deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Suppliers ────────────────────────────────────────────────────────────────

export function useSuppliers() {
  return useQuery({
    queryKey: ["suppliers"],
    queryFn: () => apiFetch<{ data: any[]; total: number }>("/api/suppliers").then((r) => r.data),
  });
}

export function useInfiniteSuppliers(params?: { search?: string }) {
  return useInfiniteQuery({
    queryKey: ["suppliers", "infinite", params],
    queryFn: ({ pageParam = 0 }) => {
      const sp = new URLSearchParams();
      sp.set("limit", "50");
      sp.set("offset", String(pageParam));
      if (params?.search) sp.set("search", params.search);
      return apiFetch<{ data: any[]; total: number }>(`/api/suppliers?${sp.toString()}`);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((s, p) => s + p.data.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => post("/api/suppliers", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers"] }); toast.success("Supplier created"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string;[k: string]: any }) => put(`/api/suppliers/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers"] }); toast.success("Supplier updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/api/suppliers/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers"] }); toast.success("Supplier deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: ["suppliers", id],
    queryFn: () => apiFetch<any>(`/api/suppliers/${id}`),
    enabled: !!id,
  });
}

// ─── Products ─────────────────────────────────────────────────────────────────

export function useProducts(params?: { search?: string; categoryId?: string; supplierId?: string; lowStock?: boolean }) {
  const sp = new URLSearchParams();
  if (params?.search) sp.set("search", params.search);
  if (params?.categoryId) sp.set("categoryId", params.categoryId);
  if (params?.supplierId) sp.set("supplierId", params.supplierId);
  if (params?.lowStock) sp.set("lowStock", "true");
  const query = sp.toString();

  return useQuery({
    queryKey: ["products", params],
    queryFn: () => apiFetch<{ data: any[]; total: number }>(`/api/products${query ? `?${query}` : ""}`).then((r) => r.data),
  });
}

export function useInfiniteProducts(params?: { search?: string; categoryId?: string; supplierId?: string; lowStock?: boolean }) {
  return useInfiniteQuery({
    queryKey: ["products", "infinite", params],
    queryFn: ({ pageParam = 0 }) => {
      const sp = new URLSearchParams();
      sp.set("limit", "50");
      sp.set("offset", String(pageParam));
      if (params?.search) sp.set("search", params.search);
      if (params?.categoryId) sp.set("categoryId", params.categoryId);
      if (params?.supplierId) sp.set("supplierId", params.supplierId);
      if (params?.lowStock) sp.set("lowStock", "true");
      return apiFetch<{ data: any[]; total: number }>(`/api/products?${sp.toString()}`);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((s, p) => s + p.data.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["products", id],
    queryFn: () => apiFetch<any>(`/api/products/${id}`),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => post("/api/products", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); toast.success("Product created"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string;[k: string]: any }) => put(`/api/products/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); toast.success("Product updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/api/products/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); toast.success("Product deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDuplicateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post<any>(`/api/products/${id}/duplicate`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); toast.success("Product duplicated"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useMaterials() {
  return useQuery({ queryKey: ["materials"], queryFn: () => apiFetch<string[]>("/api/products/materials") });
}

export function useProductCostHistory(id: string) {
  return useQuery({
    queryKey: ["products", id, "cost-history"],
    queryFn: () => apiFetch<any[]>(`/api/products/${id}/cost-history`),
    enabled: !!id,
  });
}

export function useSyncVariants() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, variants }: { productId: string; variants: any[] }) =>
      post(`/api/products/${productId}/variants`, variants),
    onSuccess: (_data, { productId }) => {
      qc.invalidateQueries({ queryKey: ["products", productId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/api/variants/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useProductGallery(productId?: string) {
  return useQuery({
    queryKey: ["gallery", productId],
    queryFn: () => apiFetch<any[]>(`/api/products/${productId}/gallery`),
    enabled: !!productId,
  });
}

export function useSaveGallery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, images }: { productId: string; images: { imageUrl: string; sortOrder: number }[] }) =>
      put(`/api/products/${productId}/gallery`, images),
    onSuccess: (_data, { productId }) => {
      qc.invalidateQueries({ queryKey: ["gallery", productId] });
      qc.invalidateQueries({ queryKey: ["products", productId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Bills ────────────────────────────────────────────────────────────────────

export function useBills(params?: { search?: string; status?: string; billType?: string }) {
  const sp = new URLSearchParams();
  if (params?.search) sp.set("search", params.search);
  if (params?.status) sp.set("status", params.status);
  if (params?.billType) sp.set("billType", params.billType);
  const query = sp.toString();

  return useQuery({
    queryKey: ["bills", params],
    queryFn: () => apiFetch<{ data: any[]; total: number }>(`/api/bills${query ? `?${query}` : ""}`).then((r) => r.data),
  });
}

export function useInfiniteBills(params?: {
  search?: string;
  billType?: string;
  dateFrom?: string;
  dateTo?: string;
  payer?: string;
  sortDir?: string;
}) {
  return useInfiniteQuery({
    queryKey: ["bills", "infinite", params],
    queryFn: ({ pageParam = 0 }) => {
      const sp = new URLSearchParams();
      sp.set("limit", "50");
      sp.set("offset", String(pageParam));
      if (params?.search) sp.set("search", params.search);
      if (params?.billType) sp.set("billType", params.billType);
      if (params?.dateFrom) sp.set("dateFrom", params.dateFrom);
      if (params?.dateTo) sp.set("dateTo", params.dateTo);
      if (params?.payer) sp.set("payer", params.payer);
      if (params?.sortDir) sp.set("sortDir", params.sortDir);
      return apiFetch<{ data: any[]; total: number; typeCounts: Record<string, number> }>(
        `/api/bills?${sp.toString()}`
      );
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.data.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
  });
}

export function useBill(id: string) {
  return useQuery({
    queryKey: ["bills", id],
    queryFn: () => apiFetch<any>(`/api/bills/${id}`),
    enabled: !!id,
  });
}

export function useBillStats() {
  return useQuery({
    queryKey: ["bills", "stats"],
    queryFn: () => apiFetch<{ personName: string; total: string; count: number }[]>("/api/bills/stats"),
  });
}

export function useCreateBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => post("/api/bills", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bills"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); toast.success("Bill created"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string;[k: string]: any }) => put(`/api/bills/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bills"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); toast.success("Bill updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/api/bills/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bills"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); toast.success("Bill deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Customers ────────────────────────────────────────────────────────────────

export function useCustomers(search?: string) {
  return useQuery({
    queryKey: ["customers", search],
    queryFn: () => apiFetch<{ data: any[]; total: number }>(`/api/customers${search ? `?search=${encodeURIComponent(search)}` : ""}`).then((r) => r.data),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ["customers", id],
    queryFn: () => apiFetch<any>(`/api/customers/${id}`),
    enabled: !!id,
  });
}

export function useInfiniteCustomers(params?: { search?: string }) {
  return useInfiniteQuery({
    queryKey: ["customers", "infinite", params],
    queryFn: ({ pageParam = 0 }) => {
      const sp = new URLSearchParams();
      sp.set("limit", "50");
      sp.set("offset", String(pageParam));
      if (params?.search) sp.set("search", params.search);
      return apiFetch<{ data: any[]; total: number }>(`/api/customers?${sp.toString()}`);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((s, p) => s + p.data.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => post("/api/customers", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["customers"] }); toast.success("Customer created"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string;[k: string]: any }) => put(`/api/customers/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["customers"] }); toast.success("Customer updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/api/customers/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["customers"] }); toast.success("Customer deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export function useOrders(params?: { search?: string; status?: string }) {
  const sp = new URLSearchParams();
  if (params?.search) sp.set("search", params.search);
  if (params?.status) sp.set("status", params.status);
  const query = sp.toString();

  return useQuery({
    queryKey: ["orders", params],
    queryFn: () => apiFetch<{ data: any[]; total: number }>(`/api/orders${query ? `?${query}` : ""}`).then((r) => r.data),
  });
}

export function useInfiniteOrders(params?: { search?: string; status?: string }) {
  return useInfiniteQuery({
    queryKey: ["orders", "infinite", params],
    queryFn: ({ pageParam = 0 }) => {
      const sp = new URLSearchParams();
      sp.set("limit", "50");
      sp.set("offset", String(pageParam));
      if (params?.search) sp.set("search", params.search);
      if (params?.status) sp.set("status", params.status);
      return apiFetch<{ data: any[]; total: number }>(`/api/orders?${sp.toString()}`);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((s, p) => s + p.data.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: () => apiFetch<any>(`/api/orders/${id}`),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => post("/api/orders", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["orders"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); toast.success("Order created"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string;[k: string]: any }) => put(`/api/orders/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["orders"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); toast.success("Order updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/api/orders/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["orders"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); toast.success("Order deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Attributes ───────────────────────────────────────────────────────────────

export function useAttributes() {
  return useQuery({ queryKey: ["attributes"], queryFn: () => apiFetch<any[]>("/api/attributes") });
}

export function useCreateAttribute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => post("/api/attributes", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["attributes"] }); toast.success("Attribute created"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateAttribute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string;[k: string]: any }) => put(`/api/attributes/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["attributes"] }); toast.success("Attribute updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteAttribute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/api/attributes/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["attributes"] }); toast.success("Attribute deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAddAttributeValue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ attributeId, value }: { attributeId: string; value: string }) =>
      post<{ id: string; value: string; colorHex: string | null; sortOrder: number }>(
        `/api/attributes/${attributeId}/values`,
        { value }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attributes"] }),
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Cost Profiles ────────────────────────────────────────────────────────────

export function useCostProfiles() {
  return useQuery({ queryKey: ["cost-profiles"], queryFn: () => apiFetch<any>("/api/cost-profiles").then((r) => r.data) });
}

export function useCreateCostProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; category: string; unitCost: string; applicationRule: string; isActive?: boolean }) =>
      post("/api/cost-profiles", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cost-profiles"] }); toast.success("Cost profile created"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateCostProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; [k: string]: any }) => put(`/api/cost-profiles/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cost-profiles"] }); toast.success("Cost profile updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteCostProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/api/cost-profiles/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cost-profiles"] }); toast.success("Cost profile deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Business Settings ────────────────────────────────────────────────────────

export function useBusinessSettings() {
  return useQuery({
    queryKey: ["business-settings"],
    queryFn: () => apiFetch<{ id: string; shippingCostThreshold: string; updatedAt: string }>("/api/settings"),
    staleTime: 5 * 60 * 1000, // cache for 5 min — settings change rarely
  });
}

export function useUpdateBusinessSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { shippingCostThreshold: string }) => put("/api/settings", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["business-settings"] });
      toast.success("Settings saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Campaigns ────────────────────────────────────────────────────────────────

export function useCampaigns() {
  return useQuery({ queryKey: ["campaigns"], queryFn: () => apiFetch<any[]>("/api/campaigns") });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => post("/api/campaigns", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["campaigns"] }); toast.success("Campaign created"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string;[k: string]: any }) => put(`/api/campaigns/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["campaigns"] }); toast.success("Campaign updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/api/campaigns/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["campaigns"] }); toast.success("Campaign deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
}
