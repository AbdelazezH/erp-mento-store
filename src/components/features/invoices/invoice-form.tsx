"use client";

import { useState, useMemo, useRef } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import {
  useCreateBill,
  useUpdateBill,
  useSuppliers,
  useCreateSupplier,
  useProducts,
} from "@/hooks/use-api";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  X,
  Trash2,
  Copy,
  ImageIcon,
  ChevronDown,
  Download,
  ZoomIn,
  Percent,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

export const BILL_TYPES = [
  { value: "supplier_bill", label: "Supplier Invoice" },
  { value: "operation_invoice", label: "Operation Invoice" },
  { value: "packaging_invoice", label: "Packaging Invoice" },
  { value: "shipping_invoice", label: "Shipping Invoice" },
  { value: "devices_invoice", label: "Devices Invoice" },
  { value: "website_invoice", label: "Website Invoice" },
  { value: "advertising_bill", label: "Advertising Bill" },
] as const;

export const PAID_BY_OPTIONS = [
  "Mento Store",
  "Abdelrhman Hany",
  "Abdelazez Hany",
  "Abdelghfar Hany",
  "Khadiga Hany",
];

// ─── Schema ──────────────────────────────────────────────────────────────────

const lineItemSchema = z.object({
  mode: z.enum(["product", "text"]).default("text"),
  productId: z.string().optional().nullable(),
  description: z.string().min(1, "Required"),
  quantity: z.coerce.number().min(0.01, "Must be > 0"),
  unitPrice: z.coerce.number().min(0, "Must be >= 0"),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
});

const invoiceSchema = z.object({
  billType: z.enum([
    "supplier_bill",
    "operation_invoice",
    "packaging_invoice",
    "shipping_invoice",
    "devices_invoice",
    "website_invoice",
  ]),
  supplierId: z.string().optional().nullable(),
  name: z.string().optional(),
  paidBy: z.string().optional().nullable(),
  status: z.enum(["pending", "overdue", "paid", "cancelled"]),
  issueDate: z.string().min(1, "Required"),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  receiptImageUrl: z.string().optional().nullable(),
  items: z.array(lineItemSchema).min(1, "At least one line item required"),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcLineTotal(qty: number, unit: number, disc: number) {
  return qty * unit * (1 - disc / 100);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Product Combobox ─────────────────────────────────────────────────────────

function ProductCombobox({
  value,
  onSelect,
}: {
  value: string | null | undefined;
  onSelect: (product: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: products = [] } = useProducts({ search: search || undefined });

  const selected = (products as any[]).find((p) => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-left transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring",
            !selected && "text-muted-foreground"
          )}
        >
          {selected ? (
            <>
              {selected.imageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={selected.imageUrl} alt="" className="h-6 w-6 rounded object-cover shrink-0" />
              ) : (
                <div className="h-6 w-6 rounded bg-muted shrink-0 flex items-center justify-center">
                  <ImageIcon className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
              <span className="flex-1 truncate">{selected.name}</span>
              {selected.sku && (
                <span className="font-mono text-xs text-muted-foreground shrink-0">{selected.sku}</span>
              )}
            </>
          ) : (
            <>
              <div className="h-6 w-6 rounded bg-muted shrink-0 flex items-center justify-center">
                <ImageIcon className="h-3 w-3 text-muted-foreground" />
              </div>
              <span>Search product...</span>
            </>
          )}
          <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search products..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No products found.</CommandEmpty>
            <CommandGroup>
              {(products as any[]).slice(0, 20).map((product) => (
                <CommandItem
                  key={product.id}
                  value={product.id}
                  onSelect={() => {
                    onSelect(product);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <div className="flex items-center gap-2 w-full">
                    {product.imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={product.imageUrl}
                        alt=""
                        className="h-8 w-8 rounded object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded bg-muted shrink-0 flex items-center justify-center">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      {product.sku && (
                        <p className="font-mono text-xs text-muted-foreground">{product.sku}</p>
                      )}
                    </div>
                    {product.basePrice && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatCurrency(product.basePrice)}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Receipt Drop Zone ────────────────────────────────────────────────────────

function ReceiptDropZone({
  value,
  onChange,
}: {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      onChange(url);
    } catch {
      // silent
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
    <div
      className={cn(
        "relative rounded-lg border-2 border-dashed p-8 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer",
        dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 bg-muted/20 hover:bg-muted/30",
        value && "p-4"
      )}
      onClick={() => !value && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {uploading ? (
        <p className="text-sm text-muted-foreground">Uploading…</p>
      ) : value ? (
        <div className="flex items-center gap-4 w-full">
          {/* Clickable thumbnail → opens lightbox */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setPreviewOpen(true); }}
            className="relative group/thumb h-20 w-20 shrink-0 rounded-lg overflow-hidden border focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Receipt" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
              <ZoomIn className="h-5 w-5 text-white" />
            </div>
          </button>
          <div className="flex-1">
            <p className="text-sm font-medium">Receipt uploaded</p>
            <p className="text-xs text-muted-foreground">Click image to preview · drag or click area to replace</p>
          </div>
          <a
            href={value}
            download
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </a>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onChange(null); }}
            className="text-muted-foreground hover:text-destructive shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <>
          <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Drop receipt image or{" "}
            <span className="text-primary font-medium">browse</span>
          </p>
        </>
      )}
    </div>

    {/* Full-size preview lightbox */}
    {value && (
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden gap-0 [&>button]:hidden">
          <DialogTitle className="sr-only">Receipt Preview</DialogTitle>
          <div className="flex items-center justify-between px-3 py-2 border-b bg-background">
            <span className="text-sm font-medium text-muted-foreground">Receipt Preview</span>
            <div className="flex items-center gap-1">
              <a
                href={value}
                download
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded hover:bg-muted"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </a>
              <button
                onClick={() => setPreviewOpen(false)}
                className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Receipt"
              className="w-full h-auto max-h-[80vh] object-contain rounded"
            />
          </div>
        </DialogContent>
      </Dialog>
    )}
    </>
  );
}

// ─── Invoice Form ─────────────────────────────────────────────────────────────

export function InvoiceForm({
  billId,
  defaultValues,
  initialPayers,
}: {
  billId?: string;
  defaultValues?: Partial<InvoiceFormValues>;
  initialPayers?: { personName: string; amount: string }[];
}) {
  const router = useRouter();
  const createBill = useCreateBill();
  const updateBill = useUpdateBill();
  const { data: suppliers = [] } = useSuppliers();
  const createSupplier = useCreateSupplier();
  const { data: allProducts = [] } = useProducts();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      billType: "supplier_bill",
      status: "pending",
      issueDate: today(),
      dueDate: today(),
      items: [{ mode: "text", productId: null, description: "", quantity: 1, unitPrice: 0, discountPercent: 0 }],
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const watchedItems = useWatch({ control, name: "items" });
  const watchedBillType = watch("billType");
  const watchedReceiptUrl = watch("receiptImageUrl");
  const isSupplierInvoice = watchedBillType === "supplier_bill";

  // Split payment state
  const [isSplit, setIsSplit] = useState(() => (initialPayers?.length ?? 0) > 1);
  const [payers, setPayers] = useState<{ personName: string; amount: string }[]>(
    () =>
      initialPayers && initialPayers.length > 0
        ? initialPayers
        : [{ personName: "", amount: "" }]
  );

  // Bulk discount dialog
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkValue, setBulkValue] = useState("");
  const [bulkMode, setBulkMode] = useState<"percent" | "fixed">("percent");

  // Add supplier modal
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierContact, setNewSupplierContact] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");

  async function handleCreateSupplier() {
    if (!newSupplierName.trim()) return;
    const result = await createSupplier.mutateAsync({
      name: newSupplierName.trim(),
      contactName: newSupplierContact.trim() || undefined,
      phone: newSupplierPhone.trim() || undefined,
    }) as { id: string };
    setValue("supplierId", result.id);
    setSupplierModalOpen(false);
    setNewSupplierName("");
    setNewSupplierContact("");
    setNewSupplierPhone("");
  }

  // Totals
  const { subTotal, totalDiscount, grandTotal } = useMemo(() => {
    const items = watchedItems ?? [];
    let subTotal = 0;
    let totalDiscount = 0;
    items.forEach((item) => {
      const qty = Number(item.quantity) || 0;
      const unit = Number(item.unitPrice) || 0;
      const disc = Number(item.discountPercent) || 0;
      subTotal += qty * unit;
      totalDiscount += qty * unit * (disc / 100);
    });
    return { subTotal, totalDiscount, grandTotal: subTotal - totalDiscount };
  }, [watchedItems]);

  const onSubmit = async (data: InvoiceFormValues) => {
    // Split validation
    if (isSplit) {
      const payerTotal = payers.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      if (Math.abs(payerTotal - grandTotal) > 0.01) {
        alert(`Split amounts (${formatCurrency(payerTotal)}) must equal the invoice total (${formatCurrency(grandTotal)}).`);
        return;
      }
      const hasEmpty = payers.some((p) => !p.personName || !p.amount);
      if (hasEmpty) {
        alert("All payer rows must have a person and an amount.");
        return;
      }
    }

    const lineItems = data.items.map((item) => {
      const qty = Number(item.quantity);
      const unit = Number(item.unitPrice);
      const disc = Number(item.discountPercent) || 0;
      const total = qty * unit * (1 - disc / 100);
      return {
        productId: item.mode === "product" ? (item.productId ?? null) : null,
        description: item.description,
        quantity: String(qty),
        unitPrice: String(unit),
        discountPercent: String(disc),
        discountType: "percent" as const,
        total: total.toFixed(2),
      };
    });

    const payersPayload = isSplit
      ? payers.map((p) => ({ personName: p.personName, amount: p.amount }))
      : data.paidBy
      ? [{ personName: data.paidBy, amount: grandTotal.toFixed(2) }]
      : [];

    const payload = {
      name: data.name || undefined,
      billType: data.billType,
      supplierId: isSupplierInvoice ? (data.supplierId || null) : null,
      paidBy: isSplit ? null : (data.paidBy || null),
      status: data.status,
      issueDate: data.issueDate,
      dueDate: data.dueDate || null,
      notes: data.notes || null,
      receiptImageUrl: data.receiptImageUrl || null,
      lineItems,
      payers: payersPayload,
    };

    if (billId) {
      await updateBill.mutateAsync({ id: billId, ...payload });
    } else {
      await createBill.mutateAsync(payload);
    }
    router.push("/bills");
  };

  function duplicateLine(idx: number) {
    const item = watchedItems?.[idx];
    if (item) append({ ...item });
  }

  function applyBulkDiscount() {
    const val = parseFloat(bulkValue) || 0;
    const pct =
      bulkMode === "fixed"
        ? subTotal > 0
          ? Math.min(100, (val / subTotal) * 100)
          : 0
        : Math.min(100, Math.max(0, val));
    fields.forEach((_, i) =>
      setValue(`items.${i}.discountPercent`, parseFloat(pct.toFixed(4)))
    );
    setBulkDialogOpen(false);
    setBulkValue("");
    setBulkMode("percent");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {billId ? "Edit Invoice" : "New Invoice"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {billId ? "Update invoice details and line items" : "Create a new invoice or bill"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/bills")}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : billId ? "Save Changes" : "Create Invoice"}
          </Button>
        </div>
      </div>

      {/* Top Info Card */}
      <Card>
        <CardContent className="pt-6 space-y-5">
          {/* Row 1: Type + Supplier */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>
                Bill Type <span className="text-destructive">*</span>
              </Label>
              <Select
                defaultValue={defaultValues?.billType ?? "supplier_bill"}
                onValueChange={(v) => setValue("billType", v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BILL_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isSupplierInvoice ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>
                    Supplier <span className="text-destructive">*</span>
                  </Label>
                  <button
                    type="button"
                    onClick={() => setSupplierModalOpen(true)}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Plus className="h-3 w-3" />
                    New Supplier
                  </button>
                </div>
                <Select
                  defaultValue={defaultValues?.supplierId ?? ""}
                  onValueChange={(v) => setValue("supplierId", v === "__none__" ? null : v)}
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
            ) : (
              <div /> /* placeholder to keep grid alignment */
            )}
          </div>

          {/* Row 2: Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Name <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="e.g. March Packaging Run, Office Supplies April…"
            />
          </div>

          {/* Row 3: Paid By + Split + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>
                  Paid By <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Split</span>
                  <Switch
                    checked={isSplit}
                    onCheckedChange={(checked) => {
                      setIsSplit(checked);
                      if (checked) {
                        setPayers([{ personName: "", amount: "" }, { personName: "", amount: "" }]);
                      } else {
                        setPayers([{ personName: "", amount: "" }]);
                      }
                    }}
                  />
                </div>
              </div>

              {!isSplit ? (
                <Select
                  defaultValue={defaultValues?.paidBy ?? ""}
                  onValueChange={(v) => setValue("paidBy", v === "__none__" ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select person..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {PAID_BY_OPTIONS.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="space-y-2">
                  {payers.map((payer, pi) => (
                    <div key={pi} className="flex items-center gap-2">
                      <Select
                        value={payer.personName}
                        onValueChange={(v) =>
                          setPayers((prev) =>
                            prev.map((p, i) => (i === pi ? { ...p, personName: v } : p))
                          )
                        }
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Person..." />
                        </SelectTrigger>
                        <SelectContent>
                          {PAID_BY_OPTIONS.map((name) => (
                            <SelectItem key={name} value={name}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={payer.amount}
                        onChange={(e) =>
                          setPayers((prev) =>
                            prev.map((p, i) => (i === pi ? { ...p, amount: e.target.value } : p))
                          )
                        }
                        className="w-28 h-9 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          payers.length > 2 &&
                          setPayers((prev) => prev.filter((_, i) => i !== pi))
                        }
                        disabled={payers.length <= 2}
                        className="text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => setPayers((prev) => [...prev, { personName: "", amount: "" }])}
                    className="w-full rounded-md border border-dashed border-muted-foreground/30 py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add Payer
                  </button>

                  {/* Balance indicator */}
                  {(() => {
                    const paid = payers.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
                    const balanced = Math.abs(paid - grandTotal) < 0.01;
                    return (
                      <div className={cn(
                        "rounded-md px-3 py-2 text-xs flex items-center justify-between",
                        balanced ? "bg-green-50 text-green-700 border border-green-200" : "bg-orange-50 text-orange-700 border border-orange-200"
                      )}>
                        <span className="font-mono">{formatCurrency(paid)} / {formatCurrency(grandTotal)} EGP</span>
                        {balanced && <span>✓</span>}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                defaultValue={defaultValues?.status ?? "pending"}
                onValueChange={(v) => setValue("status", v as any)}
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

          {/* Row 4: Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="issueDate">
                Issue Date <span className="text-destructive">*</span>
              </Label>
              <Input id="issueDate" type="date" {...register("issueDate")} />
              {errors.issueDate && (
                <p className="text-xs text-destructive">{errors.issueDate.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dueDate">
                Due Date <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input id="dueDate" type="date" {...register("dueDate")} />
            </div>
          </div>

          {/* Row 5: Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">
              Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Any additional notes…"
              rows={3}
            />
          </div>

          {/* Row 6: Receipt Image */}
          <div className="space-y-1.5">
            <Label>
              Receipt / Invoice Image <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <ReceiptDropZone
              value={watchedReceiptUrl}
              onChange={(url) => setValue("receiptImageUrl", url)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Line Items Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <CardTitle>Line Items</CardTitle>
              {isSupplierInvoice && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  Select a product to see its historical cost &amp; margin analysis.
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setBulkDialogOpen(true)}>
                <Percent className="mr-1.5 h-3.5 w-3.5" />
                Bulk Discount
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    mode: "text",
                    productId: null,
                    description: "",
                    quantity: 1,
                    unitPrice: 0,
                    discountPercent: 0,
                  })
                }
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Line
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {errors.items && !Array.isArray(errors.items) && (
            <p className="text-xs text-destructive mb-3">{(errors.items as any).message}</p>
          )}

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product / Description</TableHead>
                  <TableHead className="w-24">Qty</TableHead>
                  <TableHead className="w-28">Unit Price</TableHead>
                  <TableHead className="w-36">Discount</TableHead>
                  <TableHead className="w-28 text-right">Total</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, idx) => {
                  const item = watchedItems?.[idx];
                  const qty = Number(item?.quantity) || 0;
                  const unit = Number(item?.unitPrice) || 0;
                  const disc = Number(item?.discountPercent) || 0;
                  const lineTotal = qty * unit * (1 - disc / 100);
                  const mode = item?.mode ?? "text";

                  return (
                    <TableRow key={field.id}>
                      <TableCell className="py-2">
                        {/* Mode tabs (only for supplier invoice) */}
                        {isSupplierInvoice && (
                          <div className="flex items-center gap-1 mb-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setValue(`items.${idx}.mode`, "product");
                                setValue(`items.${idx}.productId`, null);
                                setValue(`items.${idx}.description`, "");
                              }}
                              className={cn(
                                "flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors",
                                mode === "product"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground hover:text-foreground"
                              )}
                            >
                              <span className="text-[10px]">⊞</span> Product
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setValue(`items.${idx}.mode`, "text");
                                setValue(`items.${idx}.productId`, null);
                              }}
                              className={cn(
                                "flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors",
                                mode === "text"
                                  ? "bg-muted text-foreground"
                                  : "bg-muted text-muted-foreground hover:text-foreground"
                              )}
                            >
                              <span className="text-[10px]">T</span> Text
                            </button>
                          </div>
                        )}

                        {/* Input */}
                        {isSupplierInvoice && mode === "product" ? (
                          <ProductCombobox
                            value={item?.productId}
                            onSelect={(product) => {
                              setValue(`items.${idx}.productId`, product.id);
                              setValue(`items.${idx}.description`, product.name);
                              if (product.basePrice) {
                                setValue(`items.${idx}.unitPrice`, parseFloat(product.basePrice));
                              }
                            }}
                          />
                        ) : (
                          <Input
                            {...register(`items.${idx}.description`)}
                            placeholder="Item description"
                            className="h-8 text-sm"
                          />
                        )}
                        {errors.items?.[idx]?.description && (
                          <p className="text-xs text-destructive mt-0.5">
                            {errors.items[idx]?.description?.message}
                          </p>
                        )}
                      </TableCell>

                      <TableCell className="py-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...register(`items.${idx}.quantity`)}
                          className="h-8 text-sm"
                        />
                      </TableCell>

                      <TableCell className="py-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...register(`items.${idx}.unitPrice`)}
                          className="h-8 text-sm"
                        />
                      </TableCell>

                      <TableCell className="py-2">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground w-5 text-center shrink-0">%</span>
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            max="100"
                            {...register(`items.${idx}.discountPercent`)}
                            className="h-8 text-sm w-24"
                          />
                        </div>
                      </TableCell>

                      <TableCell className="py-2 text-right font-medium tabular-nums text-sm">
                        {formatCurrency(lineTotal)}
                      </TableCell>

                      <TableCell className="py-2">
                        <div className="flex items-center gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => duplicateLine(idx)}
                            title="Duplicate line"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => fields.length > 1 && remove(idx)}
                            disabled={fields.length === 1}
                            title="Delete line"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Totals */}
          <div className="mt-4 flex justify-end">
            <div className="w-72 space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Sub-total</span>
                <span className="tabular-nums">{formatCurrency(subTotal)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount</span>
                  <span className="tabular-nums text-red-600">−{formatCurrency(totalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-1.5 text-base font-bold">
                <span>Total</span>
                <span className="tabular-nums">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sticky bottom bar */}
      <div className="flex justify-end gap-2 pb-8">
        <Button type="button" variant="outline" onClick={() => router.push("/bills")}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : billId ? "Save Changes" : "Create Invoice"}
        </Button>
      </div>

      {/* Bulk Discount Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Bulk Discount</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Mode toggle */}
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => setBulkMode("percent")}
                className={cn(
                  "flex-1 rounded-md py-1.5 text-sm font-medium transition-colors",
                  bulkMode === "percent"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                %
              </button>
              <button
                type="button"
                onClick={() => setBulkMode("fixed")}
                className={cn(
                  "flex-1 rounded-md py-1.5 text-sm font-medium transition-colors",
                  bulkMode === "fixed"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                L.E Amount
              </button>
            </div>

            {/* Input */}
            <div className="space-y-1.5">
              <Label>{bulkMode === "percent" ? "Discount %" : "Discount Amount (L.E)"}</Label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder={bulkMode === "percent" ? "e.g. 10" : "e.g. 50"}
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                  className="pr-12"
                  autoFocus
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                  {bulkMode === "percent" ? "%" : "L.E"}
                </span>
              </div>
              {/* Live conversion preview in fixed mode */}
              {bulkMode === "fixed" && bulkValue && subTotal > 0 && (
                <p className="text-xs text-muted-foreground">
                  ≈{" "}
                  {Math.min(100, ((parseFloat(bulkValue) || 0) / subTotal) * 100).toFixed(2)}
                  % of {formatCurrency(subTotal)}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setBulkDialogOpen(false);
                setBulkValue("");
                setBulkMode("percent");
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={applyBulkDiscount}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Supplier Modal */}
      <Dialog open={supplierModalOpen} onOpenChange={setSupplierModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add New Supplier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="ns-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ns-name"
                placeholder="e.g. Cairo Textiles Co."
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateSupplier();
                  }
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ns-contact">
                Contact Name <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="ns-contact"
                placeholder="e.g. Ahmed Hassan"
                value={newSupplierContact}
                onChange={(e) => setNewSupplierContact(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ns-phone">
                Phone <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="ns-phone"
                placeholder="e.g. 01012345678"
                value={newSupplierPhone}
                onChange={(e) => setNewSupplierPhone(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSupplierModalOpen(false);
                setNewSupplierName("");
                setNewSupplierContact("");
                setNewSupplierPhone("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateSupplier}
              disabled={!newSupplierName.trim() || createSupplier.isPending}
            >
              {createSupplier.isPending ? "Adding…" : "Add Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
