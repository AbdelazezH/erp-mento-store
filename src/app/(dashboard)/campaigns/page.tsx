"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCampaigns,
  useCreateCampaign,
  useDeleteCampaign,
  useProducts,
} from "@/hooks/use-api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Trash2,
  Megaphone,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  CalendarRange,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Verdict = "profitable" | "loss" | "break_even";

// ─── Schema ──────────────────────────────────────────────────────────────────

const campaignProductSchema = z.object({
  productId: z.string().min(1, "Product required"),
  originalPrice: z.coerce.number().min(0),
  campaignPrice: z.coerce.number().min(0),
  cogs: z.coerce.number().min(0),
  expectedUnits: z.coerce.number().int().min(0),
});

const campaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  advertisingBudget: z.coerce.number().min(0).default(0),
  shippingCost: z.coerce.number().min(0).default(0),
  otherCosts: z.coerce.number().min(0).default(0),
  products: z.array(campaignProductSchema).optional().default([]),
});

type CampaignFormValues = z.infer<typeof campaignSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcVerdict(netProfit: number): Verdict {
  if (netProfit > 0) return "profitable";
  if (netProfit < 0) return "loss";
  return "break_even";
}

function verdictVariant(v: Verdict) {
  switch (v) {
    case "profitable": return "success" as const;
    case "loss": return "destructive" as const;
    case "break_even": return "warning" as const;
  }
}

function VerdictLabelText({ verdict }: { verdict: Verdict }) {
  const t = useTranslations("campaigns");
  switch (verdict) {
    case "profitable": return <>{t("profitable")}</>;
    case "loss": return <>{t("loss")}</>;
    case "break_even": return <>{t("breakEven")}</>;
  }
}

function VerdictIcon({ verdict }: { verdict: Verdict }) {
  if (verdict === "profitable") return <TrendingUp className="h-4 w-4 text-green-600" />;
  if (verdict === "loss") return <TrendingDown className="h-4 w-4 text-red-600" />;
  return <Minus className="h-4 w-4 text-yellow-600" />;
}

function calcCampaignNumbers(campaign: any) {
  const products: any[] = campaign.products ?? [];
  const projectedRevenue = products.reduce(
    (s: number, p: any) =>
      s + parseFloat(p.campaignPrice ?? "0") * parseInt(p.expectedUnits ?? "0"),
    0,
  );
  const cogsCost = products.reduce(
    (s: number, p: any) =>
      s + parseFloat(p.cogs ?? "0") * parseInt(p.expectedUnits ?? "0"),
    0,
  );
  const adCost = parseFloat(campaign.advertisingBudget ?? "0");
  const shipCost = parseFloat(campaign.shippingCost ?? "0");
  const otherCost = parseFloat(campaign.otherCosts ?? "0");
  const totalExpenses = adCost + shipCost + otherCost + cogsCost;
  const netProfit = projectedRevenue - totalExpenses;
  return { projectedRevenue, totalExpenses, netProfit };
}

// ─── Live Profitability Panel ─────────────────────────────────────────────────

function ProfitabilityPanel({
  watchedProducts,
  advertisingBudget,
  shippingCost,
  otherCosts,
}: {
  watchedProducts: CampaignFormValues["products"];
  advertisingBudget: number;
  shippingCost: number;
  otherCosts: number;
}) {
  const { projectedRevenue, totalExpenses, netProfit } = useMemo(() => {
    const rev = (watchedProducts ?? []).reduce(
      (s, p) =>
        s + (Number(p.campaignPrice) || 0) * (Number(p.expectedUnits) || 0),
      0,
    );
    const cogs = (watchedProducts ?? []).reduce(
      (s, p) =>
        s + (Number(p.cogs) || 0) * (Number(p.expectedUnits) || 0),
      0,
    );
    const adCost = Number(advertisingBudget) || 0;
    const shipCost = Number(shippingCost) || 0;
    const other = Number(otherCosts) || 0;
    const expenses = adCost + shipCost + other + cogs;
    return { projectedRevenue: rev, totalExpenses: expenses, netProfit: rev - expenses };
  }, [watchedProducts, advertisingBudget, shippingCost, otherCosts]);

  const t = useTranslations("campaigns");
  const verdict = calcVerdict(netProfit);

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
      <p className="text-sm font-semibold mb-3">{t("liveProfitability")}</p>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{t("projectedRevenue")}</span>
        <span className="tabular-nums font-medium">{formatCurrency(projectedRevenue)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{t("totalCosts")}</span>
        <span className="tabular-nums font-medium text-red-600">
          -{formatCurrency(totalExpenses)}
        </span>
      </div>
      <Separator />
      <div className="flex justify-between font-bold">
        <span>{t("netProfit")}</span>
        <span
          className={`tabular-nums ${
            netProfit >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {formatCurrency(netProfit)}
        </span>
      </div>
      <div className="flex justify-center pt-1">
        <Badge variant={verdictVariant(verdict)} className="gap-1.5">
          <VerdictIcon verdict={verdict} />
          <VerdictLabelText verdict={verdict} />
        </Badge>
      </div>
    </div>
  );
}

// ─── Campaign Form Dialog ─────────────────────────────────────────────────────

function CampaignFormDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("campaigns");
  const createCampaign = useCreateCampaign();
  const { data: products = [] } = useProducts();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: "",
      advertisingBudget: 0,
      shippingCost: 0,
      otherCosts: 0,
      products: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "products" });

  const watchedProducts = watch("products");
  const watchedAd = watch("advertisingBudget");
  const watchedShip = watch("shippingCost");
  const watchedOther = watch("otherCosts");

  const onSubmit = async (data: CampaignFormValues) => {
    await createCampaign.mutateAsync(data);
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
          <DialogTitle>{t("newCampaign")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Campaign Info */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5 col-span-1">
              <Label htmlFor="name">
                {t("campaignName")} <span className="text-destructive">*</span>
              </Label>
              <Input id="name" {...register("name")} placeholder="e.g. Ramadan Sale 2025" />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="startDate">{t("startDate")}</Label>
              <Input id="startDate" type="date" {...register("startDate")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">{t("endDate")}</Label>
              <Input id="endDate" type="date" {...register("endDate")} />
            </div>
          </div>

          {/* Budget Section */}
          <div>
            <p className="text-sm font-semibold mb-3">{t("budget")}</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="advertisingBudget">{t("advertisingBudget")}</Label>
                <Input
                  id="advertisingBudget"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("advertisingBudget")}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="shippingCost">{t("shippingCost")}</Label>
                <Input
                  id="shippingCost"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("shippingCost")}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="otherCosts">{t("otherCosts")}</Label>
                <Input
                  id="otherCosts"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("otherCosts")}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Products Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">{t("addProduct")}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    productId: "",
                    originalPrice: 0,
                    campaignPrice: 0,
                    cogs: 0,
                    expectedUnits: 0,
                  })
                }
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {t("addProduct")}
              </Button>
            </div>

            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("selectProduct")}</TableHead>
                    <TableHead className="w-28">{t("originalPrice")}</TableHead>
                    <TableHead className="w-28">{t("campaignPrice")}</TableHead>
                    <TableHead className="w-28">{t("cogs")}</TableHead>
                    <TableHead className="w-28">{t("expectedUnits")}</TableHead>
                    <TableHead className="w-28 text-right">{t("projRevenue")}</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, idx) => {
                    const item = watchedProducts?.[idx];
                    const projRev =
                      (Number(item?.campaignPrice) || 0) *
                      (Number(item?.expectedUnits) || 0);
                    return (
                      <TableRow key={field.id}>
                        <TableCell>
                          <Select
                            onValueChange={(v) => {
                              setValue(`products.${idx}.productId`, v);
                              const prod = (products as any[]).find((p) => p.id === v);
                              if (prod) {
                                if (prod.sellingPrice) {
                                  setValue(
                                    `products.${idx}.originalPrice`,
                                    parseFloat(prod.sellingPrice),
                                  );
                                  setValue(
                                    `products.${idx}.campaignPrice`,
                                    parseFloat(prod.sellingPrice),
                                  );
                                }
                                if (prod.averageCost || prod.basePrice) {
                                  setValue(
                                    `products.${idx}.cogs`,
                                    parseFloat(prod.averageCost ?? prod.basePrice ?? "0"),
                                  );
                                }
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder={t("selectProduct")} />
                            </SelectTrigger>
                            <SelectContent>
                              {(products as any[]).map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.products?.[idx]?.productId && (
                            <p className="text-xs text-destructive mt-0.5">
                              {errors.products[idx]?.productId?.message}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            {...register(`products.${idx}.originalPrice`)}
                            className="h-8 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            {...register(`products.${idx}.campaignPrice`)}
                            className="h-8 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            {...register(`products.${idx}.cogs`)}
                            className="h-8 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            {...register(`products.${idx}.expectedUnits`)}
                            className="h-8 text-sm"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums text-sm">
                          {formatCurrency(projRev)}
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
          </div>

          {/* Live Profitability */}
          <ProfitabilityPanel
            watchedProducts={watchedProducts}
            advertisingBudget={watchedAd}
            shippingCost={watchedShip}
            otherCosts={watchedOther}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("saving") : t("createCampaign")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Campaign Card ────────────────────────────────────────────────────────────

function CampaignCard({
  campaign,
  onDelete,
}: {
  campaign: any;
  onDelete: (id: string) => void;
}) {
  const t = useTranslations("campaigns");
  const { projectedRevenue, totalExpenses, netProfit } = calcCampaignNumbers(campaign);
  const verdict = calcVerdict(netProfit);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">{campaign.name}</CardTitle>
          <Badge variant={verdictVariant(verdict)} className="shrink-0 gap-1">
            <VerdictIcon verdict={verdict} />
            <VerdictLabelText verdict={verdict} />
          </Badge>
        </div>
        {(campaign.startDate || campaign.endDate) && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            <CalendarRange className="h-3.5 w-3.5" />
            <span>
              {formatDate(campaign.startDate)}
              {campaign.endDate ? ` – ${formatDate(campaign.endDate)}` : ""}
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {/* Budget breakdown */}
        <div className="rounded-lg bg-muted/40 p-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("advertising")}</span>
            <span className="tabular-nums">{formatCurrency(campaign.advertisingBudget ?? 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("shipping")}</span>
            <span className="tabular-nums">{formatCurrency(campaign.shippingCost ?? 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("other")}</span>
            <span className="tabular-nums">{formatCurrency(campaign.otherCosts ?? 0)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-medium">
            <span>{t("totalExpenses")}</span>
            <span className="tabular-nums text-red-600">{formatCurrency(totalExpenses)}</span>
          </div>
        </div>

        {/* Revenue / profit */}
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("projRevenue")}</span>
            <span className="tabular-nums font-medium">{formatCurrency(projectedRevenue)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>{t("netProfit")}</span>
            <span
              className={`tabular-nums ${
                netProfit >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(netProfit)}
            </span>
          </div>
        </div>

        {/* Products list */}
        {campaign.products?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
              {t("productCount", { count: campaign.products.length })}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {campaign.products.map((p: any, i: number) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium"
                >
                  {p.product?.name ?? p.productId ?? `Product ${i + 1}`}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => onDelete(campaign.id)}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          {t("delete")}
        </Button>
      </CardFooter>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const t = useTranslations("campaigns");
  const tc = useTranslations("common");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: campaigns = [], isLoading } = useCampaigns();
  const deleteCampaign = useDeleteCampaign();

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteCampaign.mutateAsync(deleteId);
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="me-2 h-4 w-4" />
          {t("newCampaign")}
        </Button>
      </div>

      {/* Campaign Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (campaigns as any[]).length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <Megaphone className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-semibold">{t("noCampaignsYet")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("getStarted")}
          </p>
          <Button className="mt-4" onClick={() => setCreateOpen(true)}>
            <Plus className="me-2 h-4 w-4" />
            {t("newCampaign")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(campaigns as any[]).map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onDelete={(id) => setDeleteId(id)}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <CampaignFormDialog open={createOpen} onClose={() => setCreateOpen(false)} />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteCampaignTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteCampaignDesc")}
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
    </div>
  );
}
