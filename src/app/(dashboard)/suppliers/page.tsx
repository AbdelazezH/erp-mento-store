"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useInfiniteSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
} from "@/hooks/use-api";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Truck,
} from "lucide-react";

// ─── Schema ──────────────────────────────────────────────────────────────────

const supplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contactName: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

// ─── Supplier Form Dialog ─────────────────────────────────────────────────────

function SupplierFormDialog({
  open,
  onClose,
  defaultValues,
  supplierId,
}: {
  open: boolean;
  onClose: () => void;
  defaultValues?: Partial<SupplierFormValues>;
  supplierId?: string;
}) {
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
      contactName: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
      ...defaultValues,
    },
  });

  const onSubmit = async (data: SupplierFormValues) => {
    if (supplierId) {
      await updateSupplier.mutateAsync({ id: supplierId, ...data });
    } else {
      await createSupplier.mutateAsync(data);
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{supplierId ? "Edit Supplier" : "New Supplier"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input id="name" {...register("name")} placeholder="Supplier name" />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Contact Name */}
          <div className="space-y-1.5">
            <Label htmlFor="contactName">Contact Person</Label>
            <Input
              id="contactName"
              {...register("contactName")}
              placeholder="Full name"
            />
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="supplier@example.com"
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                {...register("phone")}
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              {...register("address")}
              placeholder="Street, City, Country"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Any additional notes…"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving…"
                : supplierId
                ? "Save Changes"
                : "Create Supplier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SuppliersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {
    data: suppliersData,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteSuppliers({ search: search || undefined });
  const filtered = useMemo(() => suppliersData?.pages.flatMap((p) => p.data) ?? [], [suppliersData]);
  const deleteSupplier = useDeleteSupplier();

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && !isFetchingNextPage) fetchNextPage(); },
      { rootMargin: "300px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteSupplier.mutateAsync(deleteId);
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-sm text-muted-foreground">
            Manage your supplier relationships
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Supplier
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search suppliers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="rounded-xl border overflow-hidden">
          <Table><TableBody>
            {Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><div className="h-4 w-28 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-4 w-10 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                <TableCell />
              </TableRow>
            ))}
          </TableBody></Table>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <Truck className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-semibold">No suppliers found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {search
              ? "Try a different search term."
              : "Add your first supplier to get started."}
          </p>
          {!search && (
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Supplier
            </Button>
          )}
        </div>
      ) : (
        <>
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Products</TableHead>
                <TableHead className="text-right">Total Spend</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((supplier) => (
                <TableRow key={supplier.id}>
                  {/* Name */}
                  <TableCell className="font-medium">
                    <button
                      onClick={() => router.push(`/suppliers/${supplier.id}`)}
                      className="hover:underline text-left"
                    >
                      {supplier.name}
                    </button>
                  </TableCell>

                  {/* Contact */}
                  <TableCell className="text-sm text-muted-foreground">
                    {supplier.contactName ?? "—"}
                  </TableCell>

                  {/* Email */}
                  <TableCell className="text-sm">
                    {supplier.email ? (
                      <a
                        href={`mailto:${supplier.email}`}
                        className="text-primary hover:underline"
                      >
                        {supplier.email}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Phone */}
                  <TableCell className="text-sm">
                    {supplier.phone ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Product count */}
                  <TableCell className="text-right tabular-nums text-sm">
                    {supplier._count?.products ?? supplier.productCount ?? 0}
                  </TableCell>

                  {/* Total spend */}
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(supplier.totalSpend ?? 0)}
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setEditSupplier(supplier)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteId(supplier.id)}
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
          {isFetchingNextPage && (
            <Table><TableBody>
              {Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-4 w-28 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-10 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                  <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                  <TableCell />
                </TableRow>
              ))}
            </TableBody></Table>
          )}
        </div>
        {hasNextPage && <div ref={sentinelRef} className="h-1" />}
        </>
      )}

      {/* Create Dialog */}
      <SupplierFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      {/* Edit Dialog */}
      {editSupplier && (
        <SupplierFormDialog
          open={!!editSupplier}
          onClose={() => setEditSupplier(null)}
          supplierId={editSupplier.id}
          defaultValues={{
            name: editSupplier.name ?? "",
            contactName: editSupplier.contactName ?? "",
            email: editSupplier.email ?? "",
            phone: editSupplier.phone ?? "",
            address: editSupplier.address ?? "",
            notes: editSupplier.notes ?? "",
          }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supplier</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the supplier. Products linked to this
              supplier will not be deleted. This action cannot be undone.
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
