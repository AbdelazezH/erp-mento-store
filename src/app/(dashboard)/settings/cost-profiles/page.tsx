"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCostProfiles, useCreateCostProfile, useUpdateCostProfile, useDeleteCostProfile } from "@/hooks/use-api";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.enum(["packaging", "handling", "transaction_fee"]),
  unitCost: z.string().min(1, "Unit cost is required"),
  applicationRule: z.enum(["per_order", "per_item", "manual"]),
});

type ProfileForm = z.infer<typeof profileSchema>;

// categoryLabels is defined inside component for i18n

const categoryVariant: Record<string, "default" | "secondary" | "outline"> = {
  packaging: "secondary",
  handling: "outline",
  transaction_fee: "default",
};

// ruleLabels is defined inside component for i18n

export default function CostProfilesPage() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");

  const categoryLabels: Record<string, string> = {
    packaging: t("packaging"),
    handling: t("handling"),
    transaction_fee: t("txnFee"),
  };

  const ruleLabels: Record<string, string> = {
    per_order: t("perOrder"),
    per_item: t("perItem"),
    manual: t("manual"),
  };

  const { data: profiles = [], isLoading } = useCostProfiles();
  const createMutation = useCreateCostProfile();
  const updateMutation = useUpdateCostProfile();
  const deleteMutation = useDeleteCostProfile();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", category: "packaging", unitCost: "", applicationRule: "per_order" },
  });

  function openCreate() {
    setEditingId(null);
    form.reset({ name: "", category: "packaging", unitCost: "", applicationRule: "per_order" });
    setDialogOpen(true);
  }

  function openEdit(profile: any) {
    setEditingId(profile.id);
    form.reset({
      name: profile.name,
      category: profile.category,
      unitCost: profile.unitCost,
      applicationRule: profile.applicationRule,
    });
    setDialogOpen(true);
  }

  function handleSubmit(values: ProfileForm) {
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...values }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createMutation.mutate(values, { onSuccess: () => setDialogOpen(false) });
    }
  }

  function handleToggleActive(profile: any) {
    updateMutation.mutate({ id: profile.id, isActive: !profile.isActive });
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("costProfilesTitle")}</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {t("costProfilesSubtitle")}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 me-2" />
          {t("addCost")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name2")}</TableHead>
                <TableHead>{tc("category")}</TableHead>
                <TableHead>{t("unitCostEgp")}</TableHead>
                <TableHead>{t("applicationRule")}</TableHead>
                <TableHead>{t("active")}</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : profiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    {t("noCostProfiles")}
                  </TableCell>
                </TableRow>
              ) : (
                profiles.map((profile: any) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">{profile.name}</TableCell>
                    <TableCell>
                      <Badge variant={categoryVariant[profile.category] ?? "secondary"}>
                        {categoryLabels[profile.category] ?? profile.category}
                      </Badge>
                    </TableCell>
                    <TableCell>{profile.unitCost} EGP</TableCell>
                    <TableCell>{ruleLabels[profile.applicationRule] ?? profile.applicationRule}</TableCell>
                    <TableCell>
                      <Switch
                        checked={profile.isActive}
                        disabled={updateMutation.isPending}
                        onCheckedChange={() => handleToggleActive(profile)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(profile)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(profile.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? t("editCostProfile") : t("addCostProfile")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("name2")}</Label>
              <Input id="name" {...form.register("name")} placeholder="e.g. Standard Eco-Box" />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{tc("category")}</Label>
              <Select value={form.watch("category")} onValueChange={(v) => form.setValue("category", v as ProfileForm["category"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="packaging">{t("packaging")}</SelectItem>
                  <SelectItem value="handling">{t("handling")}</SelectItem>
                  <SelectItem value="transaction_fee">{t("transactionFee")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitCost">{t("unitCostEgp")}</Label>
              <Input id="unitCost" type="number" step="0.01" {...form.register("unitCost")} placeholder="0.00" />
              {form.formState.errors.unitCost && (
                <p className="text-xs text-destructive">{form.formState.errors.unitCost.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t("applicationRule")}</Label>
              <Select value={form.watch("applicationRule")} onValueChange={(v) => form.setValue("applicationRule", v as ProfileForm["applicationRule"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_order">{t("perOrder")}</SelectItem>
                  <SelectItem value="per_item">{t("perItem")}</SelectItem>
                  <SelectItem value="manual">{t("manual")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t("cancel")}</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? t("saving") : editingId ? t("update") : t("create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteCostProfileTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteCostProfileDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId, { onSuccess: () => setDeleteId(null) })}
            >
              {tc("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
