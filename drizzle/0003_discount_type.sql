ALTER TABLE "bill_line_items" ADD COLUMN IF NOT EXISTS "discount_type" text NOT NULL DEFAULT 'percent';
