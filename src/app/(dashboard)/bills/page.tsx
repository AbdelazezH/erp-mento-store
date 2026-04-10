"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  useBills,
  useBillStats,
  useDeleteBill,
  useUpdateBill,
} from "@/hooks/use-api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Receipt,
  ImageIcon,
  Download,
  X,
  CalendarIcon,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  User,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PAID_BY_OPTIONS } from "@/components/features/invoices/invoice-form";

// ─── Types ────────────────────────────────────────────────────────────────────

type BillStatus = "pending" | "overdue" | "paid" | "cancelled";

// Short labels used on filter pills
const TYPE_PILL_LABELS: Record<string, string> = {
  supplier_bill:      "Supplier Bill",
  operation_invoice:  "Operation Bill",
  packaging_invoice:  "Packaging Bill",
  shipping_invoice:   "Shipping Bill",
  devices_invoice:    "Devices Bill",
  website_invoice:    "Website Service",
  advertising_bill:   "Advertising Bill",
  other_expense:      "Other Expense",
};

// Badge colours per bill type
const TYPE_BADGE_STYLES: Record<string, string> = {
  supplier_bill:      "bg-blue-50 text-blue-700 border-blue-200",
  operation_invoice:  "bg-violet-50 text-violet-700 border-violet-200",
  packaging_invoice:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  shipping_invoice:   "bg-indigo-50 text-indigo-700 border-indigo-200",
  devices_invoice:    "bg-slate-100 text-slate-600 border-slate-200",
  website_invoice:    "bg-pink-50 text-pink-700 border-pink-200",
  advertising_bill:   "bg-rose-50 text-rose-700 border-rose-200",
  other_expense:      "bg-orange-50 text-orange-700 border-orange-200",
};

// Status pill styles
const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-yellow-50 text-yellow-700 border-yellow-200",
  overdue:   "bg-red-50 text-red-700 border-red-200",
  paid:      "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
};

// Colors for per-person stat cards — cycling by index
const CARD_PALETTES = [
  { bg: "bg-blue-50",   border: "border-blue-100",   name: "text-blue-600",   amount: "text-blue-700" },
  { bg: "bg-purple-50", border: "border-purple-100", name: "text-purple-600", amount: "text-purple-700" },
  { bg: "bg-green-50",  border: "border-green-100",  name: "text-green-600",  amount: "text-green-700" },
  { bg: "bg-yellow-50", border: "border-yellow-100", name: "text-yellow-600", amount: "text-yellow-700" },
  { bg: "bg-red-50",    border: "border-red-100",    name: "text-red-500",    amount: "text-red-600" },
];

// ─── Date Preset Helpers ──────────────────────────────────────────────────────

const DATE_PRESETS = [
  { key: "all",        label: "All time" },
  { key: "week",       label: "This Week" },
  { key: "month",      label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "year",       label: "This Year" },
  { key: "custom",     label: "Custom" },
];

function getPresetRange(preset: string): { from: string; to: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = fmt(now);
  if (preset === "week") {
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mon = new Date(now);
    mon.setDate(now.getDate() + diff);
    return { from: fmt(mon), to: today };
  }
  if (preset === "month") {
    return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
  }
  if (preset === "last_month") {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: fmt(first), to: fmt(last) };
  }
  if (preset === "year") {
    return { from: `${now.getFullYear()}-01-01`, to: today };
  }
  return { from: "", to: "" };
}

// ─── Inline Status Dropdown ───────────────────────────────────────────────────

function StatusDropdown({ bill }: { bill: any }) {
  const updateBill = useUpdateBill();
  const statuses: BillStatus[] = ["pending", "overdue", "paid", "cancelled"];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:opacity-80",
            STATUS_STYLES[bill.status] ?? STATUS_STYLES.cancelled
          )}
        >
          {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-36">
        {statuses.map((s) => (
          <DropdownMenuItem
            key={s}
            className={cn(
              "text-xs capitalize",
              bill.status === s && "font-semibold"
            )}
            onClick={() => {
              if (bill.status !== s) {
                updateBill.mutate({ id: bill.id, status: s });
              }
            }}
          >
            <span className={cn(
              "mr-2 h-2 w-2 rounded-full inline-block",
              s === "paid" ? "bg-green-500" :
              s === "pending" ? "bg-yellow-500" :
              s === "overdue" ? "bg-red-500" : "bg-gray-400"
            )} />
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [datePreset, setDatePreset] = useState<"all"|"week"|"month"|"last_month"|"year"|"custom">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [payerFilter, setPayerFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dateSortDir, setDateSortDir] = useState<"asc" | "desc">("desc");

  // Fetch all bills (server-side search only; type/date filtered client-side for pill counts)
  const { data: rawBills = [], isLoading } = useBills({
    search: search || undefined,
  });
  const { data: stats = [], isLoading: statsLoading } = useBillStats();
  const deleteBill = useDeleteBill();

  // Client-side filtering
  const bills = useMemo(() => {
    let list = rawBills as any[];

    if (typeFilter !== "all") {
      list = list.filter((b) => b.billType === typeFilter);
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      list = list.filter((b) => b.issueDate && new Date(b.issueDate) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      list = list.filter((b) => b.issueDate && new Date(b.issueDate) <= to);
    }

    if (payerFilter !== "all") {
      list = list.filter((b) =>
        b.paidBy === payerFilter || b.firstPayerName === payerFilter
      );
    }

    list = [...list].sort((a, b) => {
      const aTime = a.issueDate ? new Date(a.issueDate).getTime() : 0;
      const bTime = b.issueDate ? new Date(b.issueDate).getTime() : 0;
      return dateSortDir === "desc" ? bTime - aTime : aTime - bTime;
    });

    return list;
  }, [rawBills, typeFilter, dateFrom, dateTo, payerFilter, dateSortDir]);

  // Counts per type (from rawBills, ignoring type filter, respecting date filter)
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    for (const b of rawBills as any[]) {
      counts.all = (counts.all ?? 0) + 1;
      counts[b.billType] = (counts[b.billType] ?? 0) + 1;
    }
    return counts;
  }, [rawBills]);

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteBill.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const TYPE_PILLS = [
    { key: "all",              label: "All" },
    { key: "supplier_bill",    label: "Supplier Bill" },
    { key: "operation_invoice",label: "Operation Bill" },
    { key: "packaging_invoice",label: "Packaging Bill" },
    { key: "shipping_invoice", label: "Shipping Bill" },
    { key: "devices_invoice",  label: "Devices Bill" },
    { key: "website_invoice",  label: "Website Service" },
    { key: "advertising_bill", label: "Advertising Bill" },
    { key: "other_expense",    label: "Other Expense" },
  ];

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

      {/* Filter bar: search + dropdowns + pills */}
      <div className="space-y-3">
        {/* Row 1: search + date preset + payer */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search invoices…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Date preset dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 h-9 text-sm font-medium hover:bg-muted transition-colors whitespace-nowrap">
                <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                {DATE_PRESETS.find((p) => p.key === datePreset)?.label ?? "All time"}
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              {DATE_PRESETS.map(({ key, label }) => (
                <DropdownMenuItem
                  key={key}
                  className="flex items-center justify-between"
                  onClick={() => {
                    setDatePreset(key as any);
                    if (key !== "custom") {
                      const { from, to } = getPresetRange(key);
                      setDateFrom(from);
                      setDateTo(to);
                    }
                  }}
                >
                  {label}
                  {datePreset === key && <Check className="h-3.5 w-3.5 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Payer dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 h-9 text-sm font-medium hover:bg-muted transition-colors whitespace-nowrap">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                {payerFilter === "all" ? "All Payers" : payerFilter}
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuItem
                className="flex items-center justify-between"
                onClick={() => setPayerFilter("all")}
              >
                All Payers
                {payerFilter === "all" && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
              {PAID_BY_OPTIONS.map((name) => (
                <DropdownMenuItem
                  key={name}
                  className="flex items-center justify-between"
                  onClick={() => setPayerFilter(name)}
                >
                  {name}
                  {payerFilter === name && <Check className="h-3.5 w-3.5 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Custom date inputs — only shown when preset = "custom" */}
        {datePreset === "custom" && (
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-36 h-9 text-sm"
            />
            <span className="text-muted-foreground text-sm">—</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-36 h-9 text-sm"
            />
            <button
              onClick={() => { setDatePreset("all"); setDateFrom(""); setDateTo(""); }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Row 2: type filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {TYPE_PILLS.map(({ key, label }) => {
            const count = typeCounts[key] ?? 0;
            const active = typeFilter === key;
            return (
              <button
                key={key}
                onClick={() => setTypeFilter(key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors border",
                  active
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground"
                )}
              >
                {label}
                <span className={cn(
                  "text-xs rounded-full px-1.5 py-0.5 leading-none tabular-nums",
                  active ? "bg-background/20 text-background" : "bg-muted text-muted-foreground"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : bills.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <Receipt className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-semibold">No invoices found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {search || typeFilter !== "all" || dateFrom || dateTo || payerFilter !== "all"
              ? "Try adjusting your filters."
              : "Get started by recording your first invoice."}
          </p>
          {!search && typeFilter === "all" && !dateFrom && !dateTo && payerFilter === "all" && (
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
              <TableRow className="bg-muted/30">
                <TableHead className="font-semibold">Invoice #</TableHead>
                <TableHead className="font-semibold">Type</TableHead>
                <TableHead className="font-semibold">Paid By</TableHead>
                <TableHead className="font-semibold">
                  <button
                    onClick={() => setDateSortDir((d) => d === "desc" ? "asc" : "desc")}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    Dates
                    {dateSortDir === "desc" ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronUp className="h-3.5 w-3.5" />
                    )}
                  </button>
                </TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="text-right font-semibold">Amount</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.map((bill) => (
                <TableRow key={bill.id} className="group">
                  {/* Invoice # + name */}
                  <TableCell>
                    <div className="flex items-start gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-semibold text-foreground">
                            {bill.billNumber ?? "—"}
                          </span>
                          {bill.receiptImageUrl && (
                            <button
                              type="button"
                              onClick={() => setPreviewUrl(bill.receiptImageUrl)}
                              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                              title="View receipt"
                            >
                              <ImageIcon className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        {bill.name && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">
                            {bill.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Type + Supplier combined */}
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className={cn(
                        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap w-fit",
                        TYPE_BADGE_STYLES[bill.billType] ?? "bg-gray-100 text-gray-600 border-gray-200"
                      )}>
                        {TYPE_PILL_LABELS[bill.billType] ?? bill.billType}
                      </span>
                      {bill.supplierName && (
                        <span className="text-xs text-muted-foreground pl-0.5">{bill.supplierName}</span>
                      )}
                    </div>
                  </TableCell>

                  {/* Paid By */}
                  <TableCell className="text-sm">
                    {bill.paidBy ? (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <User className="h-3.5 w-3.5 shrink-0" />
                        <span>{bill.paidBy}</span>
                      </div>
                    ) : bill.firstPayerName ? (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <User className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {bill.firstPayerName}
                          {bill.payerCount > 1 && (
                            <span className="text-muted-foreground/60">, +{bill.payerCount - 1}</span>
                          )}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Dates — stacked */}
                  <TableCell>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs text-foreground">
                        <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{formatDate(bill.issueDate)}</span>
                      </div>
                      {bill.dueDate && (
                        <div className={cn(
                          "flex items-center gap-1.5 text-xs",
                          bill.status === "overdue" ? "text-orange-600" : "text-muted-foreground"
                        )}>
                          <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                          <span>Due: {formatDate(bill.dueDate)}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Status — inline dropdown */}
                  <TableCell>
                    <StatusDropdown bill={bill} />
                  </TableCell>

                  {/* Amount */}
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatCurrency(bill.totalAmount)}
                  </TableCell>

                  {/* Actions — direct buttons */}
                  <TableCell>
                    <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => router.push(`/bills/${bill.id}/edit`)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteId(bill.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
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
        <DialogContent className="max-w-3xl p-0 overflow-hidden gap-0 [&>button]:hidden">
          <DialogTitle className="sr-only">Receipt Preview</DialogTitle>
          <div className="flex items-center justify-between px-3 py-2 border-b bg-background">
            <span className="text-sm font-medium text-muted-foreground">Receipt</span>
            <div className="flex items-center gap-1">
              {previewUrl && (
                <a
                  href={previewUrl}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded hover:bg-muted"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
              )}
              <button
                onClick={() => setPreviewUrl(null)}
                className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          {previewUrl && (
            <div className="p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Receipt"
                className="w-full h-auto max-h-[80vh] object-contain rounded"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
