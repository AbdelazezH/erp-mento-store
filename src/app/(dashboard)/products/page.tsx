"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  useInfiniteProducts,
  useDeleteProduct,
  useDuplicateProduct,
  useCategories,
  useSuppliers,
  useCreateCategory,
} from "@/hooks/use-api";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Package,
  Filter,
  Download,
  Copy,
} from "lucide-react";

// ─── Stock Badge ─────────────────────────────────────────────────────────────

function StockBadge({ qty }: { qty: number }) {
  const t = useTranslations("products");
  if (qty === 0)
    return (
      <Badge variant="destructive" className="tabular-nums">
        {t("outOfStock")}
      </Badge>
    );
  if (qty < 10)
    return (
      <Badge variant="warning" className="tabular-nums">
        {t("low", { qty })}
      </Badge>
    );
  return (
    <Badge variant="success" className="tabular-nums">
      {qty}
    </Badge>
  );
}

// ─── CSV + Image helpers ──────────────────────────────────────────────────────

function downloadCSV(productList: any[]) {
  const headers = [
    "Name", "SKU", "Barcode", "Category", "Supplier",
    "Stock", "Selling Price", "Base Cost", "Avg Cost", "Profit", "Margin %", "Status", "Image URL",
  ];
  const rows = productList.map((p) => [
    p.name,
    p.sku ?? "",
    p.barcode ?? "",
    p.categoryName ?? "",
    p.supplierName ?? "",
    p.totalStock ?? p.stockQuantity ?? 0,
    p.sellingPrice ?? "",
    p.basePrice ?? "",
    p.averageCost ?? "",
    (() => { const sp = p.sellingPrice ? parseFloat(p.sellingPrice) : null; const bp = p.basePrice ? parseFloat(p.basePrice) : null; return sp && bp ? (sp - bp).toFixed(2) : ""; })(),
    (() => { const sp = p.sellingPrice ? parseFloat(p.sellingPrice) : null; const bp = p.basePrice ? parseFloat(p.basePrice) : null; return sp && bp && sp > 0 ? (((sp - bp) / sp) * 100).toFixed(1) + "%" : ""; })(),
    p.isPublished ? "Published" : "Draft",
    p.imageUrl ?? "",
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "products.csv";
  a.click();
  URL.revokeObjectURL(url);
}


// ─── New Category Dialog ──────────────────────────────────────────────────────

function NewCategoryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const t = useTranslations("products");
  const tc = useTranslations("common");
  const [name, setName] = useState("");
  const createCategory = useCreateCategory();

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createCategory.mutateAsync({ name: name.trim() });
    setName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>{t("newCategoryTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>{tc("name")}</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Shirts"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || createCategory.isPending}>
            {t("createCategory")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const t = useTranslations("products");
  const tc = useTranslations("common");
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [lowStock, setLowStock] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);

  const {
    data: productsData,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteProducts({
    search: search || undefined,
    categoryId: categoryId || undefined,
    supplierId: supplierId || undefined,
    lowStock: lowStock || undefined,
  });
  const products = useMemo(() => productsData?.pages.flatMap((p) => p.data) ?? [], [productsData]);

  const { data: categories = [] } = useCategories();
  const { data: suppliers = [] } = useSuppliers();
  const deleteProduct = useDeleteProduct();
  const duplicateProduct = useDuplicateProduct();

  // Infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && !isFetchingNextPage) fetchNextPage(); },
      { rootMargin: "300px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteProduct.mutateAsync(deleteId);
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => downloadCSV(products as any[])}
            disabled={(products as any[]).length === 0}
          >
            <Download className="me-2 h-4 w-4" />
            {tc("exportCsv")}
          </Button>
          <Button onClick={() => router.push("/products/new")}>
            <Plus className="me-2 h-4 w-4" />
            {t("newProduct")}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-1">
          <Select
            value={categoryId}
            onValueChange={(v) => setCategoryId(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder={t("allCategories")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("allCategories")}</SelectItem>
              {(categories as any[]).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            title="New category"
            onClick={() => setNewCategoryOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <Select
          value={supplierId}
          onValueChange={(v) => setSupplierId(v === "__all__" ? "" : v)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t("allSuppliers")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("allSuppliers")}</SelectItem>
            {(suppliers as any[]).map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <button
          type="button"
          onClick={() => setLowStock((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors ${
            lowStock
              ? "border-orange-400 bg-orange-50 text-orange-700"
              : "border-input bg-background text-foreground hover:bg-accent"
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          {t("lowStock")}
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableBody>
              {Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-10 w-10 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-5 w-14 bg-muted animate-pulse rounded-full" /></TableCell>
                  <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (products as any[]).length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <Package className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-semibold">{t("noProductsFound")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {search || categoryId || supplierId || lowStock
              ? tc("adjustFilters")
              : t("getStartedFirst")}
          </p>
          {!search && !categoryId && !supplierId && !lowStock && (
            <Button className="mt-4" onClick={() => router.push("/products/new")}>
              <Plus className="me-2 h-4 w-4" />
              {t("newProduct")}
            </Button>
          )}
        </div>
      ) : (
        <>
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>{tc("name")}</TableHead>
                <TableHead>{t("sku")}</TableHead>
                <TableHead>{t("category")}</TableHead>
                <TableHead>{t("supplier")}</TableHead>
                <TableHead>{t("stock")}</TableHead>
                <TableHead>{t("sellingPrice")}</TableHead>
                <TableHead>{t("baseCost")}</TableHead>
                <TableHead>{t("profitMargin")}</TableHead>
                <TableHead>{tc("status")}</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(products as any[]).map((product) => (
                <TableRow
                  key={product.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/products/${product.id}`)}
                >
                  {/* Thumbnail */}
                  <TableCell>
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-muted">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Name */}
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {product.name}
                  </TableCell>

                  {/* SKU */}
                  <TableCell className="text-muted-foreground text-xs">
                    {product.sku ?? "—"}
                  </TableCell>

                  {/* Category */}
                  <TableCell className="text-sm">
                    {product.categoryName ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Supplier */}
                  <TableCell className="text-sm">
                    {product.supplierName ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Stock */}
                  <TableCell>
                    <StockBadge qty={product.totalStock ?? product.stockQuantity ?? 0} />
                  </TableCell>

                  {/* Selling Price */}
                  <TableCell className="font-medium tabular-nums">
                    {product.sellingPrice
                      ? formatCurrency(product.sellingPrice)
                      : "—"}
                  </TableCell>

                  {/* Base Cost + optional avg cost */}
                  <TableCell className="tabular-nums">
                    {product.basePrice && parseFloat(product.basePrice) > 0 ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-sm">{formatCurrency(product.basePrice)}</span>
                        {product.averageCost &&
                          parseFloat(product.averageCost) > 0 &&
                          parseFloat(product.averageCost) !== parseFloat(product.basePrice) && (
                            <span className="text-xs text-muted-foreground tabular-nums">
                              avg {formatCurrency(product.averageCost)}
                            </span>
                          )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Profit & Margin */}
                  <TableCell className="tabular-nums">
                    {(() => {
                      const sp = product.sellingPrice ? parseFloat(product.sellingPrice) : null;
                      const bp = product.basePrice ? parseFloat(product.basePrice) : null;
                      if (!sp || !bp || sp <= 0 || bp <= 0) return <span className="text-muted-foreground">—</span>;
                      const profit = sp - bp;
                      const margin = (profit / sp) * 100;
                      return (
                        <span className={profit >= 0 ? "text-emerald-600 font-medium text-sm" : "text-destructive font-medium text-sm"}>
                          {profit >= 0 ? "+" : ""}{profit.toFixed(0)} L.E ({margin.toFixed(0)}%)
                        </span>
                      );
                    })()}
                  </TableCell>

                  {/* Published */}
                  <TableCell>
                    {product.isPublished ? (
                      <Badge variant="success">{tc("published")}</Badge>
                    ) : (
                      <Badge variant="secondary">{tc("draft")}</Badge>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => router.push(`/products/${product.id}`)}
                        >
                          <Pencil className="me-2 h-4 w-4" />
                          {tc("edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={duplicateProduct.isPending}
                          onClick={() => duplicateProduct.mutate(product.id)}
                        >
                          <Copy className="me-2 h-4 w-4" />
                          {tc("duplicate")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteId(product.id)}
                        >
                          <Trash2 className="me-2 h-4 w-4" />
                          {tc("delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {isFetchingNextPage && (
            <Table><TableBody>
              {Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-10 w-10 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-5 w-14 bg-muted animate-pulse rounded-full" /></TableCell>
                  <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell />
                </TableRow>
              ))}
            </TableBody></Table>
          )}
        </div>
        {hasNextPage && <div ref={sentinelRef} className="h-1" />}
        </>
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteProductTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteProductDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              {tc("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Category Dialog */}
      <NewCategoryDialog
        open={newCategoryOpen}
        onOpenChange={setNewCategoryOpen}
      />
    </div>
  );
}
