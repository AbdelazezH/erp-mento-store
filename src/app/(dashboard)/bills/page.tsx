"use client";

import { useState, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useBills,
  useCreateBill,
  useUpdateBill,
  useDeleteBill,
  useSuppliers,
} from "@/hooks/use-api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Receipt,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type BillStatus = "pending" | "overdue" | "paid" | "cancelled";
type BillType = "supplier_bill" | "other_expense";

// ─── Schema ──────────────────────────────────────────────────────────────────

const lineItemSchema = z.object({
  description: z.string().min(1, "Required"),
  quantity: z.coerce.number().min(0.01, "Must be > 0"),
  unitPrice: z.coerce.number().min(0, "Must be >= 0"),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
});

const billSchema = z.object({
  name: z.string().min(1, "Bill name is required"),
  billType: z.enum(["supplier_bill", "other_expense"]),
  supplierId: z.string().optional(),
  paidBy: z.string().optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(["pending", "overdue", "paid", "cancelled"]),
  notes: z.string().optional(),
  items: z.array(lineItemSchema).min(1, "At least one line item required"),
});

type BillFormValues = z.infer<typeof billSchema>;

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

function calcLineTotal(qty: number, unit: number, disc: number) {
  return qty * unit * (1 - disc / 100);
}

// ─── Bill Form Dialog ─────────────────────────────────────────────────────────

function BillFormDialog({
  open,
  onClose,
  defaultValues,
  billId,
}: {
  open: boolean;
  onClose: () => void;
  defaultValues?: Partial<BillFormValues>;
  billId?: string;
}) {
  const createBill = useCreateBill();
  const updateBill = useUpdateBill();
  const { data: suppliers = [] } = useSuppliers();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<BillFormValues>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      name: "",
      billType: "supplier_bill",
      status: "pending",
      items: [{ description: "", quantity: 1, unitPrice: 0, discountPercent: 0 }],
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const watchedItems = watch("items");
  const watchedBillType = watch("billType");

  const grandTotal = useMemo(() => {
    return (watchedItems ?? []).reduce((sum, item) => {
      return sum + calcLineTotal(
        Number(item.quantity) || 0,
        Number(item.unitPrice) || 0,
        Number(item.discountPercent) || 0,
      );
    }, 0);
  }, [watchedItems]);

  const onSubmit = async (data: BillFormValues) => {
    const payload = {
      ...data,
      supplierId: data.billType === "supplier_bill" ? (data.supplierId || null) : null,
      totalAmount: grandTotal,
    };
    if (billId) {
      await updateBill.mutateAsync({ id: billId, ...payload });
    } else {
      await createBill.mutateAsync(payload);
    }
    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{billId ? "Edit Bill" : "New Bill"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Row 1: name + billType */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">
                Bill Name <span className="text-destructive">*</span>
              </Label>
              <Input id="name" {...register("name")} placeholder="e.g. Office supplies" />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Bill Type</Label>
              <Select
                defaultValue={defaultValues?.billType ?? "supplier_bill"}
                onValueChange={(v) => setValue("billType", v as BillType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="supplier_bill">Supplier Bill</SelectItem>
                  <SelectItem value="other_expense">Other Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: supplierId (conditional) + paidBy */}
          <div className="grid grid-cols-2 gap-4">
            {watchedBillType === "supplier_bill" && (
              <div className="space-y-1.5">
                <Label>Supplier</Label>
                <Select
                  defaultValue={defaultValues?.supplierId ?? ""}
                  onValueChange={(v) => setValue("supplierId", v === "__none__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {(suppliers as any[]).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="paidBy">Paid By</Label>
              <Input id="paidBy" {...register("paidBy")} placeholder="e.g. Ahmed" />
            </div>
          </div>

          {/* Row 3: dates + status */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="issueDate">Issue Date</Label>
              <Input id="issueDate" type="date" {...register("issueDate")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input id="dueDate" type="date" {...register("dueDate")} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                defaultValue={defaultValues?.status ?? "pending"}
                onValueChange={(v) => setValue("status", v as BillStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} placeholder="Optional notes…" rows={2} />
          </div>

          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Line Items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({ description: "", quantity: 1, unitPrice: 0, discountPercent: 0 })
                }
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Row
              </Button>
            </div>

            {errors.items && !Array.isArray(errors.items) && (
              <p className="text-xs text-destructive">{(errors.items as any).message}</p>
            )}

            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-24">Qty</TableHead>
                    <TableHead className="w-28">Unit Price</TableHead>
                    <TableHead className="w-24">Disc %</TableHead>
                    <TableHead className="w-28 text-right">Total</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, idx) => {
                    const item = watchedItems?.[idx];
                    const lineTotal = calcLineTotal(
                      Number(item?.quantity) || 0,
                      Number(item?.unitPrice) || 0,
                      Number(item?.discountPercent) || 0,
                    );
                    return (
                      <TableRow key={field.id}>
                        <TableCell>
                          <Input
                            {...register(`items.${idx}.description`)}
                            placeholder="Item description"
                            className="h-8 text-sm"
                          />
                          {errors.items?.[idx]?.description && (
                            <p className="text-xs text-destructive mt-0.5">
                              {errors.items[idx]?.description?.message}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            {...register(`items.${idx}.quantity`)}
                            className="h-8 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            {...register(`items.${idx}.unitPrice`)}
                            className="h-8 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            {...register(`items.${idx}.discountPercent`)}
                            className="h-8 text-sm"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums text-sm">
                          {formatCurrency(lineTotal)}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => fields.length > 1 && remove(idx)}
                            disabled={fields.length === 1}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Grand Total */}
            <div className="flex justify-end">
              <div className="rounded-lg bg-muted px-5 py-3 text-right">
                <p className="text-xs text-muted-foreground">Grand Total</p>
                <p className="text-xl font-bold tabular-nums">{formatCurrency(grandTotal)}</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : billId ? "Save Changes" : "Create Bill"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BillsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [editBill, setEditBill] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: bills = [], isLoading } = useBills({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    billType: typeFilter !== "all" ? typeFilter : undefined,
  });

  const deleteBill = useDeleteBill();

  // Summary calculations
  const summary = useMemo(() => {
    const all = bills as any[];
    const pendingSum = all
      .filter((b) => b.status === "pending" || b.status === "overdue")
      .reduce((s, b) => s + parseFloat(b.totalAmount ?? "0"), 0);
    const paidSum = all
      .filter((b) => b.status === "paid")
      .reduce((s, b) => s + parseFloat(b.totalAmount ?? "0"), 0);
    return { count: all.length, pendingSum, paidSum };
  }, [bills]);

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
          <h1 className="text-2xl font-bold tracking-tight">Bills & Expenses</h1>
          <p className="text-sm text-muted-foreground">Track supplier bills and other expenses</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Bill
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Bills</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary.count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending / Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-yellow-600">
              {formatCurrency(summary.pendingSum)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-green-600">
              {formatCurrency(summary.paidSum)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search bills…"
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
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="supplier_bill">Supplier Bill</SelectItem>
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
          <h3 className="text-lg font-semibold">No bills found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {search || statusFilter !== "all" || typeFilter !== "all"
              ? "Try adjusting your filters."
              : "Get started by recording your first bill."}
          </p>
          {!search && statusFilter === "all" && typeFilter === "all" && (
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Bill
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Supplier / Type</TableHead>
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
                    {bill.billNumber ?? "—"}
                  </TableCell>
                  <TableCell className="font-medium max-w-[160px] truncate">
                    {bill.name}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {bill.billType === "supplier_bill"
                      ? (bill.supplier?.name ?? "—")
                      : "Other Expense"}
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
                        <DropdownMenuItem onClick={() => setEditBill(bill)}>
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

      {/* Create Dialog */}
      <BillFormDialog open={createOpen} onClose={() => setCreateOpen(false)} />

      {/* Edit Dialog */}
      {editBill && (
        <BillFormDialog
          open={!!editBill}
          onClose={() => setEditBill(null)}
          billId={editBill.id}
          defaultValues={{
            name: editBill.name ?? "",
            billType: editBill.billType ?? "supplier_bill",
            supplierId: editBill.supplierId ?? "",
            paidBy: editBill.paidBy ?? "",
            issueDate: editBill.issueDate ? editBill.issueDate.substring(0, 10) : "",
            dueDate: editBill.dueDate ? editBill.dueDate.substring(0, 10) : "",
            status: editBill.status ?? "pending",
            notes: editBill.notes ?? "",
            items:
              editBill.items?.length > 0
                ? editBill.items.map((i: any) => ({
                    description: i.description ?? "",
                    quantity: parseFloat(i.quantity ?? "1"),
                    unitPrice: parseFloat(i.unitPrice ?? "0"),
                    discountPercent: parseFloat(i.discountPercent ?? "0"),
                  }))
                : [{ description: "", quantity: 1, unitPrice: 0, discountPercent: 0 }],
          }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bill</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the bill. This action cannot be undone.
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
    </div>
  );
}
