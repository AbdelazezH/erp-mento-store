"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useProducts,
  useDeleteProduct,
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
  Image as ImageIcon,
} from "lucide-react";

// ─── Stock Badge ─────────────────────────────────────────────────────────────

function StockBadge({ qty }: { qty: number }) {
  if (qty === 0)
    return (
      <Badge variant="destructive" className="tabular-nums">
        Out of stock
      </Badge>
    );
  if (qty < 10)
    return (
      <Badge variant="warning" className="tabular-nums">
        {qty} low
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

async function downloadImage(imageUrl: string, productName: string) {
  try {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    const ext = blob.type.split("/")[1] || "jpg";
    const safeName = productName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeName}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    // If fetch fails (CORS), open in new tab so user can save manually
    window.open(imageUrl, "_blank");
  }
}

// ─── New Category Dialog ──────────────────────────────────────────────────────

function NewCategoryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
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
          <DialogTitle>New Category</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>Name</Label>
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
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || createCategory.isPending}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [lowStock, setLowStock] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);

  const { data: products = [], isLoading } = useProducts({
    search: search || undefined,
    categoryId: categoryId || undefined,
    supplierId: supplierId || undefined,
    lowStock: lowStock || undefined,
  });

  const { data: categories = [] } = useCategories();
  const { data: suppliers = [] } = useSuppliers();
  const deleteProduct = useDeleteProduct();

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
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">
            Manage your product catalog
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => downloadCSV(products as any[])}
            disabled={(products as any[]).length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={() => router.push("/products/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Product
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products…"
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
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All categories</SelectItem>
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
            <SelectValue placeholder="All suppliers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All suppliers</SelectItem>
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
          Low stock
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (products as any[]).length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <Package className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-semibold">No products found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {search || categoryId || supplierId || lowStock
              ? "Try adjusting your filters."
              : "Get started by creating your first product."}
          </p>
          {!search && !categoryId && !supplierId && !lowStock && (
            <Button className="mt-4" onClick={() => router.push("/products/new")}>
              <Plus className="mr-2 h-4 w-4" />
              New Product
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Selling Price</TableHead>
                <TableHead>Base Cost</TableHead>
                <TableHead>Profit &amp; Margin</TableHead>
                <TableHead>Status</TableHead>
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
                      <Badge variant="success">Published</Badge>
                    ) : (
                      <Badge variant="secondary">Draft</Badge>
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
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        {product.imageUrl && (
                          <DropdownMenuItem
                            onClick={() =>
                              downloadImage(product.imageUrl, product.name)
                            }
                          >
                            <ImageIcon className="mr-2 h-4 w-4" />
                            Download Image
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteId(product.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the product. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
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
