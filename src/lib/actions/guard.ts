"use server";

import { getAuthUser, requireAdmin, type AuthUser } from "@/lib/auth";

export async function adminAction<T>(
  fn: (user: AuthUser) => Promise<T>
): Promise<T> {
  const user = await requireAdmin();
  return fn(user);
}

export async function authAction<T>(
  fn: (user: AuthUser) => Promise<T>
): Promise<T> {
  const user = await getAuthUser();
  return fn(user);
}
