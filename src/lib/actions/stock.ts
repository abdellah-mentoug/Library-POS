"use server";

import { adminAction, requireStockAccess, stockAccessAction } from "@/lib/actions/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUuid } from "@/lib/utils/validation";
import { revalidatePath } from "next/cache";

const adjustReasons = [
  "adjustment_add",
  "adjustment_remove",
  "stocktake",
  "return",
  "damaged",
] as const;

export type ActionResult<T = void> =
  | { success: true } & (T extends void ? object : { data: T })
  | { error: string };

export interface StockSummaryRow {
  id: string;
  name: string;
  barcode: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
  category_id: string | null;
  category_name: string | null;
  last_movement_at: string | null;
  last_movement_reason: string | null;
}

export interface StockHistoryRow {
  id: string;
  product_id: string;
  product_name: string;
  product_barcode: string | null;
  category_name: string | null;
  quantity_change: number;
  reason: string;
  reference_id: string | null;
  reference_type: string | null;
  notes: string | null;
  created_by_name: string | null;
  created_at: string;
}

export const adjustStock = adminAction(async (user, productId: string, quantityChange: number, reason: string, notes?: string) => {
  if (!isValidUuid(productId)) return { error: "Invalid product ID" };
  if (!adjustReasons.includes(reason as (typeof adjustReasons)[number])) {
    return { error: "Invalid reason" };
  }

  if (quantityChange === 0) {
    return { error: "Quantity change cannot be zero" };
  }

  const supabase = createAdminClient();

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

  const { error: movementError } = await supabase.from("stock_movements").insert({
    product_id: productId,
    quantity_change: quantityChange,
    reason,
    notes: notes || null,
    created_by: user.id,
  });

  if (movementError) return { error: movementError.message };

  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
  revalidatePath("/stock");
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
    .select(
      `
      *,
      products (
        name,
        barcode
      ),
      profiles (
        full_name
      )
    `
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return data;
}

export async function getStockSummary(filters?: {
  categoryId?: string;
  lowStockOnly?: boolean;
  search?: string;
}): Promise<StockSummaryRow[]> {
  await requireStockAccess();
  const supabase = createAdminClient();

  let q = supabase
    .from("products")
    .select("id, name, barcode, stock_quantity, low_stock_threshold, is_active, category_id, categories(name)")
    .order("name", { ascending: true });

  if (filters?.categoryId && isValidUuid(filters.categoryId)) {
    q = q.eq("category_id", filters.categoryId);
  }

  const { data: products, error } = await q;
  if (error) throw new Error(error.message);
  if (!products?.length) return [];

  let rows: StockSummaryRow[] = products.map((p: Record<string, unknown>) => {
    const cat = p.categories as { name: string } | null;
    return {
      id: p.id as string,
      name: p.name as string,
      barcode: (p.barcode as string | null) ?? null,
      stock_quantity: p.stock_quantity as number,
      low_stock_threshold: p.low_stock_threshold as number,
      is_active: p.is_active as boolean,
      category_id: (p.category_id as string | null) ?? null,
      category_name: cat?.name ?? null,
      last_movement_at: null,
      last_movement_reason: null,
    };
  });

  if (filters?.search?.trim()) {
    const s = filters.search.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(s) ||
        (r.barcode && r.barcode.toLowerCase().includes(s))
    );
  }

  if (filters?.lowStockOnly) {
    rows = rows.filter((r) => r.stock_quantity <= r.low_stock_threshold);
  }

  const ids = rows.map((r) => r.id);
  const { data: movs } = await supabase
    .from("stock_movements")
    .select("product_id, created_at, reason")
    .in("product_id", ids)
    .order("created_at", { ascending: false });

  const latest = new Map<string, { created_at: string; reason: string }>();
  for (const m of movs ?? []) {
    if (!latest.has(m.product_id)) {
      latest.set(m.product_id, { created_at: m.created_at, reason: m.reason });
    }
  }

  for (const r of rows) {
    const l = latest.get(r.id);
    if (l) {
      r.last_movement_at = l.created_at;
      r.last_movement_reason = l.reason;
    }
  }

  return rows;
}

export const recordStockEntry = stockAccessAction(
  async (user, input: { productId: string; quantity: number; notes?: string }): Promise<ActionResult> => {
    if (!isValidUuid(input.productId)) return { error: "Invalid product ID" };
    if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
      return { error: "Quantity must be positive" };
    }

    const supabase = createAdminClient();
    const { data: product, error: fe } = await supabase
      .from("products")
      .select("stock_quantity")
      .eq("id", input.productId)
      .single();
    if (fe) return { error: fe.message };

    const newQty = product.stock_quantity + input.quantity;
    const { error: ue } = await supabase
      .from("products")
      .update({ stock_quantity: newQty })
      .eq("id", input.productId);
    if (ue) return { error: ue.message };

    const { error: me } = await supabase.from("stock_movements").insert({
      product_id: input.productId,
      quantity_change: input.quantity,
      reason: "entry",
      notes: input.notes || null,
      created_by: user.id,
    });
    if (me) return { error: me.message };

    revalidatePath("/stock");
    revalidatePath("/products");
    revalidatePath(`/products/${input.productId}`);
    return { success: true };
  }
);

export const recordStockExit = stockAccessAction(
  async (
    user,
    input: {
      productId: string;
      quantity: number;
      reason: "damaged" | "return" | "exit";
      notes?: string;
    }
  ): Promise<ActionResult> => {
    if (!isValidUuid(input.productId)) return { error: "Invalid product ID" };
    if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
      return { error: "Quantity must be positive" };
    }

    const reasonMap = { damaged: "damaged", return: "return", exit: "exit" } as const;
    const dbReason = reasonMap[input.reason];

    const supabase = createAdminClient();
    const { data: product, error: fe } = await supabase
      .from("products")
      .select("stock_quantity")
      .eq("id", input.productId)
      .single();
    if (fe) return { error: fe.message };

    if (input.quantity > product.stock_quantity) {
      return { error: "Quantity exceeds current stock" };
    }

    const newQty = product.stock_quantity - input.quantity;
    const { error: ue } = await supabase
      .from("products")
      .update({ stock_quantity: newQty })
      .eq("id", input.productId);
    if (ue) return { error: ue.message };

    const { error: me } = await supabase.from("stock_movements").insert({
      product_id: input.productId,
      quantity_change: -input.quantity,
      reason: dbReason,
      notes: input.notes || null,
      created_by: user.id,
    });
    if (me) return { error: me.message };

    revalidatePath("/stock");
    revalidatePath("/products");
    revalidatePath(`/products/${input.productId}`);
    return { success: true };
  }
);

export const recordStocktake = stockAccessAction(
  async (
    user,
    input: { items: Array<{ productId: string; countedQuantity: number }>; notes?: string }
  ): Promise<ActionResult<{ changed: number }>> => {
    if (!input.items?.length) return { error: "No items" };

    const supabase = createAdminClient();
    let changed = 0;

    for (const row of input.items) {
      if (!isValidUuid(row.productId)) return { error: "Invalid product ID" };
      if (!Number.isFinite(row.countedQuantity) || row.countedQuantity < 0) {
        return { error: "Invalid counted quantity" };
      }

      const { data: product, error: fe } = await supabase
        .from("products")
        .select("stock_quantity")
        .eq("id", row.productId)
        .single();
      if (fe) return { error: fe.message };

      const delta = row.countedQuantity - product.stock_quantity;
      if (delta === 0) continue;

      const { error: ue } = await supabase
        .from("products")
        .update({ stock_quantity: row.countedQuantity })
        .eq("id", row.productId);
      if (ue) return { error: ue.message };

      const { error: me } = await supabase.from("stock_movements").insert({
        product_id: row.productId,
        quantity_change: delta,
        reason: "stocktake",
        notes: input.notes || null,
        created_by: user.id,
      });
      if (me) return { error: me.message };
      changed++;
    }

    revalidatePath("/stock");
    revalidatePath("/products");
    return { success: true, data: { changed } };
  }
);

export async function getStockHistory(filters?: {
  productId?: string;
  reason?: string;
  startDate?: string;
  endDate?: string;
  createdBy?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ data: StockHistoryRow[]; count: number }> {
  await requireStockAccess();
  const supabase = createAdminClient();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(filters?.pageSize ?? 50, 200);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from("stock_movements")
    .select(
      `
      id,
      product_id,
      quantity_change,
      reason,
      reference_id,
      reference_type,
      notes,
      created_at,
      created_by,
      products ( name, barcode, categories ( name ) ),
      profiles ( full_name )
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters?.productId && isValidUuid(filters.productId)) {
    q = q.eq("product_id", filters.productId);
  }
  if (filters?.reason && filters.reason !== "all" && filters.reason !== "") {
    q = q.eq("reason", filters.reason);
  }
  if (filters?.createdBy && isValidUuid(filters.createdBy)) {
    q = q.eq("created_by", filters.createdBy);
  }
  if (filters?.startDate) {
    q = q.gte("created_at", `${filters.startDate}T00:00:00.000Z`);
  }
  if (filters?.endDate) {
    q = q.lte("created_at", `${filters.endDate}T23:59:59.999Z`);
  }

  const { data, error, count } = await q;
  if (error) throw new Error(error.message);

  const rows: StockHistoryRow[] = (data ?? []).map((m: Record<string, unknown>) => {
    const pr = m.products as { name: string; barcode: string | null; categories: { name: string } | null } | null;
    const prof = m.profiles as { full_name: string | null } | null;
    const cat = pr?.categories as { name: string } | null;
    return {
      id: m.id as string,
      product_id: m.product_id as string,
      product_name: pr?.name ?? "—",
      product_barcode: pr?.barcode ?? null,
      category_name: cat?.name ?? null,
      quantity_change: m.quantity_change as number,
      reason: m.reason as string,
      reference_id: (m.reference_id as string | null) ?? null,
      reference_type: (m.reference_type as string | null) ?? null,
      notes: (m.notes as string | null) ?? null,
      created_by_name: prof?.full_name ?? null,
      created_at: m.created_at as string,
    };
  });

  return { data: rows, count: count ?? rows.length };
}
