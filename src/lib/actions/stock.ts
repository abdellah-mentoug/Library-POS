"use server";

import { adminAction } from "@/lib/actions/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUuid } from "@/lib/utils/validation";
import { revalidatePath } from "next/cache";

const validReasons = [
  "adjustment_add",
  "adjustment_remove",
  "stocktake",
  "return",
  "damaged",
] as const;

export const adjustStock = adminAction(async (user, productId: string, quantityChange: number, reason: string, notes?: string) => {
  if (!isValidUuid(productId)) return { error: "Invalid product ID" };
  if (!validReasons.includes(reason as (typeof validReasons)[number])) {
    return { error: "Invalid reason" };
  }

  if (quantityChange === 0) {
    return { error: "Quantity change cannot be zero" };
  }

  const supabase = createAdminClient();

    // Update product stock
    const { data: product, error: fetchError } = await supabase
      .from("products")
      .select("stock_quantity")
      .eq("id", productId)
      .single();

    if (fetchError) return { error: fetchError.message };

    const newQuantity = product.stock_quantity + quantityChange;
    if (newQuantity < 0) {
      return { error: "Stock cannot go below zero" };
    }

    const { error: updateError } = await supabase
      .from("products")
      .update({ stock_quantity: newQuantity })
      .eq("id", productId);

    if (updateError) return { error: updateError.message };

    // Insert stock movement record
    const { error: movementError } = await supabase
      .from("stock_movements")
      .insert({
        product_id: productId,
        quantity_change: quantityChange,
        reason,
        notes: notes || null,
        created_by: user.id,
      });

    if (movementError) return { error: movementError.message };

    revalidatePath("/products");
    revalidatePath(`/products/${productId}`);
    return { success: true };
});

export async function getStockMovements(productId: string) {
  if (!isValidUuid(productId)) throw new Error("Invalid product ID");
  const supabase = (await import("@/lib/supabase/server")).createClient;
  const client = await supabase();
  const { data, error } = await client
    .from("stock_movements")
    .select("*, profiles(full_name)")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return data;
}

export async function getAllStockMovements() {
  const supabase = (await import("@/lib/supabase/server")).createClient;
  const client = await supabase();
  const { data, error } = await client
    .from("stock_movements")
    .select(`
      *,
      products (
        name,
        barcode
      ),
      profiles (
        full_name
      )
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return data;
}
