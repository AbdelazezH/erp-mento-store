"use client";

import { useState, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useOrders,
  useCreateOrder,
  useUpdateOrder,
  useDeleteOrder,
  useCustomers,
  useProducts,
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
  DropdownMenuSeparator,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  ShoppingCart,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus = "draft" | "pending" | "delivered" | "cancelled";

// ─── Schema ──────────────────────────────────────────────────────────────────

const orderItemSchema = z.object({
  productId: z.string().min(1, "Product required"),
  variant: z.string().optional(),
  quantity: z.coerce.number().int().min(1, "Min 1"),
  unitPrice: z.coerce.number().min(0),
  isFree: z.boolean().default(false),
});

const orderSchema = z.object({
  customerId: z.string().min(1, "Customer required"),
  orderDate: z.string().optional(),
  status: z.enum(["draft", "pending", "delivered", "cancelled"]),
  notes: z.string().optional(),
  customerFeedback: z.string().optional(),
  shippingFee: z.coerce.number().min(0).default(0),
  shippingDiscount: z.coerce.number().min(0).default(0),
  items: z.array(orderItemSchema).min(1, "At least one item required"),
});

type OrderFormValues = z.infer<typeof orderSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusVariant(status: OrderStatus) {
  switch (status) {
    case "draft": return "secondary" as const;
    case "pending": return "warning" as const;
    case "delivered": return "success" as const;
    case "cancelled": return "destructive" as const;
  }
}

function statusLabel(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const STATUS_TABS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

// ─── Order Form Dialog ────────────────────────────────────────────────────────

function OrderFormDialog({
  open,
  onClose,
  defaultValues,
  orderId,
}: {
  open: boolean;
  onClose: () => void;
  defaultValues?: Partial<OrderFormValues>;
  orderId?: string;
}) {
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();
  const { data: customers = [] } = useCustomers();
  const { data: products = [] } = useProducts();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customerId: "",
      status: "pending",
      shippingFee: 0,
      shippingDiscount: 0,
      items: [{ productId: "", variant: "", quantity: 1, unitPrice: 0, isFree: false }],
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const watchedItems = watch("items");
  const watchedShippingFee = watch("shippingFee");
  const watchedShippingDiscount = watch("shippingDiscount");

  // Calc summary
  const { subtotal, shippingNet, grandTotal, estimatedProfit } = useMemo(() => {
    const sub = (watchedItems ?? []).reduce((sum, item) => {
      if (item.isFree) return sum;
      return sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    }, 0);
    const net = Math.max(0, (Number(watchedShippingFee) || 0) - (Number(watchedShippingDiscount) || 0));
    const grand = sub + net;

    // Estimate profit = revenue - COGS (use product averageCost)
    const cogs = (watchedItems ?? []).reduce((sum, item) => {
      if (item.isFree) return sum;
      const prod = (products as any[]).find((p) => p.id === item.productId);
      const cost = prod ? parseFloat(prod.averageCost ?? prod.basePrice ?? "0") : 0;
      return sum + cost * (Number(item.quantity) || 0);
    }, 0);
    const profit = grand - cogs;
    return { subtotal: sub, shippingNet: net, grandTotal: grand, estimatedProfit: profit };
  }, [watchedItems, watchedShippingFee, watchedShippingDiscount, products]);

  const onSubmit = async (data: OrderFormValues) => {
    const payload = { ...data, totalAmount: grandTotal };
    if (orderId) {
      await updateOrder.mutateAsync({ id: orderId, ...payload });
    } else {
      await createOrder.mutateAsync(payload);
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
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{orderId ? "Edit Order" : "New Order"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Row 1: customer + date + status */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>
                Customer <span className="text-destructive">*</span>
              </Label>
              <Select
                defaultValue={defaultValues?.customerId ?? ""}
                onValueChange={(v) => setValue("customerId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {(customers as any[]).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.customerId && (
                <p className="text-xs text-destructive">{errors.customerId.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="orderDate">Order Date</Label>
              <Input id="orderDate" type="date" {...register("orderDate")} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                defaultValue={defaultValues?.status ?? "pending"}
                onValueChange={(v) => setValue("status", v as OrderStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: shipping */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="shippingFee">Shipping Fee</Label>
              <Input
                id="shippingFee"
                type="number"
                step="0.01"
                min="0"
                {...register("shippingFee")}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shippingDiscount">Shipping Discount</Label>
              <Input
                id="shippingDiscount"
                type="number"
                step="0.01"
                min="0"
                {...register("shippingDiscount")}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Notes + Feedback */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" {...register("notes")} placeholder="Internal notes…" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customerFeedback">Customer Feedback</Label>
              <Textarea
                id="customerFeedback"
                {...register("customerFeedback")}
                placeholder="Customer feedback…"
                rows={2}
              />
            </div>
          </div>

          <Separator />

          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Order Items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({ productId: "", variant: "", quantity: 1, unitPrice: 0, isFree: false })
                }
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Item
              </Button>
            </div>

            {errors.items && !Array.isArray(errors.items) && (
              <p className="text-xs text-destructive">{(errors.items as any).message}</p>
            )}

            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="w-28">Variant</TableHead>
                    <TableHead className="w-20">Qty</TableHead>
                    <TableHead className="w-28">Unit Price</TableHead>
                    <TableHead className="w-16 text-center">Free?</TableHead>
                    <TableHead className="w-28 text-right">Total</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, idx) => {
                    const item = watchedItems?.[idx];
                    const isFree = item?.isFree;
                    const lineTotal = isFree
                      ? 0
                      : (Number(item?.quantity) || 0) * (Number(item?.unitPrice) || 0);

                    return (
                      <TableRow key={field.id}>
                        <TableCell>
                          <Select
                            defaultValue={defaultValues?.items?.[idx]?.productId ?? ""}
                            onValueChange={(v) => {
                              setValue(`items.${idx}.productId`, v);
                              const prod = (products as any[]).find((p) => p.id === v);
                              if (prod?.sellingPrice) {
                                setValue(
                                  `items.${idx}.unitPrice`,
                                  parseFloat(prod.sellingPrice),
                                );
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {(products as any[]).map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.items?.[idx]?.productId && (
                            <p className="text-xs text-destructive mt-0.5">
                              {errors.items[idx]?.productId?.message}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            {...register(`items.${idx}.variant`)}
                            placeholder="e.g. Red, L"
                            className="h-8 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            step="1"
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
                            disabled={isFree}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            {...register(`items.${idx}.isFree`)}
                            className="h-4 w-4 rounded border-input"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums text-sm">
                          {isFree ? (
                            <span className="text-muted-foreground italic text-xs">Free</span>
                          ) : (
                            formatCurrency(lineTotal)
                          )}
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

            {/* Order Footer Summary */}
            <div className="flex justify-end">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2 min-w-[260px]">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="tabular-nums">{formatCurrency(shippingNet)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Grand Total</span>
                  <span className="tabular-nums">{formatCurrency(grandTotal)}</span>
                </div>
                <div
                  className={`flex justify-between text-sm font-medium ${
                    estimatedProfit >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  <span>Est. Profit</span>
                  <span className="tabular-nums">{formatCurrency(estimatedProfit)}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : orderId ? "Save Changes" : "Create Order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useOrders({
    status: activeTab !== "all" ? activeTab : undefined,
  });

  const updateOrder = useUpdateOrder();
  const deleteOrder = useDeleteOrder();

  // Summary
  const summary = useMemo(() => {
    const all = orders as any[];
    const delivered = all.filter((o) => o.status === "delivered");
    const revenue = delivered.reduce(
      (s, o) => s + parseFloat(o.totalAmount ?? "0"),
      0,
    );
    const profit = all.reduce((s, o) => s + parseFloat(o.estimatedProfit ?? "0"), 0);
    return { total: all.length, revenue, profit };
  }, [orders]);

  const handleStatusChange = async (id: string, status: OrderStatus) => {
    await updateOrder.mutateAsync({ id, status });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteOrder.mutateAsync(deleteId);
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales Orders</h1>
          <p className="text-sm text-muted-foreground">Manage customer orders</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Order
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Delivered Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{formatCurrency(summary.revenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold tabular-nums ${
                summary.profit >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(summary.profit)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (orders as any[]).length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <ShoppingCart className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-semibold">No orders found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeTab !== "all"
              ? `No ${activeTab} orders.`
              : "Get started by creating your first order."}
          </p>
          {activeTab === "all" && (
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Order
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead className="text-right">Shipping</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(orders as any[]).map((order) => {
                const profit = parseFloat(order.estimatedProfit ?? "0");
                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {order.orderNumber ?? "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {order.customer?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(order.orderDate ?? order.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(order.status as OrderStatus)}>
                        {statusLabel(order.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {order._count?.items ?? order.items?.length ?? 0}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(order.totalAmount)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium tabular-nums ${
                        profit >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatCurrency(profit)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                      {formatCurrency(order.shippingFee ?? 0)}
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
                          <DropdownMenuItem onClick={() => setEditOrder(order)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {(["draft", "pending", "delivered", "cancelled"] as OrderStatus[])
                            .filter((s) => s !== order.status)
                            .map((s) => (
                              <DropdownMenuItem
                                key={s}
                                onClick={() => handleStatusChange(order.id, s)}
                              >
                                Mark as {statusLabel(s)}
                              </DropdownMenuItem>
                            ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteId(order.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Dialog */}
      <OrderFormDialog open={createOpen} onClose={() => setCreateOpen(false)} />

      {/* Edit Dialog */}
      {editOrder && (
        <OrderFormDialog
          open={!!editOrder}
          onClose={() => setEditOrder(null)}
          orderId={editOrder.id}
          defaultValues={{
            customerId: editOrder.customerId ?? "",
            orderDate: editOrder.orderDate ? editOrder.orderDate.substring(0, 10) : "",
            status: editOrder.status ?? "pending",
            notes: editOrder.notes ?? "",
            customerFeedback: editOrder.customerFeedback ?? "",
            shippingFee: parseFloat(editOrder.shippingFee ?? "0"),
            shippingDiscount: parseFloat(editOrder.shippingDiscount ?? "0"),
            items:
              editOrder.items?.length > 0
                ? editOrder.items.map((i: any) => ({
                    productId: i.productId ?? "",
                    variant: i.variant ?? "",
                    quantity: parseInt(i.quantity ?? "1"),
                    unitPrice: parseFloat(i.unitPrice ?? "0"),
                    isFree: i.isFree ?? false,
                  }))
                : [{ productId: "", variant: "", quantity: 1, unitPrice: 0, isFree: false }],
          }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the order. This action cannot be undone.
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
