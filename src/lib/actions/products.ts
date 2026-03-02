"use server";

import { adminAction, authAction } from "@/lib/actions/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ProductSchema, isValidUuid } from "@/lib/utils/validation";
import { revalidatePath } from "next/cache";

export async function getProducts() {
  return authAction(async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select("*, categories(name)")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) throw new Error(error.message);
    return data;
  });
}

export async function getProduct(id: string) {
  if (!isValidUuid(id)) throw new Error("Invalid product ID");
  return authAction(async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select("*, categories(name)")
      .eq("id", id)
      .single();

    if (error) throw new Error(error.message);
    return data;
  });
}

export async function createProduct(formData: FormData) {
  return adminAction(async (user) => {
    const raw = {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
      barcode: (formData.get("barcode") as string) || undefined,
      sku: (formData.get("sku") as string) || undefined,
      category_id: formData.get("category_id") as string | null,
      purchase_price: formData.get("purchase_price") as string,
      tax_rate: formData.get("tax_rate") as string,
      stock_quantity: formData.get("stock_quantity") as string,
      low_stock_threshold: formData.get("low_stock_threshold") as string,
      unit: (formData.get("unit") as string) || "piece",
    };

    const parsed = ProductSchema.safeParse(raw);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { error: `${issue.path.join(".")}: ${issue.message}` };
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("products")
      .insert({
        name: parsed.data.name,
        description: parsed.data.description || null,
        barcode: parsed.data.barcode || null,
        sku: parsed.data.sku || null,
        category_id: parsed.data.category_id,
        purchase_price: parsed.data.purchase_price,
        tax_rate: parsed.data.tax_rate,
        stock_quantity: parsed.data.stock_quantity,
        low_stock_threshold: parsed.data.low_stock_threshold,
        unit: parsed.data.unit,
      })
      .select()
      .single();

    if (error) return { error: error.message };

    // If initial stock > 0, create a stock movement record
    if (parsed.data.stock_quantity > 0) {
      await supabase.from("stock_movements").insert({
        product_id: data.id,
        quantity_change: parsed.data.stock_quantity,
        reason: "initial",
        notes: "Initial stock on product creation",
        created_by: user.id,
      });
    }

    revalidatePath("/products");
    return { success: true, data };
  });
}

export async function updateProduct(id: string, formData: FormData) {
  if (!isValidUuid(id)) return { error: "Invalid product ID" };
  return adminAction(async () => {
    const raw = {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
      barcode: (formData.get("barcode") as string) || undefined,
      sku: (formData.get("sku") as string) || undefined,
      category_id: formData.get("category_id") as string | null,
      purchase_price: formData.get("purchase_price") as string,
      tax_rate: formData.get("tax_rate") as string,
      stock_quantity: "0", // not updated via form edit
      low_stock_threshold: formData.get("low_stock_threshold") as string,
      unit: (formData.get("unit") as string) || "piece",
    };

    const parsed = ProductSchema.safeParse(raw);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { error: `${issue.path.join(".")}: ${issue.message}` };
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("products")
      .update({
        name: parsed.data.name,
        description: parsed.data.description || null,
        barcode: parsed.data.barcode || null,
        sku: parsed.data.sku || null,
        category_id: parsed.data.category_id,
        purchase_price: parsed.data.purchase_price,
        tax_rate: parsed.data.tax_rate,
        low_stock_threshold: parsed.data.low_stock_threshold,
        unit: parsed.data.unit,
      })
      .eq("id", id);

    if (error) return { error: error.message };

    revalidatePath("/products");
    revalidatePath(`/products/${id}`);
    return { success: true };
  });
}

export async function deleteProduct(id: string) {
  if (!isValidUuid(id)) return { error: "Invalid product ID" };
  return adminAction(async () => {
    const supabase = createAdminClient();
    // Soft delete: set is_active = false
    const { error } = await supabase
      .from("products")
      .update({ is_active: false })
      .eq("id", id);

    if (error) return { error: error.message };

    revalidatePath("/products");
    return { success: true };
  });
}
