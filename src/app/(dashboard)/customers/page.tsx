"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  useInfiniteCustomers,
  useUpdateCustomer,
  useDeleteCustomer,
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
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  Star,
} from "lucide-react";
import { CustomerFormDialog } from "@/components/features/customers/customer-form-dialog";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {
    data: customersData,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteCustomers({ search: search || undefined });
  const customers = useMemo(() => customersData?.pages.flatMap((p) => p.data) ?? [], [customersData]);
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

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
    await deleteCustomer.mutateAsync(deleteId);
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">Manage your customer base</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Customer
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search customers…"
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
                <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-4 w-12 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell />
              </TableRow>
            ))}
          </TableBody></Table>
        </div>
      ) : (customers as any[]).length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <Users className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-semibold">No customers found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {search
              ? "Try a different search term."
              : "Get started by adding your first customer."}
          </p>
          {!search && (
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Customer
            </Button>
          )}
        </div>
      ) : (
        <>
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Total Spend</TableHead>
                <TableHead>Since</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(customers as any[]).map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() =>
                        updateCustomer.mutate({
                          id: customer.id,
                          hasFeedback: !customer.hasFeedback,
                        })
                      }
                      className="transition-colors hover:scale-110"
                      title={customer.hasFeedback ? "Remove feedback" : "Mark as feedback given"}
                    >
                      <Star
                        className={`h-4 w-4 ${
                          customer.hasFeedback
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground/40"
                        }`}
                      />
                    </button>
                  </TableCell>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {customer.email ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {customer.phone ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {customer._count?.orders ?? 0}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(customer.totalSpend ?? 0)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(customer.createdAt)}
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
                        <DropdownMenuItem onClick={() => setEditCustomer(customer)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteId(customer.id)}
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
                  <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-12 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
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
      <CustomerFormDialog open={createOpen} onClose={() => setCreateOpen(false)} />

      {/* Edit Dialog */}
      {editCustomer && (
        <CustomerFormDialog
          open={!!editCustomer}
          onClose={() => setEditCustomer(null)}
          customerId={editCustomer.id}
          defaultValues={{
            name: editCustomer.name ?? "",
            email: editCustomer.email ?? "",
            phone: editCustomer.phone ?? "",
            phone2: editCustomer.phone2 ?? "",
            governorate: editCustomer.governorate ?? "",
            address: editCustomer.address ?? "",
            notes: editCustomer.notes ?? "",
          }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the customer and may affect related orders. This
              action cannot be undone.
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
