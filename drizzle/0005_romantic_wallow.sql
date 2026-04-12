CREATE TABLE "business_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipping_cost_threshold" numeric(12, 2) DEFAULT '105' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
