import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  pgEnum,
  unique,
  index,
  json,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const billStatusEnum = pgEnum("bill_status", [
  "pending",
  "overdue",
  "paid",
  "cancelled",
]);

export const billTypeEnum = pgEnum("bill_type", [
  "supplier_bill",
  "other_expense",
  "operation_invoice",
  "packaging_invoice",
  "shipping_invoice",
  "devices_invoice",
  "website_invoice",
  "advertising_bill",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "draft",
  "pending",
  "delivered",
  "cancelled",
]);

export const attributeTypeEnum = pgEnum("attribute_type", ["text", "color"]);

export const userRoleEnum = pgEnum("user_role", ["admin", "worker"]);

export const costCategoryEnum = pgEnum("cost_category", [
  "packaging",
  "handling",
  "transaction_fee",
]);

export const applicationRuleEnum = pgEnum("application_rule", [
  "per_order",
  "per_item",
  "manual",
]);

export const discountTypeEnum = pgEnum("discount_type", [
  "percent",
  "fixed",
]);

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  password: text("password"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: userRoleEnum("role").notNull().default("admin"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  token: uuid("token").notNull().unique().defaultRandom(),
  role: userRoleEnum("role").notNull().default("worker"),
  invitedBy: uuid("invited_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Categories ───────────────────────────────────────────────────────────────

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Suppliers ────────────────────────────────────────────────────────────────

export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Attributes ───────────────────────────────────────────────────────────────

export const attributes = pgTable("attributes", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  type: attributeTypeEnum("type").notNull().default("text"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const attributeValues = pgTable("attribute_values", {
  id: uuid("id").primaryKey().defaultRandom(),
  attributeId: uuid("attribute_id")
    .notNull()
    .references(() => attributes.id, { onDelete: "cascade" }),
  value: text("value").notNull(),
  colorHex: text("color_hex"),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ─── Products ─────────────────────────────────────────────────────────────────

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: uuid("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  supplierId: uuid("supplier_id").references(() => suppliers.id, {
    onDelete: "set null",
  }),
  basePrice: numeric("base_price", { precision: 12, scale: 2 }),
  sellingPrice: numeric("selling_price", { precision: 12, scale: 2 }),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }).default("0"),
  averageCost: numeric("average_cost", { precision: 12, scale: 2 }).default("0"),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  sku: text("sku").unique(),
  barcode: text("barcode").unique(),
  imageUrl: text("image_url"),
  hasVariants: boolean("has_variants").notNull().default(false),
  isPublished: boolean("is_published").notNull().default(false),
  width: numeric("width", { precision: 8, scale: 2 }),
  height: numeric("height", { precision: 8, scale: 2 }),
  material: text("material"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const productVariants = pgTable("product_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  attributeName: text("attribute_name"),
  attributeValue: text("attribute_value"),
  sku: text("sku").unique(),
  barcode: text("barcode").unique(),
  imageUrl: text("image_url"),
  additionalCost: numeric("additional_cost", { precision: 12, scale: 2 }).default("0"),
  sellingPrice: numeric("selling_price", { precision: 12, scale: 2 }),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const productProperties = pgTable("product_properties", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  value: text("value").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const productImages = pgTable("product_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Bills ────────────────────────────────────────────────────────────────────

export const bills = pgTable("bills", {
  id: uuid("id").primaryKey().defaultRandom(),
  billNumber: text("bill_number").notNull().unique(),
  name: text("name").notNull(),
  supplierId: uuid("supplier_id").references(() => suppliers.id, {
    onDelete: "set null",
  }),
  issueDate: timestamp("issue_date").notNull().defaultNow(),
  dueDate: timestamp("due_date"),
  status: billStatusEnum("status").notNull().default("pending"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  billType: billTypeEnum("bill_type").notNull().default("supplier_bill"),
  paidBy: text("paid_by"),
  receiptImageUrl: text("receipt_image_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const billLineItems = pgTable("bill_line_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  billId: uuid("bill_id")
    .notNull()
    .references(() => bills.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  variantId: uuid("variant_id").references(() => productVariants.id, {
    onDelete: "set null",
  }),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull().default("1"),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }).default("0"),
  discountType: text("discount_type").notNull().default("percent"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
});

export const billPayers = pgTable("bill_payers", {
  id: uuid("id").primaryKey().defaultRandom(),
  billId: uuid("bill_id")
    .notNull()
    .references(() => bills.id, { onDelete: "cascade" }),
  personName: text("person_name").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
});

// ─── Customers ────────────────────────────────────────────────────────────────

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  phone2: text("phone2"),
  governorate: text("governorate"),
  address: text("address"),
  notes: text("notes"),
  hasFeedback: boolean("has_feedback").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Orders ───────────────────────────────────────────────────────────────────

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNumber: text("order_number").notNull().unique(),
  customerId: uuid("customer_id").references(() => customers.id, {
    onDelete: "set null",
  }),
  orderDate: timestamp("order_date").notNull().defaultNow(),
  status: orderStatusEnum("status").notNull().default("pending"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  totalCost: numeric("total_cost", { precision: 12, scale: 2 }).notNull().default("0"),
  profit: numeric("profit", { precision: 12, scale: 2 }).notNull().default("0"),
  shippingFee: numeric("shipping_fee", { precision: 12, scale: 2 }).default("0"),
  shippingDiscount: numeric("shipping_discount", { precision: 12, scale: 2 }).default("0"),
  shippingDiscountReason: text("shipping_discount_reason"),
  notes: text("notes"),
  customerFeedback: text("customer_feedback"),
  campaignId: uuid("campaign_id").references(() => campaigns.id, {
    onDelete: "set null",
  }),
  discountType: discountTypeEnum("discount_type"),
  discountValue: numeric("discount_value", { precision: 12, scale: 2 }).default("0"),
  trackInventory: boolean("track_inventory").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderLineItems = pgTable("order_line_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  variantId: uuid("variant_id").references(() => productVariants.id, {
    onDelete: "set null",
  }),
  productName: text("product_name").notNull(),
  variantName: text("variant_name"),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  unitCost: numeric("unit_cost", { precision: 12, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  profit: numeric("profit", { precision: 12, scale: 2 }).notNull().default("0"),
  isFree: boolean("is_free").notNull().default(false),
  originalUnitPrice: numeric("original_unit_price", { precision: 12, scale: 2 }),
});

// ─── Campaigns ────────────────────────────────────────────────────────────────

export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  advertisingBudget: numeric("advertising_budget", { precision: 12, scale: 2 }).default("0"),
  shippingCost: numeric("shipping_cost", { precision: 12, scale: 2 }).default("0"),
  otherCosts: numeric("other_costs", { precision: 12, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const campaignProducts = pgTable("campaign_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id")
    .notNull()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  originalPrice: numeric("original_price", { precision: 12, scale: 2 }),
  campaignPrice: numeric("campaign_price", { precision: 12, scale: 2 }),
  cogs: numeric("cogs", { precision: 12, scale: 2 }),
  expectedUnits: integer("expected_units").default(0),
});

// ─── Cost Profiles ────────────────────────────────────────────────────────────

export const costProfiles = pgTable("cost_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  category: costCategoryEnum("category").notNull(),
  unitCost: numeric("unit_cost", { precision: 12, scale: 2 }).notNull().default("0"),
  applicationRule: applicationRuleEnum("application_rule").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderCostProfiles = pgTable("order_cost_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  costProfileId: uuid("cost_profile_id")
    .notNull()
    .references(() => costProfiles.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  products: many(products),
  bills: many(bills),
}));

export const attributesRelations = relations(attributes, ({ many }) => ({
  values: many(attributeValues),
}));

export const attributeValuesRelations = relations(attributeValues, ({ one }) => ({
  attribute: one(attributes, {
    fields: [attributeValues.attributeId],
    references: [attributes.id],
  }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  supplier: one(suppliers, {
    fields: [products.supplierId],
    references: [suppliers.id],
  }),
  variants: many(productVariants),
  properties: many(productProperties),
  images: many(productImages),
  billLineItems: many(billLineItems),
  orderLineItems: many(orderLineItems),
  campaignProducts: many(campaignProducts),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
}));

export const billsRelations = relations(bills, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [bills.supplierId],
    references: [suppliers.id],
  }),
  lineItems: many(billLineItems),
  payers: many(billPayers),
}));

export const billPayersRelations = relations(billPayers, ({ one }) => ({
  bill: one(bills, { fields: [billPayers.billId], references: [bills.id] }),
}));

export const billLineItemsRelations = relations(billLineItems, ({ one }) => ({
  bill: one(bills, { fields: [billLineItems.billId], references: [bills.id] }),
  product: one(products, {
    fields: [billLineItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [billLineItems.variantId],
    references: [productVariants.id],
  }),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  lineItems: many(orderLineItems),
  costProfileEntries: many(orderCostProfiles),
}));

export const orderLineItemsRelations = relations(orderLineItems, ({ one }) => ({
  order: one(orders, { fields: [orderLineItems.orderId], references: [orders.id] }),
  product: one(products, {
    fields: [orderLineItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [orderLineItems.variantId],
    references: [productVariants.id],
  }),
}));

export const campaignsRelations = relations(campaigns, ({ many }) => ({
  products: many(campaignProducts),
}));

export const campaignProductsRelations = relations(campaignProducts, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignProducts.campaignId],
    references: [campaigns.id],
  }),
  product: one(products, {
    fields: [campaignProducts.productId],
    references: [products.id],
  }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  inviter: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id],
  }),
}));

export const orderCostProfilesRelations = relations(orderCostProfiles, ({ one }) => ({
  order: one(orders, { fields: [orderCostProfiles.orderId], references: [orders.id] }),
  costProfile: one(costProfiles, { fields: [orderCostProfiles.costProfileId], references: [costProfiles.id] }),
}));

export const costProfilesRelations = relations(costProfiles, ({ many }) => ({
  orderEntries: many(orderCostProfiles),
}));

// ─── Business Settings (singleton row) ───────────────────────────────────────

export const businessSettings = pgTable("business_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Shipping fees at or below this threshold are treated as a pass-through
  // (no impact on Est. Profit). Only the amount ABOVE the threshold is deducted.
  shippingCostThreshold: numeric("shipping_cost_threshold", { precision: 12, scale: 2 }).notNull().default("105"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type Attribute = typeof attributes.$inferSelect;
export type AttributeValue = typeof attributeValues.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductVariant = typeof productVariants.$inferSelect;
export type ProductProperty = typeof productProperties.$inferSelect;
export type Bill = typeof bills.$inferSelect;
export type BillLineItem = typeof billLineItems.$inferSelect;
export type BillPayer = typeof billPayers.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderLineItem = typeof orderLineItems.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type CampaignProduct = typeof campaignProducts.$inferSelect;
export type ProductImage = typeof productImages.$inferSelect;
export type OrderCostProfile = typeof orderCostProfiles.$inferSelect;
export type CostProfile = typeof costProfiles.$inferSelect;
export type BusinessSettings = typeof businessSettings.$inferSelect;
