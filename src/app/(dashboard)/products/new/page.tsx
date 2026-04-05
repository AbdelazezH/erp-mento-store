"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductForm } from "@/components/features/products/product-form";

export default function NewProductPage() {
  return (
    <div className="min-h-screen pb-20">
      {/* Page header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-6 py-4">
        <div className="flex items-center gap-3">
          <Link
            href="/products"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-base font-semibold">New Product</h1>
        </div>
      </div>

      <ProductForm mode="create" />
    </div>
  );
}
