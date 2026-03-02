import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type UserRole = "admin" | "employee";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
}

export async function getAuthUser(): Promise<AuthUser> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return {
    id: user.id,
    email: user.email!,
    role: profile.role as UserRole,
    fullName: profile.full_name,
  };
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (user.role !== "admin") redirect("/");
  return user;
}
