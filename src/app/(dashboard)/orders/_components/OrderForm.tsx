"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import {
  useCreateOrder,
  useUpdateOrder,
  useCustomers,
  useCustomer,
  useProducts,
  useProduct,
  useCampaigns,
  useCostProfiles,
} from "@/hooks/use-api";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  X,
  Search,
  Check,
  ChevronsUpDown,
  ArrowLeft,
  Save,
  ImageIcon,
  Phone,
  Mail,
  MapPin,
  PackageCheck,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CustomerFormDialog } from "@/components/features/customers/customer-form-dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus = "draft" | "pending" | "delivered" | "cancelled";
type DiscountType = "percent" | "fixed" | null;

// ─── Schema ──────────────────────────────────────────────────────────────────

const orderItemSchema = z.object({
  productId: z.string().min(1, "Product required"),
  variantId: z.string().optional(),
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
  discountType: z.enum(["percent", "fixed"]).optional().nullable(),
  discountValue: z.coerce.number().min(0).default(0),
  trackInventory: z.boolean().default(true),
  items: z.array(orderItemSchema).min(1, "At least one item required"),
  costProfileEntries: z.array(z.object({
    costProfileId: z.string(),
    amount: z.string(),
  })).default([]),
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
  const { data: costProfilesList = [] } = useCostProfiles();

  const [searchOpen, setSearchOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  // Customer search state
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerSearchDebounced, setCustomerSearchDebounced] = useState("");
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const { data: customerSearchResults } = useCustomers(customerSearchDebounced || undefined);

  // Debounce customer search
  useEffect(() => {
    const timer = setTimeout(() => setCustomerSearchDebounced(customerSearch), 300);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  // Variant modal state
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [variantModalProductIdx, setVariantModalProductIdx] = useState<number | null>(null);
  const [variantModalProductId, setVariantModalProductId] = useState<string>("");

  // Fetch product details for variant modal
  const { data: variantModalProduct } = useProduct(variantModalProductId);

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
      discountType: null,
      discountValue: 0,
      trackInventory: true,
      items: [{ productId: "", variantId: "", variant: "", quantity: 1, unitPrice: 0, isFree: false }],
      costProfileEntries: [],
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const watchedItems = useWatch({ control, name: "items" });
  const watchedShippingFee = watch("shippingFee");
  const watchedShippingDiscount = watch("shippingDiscount");
  const watchedCampaignId = watch("campaignId");
  const watchedCPEntries = watch("costProfileEntries");
  const watchedCustomerId = watch("customerId");
  const watchedDiscountType = watch("discountType");
  const watchedDiscountValue = watch("discountValue");
  const watchedTrackInventory = watch("trackInventory");

  // Customer details for context snippet
  const { data: selectedCustomer } = useCustomer(watchedCustomerId || "");

  // Total item quantity (for per_item cost profile calculation)
  const totalItemQuantity = useMemo(
    () => (watchedItems ?? []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    [watchedItems],
  );

  // Find selected campaign for COGS lookup
  const selectedCampaign = useMemo(
    () => (campaigns as any[]).find((c: any) => c.id === watchedCampaignId),
    [campaigns, watchedCampaignId],
  );

  // Calc summary
  const { subtotal, totalCost, freeItemsValue, shippingNet, costProfileTotal, orderDiscount, grandTotal, estimatedProfit } = useMemo(() => {
    // Subtotal includes ALL items (paid + free) so the deduction is visible
    const sub = (watchedItems ?? []).reduce((sum, item) => {
      return sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    }, 0);

    // Revenue value being given away for free (shown as a negative deduction line)
    const freeVal = (watchedItems ?? []).reduce((sum, item) => {
      if (!item.isFree) return sum;
      return sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    }, 0);

    // COGS includes ALL items (paid + free) — full cost of goods sold
    const cogs = (watchedItems ?? []).reduce((sum, item) => {
      const prod = (products as any[]).find((p: any) => p.id === item.productId);
      let cost = prod ? parseFloat(prod.averageCost ?? prod.basePrice ?? "0") : 0;

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

    const cpTotal = (watchedCPEntries ?? []).reduce((sum, entry) => sum + parseFloat(entry.amount || "0"), 0);

    const net = Math.max(0, (Number(watchedShippingFee) || 0) - (Number(watchedShippingDiscount) || 0));

    // Calculate order discount (based on paid revenue + shipping)
    let disc = 0;
    if (watchedDiscountType === "percent") {
      disc = (sub - freeVal + net) * ((Number(watchedDiscountValue) || 0) / 100);
    } else if (watchedDiscountType === "fixed") {
      disc = Number(watchedDiscountValue) || 0;
    }
    disc = Math.min(disc, sub - freeVal + net);

    // Grand total = paid revenue + shipping (net) − order discount
    const grand = sub - freeVal + net - disc;
    // Shipping fee is a pass-through cost (not profit); only the shipping discount is absorbed by the business
    const shippingFeeNum = Number(watchedShippingFee) || 0;
    const profit = grand - cogs - cpTotal - shippingFeeNum;

    return { subtotal: sub, totalCost: cogs, freeItemsValue: freeVal, shippingNet: net, costProfileTotal: cpTotal, orderDiscount: disc, grandTotal: grand, estimatedProfit: profit };
  }, [watchedItems, watchedShippingFee, watchedShippingDiscount, products, selectedCampaign, watchedCPEntries, watchedDiscountType, watchedDiscountValue]);

  // Auto-recalculate per_item cost profile amounts when item quantities change
  useEffect(() => {
    const entries = watchedCPEntries ?? [];
    entries.forEach((entry, idx) => {
      const profile = (costProfilesList as any[]).find((p: any) => p.id === entry.costProfileId);
      if (profile && profile.applicationRule !== "manual") {
        const newAmount =
          profile.applicationRule === "per_item"
            ? parseFloat(profile.unitCost) * totalItemQuantity
            : parseFloat(profile.unitCost);
        setValue(`costProfileEntries.${idx}.amount`, String(newAmount));
      }
    });
  }, [totalItemQuantity]); // eslint-disable-line react-hooks/exhaustive-deps

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
        variantId: item.variantId || null,
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
      discountType: data.discountType || null,
      discountValue: String(data.discountValue || 0),
      trackInventory: data.trackInventory,
      lineItems,
      costProfileEntries: data.costProfileEntries ?? [],
    };

    if (orderId) {
      await updateOrder.mutateAsync({ id: orderId, ...payload });
    } else {
      await createOrder.mutateAsync(payload);
    }
    router.push("/orders");
  };

  // Handle product selection from combobox — open variant modal if has variants
  const handleProductSelected = (idx: number, prod: any) => {
    setValue(`items.${idx}.productId`, prod.id);
    if (prod.sellingPrice) {
      setValue(`items.${idx}.unitPrice`, parseFloat(prod.sellingPrice));
    }
    // Clear previous variant
    setValue(`items.${idx}.variantId`, "");
    setValue(`items.${idx}.variant`, "");

    // Check if product has variants
    if (prod.hasVariants) {
      setVariantModalProductIdx(idx);
      setVariantModalProductId(prod.id);
      setVariantModalOpen(true);
    }
  };

  const handleVariantSelected = (variant: any) => {
    if (variantModalProductIdx === null) return;
    setValue(`items.${variantModalProductIdx}.variantId`, variant.id);
    setValue(`items.${variantModalProductIdx}.variant`, variant.name);
    if (variant.sellingPrice) {
      setValue(`items.${variantModalProductIdx}.unitPrice`, parseFloat(variant.sellingPrice));
    }
    setVariantModalOpen(false);
    setVariantModalProductIdx(null);
    setVariantModalProductId("");
  };

  // Quick search: add product from search
  const handleProductSelect = (productId: string) => {
    const prod = (products as any[]).find((p: any) => p.id === productId);
    if (!prod) return;

    const existingIdx = fields.findIndex((f) => f.productId === productId);
    if (existingIdx >= 0) {
      const currentQty = watchedItems?.[existingIdx]?.quantity ?? 1;
      setValue(`items.${existingIdx}.quantity`, currentQty + 1);
    } else {
      const emptyIdx = fields.findIndex((f) => !f.productId);
      let unitPrice = prod.sellingPrice ? parseFloat(prod.sellingPrice) : 0;

      if (emptyIdx >= 0) {
        setValue(`items.${emptyIdx}.productId`, prod.id);
        setValue(`items.${emptyIdx}.unitPrice`, unitPrice);
        // Open variant modal for this product if it has variants
        if (prod.hasVariants) {
          setVariantModalProductIdx(emptyIdx);
          setVariantModalProductId(prod.id);
          setVariantModalOpen(true);
        }
      } else {
        append({ productId: prod.id, variantId: "", variant: "", quantity: 1, unitPrice, isFree: false });
        // Open variant modal for the newly appended item
        if (prod.hasVariants) {
          const newIdx = fields.length; // will be the last item
          setVariantModalProductIdx(newIdx);
          setVariantModalProductId(prod.id);
          setVariantModalOpen(true);
        }
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
                    {selectedCustomer ? (
                      <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                        <span className="font-medium">{selectedCustomer.name}</span>
                        <button
                          type="button"
                          onClick={() => { setValue("customerId", ""); setCustomerSearch(""); }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <Popover open={customerSearch.length > 0} onOpenChange={(v) => { if (!v) setCustomerSearch(""); }}>
                        <PopoverTrigger asChild>
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              placeholder="Search by name or phone…"
                              value={customerSearch}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
                                setCustomerSearch(val);
                              }}
                              className="pl-8"
                            />
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                          <Command shouldFilter={false}>
                            <CommandList>
                              {customerSearchDebounced && (customerSearchResults as any[])?.length === 0 ? (
                                <div className="p-3 space-y-2">
                                  <p className="text-sm text-muted-foreground">No customer found.</p>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => {
                                      setCustomerModalOpen(true);
                                      setCustomerSearch("");
                                    }}
                                  >
                                    <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                                    Create new customer
                                  </Button>
                                </div>
                              ) : (
                                <CommandGroup>
                                  {(customerSearchResults as any[] ?? []).map((c: any) => (
                                    <CommandItem
                                      key={c.id}
                                      value={c.id}
                                      onSelect={() => {
                                        setValue("customerId", c.id);
                                        setCustomerSearch("");
                                      }}
                                    >
                                      <Check className={cn("mr-2 h-4 w-4", watchedCustomerId === c.id ? "opacity-100" : "opacity-0")} />
                                      <span>{c.name}</span>
                                      {c.phone && <span className="ml-2 text-xs text-muted-foreground">{c.phone}</span>}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}
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

                {/* Customer Context Snippet */}
                {selectedCustomer && (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      {selectedCustomer.phone && (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          {selectedCustomer.phone}
                        </span>
                      )}
                      {selectedCustomer.email && (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Mail className="h-3.5 w-3.5" />
                          {selectedCustomer.email}
                        </span>
                      )}
                      {selectedCustomer.address && (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {selectedCustomer.address}
                        </span>
                      )}
                    </div>
                    {(selectedCustomer.orderCount > 0 || selectedCustomer.totalSpend) && (
                      <div className="text-xs text-muted-foreground">
                        LTV: {formatCurrency(parseFloat(selectedCustomer.totalSpend || "0"))}
                        {" | "}
                        Total Orders: {selectedCustomer.orderCount ?? 0}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Order Items</CardTitle>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <PackageCheck className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="trackInventory" className="text-sm font-normal cursor-pointer">
                        Track Inventory
                      </Label>
                      <Switch
                        id="trackInventory"
                        checked={watchedTrackInventory}
                        onCheckedChange={(checked) => setValue("trackInventory", checked)}
                      />
                    </div>
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
                        <TableHead className="w-24">Qty</TableHead>
                        <TableHead className="w-[80px] min-w-[80px]">Unit Price</TableHead>
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
                                onSelect={(prod: any) => handleProductSelected(idx, prod)}
                              />
                              {errors.items?.[idx]?.productId && (
                                <p className="text-xs text-destructive mt-0.5">
                                  {errors.items[idx]?.productId?.message}
                                </p>
                              )}
                            </TableCell>
                            <TableCell>
                              {item?.variant ? (
                                <Badge
                                  variant="secondary"
                                  className="cursor-pointer"
                                  onClick={() => {
                                    // Re-open variant modal for this product
                                    if (item.productId) {
                                      setVariantModalProductIdx(idx);
                                      setVariantModalProductId(item.productId);
                                      setVariantModalOpen(true);
                                    }
                                  }}
                                >
                                  {item.variant}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="1"
                                step="1"
                                {...register(`items.${idx}.quantity`)}
                                className="h-8 text-sm w-24"
                              />
                            </TableCell>
                            <TableCell className="w-[80px] min-w-[80px] max-w-[80px]">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                {...register(`items.${idx}.unitPrice`)}
                                className="h-8 text-sm w-[80px]"
                                disabled={isFree}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <input
                                type="checkbox"
                                checked={!!item?.isFree}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setValue(`items.${idx}.isFree`, checked, { shouldValidate: true });
                                  const prod = (products as any[]).find((p: any) => p.id === item?.productId);
                                  if (prod) {
                                    if (checked) {
                                      // Unit Price shows the base cost so the financial summary deduction is accurate
                                      let baseCost = parseFloat(prod.averageCost ?? prod.basePrice ?? "0");
                                      if (selectedCampaign) {
                                        const cp = (selectedCampaign.products ?? []).find(
                                          (c: any) => c.productId === prod.id,
                                        );
                                        if (cp?.cogs) baseCost = parseFloat(cp.cogs);
                                      }
                                      setValue(`items.${idx}.unitPrice`, baseCost, { shouldValidate: true });
                                    } else {
                                      // Restore selling price when un-marking as free
                                      setValue(`items.${idx}.unitPrice`, parseFloat(prod.sellingPrice ?? "0"), { shouldValidate: true });
                                    }
                                  }
                                }}
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
                      append({ productId: "", variantId: "", variant: "", quantity: 1, unitPrice: 0, isFree: false })
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
                </CardContent>
              </Card>

              {/* Cost Profiles */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">Cost Profiles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(costProfilesList as any[]).filter((p: any) => p.isActive).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No active cost profiles.</p>
                  ) : (
                    (costProfilesList as any[])
                      .filter((p: any) => p.isActive)
                      .map((profile: any) => {
                        const isSelected = (watchedCPEntries ?? []).some(
                          (e) => e.costProfileId === profile.id,
                        );
                        const entryIdx = (watchedCPEntries ?? []).findIndex(
                          (e) => e.costProfileId === profile.id,
                        );
                        const computedAmount =
                          profile.applicationRule === "per_item"
                            ? parseFloat(profile.unitCost) * totalItemQuantity
                            : profile.applicationRule === "per_order"
                              ? parseFloat(profile.unitCost)
                              : 0;

                        return (
                          <div key={profile.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              className="h-4 w-4 rounded border-input"
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const amount =
                                    profile.applicationRule === "manual"
                                      ? "0"
                                      : String(computedAmount);
                                  setValue("costProfileEntries", [
                                    ...(watchedCPEntries ?? []),
                                    { costProfileId: profile.id, amount },
                                  ]);
                                } else {
                                  setValue(
                                    "costProfileEntries",
                                    (watchedCPEntries ?? []).filter(
                                      (e) => e.costProfileId !== profile.id,
                                    ),
                                  );
                                }
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm">{profile.name}</span>
                              <span className="ml-1.5 text-xs text-muted-foreground">
                                ({profile.applicationRule === "per_item"
                                  ? "Per Item"
                                  : profile.applicationRule === "per_order"
                                    ? "Per Order"
                                    : "Manual"})
                              </span>
                            </div>
                            {profile.applicationRule === "manual" && isSelected ? (
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                className="h-7 w-24 text-sm"
                                value={watchedCPEntries?.[entryIdx]?.amount ?? "0"}
                                onChange={(e) => {
                                  if (entryIdx >= 0) {
                                    setValue(`costProfileEntries.${entryIdx}.amount`, e.target.value);
                                  }
                                }}
                              />
                            ) : (
                              <span className="text-sm tabular-nums text-muted-foreground">
                                {formatCurrency(isSelected ? computedAmount : parseFloat(profile.unitCost))}
                              </span>
                            )}
                          </div>
                        );
                      })
                  )}
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
                    <span className="tabular-nums font-medium">{formatCurrency(Number(watchedShippingFee) || 0)}</span>
                  </div>
                  {(Number(watchedShippingDiscount) || 0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping Discount</span>
                      <span className="tabular-nums font-medium text-red-600">
                        -{formatCurrency(Number(watchedShippingDiscount) || 0)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">COGS</span>
                    <span className="tabular-nums font-medium text-red-600">
                      -{formatCurrency(totalCost)}
                    </span>
                  </div>
                  {freeItemsValue > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Free Items</span>
                      <span className="tabular-nums font-medium text-red-600">
                        -{formatCurrency(freeItemsValue)}
                      </span>
                    </div>
                  )}
                  {costProfileTotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Cost Profiles</span>
                      <span className="tabular-nums font-medium text-red-600">
                        -{formatCurrency(costProfileTotal)}
                      </span>
                    </div>
                  )}

                  {/* Discount Section */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-sm">Discount</Label>
                      <div className="flex rounded-md border overflow-hidden">
                        <button
                          type="button"
                          className={cn(
                            "px-2.5 py-1 text-xs font-medium transition-colors",
                            watchedDiscountType === "percent"
                              ? "bg-primary text-primary-foreground"
                              : "bg-background hover:bg-accent"
                          )}
                          onClick={() => setValue("discountType", "percent")}
                        >
                          %
                        </button>
                        <button
                          type="button"
                          className={cn(
                            "px-2.5 py-1 text-xs font-medium border-l transition-colors",
                            watchedDiscountType === "fixed"
                              ? "bg-primary text-primary-foreground"
                              : "bg-background hover:bg-accent"
                          )}
                          onClick={() => setValue("discountType", "fixed")}
                        >
                          EGP
                        </button>
                      </div>
                    </div>
                    {watchedDiscountType && (
                      <Input
                        type="number"
                        step={watchedDiscountType === "percent" ? "1" : "0.01"}
                        min="0"
                        max={watchedDiscountType === "percent" ? 100 : undefined}
                        {...register("discountValue")}
                        placeholder={watchedDiscountType === "percent" ? "Enter %" : "Enter EGP"}
                        className="h-8 text-sm"
                      />
                    )}
                    {orderDiscount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Order Discount</span>
                        <span className="tabular-nums font-medium text-red-600">
                          -{formatCurrency(orderDiscount)}
                        </span>
                      </div>
                    )}
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

      {/* Variant Selection Modal */}
      <Dialog open={variantModalOpen} onOpenChange={setVariantModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Select Variant — {(variantModalProduct as any)?.name ?? "Product"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {((variantModalProduct as any)?.variants ?? []).length === 0 ? (
              <p className="col-span-2 text-sm text-muted-foreground text-center py-4">
                No variants available for this product.
              </p>
            ) : (
              ((variantModalProduct as any)?.variants ?? []).map((variant: any) => (
                <button
                  key={variant.id}
                  type="button"
                  className="flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors hover:bg-accent"
                  onClick={() => handleVariantSelected(variant)}
                >
                  <span className="text-sm font-medium">{variant.name}</span>
                  {variant.sku && (
                    <span className="font-mono text-xs text-muted-foreground">{variant.sku}</span>
                  )}
                  <div className="flex items-center justify-between w-full mt-1">
                    {variant.sellingPrice && (
                      <span className="text-xs font-medium">
                        {formatCurrency(parseFloat(variant.sellingPrice))}
                      </span>
                    )}
                    <span
                      className={cn(
                        "text-xs",
                        variant.stockQuantity > 0
                          ? "text-green-600"
                          : "text-red-500"
                      )}
                    >
                      Stock: {variant.stockQuantity}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Creation Modal */}
      <CustomerFormDialog
        open={customerModalOpen}
        onClose={(created) => {
          setCustomerModalOpen(false);
          if (created?.id) {
            setValue("customerId", created.id);
          }
        }}
        defaultValues={{
          phone: customerSearchDebounced || "",
        }}
      />
    </div>
  );
}
