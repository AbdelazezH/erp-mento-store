"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useBusinessSettings, useUpdateBusinessSettings } from "@/hooks/use-api";

const schema = z.object({
  shippingCostThreshold: z
    .string()
    .min(1, "Required")
    .regex(/^\d+(\.\d{1,2})?$/, "Must be a valid number (e.g. 105 or 105.50)"),
});

type FormValues = z.infer<typeof schema>;

export default function BusinessSettingsPage() {
  const { data: settings, isLoading } = useBusinessSettings();
  const updateMutation = useUpdateBusinessSettings();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { shippingCostThreshold: "105" },
  });

  // Populate form once settings load
  useEffect(() => {
    if (settings) {
      reset({ shippingCostThreshold: settings.shippingCostThreshold });
    }
  }, [settings, reset]);

  const onSubmit = (values: FormValues) => {
    updateMutation.mutate(values);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Business Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure business-wide defaults used across the system.
        </p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">Shipping Cost Threshold</CardTitle>
          <CardDescription>
            Shipping fees at or below this amount are treated as a pass-through
            (customer pays = business pays — no profit impact). Only the amount{" "}
            <strong>above</strong> this threshold is deducted from Est. Profit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="threshold">Threshold (EGP)</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">EGP</span>
                <Input
                  id="threshold"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="105"
                  className="w-36"
                  disabled={isLoading}
                  {...register("shippingCostThreshold")}
                />
              </div>
              {errors.shippingCostThreshold && (
                <p className="text-xs text-destructive">{errors.shippingCostThreshold.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={!isDirty || updateMutation.isPending || isLoading}
            >
              {updateMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
