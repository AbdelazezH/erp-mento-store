"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useAttributes,
  useCreateAttribute,
  useUpdateAttribute,
  useDeleteAttribute,
} from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  X,
} from "lucide-react";

// ─── Schema ──────────────────────────────────────────────────────────────────

const attributeValueSchema = z.object({
  value: z.string().min(1, "Value is required"),
  colorHex: z.string().optional(),
});

const attributeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["text", "color"]),
  values: z
    .array(attributeValueSchema)
    .min(1, "Add at least one value"),
});

type AttributeFormValues = z.infer<typeof attributeSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Ensures a hex string is in #RRGGBB format */
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

  const { fields, append, remove } = useFieldArray({
    control,
    name: "values",
  });

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

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {attributeId ? "Edit Attribute" : "New Attribute"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="e.g. Color, Size, Material"
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select
              defaultValue={defaultValues?.type ?? "text"}
              onValueChange={(v) => setValue("type", v as "text" | "color")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="color">Color</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Values */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                Values <span className="text-destructive">*</span>
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => append({ value: "", colorHex: "#000000" })}
                className="h-7 px-2 text-xs"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add value
              </Button>
            </div>

            {errors.values && typeof errors.values.message === "string" && (
              <p className="text-xs text-destructive">{errors.values.message}</p>
            )}

            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  {/* Color picker for color type */}
                  {watchedType === "color" && (
                    <div className="relative shrink-0">
                      <input
                        type="color"
                        {...register(`values.${index}.colorHex`)}
                        defaultValue={field.colorHex || "#000000"}
                        className="h-9 w-9 cursor-pointer rounded-md border border-input p-0.5"
                        title="Pick color"
                      />
                    </div>
                  )}

                  <Input
                    {...register(`values.${index}.value`)}
                    placeholder={
                      watchedType === "color"
                        ? "e.g. Red, Ocean Blue"
                        : "e.g. Small, XL, Cotton"
                    }
                    className="flex-1"
                  />
                  {errors.values?.[index]?.value && (
                    <p className="text-xs text-destructive sr-only">
                      {errors.values[index]?.value?.message}
                    </p>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => fields.length > 1 && remove(index)}
                    disabled={fields.length === 1}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remove</span>
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving…"
                : attributeId
                ? "Save Changes"
                : "Create Attribute"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Value Chip ───────────────────────────────────────────────────────────────

function ValueChip({
  value,
  colorHex,
  type,
}: {
  value: string;
  colorHex?: string | null;
  type: "text" | "color";
}) {
  if (type === "color") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-0.5 text-xs font-medium">
        <span
          className="h-3 w-3 rounded-full border border-black/10 shrink-0"
          style={{ backgroundColor: colorHex ?? "#000" }}
        />
        {value}
        {colorHex && (
          <span className="text-muted-foreground font-mono text-[10px]">
            {colorHex}
          </span>
        )}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
      {value}
    </span>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AttributesPage() {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attributes</h1>
          <p className="text-sm text-muted-foreground">
            Define product attributes like color, size, or material
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Attribute
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (attributes as any[]).length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-24 text-center">
          <Tags className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-semibold">No attributes yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create attributes to organize product variants.
          </p>
          <Button className="mt-4" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Attribute
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(attributes as any[]).map((attr) => (
            <Card key={attr.id} className="group relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <CardTitle className="text-base truncate">
                      {attr.name}
                    </CardTitle>
                    <div>
                      {attr.type === "color" ? (
                        <Badge variant="info" className="text-[11px]">
                          Color
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[11px]">
                          Text
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditAttribute(attr)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteId(attr.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent>
                {attr.values && attr.values.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {(attr.values as any[]).map((v: any) => (
                      <ValueChip
                        key={v.id}
                        value={v.value}
                        colorHex={v.colorHex}
                        type={attr.type}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No values defined
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <AttributeFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      {/* Edit Dialog */}
      {editAttribute && (
        <AttributeFormDialog
          open={!!editAttribute}
          onClose={() => setEditAttribute(null)}
          attributeId={editAttribute.id}
          defaultValues={{
            name: editAttribute.name ?? "",
            type: editAttribute.type ?? "text",
            values:
              editAttribute.values && editAttribute.values.length > 0
                ? editAttribute.values.map((v: any) => ({
                    value: v.value,
                    colorHex: v.colorHex ?? "#000000",
                  }))
                : [{ value: "", colorHex: "#000000" }],
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
            <AlertDialogTitle>Delete Attribute</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this attribute and all its values.
              This action cannot be undone.
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
