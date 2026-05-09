"use server";

import { authAction } from "@/lib/actions/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { CategorySchema } from "@/lib/utils/validation";

export const getCategories = authAction(async (_user) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data;
});

type ActionResult =
  | { success: true }
  | { error: string };

export async function createCategory(
  data: unknown
): Promise<ActionResult> {
  const parsed = CategorySchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("categories")
    .insert(parsed.data);

  if (error) return { error: error.message };

  revalidatePath("/categories");

  return { success: true };
}

export async function updateCategory(
  id: string,
  data: unknown
): Promise<ActionResult> {
  const parsed = CategorySchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("categories")
    .update(parsed.data)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/categories");

  return { success: true };
}