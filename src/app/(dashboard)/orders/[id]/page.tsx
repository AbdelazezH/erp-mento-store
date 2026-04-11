"use client";

import React from "react";
import { useOrder } from "@/hooks/use-api";
import OrderForm from "../_components/OrderForm";

export default function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const { data: order, isLoading } = useOrder(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-48 bg-muted animate-pulse rounded-lg" />
            <div className="h-64 bg-muted animate-pulse rounded-lg" />
            <div className="h-32 bg-muted animate-pulse rounded-lg" />
          </div>
          <div className="space-y-4">
            <div className="h-24 bg-muted animate-pulse rounded-lg" />
            <div className="h-32 bg-muted animate-pulse rounded-lg" />
            <div className="h-40 bg-muted animate-pulse rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Order not found.</p>
      </div>
    );
  }

  const defaultValues = {
    customerId: (order as any).customerId ?? "",
    campaignId: (order as any).campaignId ?? null,
    orderDate: (order as any).orderDate
      ? new Date((order as any).orderDate).toISOString().substring(0, 10)
      : "",
    status: (order as any).status ?? "pending",
    notes: (order as any).notes ?? "",
    customerFeedback: (order as any).customerFeedback ?? "",
    shippingFee: parseFloat((order as any).shippingFee ?? "0"),
    shippingDiscount: parseFloat((order as any).shippingDiscount ?? "0"),
    items:
      (order as any).lineItems?.length > 0
        ? (order as any).lineItems.map((i: any) => ({
            productId: i.productId ?? "",
            variant: i.variantName ?? "",
            quantity: parseInt(String(i.quantity ?? "1")),
            unitPrice: parseFloat(i.unitPrice ?? "0"),
            isFree: i.isFree ?? false,
          }))
        : [{ productId: "", variant: "", quantity: 1, unitPrice: 0, isFree: false }],
  };

  return <OrderForm orderId={id} defaultValues={defaultValues} />;
}
