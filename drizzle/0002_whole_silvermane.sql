CREATE TYPE "public"."application_rule" AS ENUM('per_order', 'per_item', 'manual');--> statement-breakpoint
CREATE TYPE "public"."cost_category" AS ENUM('packaging', 'handling', 'transaction_fee');--> statement-breakpoint
CREATE TYPE "public"."discount_type" AS ENUM('percent', 'fixed');--> statement-breakpoint
ALTER TYPE "public"."bill_type" ADD VALUE 'advertising_bill';--> statement-breakpoint
CREATE TABLE "bill_payers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"person_name" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" "cost_category" NOT NULL,
	"unit_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"application_rule" "application_rule" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_cost_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"cost_profile_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bill_line_items" ADD COLUMN "discount_type" text DEFAULT 'percent' NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "governorate" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "campaign_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount_type" "discount_type";--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount_value" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "track_inventory" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "bill_payers" ADD CONSTRAINT "bill_payers_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_cost_profiles" ADD CONSTRAINT "order_cost_profiles_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_cost_profiles" ADD CONSTRAINT "order_cost_profiles_cost_profile_id_cost_profiles_id_fk" FOREIGN KEY ("cost_profile_id") REFERENCES "public"."cost_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;