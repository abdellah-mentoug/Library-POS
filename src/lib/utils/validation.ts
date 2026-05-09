import { z } from "zod";

// ========================
// UUID validation
// ========================
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Validate UUID (helper)
export function isValidUuid(val: string): boolean {
  return UUID_RE.test(val);
}

// ========================
// Optional UUID (SAFE VERSION)
// ========================
const optionalUuid = z
  .union([z.string().uuid(), z.literal(""), z.null(), z.undefined()])
  .transform((val) => {
    if (!val || val === "") return null;
    return val;
  });

// ========================
// PRODUCT
// ========================
export const ProductSchema = z.object({
  name: z.string().min(1, "Product name is required").max(255),
  description: z.string().nullable().optional(),
  barcode: z.string().max(13).optional(),
  sku: z.string().optional(),

  category_id: optionalUuid,

  purchase_price: z.coerce.number().min(0),
  tax_rate: z.coerce.number().min(0).max(100).default(0),

  stock_quantity: z.coerce.number().int().min(0).default(0),
  low_stock_threshold: z.coerce.number().int().min(0).default(3),

  unit: z.string().default("piece"),
});

// ========================
// CATEGORY (FIXED - IMPORTANT)
// ========================
export const CategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(100),

  description: z.string().nullable().optional(),

  parent_id: optionalUuid,

  sort_order: z.coerce.number().int().default(0),
});

// ========================
// CUSTOMER
// ========================
export const CustomerSchema = z.object({
  name: z.string().min(1, "Customer name is required").max(255),

  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

// ========================
// SUPPLIER
// ========================
export const SupplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required").max(255),

  contact_person: z.string().optional(),

  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

// ========================
// PRINT ORDER
// ========================
export const PrintOrderSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required"),
  customer_phone: z.string().optional(),

  customer_id: optionalUuid,

  service_type: z.enum([
    "printing",
    "copying",
    "binding",
    "laminating",
    "scanning",
    "other",
  ]),

  description: z.string().min(1, "Description is required"),

  quantity: z.coerce.number().int().positive(),
  unit_price: z.coerce.number().min(0),
  total_price: z.coerce.number().min(0),

  notes: z.string().optional(),
  due_date: z.string().optional(),
});

// ========================
// LOGIN
// ========================
export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});