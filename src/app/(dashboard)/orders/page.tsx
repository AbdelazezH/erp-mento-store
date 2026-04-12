"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  useInfiniteOrders,
  useUpdateOrder,
  useDeleteOrder,
} from "@/hooks/use-api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  ShoppingCart,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus = "draft" | "pending" | "delivered" | "cancelled";

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {
    data: ordersData,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteOrders({
    status: activeTab !== "all" ? activeTab : undefined,
  });
  const orders = useMemo(() => ordersData?.pages.flatMap((p) => p.data) ?? [], [ordersData]);

  const updateOrder = useUpdateOrder();
  const deleteOrder = useDeleteOrder();

  // Infinite scroll
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

  // Summary
  const summary = useMemo(() => {
    const all = orders as any[];
    const delivered = all.filter((o) => o.status === "delivered");
    const revenue = delivered.reduce(
      (s, o) => s + parseFloat(o.totalAmount ?? "0") + parseFloat(o.shippingFee ?? "0"),
      0,
    );
    const totalProfit = all.reduce(
      (s, o) => s + parseFloat(o.profit ?? "0"),
      0,
    );
    return { total: all.length, revenue, totalProfit };
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
        <Button onClick={() => router.push("/orders/new")}>
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
              Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{formatCurrency(summary.revenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Est. Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold tabular-nums ${summary.totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(summary.totalProfit)}
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
        <div className="rounded-xl border overflow-hidden">
          <Table><TableBody>
            {Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-4 w-28 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-5 w-16 bg-muted animate-pulse rounded-full" /></TableCell>
                <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell />
              </TableRow>
            ))}
          </TableBody></Table>
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
            <Button className="mt-4" onClick={() => router.push("/orders/new")}>
              <Plus className="mr-2 h-4 w-4" />
              New Order
            </Button>
          )}
        </div>
      ) : (
        <>
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Sales</TableHead>
                <TableHead className="text-right">Est. Profit</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(orders as any[]).map((order) => {
                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {order.orderNumber ?? "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {order.customerName ?? "—"}
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
                      {formatCurrency(parseFloat(order.totalAmount ?? "0") + parseFloat(order.shippingFee ?? "0"))}
                    </TableCell>
                    <TableCell className={`text-right font-medium tabular-nums ${parseFloat(order.profit ?? "0") >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(parseFloat(order.profit ?? "0"))}
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
                          <DropdownMenuItem onClick={() => router.push(`/orders/${order.id}`)}>
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
          {isFetchingNextPage && (
            <Table><TableBody>
              {Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-28 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-5 w-16 bg-muted animate-pulse rounded-full" /></TableCell>
                  <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell />
                </TableRow>
              ))}
            </TableBody></Table>
          )}
        </div>
        {hasNextPage && <div ref={sentinelRef} className="h-1" />}
        </>
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
