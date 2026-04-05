"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useProduct } from "@/hooks/use-api";
import { ProductForm } from "@/components/features/products/product-form";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: product, isLoading } = useProduct(id);

  if (isLoading) {
    return (
      <div className="min-h-screen pb-20">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background px-6 py-4">
          <Link
            href="/products"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <span className="text-muted-foreground">/</span>
          <div className="h-5 w-48 animate-pulse rounded bg-muted" />
        </div>
        <div className="p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <p className="text-muted-foreground">Product not found.</p>
        <Link href="/products" className="text-sm text-primary hover:underline">
          Back to Products
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Page header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background px-6 py-4">
        <Link
          href="/products"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-semibold">Edit Product</span>
        <span className="text-muted-foreground">—</span>
        <span className="text-sm text-muted-foreground truncate max-w-xs">{product.name}</span>
      </div>

      <ProductForm mode="edit" productId={id} initialData={product} />
    </div>
  );
}
