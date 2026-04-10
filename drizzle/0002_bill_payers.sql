CREATE TABLE IF NOT EXISTS "bill_payers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "bill_id" uuid NOT NULL REFERENCES "bills"("id") ON DELETE CASCADE,
  "person_name" text NOT NULL,
  "amount" numeric(12, 2) NOT NULL
);

-- Migrate existing single-payer data from bills.paid_by
INSERT INTO "bill_payers" ("bill_id", "person_name", "amount")
SELECT "id", "paid_by", "total_amount"
FROM "bills"
WHERE "paid_by" IS NOT NULL AND "paid_by" != '';
