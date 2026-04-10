"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useSupplier } from "@/hooks/use-api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Package, DollarSign, Building2 } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BILL_TYPE_LABELS: Record<string, string> = {
  supplier_bill: "Supplier Bill",
  operation_invoice: "Operation Invoice",
  packaging_invoice: "Packaging Invoice",
  shipping_invoice: "Shipping Invoice",
  devices_invoice: "Devices Invoice",
  website_invoice: "Website Invoice",
  other_expense: "Other Expense",
};

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    paid: "bg-green-100 text-green-700 border-green-200",
    pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
    overdue: "bg-red-100 text-red-700 border-red-200",
    cancelled: "bg-gray-100 text-gray-500 border-gray-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.cancelled}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: supplier, isLoading } = useSupplier(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Supplier not found.
      </div>
    );
  }

  const s = supplier as any;
  const bills: any[] = s.bills ?? [];
  const products: any[] = s.products ?? [];

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <button
        onClick={() => router.push("/suppliers")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Suppliers
      </button>

      {/* Top section */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-4 items-start">
        {/* Supplier info card */}
        <div className="rounded-xl border bg-card p-6 flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight truncate">{s.name}</h1>
            {s.contactName && (
              <p className="text-sm text-muted-foreground mt-0.5">{s.contactName}</p>
            )}
            {(s.email || s.phone) && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                {s.email && <span>{s.email}</span>}
                {s.phone && <span>{s.phone}</span>}
              </p>
            )}
          </div>
        </div>

        {/* Products Sourced stat */}
        <div className="rounded-xl border bg-card p-5 min-w-[160px]">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Package className="h-4 w-4" />
            Products Sourced
          </div>
          <p className="text-3xl font-bold">{s.productsSourced ?? 0}</p>
        </div>

        {/* Total Invested stat */}
        <div className="rounded-xl border bg-card p-5 min-w-[180px]">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <DollarSign className="h-4 w-4" />
            Total Invested
          </div>
          <p className="text-2xl font-bold text-emerald-600">
            {formatCurrency(s.totalInvested ?? 0)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="invoices">
        <TabsList className="border-b w-full justify-start rounded-none bg-transparent h-auto p-0 gap-0">
          <TabsTrigger
            value="invoices"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3 flex items-center gap-2"
          >
            <span>Invoices &amp; Expenses</span>
            <span className="text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 leading-none">
              {bills.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="products"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3 flex items-center gap-2"
          >
            <span>Products</span>
            <span className="text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 leading-none">
              {products.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* Invoices tab */}
        <TabsContent value="invoices" className="mt-4">
          {bills.length === 0 ? (
            <div className="flex items-center justify-center rounded-xl border border-dashed py-16 text-center">
              <p className="text-muted-foreground text-sm">No invoices linked to this supplier yet.</p>
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bills.map((bill) => (
                    <TableRow
                      key={bill.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/bills/${bill.id}/edit`)}
                    >
                      <TableCell className="font-mono text-sm">{bill.billNumber}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium bg-muted">
                          {BILL_TYPE_LABELS[bill.billType] ?? bill.billType}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(bill.issueDate)}</TableCell>
                      <TableCell>{statusBadge(bill.status)}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(bill.totalAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Products tab */}
        <TabsContent value="products" className="mt-4">
          {products.length === 0 ? (
            <div className="flex items-center justify-center rounded-xl border border-dashed py-16 text-center">
              <p className="text-muted-foreground text-sm">No products linked to this supplier yet.</p>
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Product ID</TableHead>
                    <TableHead className="text-right">Cost Price</TableHead>
                    <TableHead className="text-right">Selling Price</TableHead>
                    <TableHead className="text-right">In Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow
                      key={product.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/products/${product.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {product.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.imageUrl}
                              alt=""
                              className="h-8 w-8 rounded object-cover border shrink-0"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded bg-muted shrink-0 flex items-center justify-center">
                              <Package className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{product.name}</p>
                            {product.sku && (
                              <p className="font-mono text-xs text-muted-foreground">{product.sku}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">
                        #{product.id.slice(-4).toUpperCase()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        <div className="flex flex-col items-end">
                          <span>{product.basePrice ? formatCurrency(product.basePrice) : "—"}</span>
                          {product.averageCost && parseFloat(product.averageCost) > 0 &&
                            parseFloat(product.averageCost) !== parseFloat(product.basePrice ?? "0") && (
                              <span className="text-xs text-muted-foreground">
                                avg {formatCurrency(product.averageCost)}
                              </span>
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm text-emerald-600 font-medium">
                        {product.sellingPrice ? formatCurrency(product.sellingPrice) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {product.totalStock ?? product.stockQuantity ?? 0}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
