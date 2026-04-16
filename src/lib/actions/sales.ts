"use server";

import { authAction, requireAnyStaff } from "@/lib/actions/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isValidUuid } from "@/lib/utils/validation";
import { revalidatePath } from "next/cache";

interface SaleInput {
  items: {
    productId: string;
    productName: string;
    productBarcode: string | null;
    quantity: number;
    unitPrice: number;
    costPrice: number;
    taxRate: number;
    taxAmount: number;
    discountAmount: number;
    lineTotal: number;
  }[];
  customerId: string | null;
  subtotal: number;
  taxTotal: number;
  discountAmount: number;
  discountType: "fixed" | "percentage" | null;
  total: number;
  paymentMethod: "cash" | "card" | "transfer";
  amountPaid: number;
  changeGiven: number;
  paymentDetails?: Record<string, unknown>;
  notes?: string;
}

export const getSales = authAction(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales")
    .select(
      `id, sale_number, subtotal, tax_total, discount_amount, total,
       payment_method, status, created_at, notes,
       customers(name),
       profiles:cashier_id(full_name)`
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
});

export async function getSale(id: string) {
  if (!isValidUuid(id)) throw new Error("Invalid sale ID");
  return authAction(async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("sales")
      .select(
        `*, customers(name),
         profiles:cashier_id(full_name),
         voided_profile:voided_by(full_name),
         sale_items(id, product_id, product_name, product_barcode, quantity,
           unit_price, cost_price, tax_rate, tax_amount, discount_amount, line_total)`
      )
      .eq("id", id)
      .single();

    if (error) throw new Error(error.message);
    return data;
  })();
}

export async function createSale(input: SaleInput) {
  const user = await requireAnyStaff();
  const supabase = createAdminClient();

  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .insert({
      customer_id: input.customerId,
      cashier_id: user.id,
      subtotal: input.subtotal,
      tax_total: input.taxTotal,
      discount_amount: input.discountAmount,
      discount_type: input.discountType,
      total: input.total,
      payment_method: input.paymentMethod,
      payment_details: input.paymentDetails ?? null,
      amount_paid: input.amountPaid,
      change_given: input.changeGiven,
      notes: input.notes ?? null,
    })
    .select("id, sale_number")
    .single();

    if (saleError) throw new Error(`Sale creation failed: ${saleError.message}`);

    const saleItems = input.items.map((item) => ({
      sale_id: sale.id,
      product_id: item.productId,
      product_name: item.productName,
      product_barcode: item.productBarcode,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      cost_price: item.costPrice,
      tax_rate: item.taxRate,
      tax_amount: item.taxAmount,
      discount_amount: item.discountAmount,
      line_total: item.lineTotal,
    }));

    const { error: itemsError } = await supabase
      .from("sale_items")
      .insert(saleItems);

    if (itemsError) throw new Error(`Sale items failed: ${itemsError.message}`);

    revalidatePath("/pos");
    revalidatePath("/products");
    revalidatePath("/reports");

    return { saleId: sale.id, saleNumber: sale.sale_number };
}

export async function voidSale(saleId: string, reason: string) {
  if (!isValidUuid(saleId)) throw new Error("Invalid sale ID");
  return authAction(async (user) => {
    if (user.role !== "admin") {
      throw new Error("Only admins can void sales");
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("sales")
      .update({
        status: "voided",
        voided_at: new Date().toISOString(),
        voided_by: user.id,
        void_reason: reason,
      })
      .eq("id", saleId)
      .eq("status", "completed");

    if (error) throw new Error(`Void failed: ${error.message}`);

    revalidatePath("/pos");
    revalidatePath("/products");
    revalidatePath("/reports");
    revalidatePath("/sales");
    revalidatePath(`/sales/${saleId}`);
  })();
}
