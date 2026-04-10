"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useBills,
  useBillStats,
  useDeleteBill,
} from "@/hooks/use-api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Receipt,
  ImageIcon,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type BillStatus = "pending" | "overdue" | "paid" | "cancelled";

const BILL_TYPE_LABELS: Record<string, string> = {
  supplier_bill: "Supplier Invoice",
  operation_invoice: "Operation Invoice",
  packaging_invoice: "Packaging Invoice",
  shipping_invoice: "Shipping Invoice",
  devices_invoice: "Devices Invoice",
  website_invoice: "Website Invoice",
  other_expense: "Other Expense",
};

// Colors for per-person stat cards — cycling by index
const CARD_PALETTES = [
  { bg: "bg-blue-50", border: "border-blue-100", name: "text-blue-600", amount: "text-blue-700" },
  { bg: "bg-purple-50", border: "border-purple-100", name: "text-purple-600", amount: "text-purple-700" },
  { bg: "bg-green-50", border: "border-green-100", name: "text-green-600", amount: "text-green-700" },
  { bg: "bg-yellow-50", border: "border-yellow-100", name: "text-yellow-600", amount: "text-yellow-700" },
  { bg: "bg-red-50", border: "border-red-100", name: "text-red-500", amount: "text-red-600" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusVariant(status: BillStatus) {
  switch (status) {
    case "pending": return "warning" as const;
    case "overdue": return "destructive" as const;
    case "paid": return "success" as const;
    case "cancelled": return "secondary" as const;
  }
}

function statusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: bills = [], isLoading } = useBills({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    billType: typeFilter !== "all" ? typeFilter : undefined,
  });

  const { data: stats = [], isLoading: statsLoading } = useBillStats();

  const deleteBill = useDeleteBill();

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteBill.mutateAsync(deleteId);
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Receipt className="h-6 w-6" />
            Invoices &amp; Expenses
          </h1>
          <p className="text-sm text-muted-foreground">Track incoming invoices, bills, and payments.</p>
        </div>
        <Button onClick={() => router.push("/bills/new")}>
          <Plus className="mr-2 h-4 w-4" />
          New Invoice
        </Button>
      </div>

      {/* Per-person summary cards */}
      {statsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (stats as any[]).length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {(stats as any[]).slice(0, 5).map((s, i) => {
            const palette = CARD_PALETTES[i % CARD_PALETTES.length];
            return (
              <div
                key={s.personName}
                className={`rounded-xl border p-4 space-y-1 ${palette.bg} ${palette.border}`}
              >
                <p className={`text-sm font-medium truncate ${palette.name}`}>{s.personName}</p>
                <p className={`text-xl font-bold tabular-nums ${palette.amount}`}>
                  {formatCurrency(s.total)}
                </p>
                <p className="text-xs text-muted-foreground">{s.count} invoice{s.count !== 1 ? "s" : ""}</p>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search invoices…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="supplier_bill">Supplier Invoice</SelectItem>
            <SelectItem value="operation_invoice">Operation Invoice</SelectItem>
            <SelectItem value="packaging_invoice">Packaging Invoice</SelectItem>
            <SelectItem value="shipping_invoice">Shipping Invoice</SelectItem>
            <SelectItem value="devices_invoice">Devices Invoice</SelectItem>
            <SelectItem value="website_invoice">Website Invoice</SelectItem>
            <SelectItem value="other_expense">Other Expense</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (bills as any[]).length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <Receipt className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-semibold">No invoices found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {search || statusFilter !== "all" || typeFilter !== "all"
              ? "Try adjusting your filters."
              : "Get started by recording your first invoice."}
          </p>
          {!search && statusFilter === "all" && typeFilter === "all" && (
            <Button className="mt-4" onClick={() => router.push("/bills/new")}>
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Paid By</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(bills as any[]).map((bill) => (
                <TableRow key={bill.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      {bill.billNumber ?? "—"}
                      {bill.receiptImageUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewUrl(bill.receiptImageUrl)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="View receipt"
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium max-w-[160px] truncate">
                    {bill.name}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {bill.billType === "supplier_bill"
                      ? `Supplier Invoice${bill.supplierName ? ` — ${bill.supplierName}` : ""}`
                      : (BILL_TYPE_LABELS[bill.billType] ?? bill.billType)}
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(bill.issueDate)}</TableCell>
                  <TableCell className="text-sm">{formatDate(bill.dueDate)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(bill.status as BillStatus)}>
                      {statusLabel(bill.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(bill.totalAmount)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {bill.paidBy ?? "—"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/bills/${bill.id}/edit`)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteId(bill.id)}
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
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the invoice. This action cannot be undone.
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

      {/* Receipt Image Lightbox */}
      <Dialog open={!!previewUrl} onOpenChange={(v) => !v && setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl p-2">
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Receipt"
              className="w-full h-auto max-h-[80vh] object-contain rounded"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
