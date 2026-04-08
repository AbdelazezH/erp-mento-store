"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreateProduct,
  useUpdateProduct,
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useSuppliers,
  useCreateSupplier,
  useAttributes,
  useCreateAttribute,
  useAddAttributeValue,
  useSyncVariants,
  useMaterials,
  useSaveGallery,
} from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ImageUpload } from "./image-upload";
import { Plus, X, ChevronDown, Images } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  metaDescription: z.string().optional(),
  imageUrl: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  isPublished: z.boolean().default(false),
  basePrice: z.coerce.number().min(0).optional().nullable(),
  sellingPrice: z.coerce.number().min(0).optional().nullable(),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  stockQuantity: z.coerce.number().int().min(0).default(0),
  width: z.coerce.number().min(0).optional().nullable(),
  height: z.coerce.number().min(0).optional().nullable(),
  material: z.string().optional().nullable(),
  hasVariants: z.boolean().default(false),
});

type FormValues = z.infer<typeof schema>;

// ─── Types ───────────────────────────────────────────────────────────────────

interface AttributeValue {
  id: string;
  value: string;
  colorHex?: string | null;
}

interface Attribute {
  id: string;
  name: string;
  type: string;
  values: AttributeValue[];
}

interface VariantDraft {
  _key: string;
  id?: string;
  name: string;
  attributeName: string;
  attributeValue: string;
  sku: string;
  barcode: string;
  imageUrl: string;
  sellingPrice: string;
  stockQuantity: number;
}

interface AttributeRow {
  attribute: Attribute;
  selectedValues: AttributeValue[];
  pendingValue: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateSku() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return "PRD-" + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function generateBarcode() {
  return Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
}

// ─── Helper: generate cartesian product of selected values across attribute rows ─

function generateVariants(rows: AttributeRow[]): Omit<VariantDraft, "_key" | "id" | "sku" | "barcode" | "imageUrl" | "sellingPrice" | "stockQuantity">[] {
  const activeRows = rows.filter((r) => r.selectedValues.length > 0);
  if (activeRows.length === 0) return [];

  const combos: { name: string; attributeName: string; attributeValue: string }[] = [];

  function combine(rowIdx: number, current: { name: string; attributeName: string; attributeValue: string }[]) {
    if (rowIdx === activeRows.length) {
      if (current.length === 1) {
        combos.push(current[0]);
      } else {
        combos.push({
          name: current.map((c) => c.attributeValue).join(" × "),
          attributeName: current.map((c) => c.attributeName).join(" × "),
          attributeValue: current.map((c) => c.attributeValue).join(" × "),
        });
      }
      return;
    }
    const row = activeRows[rowIdx];
    for (const val of row.selectedValues) {
      combine(rowIdx + 1, [
        ...current,
        { name: val.value, attributeName: row.attribute.name, attributeValue: val.value },
      ]);
    }
  }

  combine(0, []);
  return combos;
}

// ─── Quick-create dialogs ─────────────────────────────────────────────────────

function NewCategoryDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState("");
  const create = useCreateCategory();
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>New Category</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" autoFocus />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!name.trim() || create.isPending}
            onClick={async () => {
              const res: any = await create.mutateAsync({ name: name.trim() });
              onCreated(res.id);
              setName("");
              onClose();
            }}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditCategoryDialog({
  open,
  onClose,
  category,
}: {
  open: boolean;
  onClose: () => void;
  category: { id: string; name: string; description?: string } | null;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const update = useUpdateCategory();

  useEffect(() => {
    setName(category?.name ?? "");
    setDescription(category?.description ?? "");
  }, [category]);

  if (!category) return null;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Edit Category</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Description <span className="text-xs font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description…" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!name.trim() || update.isPending}
            onClick={async () => {
              await update.mutateAsync({ id: category.id, name: name.trim(), description: description.trim() || undefined });
              onClose();
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewSupplierDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState("");
  const create = useCreateSupplier();
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>New Supplier</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Supplier name" autoFocus />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!name.trim() || create.isPending}
            onClick={async () => {
              const res: any = await create.mutateAsync({ name: name.trim() });
              onCreated(res.id);
              setName("");
              onClose();
            }}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Attribute Row Card ───────────────────────────────────────────────────────

function AttributeRowCard({
  row,
  rowIdx,
  onRemove,
  onAddValue,
  onRemoveValue,
  onNewValueCreated,
  addAttributeValue,
}: {
  row: AttributeRow;
  rowIdx: number;
  onRemove: () => void;
  onAddValue: (val: AttributeValue) => void;
  onRemoveValue: (valueId: string) => void;
  onNewValueCreated: (rowIdx: number, val: AttributeValue) => void;
  addAttributeValue: ReturnType<typeof useAddAttributeValue>;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newValueInput, setNewValueInput] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unselectedValues = row.attribute.values.filter(
    (v) => !row.selectedValues.some((sv) => sv.id === v.id)
  );

  const handleAddNewValue = async () => {
    const trimmed = newValueInput.trim();
    if (!trimmed || !row.attribute.id) return;
    const result = await addAttributeValue.mutateAsync({ attributeId: row.attribute.id, value: trimmed });
    const newVal = { id: result.id, value: result.value, colorHex: result.colorHex };
    onNewValueCreated(rowIdx, newVal);
    setNewValueInput("");
    setIsAddingNew(false);
  };

  return (
    <div className="border rounded-xl p-4 space-y-3 bg-background">
      {/* Header: attribute name + remove */}
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{row.attribute.name}</span>
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Selected value chips */}
      {row.selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {row.selectedValues.map((val) => (
            <Badge key={val.id} variant="secondary" className="gap-1 pr-1.5 h-6 text-xs font-normal">
              {val.value}
              <button
                type="button"
                onClick={() => onRemoveValue(val.id)}
                className="hover:text-destructive ml-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Value selector: dropdown OR new value input */}
      <div className="relative" ref={dropdownRef}>
        {isAddingNew ? (
          <div className="flex gap-2">
            <Input
              value={newValueInput}
              onChange={(e) => setNewValueInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); handleAddNewValue(); }
                if (e.key === "Escape") { setIsAddingNew(false); setNewValueInput(""); }
              }}
              placeholder="Enter new value…"
              className="h-9 flex-1 text-sm"
              autoFocus
            />
            <Button
              type="button"
              size="icon"
              disabled={!newValueInput.trim() || addAttributeValue.isPending}
              onClick={handleAddNewValue}
              className="h-9 w-9 shrink-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => { setIsAddingNew(false); setNewValueInput(""); }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            {/* Custom dropdown trigger */}
            <button
              type="button"
              className="flex-1 flex items-center justify-between h-9 rounded-lg border bg-background px-3 text-sm text-muted-foreground hover:bg-muted/30 transition-colors"
              onClick={() => setShowDropdown((v) => !v)}
            >
              <span>Select a value…</span>
              <ChevronDown className="h-4 w-4 shrink-0" />
            </button>
            {/* Blue + button */}
            <Button
              type="button"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => setShowDropdown((v) => !v)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Custom dropdown list */}
        {showDropdown && !isAddingNew && (
          <div className="absolute z-20 top-full mt-1 w-full rounded-xl border bg-popover shadow-lg overflow-hidden">
            <div className="max-h-52 overflow-y-auto">
              {unselectedValues.length === 0 && (
                <div className="px-4 py-3 text-sm text-muted-foreground">All values selected</div>
              )}
              {unselectedValues.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                  onClick={() => {
                    onAddValue(v);
                    setShowDropdown(false);
                  }}
                >
                  {v.value}
                </button>
              ))}
            </div>
            {/* New value option */}
            {row.attribute.id && (
              <div className="border-t">
                <button
                  type="button"
                  className="w-full text-left px-4 py-2.5 text-sm text-primary hover:bg-accent transition-colors flex items-center gap-1.5"
                  onClick={() => {
                    setShowDropdown(false);
                    setIsAddingNew(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  New value…
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Gallery Upload Cell ──────────────────────────────────────────────────────

function GalleryUploadCell({ onUpload }: { onUpload: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      onUpload(url);
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className="aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors text-muted-foreground gap-1"
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          files.forEach(handleFile);
          e.target.value = "";
        }}
      />
      {uploading ? (
        <span className="text-xs">Uploading…</span>
      ) : (
        <>
          <Plus className="h-6 w-6" />
          <span className="text-xs">Add Image</span>
        </>
      )}
    </div>
  );
}

// ─── Variant Card ─────────────────────────────────────────────────────────────

function VariantCard({
  variant,
  onChange,
  onRemove,
  productSku,
  productSellingPrice,
}: {
  variant: VariantDraft;
  onChange: (updated: Partial<VariantDraft>) => void;
  onRemove: () => void;
  productSku?: string | null;
  productSellingPrice?: number | null;
}) {
  const priceHint = productSellingPrice != null
    ? `Default: L.E ${productSellingPrice}`
    : "Same as product";

  return (
    <div className="border rounded-lg p-4 space-y-3 relative">
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <ImageUpload
          value={variant.imageUrl || null}
          onUpload={(url) => onChange({ imageUrl: url })}
          onRemove={() => onChange({ imageUrl: "" })}
          size="sm"
          className="shrink-0"
        />
        <div>
          <p className="font-medium text-sm">{variant.name}</p>
          <p className="text-xs text-muted-foreground">
            {variant.attributeName}: {variant.attributeValue}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">SKU</Label>
          <div className="flex h-8 items-center rounded-md border bg-muted/50 px-3 text-sm font-mono text-muted-foreground">
            {productSku
              ? `${productSku}-${variant.attributeValue}`
              : variant.attributeValue || "—"}
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Barcode</Label>
          <div className="flex h-8 items-center rounded-md border bg-muted/50 px-3 text-xs font-mono text-muted-foreground select-all">
            {variant.barcode || "—"}
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Stock</Label>
          <Input
            type="number"
            min="0"
            value={variant.stockQuantity}
            onChange={(e) => onChange({ stockQuantity: parseInt(e.target.value) || 0 })}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Price Override</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={variant.sellingPrice}
            onChange={(e) => onChange({ sellingPrice: e.target.value })}
            placeholder={priceHint}
            className="h-8 text-sm"
          />
          {!variant.sellingPrice && productSellingPrice != null && (
            <p className="text-xs text-muted-foreground">Uses product price: L.E {productSellingPrice}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export interface ProductFormProps {
  mode: "create" | "edit";
  productId?: string;
  initialData?: any;
  onSuccess?: (id: string) => void;
}

export function ProductForm({ mode, productId, initialData, onSuccess }: ProductFormProps) {
  const router = useRouter();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const syncVariants = useSyncVariants();
  const saveGallery = useSaveGallery();
  const addAttributeValue = useAddAttributeValue();
  const { data: categories = [] } = useCategories();
  const { data: suppliers = [] } = useSuppliers();
  const { data: attributes = [] } = useAttributes();
  const { data: materials = [] } = useMaterials();

  // ── Form ──
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialData
      ? {
          name: initialData.name ?? "",
          description: initialData.description ?? "",
          metaDescription: initialData.properties?.find((p: any) => p.key === "metaDescription")?.value ?? "",
          imageUrl: initialData.imageUrl ?? null,
          categoryId: initialData.categoryId ?? null,
          supplierId: initialData.supplierId ?? null,
          sku: initialData.sku ?? "",
          barcode: initialData.barcode ?? "",
          isPublished: initialData.isPublished ?? false,
          basePrice: initialData.basePrice ? parseFloat(initialData.basePrice) : null,
          sellingPrice: initialData.sellingPrice ? parseFloat(initialData.sellingPrice) : null,
          discountPercent: initialData.discountPercent ? parseFloat(initialData.discountPercent) : 0,
          stockQuantity: initialData.stockQuantity ?? 0,
          width: initialData.width ? parseFloat(initialData.width) : null,
          height: initialData.height ? parseFloat(initialData.height) : null,
          material: initialData.material ?? null,
          hasVariants: initialData.hasVariants ?? false,
        }
      : {
          name: "",
          description: "",
          metaDescription: "",
          isPublished: false,
          discountPercent: 0,
          stockQuantity: 0,
          hasVariants: false,
        },
  });

  const basePrice = watch("basePrice");
  const sellingPrice = watch("sellingPrice");
  const discountPercent = watch("discountPercent") ?? 0;
  const hasVariants = watch("hasVariants");
  const isPublished = watch("isPublished");
  const description = watch("description");
  const imageUrl = watch("imageUrl");
  const categoryId = watch("categoryId");

  // ── Derived pricing ──
  const expectedProfit =
    sellingPrice != null && basePrice != null ? (sellingPrice - basePrice) : null;
  const priceWithoutDiscount =
    sellingPrice != null ? sellingPrice * (1 + discountPercent / 100) : null;
  const [marginInput, setMarginInput] = useState<string>(() => {
    if (sellingPrice && basePrice && sellingPrice > 0) {
      return (((sellingPrice - basePrice) / sellingPrice) * 100).toFixed(1);
    }
    return "";
  });

  // Sync margin display when basePrice/sellingPrice change externally
  useEffect(() => {
    if (sellingPrice && basePrice != null && sellingPrice > 0) {
      const m = (((sellingPrice - basePrice) / sellingPrice) * 100).toFixed(1);
      setMarginInput(m);
    }
  }, [basePrice, sellingPrice]);

  // Auto-generate SKU + barcode on create
  useEffect(() => {
    if (mode === "create") {
      setValue("sku", generateSku());
      setValue("barcode", generateBarcode());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMarginChange = (val: string) => {
    setMarginInput(val);
    const m = parseFloat(val);
    if (!isNaN(m) && m >= 0 && m < 100 && basePrice != null && basePrice > 0) {
      const sp = basePrice / (1 - m / 100);
      setValue("sellingPrice", parseFloat(sp.toFixed(2)));
    }
  };

  // ── Gallery state ──
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  useEffect(() => {
    if (initialData?.gallery?.length > 0) {
      setGalleryImages(initialData.gallery.map((g: any) => g.imageUrl));
    }
  }, [initialData]);

  // ── Variants state ──
  const createAttribute = useCreateAttribute();
  const [attributeRows, setAttributeRows] = useState<AttributeRow[]>([]);
  const [variantDrafts, setVariantDrafts] = useState<VariantDraft[]>([]);
  const [showAddAttrDropdown, setShowAddAttrDropdown] = useState(false);
  const [isCreatingNewAttr, setIsCreatingNewAttr] = useState(false);
  const [newAttrName, setNewAttrName] = useState("");
  const addAttrRef = useRef<HTMLDivElement>(null);

  // Initialize variants from existing data
  useEffect(() => {
    if (initialData?.variants?.length > 0) {
      const draftMap = new Map<string, AttributeRow>();
      const drafts: VariantDraft[] = initialData.variants.map((v: any) => ({
        _key: v.id,
        id: v.id,
        name: v.name,
        attributeName: v.attributeName ?? "",
        attributeValue: v.attributeValue ?? "",
        sku: v.sku ?? "",
        barcode: v.barcode ?? "",
        imageUrl: v.imageUrl ?? "",
        sellingPrice: v.sellingPrice ?? "",
        stockQuantity: v.stockQuantity ?? 0,
      }));
      setVariantDrafts(drafts);

      for (const v of initialData.variants) {
        if (!v.attributeName) continue;
        if (!draftMap.has(v.attributeName)) {
          const foundAttr = (attributes as Attribute[]).find((a) => a.name === v.attributeName);
          if (foundAttr) {
            draftMap.set(v.attributeName, { attribute: foundAttr, selectedValues: [], pendingValue: "" });
          } else {
            draftMap.set(v.attributeName, {
              attribute: { id: "", name: v.attributeName, type: "text", values: [] },
              selectedValues: [],
              pendingValue: "",
            });
          }
        }
        const row = draftMap.get(v.attributeName)!;
        const alreadyHas = row.selectedValues.some((sv) => sv.value === v.attributeValue);
        if (!alreadyHas) {
          row.selectedValues.push({ id: v.attributeValue, value: v.attributeValue });
        }
      }
      setAttributeRows(Array.from(draftMap.values()));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  const addAttributeRow = (attr: Attribute) => {
    if (attributeRows.some((r) => r.attribute.id === attr.id)) return;
    setAttributeRows((prev) => [...prev, { attribute: attr, selectedValues: [], pendingValue: "" }]);
  };

  const removeAttributeRow = (idx: number) => {
    const removed = attributeRows[idx];
    setAttributeRows((prev) => prev.filter((_, i) => i !== idx));
    setVariantDrafts((prev) =>
      prev.filter((v) => v.attributeName !== removed.attribute.name)
    );
  };

  const addValueToRow = (idx: number, value: AttributeValue) => {
    const row = attributeRows[idx];
    if (row.selectedValues.some((v) => v.id === value.id)) return;
    const newRows = attributeRows.map((r, i) =>
      i === idx ? { ...r, selectedValues: [...r.selectedValues, value], pendingValue: "" } : r
    );
    setAttributeRows(newRows);
    regenerateVariants(newRows);
  };

  const removeValueFromRow = (rowIdx: number, valueId: string) => {
    const row = attributeRows[rowIdx];
    const removedVal = row.selectedValues.find((v) => v.id === valueId);
    const newRows = attributeRows.map((r, i) =>
      i === rowIdx ? { ...r, selectedValues: r.selectedValues.filter((v) => v.id !== valueId) } : r
    );
    setAttributeRows(newRows);
    if (removedVal) {
      setVariantDrafts((prev) =>
        prev.filter((v) => !(v.attributeName === row.attribute.name && v.attributeValue === removedVal.value))
      );
    }
  };

  const regenerateVariants = useCallback((rows: AttributeRow[]) => {
    const combinations = generateVariants(rows);
    const currentSku = watch("sku");
    setVariantDrafts((prev) => {
      const updated: VariantDraft[] = combinations.map((combo) => {
        const existing = prev.find(
          (v) => v.attributeName === combo.attributeName && v.attributeValue === combo.attributeValue
        );
        if (existing) return existing;
        return {
          _key: `${combo.attributeName}::${combo.attributeValue}::${Date.now()}`,
          name: combo.name,
          attributeName: combo.attributeName,
          attributeValue: combo.attributeValue,
          sku: currentSku ? `${currentSku}-${combo.attributeValue}` : "",
          barcode: generateBarcode(),
          imageUrl: "",
          sellingPrice: initialData?.sellingPrice ?? "",
          stockQuantity: 0,
        };
      });
      return updated;
    });
  }, [initialData, watch]);

  const handleNewValueCreated = (rowIdx: number, newVal: AttributeValue) => {
    const updatedRows = attributeRows.map((r, i) =>
      i === rowIdx
        ? { ...r, attribute: { ...r.attribute, values: [...r.attribute.values, newVal] }, selectedValues: [...r.selectedValues, newVal] }
        : r
    );
    setAttributeRows(updatedRows);
    regenerateVariants(updatedRows);
  };

  // Close add-attr dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (addAttrRef.current && !addAttrRef.current.contains(e.target as Node)) {
        setShowAddAttrDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Dialogs ──
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [showNewSupplier, setShowNewSupplier] = useState(false);

  const selectedCategory = (categories as any[]).find((c) => c.id === categoryId) ?? null;

  // ── Material combobox ──
  const [materialInput, setMaterialInput] = useState(initialData?.material ?? "");
  const [showMaterialSuggestions, setShowMaterialSuggestions] = useState(false);
  const filteredMaterials = (materials as string[]).filter(
    (m) => m.toLowerCase().includes(materialInput.toLowerCase()) && m !== materialInput
  );

  // ── Submit ──
  const onSubmit = async (data: FormValues) => {
    try {
      const properties: { key: string; value: string }[] = [];
      if (data.metaDescription) {
        properties.push({ key: "metaDescription", value: data.metaDescription });
      }

      const payload = {
        ...data,
        material: materialInput || null,
        properties,
      };

      let savedId = productId;

      if (mode === "create") {
        const res: any = await createProduct.mutateAsync(payload);
        savedId = res.id;
        toast.success("Product created");
      } else {
        await updateProduct.mutateAsync({ id: productId!, ...payload });
        toast.success("Product updated");
      }

      // Sync variants
      if (data.hasVariants && savedId) {
        await syncVariants.mutateAsync({
          productId: savedId,
          variants: variantDrafts.map((v) => ({
            name: v.name,
            attributeName: v.attributeName,
            attributeValue: v.attributeValue,
            sku: v.sku || null,
            barcode: v.barcode || null,
            imageUrl: v.imageUrl || null,
            sellingPrice: v.sellingPrice ? parseFloat(v.sellingPrice) : null,
            stockQuantity: v.stockQuantity,
          })),
        });
      } else if (!data.hasVariants && savedId) {
        await syncVariants.mutateAsync({ productId: savedId!, variants: [] });
      }

      // Save gallery
      if (savedId) {
        await saveGallery.mutateAsync({
          productId: savedId,
          images: galleryImages.map((url, i) => ({ imageUrl: url, sortOrder: i })),
        });
      }

      onSuccess?.(savedId!);
      router.push("/products");
    } catch {
      // Errors handled by individual mutations
    }
  };

  const isSaving = isSubmitting || createProduct.isPending || updateProduct.isPending || syncVariants.isPending || saveGallery.isPending;

  return (
    <>
      <form id="product-form" onSubmit={handleSubmit(onSubmit)} className="space-y-0">
        <Tabs defaultValue="details" className="space-y-0">
          {/* Tab header */}
          <div className="border-b px-6 pt-4">
            <TabsList className="bg-transparent p-0 gap-0 h-auto">
              <TabsTrigger
                value="details"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3"
              >
                Details &amp; Properties
              </TabsTrigger>
              <TabsTrigger
                value="variants"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3 flex items-center gap-1.5"
              >
                Variants
                {hasVariants ? (
                  <span className="text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 leading-none">On</span>
                ) : (
                  <span className="text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 leading-none">Off</span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="gallery"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3 flex items-center gap-1.5"
              >
                Gallery
                {galleryImages.length > 0 && (
                  <span className="text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 leading-none">{galleryImages.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="costHistory"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3"
              >
                Cost History
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── Details & Properties Tab ── */}
          <TabsContent value="details" className="mt-0 p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-6">
              {/* Left column */}
              <div className="space-y-6">
                {/* PRODUCT INFO */}
                <section className="border rounded-xl p-5 space-y-4">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Product Info</h2>

                  {/* Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="name">
                      Name <span className="text-destructive">*</span>
                    </Label>
                    <Input id="name" {...register("name")} placeholder="Product name" />
                    {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                  </div>

                  {/* Description (rich text) */}
                  <div className="space-y-1.5">
                    <Label>Product Description</Label>
                    <RichTextEditor
                      value={description}
                      onChange={(html) => setValue("description", html)}
                      placeholder="Describe your product…"
                    />
                  </div>

                  {/* Meta Description */}
                  <div className="space-y-1.5">
                    <Label htmlFor="metaDescription">
                      Meta Description{" "}
                      <span className="text-xs font-normal text-muted-foreground">(SEO / short summary)</span>
                    </Label>
                    <Textarea
                      id="metaDescription"
                      {...register("metaDescription")}
                      placeholder="Brief summary for search engines and previews, max ~160 characters…"
                      rows={2}
                    />
                  </div>

                  {/* Status */}
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select
                      value={isPublished ? "published" : "draft"}
                      onValueChange={(v) => setValue("isPublished", v === "published")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="draft">Not Published</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Category + Supplier */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label>Category</Label>
                        <button
                          type="button"
                          onClick={() => setShowNewCategory(true)}
                          className="text-xs text-primary hover:underline"
                        >
                          + New
                        </button>
                      </div>
                      <Select
                        value={categoryId ?? "__none__"}
                        onValueChange={(v) => setValue("categoryId", v === "__none__" ? null : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selection" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— None —</SelectItem>
                          {(categories as any[]).map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label>Supplier</Label>
                        <button
                          type="button"
                          onClick={() => setShowNewSupplier(true)}
                          className="text-xs text-primary hover:underline"
                        >
                          + New Supplier
                        </button>
                      </div>
                      <Select
                        value={watch("supplierId") ?? "__none__"}
                        onValueChange={(v) => setValue("supplierId", v === "__none__" ? null : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selection" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— None —</SelectItem>
                          {(suppliers as any[]).map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* SKU — always visible */}
                  <div className="space-y-1.5">
                    <Label htmlFor="sku">
                      Product Code{" "}
                      <span className="text-xs font-normal text-muted-foreground">(Supplier Code / SKU)</span>
                    </Label>
                    <Input id="sku" {...register("sku")} placeholder="PRD-A4X2TK" />
                  </div>

                  {/* Barcode — auto-generated, read-only, hidden when variants are on */}
                  <div className={cn("space-y-1.5", hasVariants && "hidden")}>
                    <Label>Barcode</Label>
                    <div className="flex h-9 items-center rounded-md border bg-muted/50 px-3 text-sm font-mono text-muted-foreground select-all">
                      {watch("barcode") || "—"}
                    </div>
                  </div>
                </section>

                {/* PRICING & STOCK */}
                <section className="border rounded-xl p-5 space-y-4">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Pricing &amp; Stock</h2>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Base Cost */}
                    <div className="space-y-1.5">
                      <Label htmlFor="basePrice">Base Cost (L.E)</Label>
                      <Input
                        id="basePrice"
                        type="number"
                        step="0.01"
                        min="0"
                        {...register("basePrice")}
                        placeholder="0.00"
                      />
                    </div>

                    {/* Selling Price */}
                    <div className="space-y-1.5">
                      <Label htmlFor="sellingPrice">Selling Price (L.E)</Label>
                      <Input
                        id="sellingPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        {...register("sellingPrice")}
                        placeholder="0.00"
                      />
                    </div>

                    {/* Margin % */}
                    <div className="space-y-1.5">
                      <Label htmlFor="margin">
                        Margin %{" "}
                        <span className="text-xs font-normal text-muted-foreground">(editable)</span>
                      </Label>
                      <Input
                        id="margin"
                        type="number"
                        step="0.1"
                        min="0"
                        max="99.9"
                        value={marginInput}
                        onChange={(e) => handleMarginChange(e.target.value)}
                        placeholder="0.0"
                      />
                    </div>

                    {/* Expected Profit (read only) */}
                    <div className="space-y-1.5">
                      <Label>Expected Profit (L.E)</Label>
                      <div className="flex h-9 items-center rounded-md border bg-muted/30 px-3 text-sm font-medium text-emerald-600">
                        {expectedProfit != null
                          ? `L.E ${expectedProfit.toFixed(2)}`
                          : <span className="text-muted-foreground font-normal">—</span>}
                      </div>
                    </div>

                    {/* FOMO Rate % */}
                    <div className="space-y-1.5">
                      <Label htmlFor="discountPercent">
                        FOMO Rate %{" "}
                        <span className="text-xs font-normal text-muted-foreground">(inflates displayed price)</span>
                      </Label>
                      <Input
                        id="discountPercent"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        {...register("discountPercent")}
                        placeholder="0"
                      />
                    </div>

                    {/* Price without Discount (read only) */}
                    <div className="space-y-1.5">
                      <Label>Price without Discount (L.E)</Label>
                      <div className="flex h-9 items-center rounded-md border bg-muted/30 px-3 text-sm font-medium text-emerald-600">
                        {priceWithoutDiscount != null
                          ? `L.E ${priceWithoutDiscount.toFixed(2)}`
                          : <span className="text-muted-foreground font-normal">—</span>}
                      </div>
                    </div>
                  </div>

                  {/* Stock */}
                  {!hasVariants && (
                    <div className="space-y-1.5">
                      <Label htmlFor="stockQuantity">Stock Quantity</Label>
                      <Input
                        id="stockQuantity"
                        type="number"
                        min="0"
                        {...register("stockQuantity")}
                        placeholder="0"
                      />
                    </div>
                  )}
                </section>

                {/* PROPERTIES */}
                <section className="border rounded-xl p-5 space-y-4">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Properties</h2>

                  {/* Dimensions */}
                  <div className="space-y-1.5">
                    <Label>Dimensions <span className="text-xs font-normal text-muted-foreground">(cm)</span></Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder="Width"
                          {...register("width")}
                          className="pr-10"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">cm</span>
                      </div>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder="Height"
                          {...register("height")}
                          className="pr-10"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">cm</span>
                      </div>
                    </div>
                  </div>

                  {/* Material */}
                  <div className="space-y-1.5 relative">
                    <Label>Material</Label>
                    <Input
                      value={materialInput}
                      onChange={(e) => {
                        setMaterialInput(e.target.value);
                        setValue("material", e.target.value);
                        setShowMaterialSuggestions(true);
                      }}
                      onFocus={() => setShowMaterialSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowMaterialSuggestions(false), 150)}
                      placeholder="e.g. Leather, Cotton, Stainless Steel…"
                    />
                    {showMaterialSuggestions && filteredMaterials.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
                        {filteredMaterials.map((m) => (
                          <button
                            key={m}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                            onMouseDown={() => {
                              setMaterialInput(m);
                              setValue("material", m);
                              setShowMaterialSuggestions(false);
                            }}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* Right column: Product Image */}
              <div className="space-y-3">
                <div className="border rounded-xl p-4 space-y-3">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Product Image</h2>
                  <ImageUpload
                    value={imageUrl}
                    onUpload={(url) => setValue("imageUrl", url)}
                    onRemove={() => setValue("imageUrl", null)}
                    size="lg"
                    className="w-full h-48"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Variants Tab ── */}
          <TabsContent value="variants" className="mt-0 p-6 space-y-6">
            {/* Toggle */}
            <div className="border rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">This product has variants</p>
                  <p className="text-sm text-muted-foreground">
                    Enable to manage stock per variant (e.g. Color × Size)
                  </p>
                </div>
                <Switch
                  checked={hasVariants}
                  onCheckedChange={(v) => {
                    setValue("hasVariants", v);
                    if (!v) {
                      setAttributeRows([]);
                      setVariantDrafts([]);
                    }
                  }}
                />
              </div>
            </div>

            {hasVariants && (
              <div className="border rounded-xl p-5 space-y-3">
                {/* Attribute row cards */}
                {attributeRows.map((row, rowIdx) => (
                  <AttributeRowCard
                    key={row.attribute.id || rowIdx}
                    row={row}
                    rowIdx={rowIdx}
                    onRemove={() => removeAttributeRow(rowIdx)}
                    onAddValue={(val) => addValueToRow(rowIdx, val)}
                    onRemoveValue={(valId) => removeValueFromRow(rowIdx, valId)}
                    onNewValueCreated={handleNewValueCreated}
                    addAttributeValue={addAttributeValue}
                  />
                ))}

                {/* Add attribute section */}
                <div ref={addAttrRef}>
                  {isCreatingNewAttr ? (
                    <div className="border rounded-xl p-4 space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">New Attribute</p>
                      <Input
                        value={newAttrName}
                        onChange={(e) => setNewAttrName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") { setIsCreatingNewAttr(false); setNewAttrName(""); }
                        }}
                        placeholder="e.g. Color, Size, Shape"
                        autoFocus
                        className="h-9"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={!newAttrName.trim() || createAttribute.isPending}
                          onClick={async () => {
                            const res: any = await createAttribute.mutateAsync({ name: newAttrName.trim() });
                            addAttributeRow(res);
                            setIsCreatingNewAttr(false);
                            setNewAttrName("");
                          }}
                        >
                          Create
                        </Button>
                        <button
                          type="button"
                          className="text-sm text-muted-foreground hover:text-foreground"
                          onClick={() => { setIsCreatingNewAttr(false); setNewAttrName(""); }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowAddAttrDropdown((v) => !v)}
                        className="w-full border-2 border-dashed rounded-lg px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add an attribute
                        <ChevronDown className="h-3 w-3 ml-auto" />
                      </button>
                      {showAddAttrDropdown && (
                        <div className="absolute z-20 mt-1 w-full rounded-xl border bg-popover shadow-lg overflow-hidden">
                          {(attributes as Attribute[])
                            .filter((a) => !attributeRows.some((r) => r.attribute.id === a.id))
                            .map((attr) => (
                              <button
                                key={attr.id}
                                type="button"
                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-colors flex items-center gap-2"
                                onClick={() => {
                                  addAttributeRow(attr);
                                  setShowAddAttrDropdown(false);
                                }}
                              >
                                <span className="text-muted-foreground">🏷</span>
                                {attr.name}
                              </button>
                            ))}
                          {(attributes as Attribute[]).filter((a) => !attributeRows.some((r) => r.attribute.id === a.id)).length === 0 && (
                            <div className="px-4 py-3 text-sm text-muted-foreground">All attributes added</div>
                          )}
                          <div className="border-t">
                            <button
                              type="button"
                              className="w-full text-left px-4 py-2.5 text-sm text-primary hover:bg-accent transition-colors flex items-center gap-1.5"
                              onClick={() => {
                                setShowAddAttrDropdown(false);
                                setIsCreatingNewAttr(true);
                              }}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              New Attribute
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Variant cards */}
                {variantDrafts.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                      {variantDrafts.length} Variants (will be saved on update)
                    </p>
                    <div className="space-y-3">
                      {variantDrafts.map((variant, idx) => (
                        <VariantCard
                          key={variant._key}
                          variant={variant}
                          productSku={watch("sku")}
                          productSellingPrice={sellingPrice}
                          onChange={(update) =>
                            setVariantDrafts((prev) =>
                              prev.map((v, i) => (i === idx ? { ...v, ...update } : v))
                            )
                          }
                          onRemove={() =>
                            setVariantDrafts((prev) => prev.filter((_, i) => i !== idx))
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── Gallery Tab ── */}
          <TabsContent value="gallery" className="mt-0 p-6">
            <div className="space-y-4">
              <div>
                <h2 className="font-medium">Product Gallery</h2>
                <p className="text-sm text-muted-foreground">
                  Upload marketing images for this product. These are saved separately from the main product image.
                </p>
              </div>

              {galleryImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center gap-3">
                  <Images className="h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No gallery images yet</p>
                  <GalleryUploadCell onUpload={(url) => setGalleryImages((g) => [...g, url])} />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {galleryImages.map((url, idx) => (
                    <div key={idx} className="group relative aspect-square rounded-lg border overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Gallery ${idx + 1}`} className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setGalleryImages((g) => g.filter((_, i) => i !== idx))}
                          className="p-1.5 rounded-md bg-white/20 hover:bg-red-500/70 transition-colors"
                          title="Remove"
                        >
                          <X className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <GalleryUploadCell onUpload={(url) => setGalleryImages((g) => [...g, url])} />
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Cost History Tab ── */}
          <TabsContent value="costHistory" className="mt-0 p-6">
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
              <p className="text-muted-foreground text-sm">Cost history will appear here once purchase bills are linked to this product.</p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Hidden submit button */}
        <button type="submit" id="product-form-submit" className="hidden" />
      </form>

      {/* Save bar — portalled outside <main> so it never overlaps the sidebar */}
      {typeof window !== "undefined" &&
        document.getElementById("page-bottom-bar") &&
        createPortal(
          <div className="border-t bg-background px-6 py-3 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.push("/products")}>
              Cancel
            </Button>
            <Button type="submit" form="product-form" disabled={isSaving}>
              {isSaving ? "Saving…" : mode === "create" ? "Save Product" : "Save Changes"}
            </Button>
          </div>,
          document.getElementById("page-bottom-bar")!
        )}

      {/* Quick-create / edit dialogs */}
      <NewCategoryDialog
        open={showNewCategory}
        onClose={() => setShowNewCategory(false)}
        onCreated={(id) => setValue("categoryId", id)}
      />
      <NewSupplierDialog
        open={showNewSupplier}
        onClose={() => setShowNewSupplier(false)}
        onCreated={(id) => setValue("supplierId", id)}
      />
    </>
  );
}
