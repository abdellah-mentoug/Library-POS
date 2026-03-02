"use server";

import { adminAction, authAction } from "@/lib/actions/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SupplierSchema, isValidUuid } from "@/lib/utils/validation";
import { revalidatePath } from "next/cache";

export async function getSuppliers() {
  return authAction(async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) throw new Error(error.message);
    return data;
  });
}

export async function getSupplier(id: string) {
  if (!isValidUuid(id)) throw new Error("Invalid supplier ID");
  return authAction(async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw new Error(error.message);
    return data;
  });
}

export async function createSupplier(formData: FormData) {
  return adminAction(async () => {
    const raw = {
      name: formData.get("name") as string,
      contact_person: (formData.get("contact_person") as string) || undefined,
      email: (formData.get("email") as string) || "",
      phone: (formData.get("phone") as string) || undefined,
      address: (formData.get("address") as string) || undefined,
      notes: (formData.get("notes") as string) || undefined,
    };

    const parsed = SupplierSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("suppliers").insert({
      name: parsed.data.name,
      contact_person: parsed.data.contact_person || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      notes: parsed.data.notes || null,
    });

    if (error) return { error: error.message };

    revalidatePath("/suppliers");
    return { success: true };
  });
}

export async function updateSupplier(id: string, formData: FormData) {
  if (!isValidUuid(id)) return { error: "Invalid supplier ID" };
  return adminAction(async () => {
    const raw = {
      name: formData.get("name") as string,
      contact_person: (formData.get("contact_person") as string) || undefined,
      email: (formData.get("email") as string) || "",
      phone: (formData.get("phone") as string) || undefined,
      address: (formData.get("address") as string) || undefined,
      notes: (formData.get("notes") as string) || undefined,
    };

    const parsed = SupplierSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("suppliers")
      .update({
        name: parsed.data.name,
        contact_person: parsed.data.contact_person || null,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
        notes: parsed.data.notes || null,
      })
      .eq("id", id);

    if (error) return { error: error.message };

    revalidatePath("/suppliers");
    return { success: true };
  });
}

export async function deleteSupplier(id: string) {
  if (!isValidUuid(id)) return { error: "Invalid supplier ID" };
  return adminAction(async () => {
    const supabase = createAdminClient();
    // Soft delete
    const { error } = await supabase
      .from("suppliers")
      .update({ is_active: false })
      .eq("id", id);

    if (error) return { error: error.message };

    revalidatePath("/suppliers");
    return { success: true };
  });
}
