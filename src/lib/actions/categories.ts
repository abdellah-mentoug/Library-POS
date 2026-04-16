"use server";

import { adminAction, authAction } from "@/lib/actions/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { CategorySchema, isValidUuid } from "@/lib/utils/validation";
import { revalidatePath } from "next/cache";

export const getCategories = authAction(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
});

export async function createCategory(formData: FormData) {
  return adminAction(async () => {
    const raw = {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
      parent_id: formData.get("parent_id") as string | null,
      sort_order: Number(formData.get("sort_order") || 0),
    };

    const parsed = CategorySchema.safeParse(raw);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { error: `${issue.path.join(".")}: ${issue.message}` };
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("categories").insert(parsed.data);

    if (error) return { error: error.message };

    revalidatePath("/categories");
    revalidatePath("/products");
    return { success: true };
  });
}

export async function updateCategory(id: string, formData: FormData) {
  if (!isValidUuid(id)) return { error: "Invalid category ID" };
  return adminAction(async () => {
    const raw = {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
      parent_id: formData.get("parent_id") as string | null,
      sort_order: Number(formData.get("sort_order") || 0),
    };

    const parsed = CategorySchema.safeParse(raw);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { error: `${issue.path.join(".")}: ${issue.message}` };
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("categories")
      .update(parsed.data)
      .eq("id", id);

    if (error) return { error: error.message };

    revalidatePath("/categories");
    revalidatePath("/products");
    return { success: true };
  });
}

export async function deleteCategory(id: string) {
  if (!isValidUuid(id)) return { error: "Invalid category ID" };
  return adminAction(async () => {
    const supabase = createAdminClient();
    const { error } = await supabase.from("categories").delete().eq("id", id);

    if (error) return { error: error.message };

    revalidatePath("/categories");
    revalidatePath("/products");
    return { success: true };
  });
}
