import { z } from "zod";

// UUID regex for validation
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Helper: optional UUID field — any non-UUID value (including "", "none", null, undefined) becomes null
const optionalUuid = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((val) => {
    if (typeof val === "string" && UUID_RE.test(val)) return val;
    return null;
  });

// Helper: validate that a string is a valid UUID (for id parameters)
export function isValidUuid(val: string): boolean {
  return UUID_RE.test(val);
}

export const ProductSchema = z.object({
  name: z.string().min(1, "Product name is required").max(255),
  description: z.string().optional(),
  barcode: z
    .string()
    .max(13, "Barcode must be 13 chars max (ISBN-13/EAN-13)")
    .optional(),
  sku: z.string().optional(),
  category_id: optionalUuid,
  purchase_price: z.coerce.number().min(0, "Price must be non-negative"),
  tax_rate: z.coerce.number().min(0).max(100).default(0),
  stock_quantity: z.coerce.number().int().min(0).default(0),
  low_stock_threshold: z.coerce.number().int().min(0).default(3),
  unit: z.string().default("piece"),
});

export const CategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(100),
  description: z.string().optional(),
  parent_id: optionalUuid,
  sort_order: z.coerce.number().int().default(0),
});

export const CustomerSchema = z.object({
  name: z.string().min(1, "Customer name is required").max(255),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const SupplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required").max(255),
  contact_person: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

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

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
