ALTER TYPE "public"."bill_type" ADD VALUE 'operation_invoice';--> statement-breakpoint
ALTER TYPE "public"."bill_type" ADD VALUE 'packaging_invoice';--> statement-breakpoint
ALTER TYPE "public"."bill_type" ADD VALUE 'shipping_invoice';--> statement-breakpoint
ALTER TYPE "public"."bill_type" ADD VALUE 'devices_invoice';--> statement-breakpoint
ALTER TYPE "public"."bill_type" ADD VALUE 'website_invoice';--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"image_url" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;