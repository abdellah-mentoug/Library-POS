"use server";

import { adminAction } from "@/lib/actions/guard";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createUser(formData: FormData) {
  // Admin-only: create a new user with a specific role
  const supabase = createAdminClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("full_name") as string;
  const role = formData.get("role") as string;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings/users");
  return { data };
}

export async function getUsers() {
  return adminAction(async () => {
    const supabase = createAdminClient();

    // Fetch profiles
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, full_name, role, is_active, created_at")
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);

    // Fetch auth users for emails
    const { data: authData, error: authError } =
      await supabase.auth.admin.listUsers();

    if (authError) throw new Error(authError.message);

    // Merge email from auth.users into profiles
    const emailMap = new Map<string, string>();
    for (const u of authData.users) {
      emailMap.set(u.id, u.email || "");
    }

    return (profiles || []).map((p) => ({
      ...p,
      email: emailMap.get(p.id) || "",
    }));
  });
}

export async function updateProfile(
  userId: string,
  data: { full_name?: string; role?: string; is_active?: boolean }
) {
  return adminAction(async () => {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("profiles")
      .update(data)
      .eq("id", userId);

    if (error) return { error: error.message };

    revalidatePath("/settings/users");
    return { success: true };
  });
}
