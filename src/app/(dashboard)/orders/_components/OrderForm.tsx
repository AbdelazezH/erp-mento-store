"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import {
  useCreateOrder,
  useUpdateOrder,
  useCustomers,
  useProducts,
  useCampaigns,
} from "@/hooks/use-api";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Plus,
  X,
  Search,
  Check,
  ChevronsUpDown,
  ArrowLeft,
  Save,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  campaignId: z.string().optional().nullable(),
  orderDate: z.string().optional(),
  status: z.enum(["draft", "pending", "delivered", "cancelled"]),
  notes: z.string().optional(),
  customerFeedback: z.string().optional(),
  shippingFee: z.coerce.number().min(0).default(0),
  shippingDiscount: z.coerce.number().min(0).default(0),
  items: z.array(orderItemSchema).min(1, "At least one item required"),
});

type OrderFormValues = z.infer<typeof orderSchema>;

// ─── Product Combobox (same style as InvoiceForm) ──────────────────────────────

function ProductCombobox({
  value,
  onSelect,
  products,
}: {
  value: string;
  onSelect: (product: any) => void;
  products: any[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: searchProducts = [] } = useProducts({ search: search || undefined });

  const selected = products.find((p: any) => p.id === value);

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
          <ChevronsUpDown className="ml-auto h-3.5 w-3.5 shrink-0 opacity-50" />
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
              {(searchProducts as any[]).slice(0, 20).map((product: any) => (
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
                    {product.sellingPrice && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatCurrency(parseFloat(product.sellingPrice))}
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

// ─── Component ───────────────────────────────────────────────────────────────

export default function OrderForm({
  orderId,
  defaultValues,
}: {
  orderId?: string;
  defaultValues?: Partial<OrderFormValues>;
}) {
  const router = useRouter();
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();
  const { data: customers = [] } = useCustomers();
  const { data: campaigns = [] } = useCampaigns();
  const { data: products = [] } = useProducts();

  const [searchOpen, setSearchOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");

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
      campaignId: null,
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
  const watchedCampaignId = watch("campaignId");

  // Find selected campaign for COGS lookup
  const selectedCampaign = useMemo(
    () => (campaigns as any[]).find((c: any) => c.id === watchedCampaignId),
    [campaigns, watchedCampaignId],
  );

  // Calc summary
  const { subtotal, totalCost, shippingNet, grandTotal, estimatedProfit } = useMemo(() => {
    const sub = (watchedItems ?? []).reduce((sum, item) => {
      if (item.isFree) return sum;
      return sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    }, 0);

    const cogs = (watchedItems ?? []).reduce((sum, item) => {
      if (item.isFree) return sum;
      const prod = (products as any[]).find((p: any) => p.id === item.productId);
      let cost = prod ? parseFloat(prod.averageCost ?? prod.basePrice ?? "0") : 0;

      // Use campaign COGS if campaign is selected and product has campaign-specific cost
      if (selectedCampaign && prod) {
        const campaignProd = (selectedCampaign.products ?? []).find(
          (cp: any) => cp.productId === prod.id,
        );
        if (campaignProd?.cogs) {
          cost = parseFloat(campaignProd.cogs);
        }
      }

      return sum + cost * (Number(item.quantity) || 0);
    }, 0);

    const net = Math.max(0, (Number(watchedShippingFee) || 0) - (Number(watchedShippingDiscount) || 0));
    const grand = sub + net;
    const profit = grand - cogs;

    return { subtotal: sub, totalCost: cogs, shippingNet: net, grandTotal: grand, estimatedProfit: profit };
  }, [watchedItems, watchedShippingFee, watchedShippingDiscount, products, selectedCampaign]);

  const onSubmit = async (data: OrderFormValues) => {
    // Build line items for API
    const lineItems = data.items.map((item) => {
      const prod = (products as any[]).find((p: any) => p.id === item.productId);
      let unitCost = prod ? parseFloat(prod.averageCost ?? prod.basePrice ?? "0") : 0;

      if (selectedCampaign && prod) {
        const campaignProd = (selectedCampaign.products ?? []).find(
          (cp: any) => cp.productId === prod.id,
        );
        if (campaignProd?.cogs) unitCost = parseFloat(campaignProd.cogs);
      }

      const total = item.isFree ? 0 : item.quantity * item.unitPrice;
      return {
        productId: item.productId || null,
        variantId: null,
        productName: prod?.name ?? "Unknown",
        variantName: item.variant || null,
        quantity: item.quantity,
        unitPrice: String(item.isFree ? 0 : item.unitPrice),
        unitCost: String(unitCost),
        total: String(total),
        profit: String(total - unitCost * item.quantity),
        isFree: item.isFree,
        originalUnitPrice: prod?.sellingPrice ?? null,
      };
    });

    const payload = {
      customerId: data.customerId || null,
      campaignId: data.campaignId || null,
      orderDate: data.orderDate || undefined,
      status: data.status,
      notes: data.notes || null,
      customerFeedback: data.customerFeedback || null,
      shippingFee: String(data.shippingFee),
      shippingDiscount: String(data.shippingDiscount),
      lineItems,
    };

    if (orderId) {
      await updateOrder.mutateAsync({ id: orderId, ...payload });
    } else {
      await createOrder.mutateAsync(payload);
    }
    router.push("/orders");
  };

  // Quick search: add product from search
  const handleProductSelect = (productId: string) => {
    const prod = (products as any[]).find((p: any) => p.id === productId);
    if (!prod) return;

    // Check if product already in the list
    const existingIdx = fields.findIndex((f) => f.productId === productId);
    if (existingIdx >= 0) {
      // Increment quantity
      const currentQty = watchedItems?.[existingIdx]?.quantity ?? 1;
      setValue(`items.${existingIdx}.quantity`, currentQty + 1);
    } else {
      // Add new row or fill empty row
      const emptyIdx = fields.findIndex((f) => !f.productId);
      let unitPrice = prod.sellingPrice ? parseFloat(prod.sellingPrice) : 0;

      if (emptyIdx >= 0) {
        setValue(`items.${emptyIdx}.productId`, prod.id);
        setValue(`items.${emptyIdx}.unitPrice`, unitPrice);
      } else {
        append({ productId: prod.id, variant: "", quantity: 1, unitPrice, isFree: false });
      }
    }
    setSearchOpen(false);
    setProductSearch("");
  };

  // Filtered products for search
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return (products as any[]).slice(0, 20);
    const q = productSearch.toLowerCase();
    return (products as any[])
      .filter((p: any) => p.name?.toLowerCase().includes(q))
      .slice(0, 20);
  }, [products, productSearch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/orders")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {orderId ? "Edit Order" : "New Order"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {orderId ? "Update order details" : "Create a new sales order"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ─── Main Content (2/3) ─────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {/* General Information */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">General Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                        {(customers as any[]).map((c: any) => (
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
                    <Label>
                      Campaign <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      defaultValue={defaultValues?.campaignId ?? ""}
                      onValueChange={(v) => setValue("campaignId", v === "__none__" ? null : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select campaign" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No Campaign</SelectItem>
                        {(campaigns as any[]).map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Order Items</CardTitle>
                  <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Search className="mr-1.5 h-3.5 w-3.5" />
                        Quick Search
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="end">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Search products..."
                          value={productSearch}
                          onValueChange={setProductSearch}
                        />
                        <CommandList>
                          <CommandEmpty>No products found.</CommandEmpty>
                          <CommandGroup>
                            {filteredProducts.map((p: any) => (
                              <CommandItem
                                key={p.id}
                                value={p.id}
                                onSelect={() => handleProductSelect(p.id)}
                              >
                                <div className="flex items-center gap-2 w-full">
                                  {p.imageUrl ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                      src={p.imageUrl}
                                      alt=""
                                      className="h-8 w-8 rounded object-cover shrink-0"
                                    />
                                  ) : (
                                    <div className="h-8 w-8 rounded bg-muted shrink-0 flex items-center justify-center">
                                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{p.name}</p>
                                    {p.sku && (
                                      <p className="font-mono text-xs text-muted-foreground">{p.sku}</p>
                                    )}
                                  </div>
                                  {p.sellingPrice && (
                                    <span className="text-xs text-muted-foreground shrink-0">
                                      {formatCurrency(parseFloat(p.sellingPrice))}
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
                              <ProductCombobox
                                value={item?.productId ?? ""}
                                products={(products as any[])}
                                onSelect={(prod: any) => {
                                  setValue(`items.${idx}.productId`, prod.id);
                                  if (prod.sellingPrice) {
                                    setValue(
                                      `items.${idx}.unitPrice`,
                                      parseFloat(prod.sellingPrice),
                                    );
                                  }
                                }}
                              />
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

                <div className="mt-3">
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
              </CardContent>
            </Card>

            {/* Notes & Feedback */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Notes & Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      {...register("notes")}
                      placeholder="Internal notes..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="customerFeedback">Customer Feedback</Label>
                    <Textarea
                      id="customerFeedback"
                      {...register("customerFeedback")}
                      placeholder="Customer feedback..."
                      rows={3}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ─── Sidebar (1/3) ─────────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-4">
              {/* Order Status */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">Order Status</CardTitle>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>

              {/* Shipping */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">Shipping</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
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
                    <Label htmlFor="shippingDiscount">Discount</Label>
                    <Input
                      id="shippingDiscount"
                      type="number"
                      step="0.01"
                      min="0"
                      {...register("shippingDiscount")}
                      placeholder="0.00"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Financial Summary */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">Financial Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="tabular-nums font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="tabular-nums font-medium">{formatCurrency(shippingNet)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">COGS</span>
                    <span className="tabular-nums font-medium text-red-600">
                      -{formatCurrency(totalCost)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Grand Total</span>
                    <span className="tabular-nums">{formatCurrency(grandTotal)}</span>
                  </div>
                  <div
                    className={`flex justify-between font-bold ${
                      estimatedProfit >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    <span>Est. Profit</span>
                    <span className="tabular-nums">{formatCurrency(estimatedProfit)}</span>
                  </div>

                  {selectedCampaign && (
                    <Badge variant="secondary" className="w-full justify-center mt-1">
                      Campaign: {selectedCampaign.name}
                    </Badge>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.push("/orders")}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? (
                    "Saving..."
                  ) : (
                    <>
                      <Save className="mr-1.5 h-4 w-4" />
                      {orderId ? "Save Changes" : "Create Order"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
