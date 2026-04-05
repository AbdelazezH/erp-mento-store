CREATE TYPE "public"."attribute_type" AS ENUM('text', 'color');--> statement-breakpoint
CREATE TYPE "public"."bill_status" AS ENUM('pending', 'overdue', 'paid', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."bill_type" AS ENUM('supplier_bill', 'other_expense');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('draft', 'pending', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'worker');--> statement-breakpoint
CREATE TABLE "attribute_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attribute_id" uuid NOT NULL,
	"value" text NOT NULL,
	"color_hex" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attributes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "attribute_type" DEFAULT 'text' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "attributes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "bill_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"product_id" uuid,
	"variant_id" uuid,
	"description" text NOT NULL,
	"quantity" numeric(12, 3) DEFAULT '1' NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"discount_percent" numeric(5, 2) DEFAULT '0',
	"total" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_number" text NOT NULL,
	"name" text NOT NULL,
	"supplier_id" uuid,
	"issue_date" timestamp DEFAULT now() NOT NULL,
	"due_date" timestamp,
	"status" "bill_status" DEFAULT 'pending' NOT NULL,
	"total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"bill_type" "bill_type" DEFAULT 'supplier_bill' NOT NULL,
	"paid_by" text,
	"receipt_image_url" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bills_bill_number_unique" UNIQUE("bill_number")
);
--> statement-breakpoint
CREATE TABLE "campaign_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"original_price" numeric(12, 2),
	"campaign_price" numeric(12, 2),
	"cogs" numeric(12, 2),
	"expected_units" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"advertising_budget" numeric(12, 2) DEFAULT '0',
	"shipping_cost" numeric(12, 2) DEFAULT '0',
	"other_costs" numeric(12, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"role" "user_role" DEFAULT 'worker' NOT NULL,
	"invited_by" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "order_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid,
	"variant_id" uuid,
	"product_name" text NOT NULL,
	"variant_name" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"unit_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"profit" numeric(12, 2) DEFAULT '0' NOT NULL,
	"is_free" boolean DEFAULT false NOT NULL,
	"original_unit_price" numeric(12, 2)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" text NOT NULL,
	"customer_id" uuid,
	"order_date" timestamp DEFAULT now() NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"profit" numeric(12, 2) DEFAULT '0' NOT NULL,
	"shipping_fee" numeric(12, 2) DEFAULT '0',
	"shipping_discount" numeric(12, 2) DEFAULT '0',
	"shipping_discount_reason" text,
	"notes" text,
	"customer_feedback" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "product_properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"name" text NOT NULL,
	"attribute_name" text,
	"attribute_value" text,
	"sku" text,
	"barcode" text,
	"image_url" text,
	"additional_cost" numeric(12, 2) DEFAULT '0',
	"selling_price" numeric(12, 2),
	"stock_quantity" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_variants_sku_unique" UNIQUE("sku"),
	CONSTRAINT "product_variants_barcode_unique" UNIQUE("barcode")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category_id" uuid,
	"supplier_id" uuid,
	"base_price" numeric(12, 2),
	"selling_price" numeric(12, 2),
	"discount_percent" numeric(5, 2) DEFAULT '0',
	"average_cost" numeric(12, 2) DEFAULT '0',
	"stock_quantity" integer DEFAULT 0 NOT NULL,
	"sku" text,
	"barcode" text,
	"image_url" text,
	"has_variants" boolean DEFAULT false NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"width" numeric(8, 2),
	"height" numeric(8, 2),
	"material" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "products_sku_unique" UNIQUE("sku"),
	CONSTRAINT "products_barcode_unique" UNIQUE("barcode")
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"contact_name" text,
	"email" text,
	"phone" text,
	"address" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password" text,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"role" "user_role" DEFAULT 'admin' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "attribute_values" ADD CONSTRAINT "attribute_values_attribute_id_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."attributes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_line_items" ADD CONSTRAINT "bill_line_items_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_line_items" ADD CONSTRAINT "bill_line_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_line_items" ADD CONSTRAINT "bill_line_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_products" ADD CONSTRAINT "campaign_products_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_products" ADD CONSTRAINT "campaign_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line_items" ADD CONSTRAINT "order_line_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line_items" ADD CONSTRAINT "order_line_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line_items" ADD CONSTRAINT "order_line_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_properties" ADD CONSTRAINT "product_properties_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;