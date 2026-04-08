"use client";

import { use } from "react";
import { useBill } from "@/hooks/use-api";
import { InvoiceForm } from "@/components/features/invoices/invoice-form";
import { Card, CardContent } from "@/components/ui/card";

export default function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: bill, isLoading } = useBill(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-muted animate-pulse rounded" />
        <Card>
          <CardContent className="pt-6 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Invoice not found.
      </div>
    );
  }

  const b = bill as any;

  const defaultValues = {
    billType: b.billType ?? "supplier_bill",
    supplierId: b.supplierId ?? null,
    name: b.name ?? "",
    paidBy: b.paidBy ?? null,
    status: b.status ?? "pending",
    issueDate: b.issueDate ? b.issueDate.substring(0, 10) : "",
    dueDate: b.dueDate ? b.dueDate.substring(0, 10) : "",
    notes: b.notes ?? "",
    receiptImageUrl: b.receiptImageUrl ?? null,
    items:
      b.lineItems?.length > 0
        ? b.lineItems.map((item: any) => ({
            mode: item.productId ? "product" : "text",
            productId: item.productId ?? null,
            description: item.description ?? "",
            quantity: parseFloat(item.quantity ?? "1"),
            unitPrice: parseFloat(item.unitPrice ?? "0"),
            discountPercent: parseFloat(item.discountPercent ?? "0"),
          }))
        : [{ mode: "text", productId: null, description: "", quantity: 1, unitPrice: 0, discountPercent: 0 }],
  };

  return <InvoiceForm billId={id} defaultValues={defaultValues} />;
}
