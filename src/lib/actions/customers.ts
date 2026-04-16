"use server";

import { adminAction, authAction } from "@/lib/actions/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { CustomerSchema, isValidUuid } from "@/lib/utils/validation";
import { revalidatePath } from "next/cache";

export const getCustomers = authAction(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
});

export const getCustomer = authAction(async (_user, id: string) => {
  if (!isValidUuid(id)) throw new Error("Invalid customer ID");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return data;
});

export async function createCustomer(formData: FormData) {
  return authAction(async () => {
    const raw = {
      name: formData.get("name") as string,
      email: (formData.get("email") as string) || "",
      phone: (formData.get("phone") as string) || undefined,
      address: (formData.get("address") as string) || undefined,
      notes: (formData.get("notes") as string) || undefined,
    };

    const parsed = CustomerSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("customers").insert({
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      notes: parsed.data.notes || null,
    });

    if (error) return { error: error.message };

    revalidatePath("/customers");
    return { success: true };
  })();
}

export async function updateCustomer(id: string, formData: FormData) {
  if (!isValidUuid(id)) return { error: "Invalid customer ID" };
  return authAction(async () => {
    const raw = {
      name: formData.get("name") as string,
      email: (formData.get("email") as string) || "",
      phone: (formData.get("phone") as string) || undefined,
      address: (formData.get("address") as string) || undefined,
      notes: (formData.get("notes") as string) || undefined,
    };

    const parsed = CustomerSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("customers")
      .update({
        name: parsed.data.name,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
        notes: parsed.data.notes || null,
      })
      .eq("id", id);

    if (error) return { error: error.message };

    revalidatePath("/customers");
    revalidatePath(`/customers/${id}`);
    return { success: true };
  })();
}

export async function deleteCustomer(id: string) {
  if (!isValidUuid(id)) return { error: "Invalid customer ID" };
  return adminAction(async () => {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", id);

    if (error) return { error: error.message };

    revalidatePath("/customers");
    return { success: true };
  })();
}

export const getCustomerPurchaseHistory = authAction(async (_user, customerId: string) => {
  if (!isValidUuid(customerId)) throw new Error("Invalid customer ID");

  const supabase = await createClient();

  // Get sales for this customer
  const { data: sales, error: salesError } = await supabase
    .from("sales")
    .select(
      `id, sale_number, total, payment_method, status, created_at,
       sale_items(id, product_name, quantity, unit_price, line_total)`
    )
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (salesError) throw new Error(salesError.message);

  // Get print orders for this customer
  const { data: printOrders, error: printError } = await supabase
    .from("print_orders")
    .select("id, order_number, service_type, total_price, status, created_at")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (printError) throw new Error(printError.message);

  return { sales: sales || [], printOrders: printOrders || [] };
});
