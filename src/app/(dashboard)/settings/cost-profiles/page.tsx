"use client";

import { useState } from "react";
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

const categoryLabels: Record<string, string> = {
  packaging: "Packaging",
  handling: "Handling",
  transaction_fee: "Txn Fee",
};

const categoryVariant: Record<string, "default" | "secondary" | "outline"> = {
  packaging: "secondary",
  handling: "outline",
  transaction_fee: "default",
};

const ruleLabels: Record<string, string> = {
  per_order: "Per Order",
  per_item: "Per Item",
  manual: "Manual",
};

export default function CostProfilesPage() {
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
          <h2 className="text-2xl font-bold">Cost Profiles</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage operational costs like packaging, handling, and transaction fees.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Cost
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Application Rule</TableHead>
                <TableHead>Active</TableHead>
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
                    No cost profiles yet. Add one to get started.
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
            <DialogTitle>{editingId ? "Edit Cost Profile" : "Add Cost Profile"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...form.register("name")} placeholder="e.g. Standard Eco-Box" />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.watch("category")} onValueChange={(v) => form.setValue("category", v as ProfileForm["category"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="packaging">Packaging</SelectItem>
                  <SelectItem value="handling">Handling</SelectItem>
                  <SelectItem value="transaction_fee">Transaction Fee</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitCost">Unit Cost (EGP)</Label>
              <Input id="unitCost" type="number" step="0.01" {...form.register("unitCost")} placeholder="0.00" />
              {form.formState.errors.unitCost && (
                <p className="text-xs text-destructive">{form.formState.errors.unitCost.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Application Rule</Label>
              <Select value={form.watch("applicationRule")} onValueChange={(v) => form.setValue("applicationRule", v as ProfileForm["applicationRule"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_order">Per Order</SelectItem>
                  <SelectItem value="per_item">Per Item</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingId ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this cost profile?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the cost profile. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId, { onSuccess: () => setDeleteId(null) })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
