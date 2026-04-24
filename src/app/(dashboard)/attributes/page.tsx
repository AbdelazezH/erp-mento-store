"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useAttributes,
  useCreateAttribute,
  useUpdateAttribute,
  useDeleteAttribute,
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  Tags,
  FolderOpen,
  X,
} from "lucide-react";

// ─── Attribute Schema ─────────────────────────────────────────────────────────

const attributeValueSchema = z.object({
  value: z.string().min(1, "Value is required"),
  colorHex: z.string().optional(),
});

const attributeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["text", "color"]),
  values: z.array(attributeValueSchema).min(1, "Add at least one value"),
});

type AttributeFormValues = z.infer<typeof attributeSchema>;

// ─── Category Schema ──────────────────────────────────────────────────────────

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeHex(hex: string): string {
  if (!hex) return "#000000";
  return hex.startsWith("#") ? hex : `#${hex}`;
}

// ─── Attribute Form Dialog ────────────────────────────────────────────────────

function AttributeFormDialog({
  open,
  onClose,
  defaultValues,
  attributeId,
}: {
  open: boolean;
  onClose: () => void;
  defaultValues?: Partial<AttributeFormValues>;
  attributeId?: string;
}) {
  const t = useTranslations("attributes");
  const tc = useTranslations("common");
  const createAttribute = useCreateAttribute();
  const updateAttribute = useUpdateAttribute();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AttributeFormValues>({
    resolver: zodResolver(attributeSchema),
    defaultValues: {
      name: "",
      type: "text",
      values: [{ value: "", colorHex: "" }],
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "values" });
  const watchedType = watch("type");

  const onSubmit = async (data: AttributeFormValues) => {
    const payload = {
      name: data.name,
      type: data.type,
      values: data.values
        .filter((v) => v.value.trim() !== "")
        .map((v, i) => ({
          value: v.value.trim(),
          colorHex: data.type === "color" ? normalizeHex(v.colorHex ?? "") : null,
          sortOrder: i,
        })),
    };
    if (attributeId) {
      await updateAttribute.mutateAsync({ id: attributeId, ...payload });
    } else {
      await createAttribute.mutateAsync(payload);
    }
    reset();
    onClose();
  };

  const handleClose = () => { reset(); onClose(); };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{attributeId ? t("editAttribute") : t("newAttribute")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="attr-name">{t("attributeNameLabel")} <span className="text-destructive">*</span></Label>
            <Input id="attr-name" {...register("name")} placeholder={t("attributeNamePlaceholder")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>{t("attributeType")}</Label>
            <Select
              defaultValue={defaultValues?.type ?? "text"}
              onValueChange={(v) => setValue("type", v as "text" | "color")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">{t("text")}</SelectItem>
                <SelectItem value="color">{t("color")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("values")} <span className="text-destructive">*</span></Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => append({ value: "", colorHex: "#000000" })}
                className="h-7 px-2 text-xs"
              >
                <Plus className="me-1 h-3.5 w-3.5" />
                {t("addValue")}
              </Button>
            </div>
            {errors.values && typeof errors.values.message === "string" && (
              <p className="text-xs text-destructive">{errors.values.message}</p>
            )}
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  {watchedType === "color" && (
                    <input
                      type="color"
                      {...register(`values.${index}.colorHex`)}
                      defaultValue={field.colorHex || "#000000"}
                      className="h-9 w-9 cursor-pointer rounded-md border border-input p-0.5 shrink-0"
                    />
                  )}
                  <Input
                    {...register(`values.${index}.value`)}
                    placeholder={watchedType === "color" ? "e.g. Red, Ocean Blue" : "e.g. Small, XL, Cotton"}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => fields.length > 1 && remove(index)}
                    disabled={fields.length === 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>{tc("cancel")}</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("saving") : attributeId ? t("saveChanges") : t("createAttribute")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Category Form Dialog ─────────────────────────────────────────────────────

function CategoryFormDialog({
  open,
  onClose,
  category,
}: {
  open: boolean;
  onClose: () => void;
  category?: { id: string; name: string; description?: string } | null;
}) {
  const t = useTranslations("attributes");
  const tc = useTranslations("common");
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name ?? "",
      description: category?.description ?? "",
    },
    values: {
      name: category?.name ?? "",
      description: category?.description ?? "",
    },
  });

  const onSubmit = async (data: CategoryFormValues) => {
    if (category) {
      await updateCategory.mutateAsync({ id: category.id, name: data.name, description: data.description?.trim() || undefined });
    } else {
      await createCategory.mutateAsync({ name: data.name, description: data.description?.trim() || undefined });
    }
    reset();
    onClose();
  };

  const handleClose = () => { reset(); onClose(); };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{category ? t("editCategoryTitle") : t("newCategoryTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">{tc("name")} <span className="text-destructive">*</span></Label>
            <Input id="cat-name" {...register("name")} placeholder={t("categoryNamePlaceholder")} autoFocus />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-desc">
              {tc("description")} <span className="text-xs font-normal text-muted-foreground">({tc("optional")})</span>
            </Label>
            <Textarea id="cat-desc" {...register("description")} placeholder={t("categoryDescPlaceholder")} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>{tc("cancel")}</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("saving") : category ? t("saveChanges") : t("createCategory")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Value Chip ───────────────────────────────────────────────────────────────

function ValueChip({ value, colorHex, type }: { value: string; colorHex?: string | null; type: "text" | "color" }) {
  if (type === "color") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-0.5 text-xs font-medium">
        <span className="h-3 w-3 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: colorHex ?? "#000" }} />
        {value}
        {colorHex && <span className="text-muted-foreground font-mono text-[10px]">{colorHex}</span>}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
      {value}
    </span>
  );
}

// ─── Attributes Tab ───────────────────────────────────────────────────────────

function AttributesTab() {
  const t = useTranslations("attributes");
  const tc = useTranslations("common");
  const [createOpen, setCreateOpen] = useState(false);
  const [editAttribute, setEditAttribute] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: attributes = [], isLoading } = useAttributes();
  const deleteAttribute = useDeleteAttribute();

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteAttribute.mutateAsync(deleteId);
    setDeleteId(null);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">{t("defineAttributes")}</p>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="me-2 h-4 w-4" />
          {t("newAttribute")}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (attributes as any[]).length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-24 text-center">
          <Tags className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-semibold">{t("noAttributesYet")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("createAttributes")}</p>
          <Button className="mt-4" onClick={() => setCreateOpen(true)}>
            <Plus className="me-2 h-4 w-4" />
            {t("newAttribute")}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(attributes as any[]).map((attr) => (
            <Card key={attr.id} className="group relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <CardTitle className="text-base truncate">{attr.name}</CardTitle>
                    <div>
                      {attr.type === "color" ? (
                        <Badge variant="info" className="text-[11px]">{t("color")}</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[11px]">{t("text")}</Badge>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditAttribute(attr)}>
                        <Pencil className="me-2 h-4 w-4" />{tc("edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteId(attr.id)}>
                        <Trash2 className="me-2 h-4 w-4" />{tc("delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                {attr.values && attr.values.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {(attr.values as any[]).map((v: any) => (
                      <ValueChip key={v.id} value={v.value} colorHex={v.colorHex} type={attr.type} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">{t("noValuesDefined")}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AttributeFormDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      {editAttribute && (
        <AttributeFormDialog
          open={!!editAttribute}
          onClose={() => setEditAttribute(null)}
          attributeId={editAttribute.id}
          defaultValues={{
            name: editAttribute.name ?? "",
            type: editAttribute.type ?? "text",
            values: editAttribute.values?.length > 0
              ? editAttribute.values.map((v: any) => ({ value: v.value, colorHex: v.colorHex ?? "#000000" }))
              : [{ value: "", colorHex: "#000000" }],
          }}
        />
      )}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteAttributeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteAttributeDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
              {tc("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Categories Tab ───────────────────────────────────────────────────────────

function CategoriesTab() {
  const t = useTranslations("attributes");
  const tc = useTranslations("common");
  const [createOpen, setCreateOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: categories = [], isLoading } = useCategories();
  const deleteCategory = useDeleteCategory();

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteCategory.mutateAsync(deleteId);
    setDeleteId(null);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">{t("organiseProducts")}</p>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="me-2 h-4 w-4" />
          {t("newCategoryBtn")}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (categories as any[]).length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-24 text-center">
          <FolderOpen className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-semibold">{t("noCategoriesYet")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("createCategories")}</p>
          <Button className="mt-4" onClick={() => setCreateOpen(true)}>
            <Plus className="me-2 h-4 w-4" />
            {t("newCategoryBtn")}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(categories as any[]).map((cat) => (
            <Card key={cat.id} className="group relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base truncate">{cat.name}</CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditCategory(cat)}>
                        <Pencil className="me-2 h-4 w-4" />{tc("edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteId(cat.id)}>
                        <Trash2 className="me-2 h-4 w-4" />{tc("delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              {cat.description && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground line-clamp-2">{cat.description}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <CategoryFormDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      {editCategory && (
        <CategoryFormDialog
          open={!!editCategory}
          onClose={() => setEditCategory(null)}
          category={editCategory}
        />
      )}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteCategoryTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteCategoryDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
              {tc("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TaxonomyPage() {
  const t = useTranslations("attributes");
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="attributes">
        <TabsList>
          <TabsTrigger value="attributes">{t("attributesTab")}</TabsTrigger>
          <TabsTrigger value="categories">{t("categoriesTab")}</TabsTrigger>
        </TabsList>

        <TabsContent value="attributes" className="mt-6">
          <AttributesTab />
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <CategoriesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
