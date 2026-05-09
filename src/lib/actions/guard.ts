import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
 
export type AllowedRole = 'admin' | 'employee' | 'stock_operator';

export interface CurrentUser {
  id: string;
  email?: string | null;
  role: AllowedRole;
  is_active: boolean;
  full_name?: string | null;
}
 
export async function getSession() {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
 
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_active, full_name')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('Error fetching user profile:', profileError);
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    role: profile.role as AllowedRole,
    is_active: profile.is_active,
    full_name: profile.full_name,
  };
}
 
export async function requireAuth() {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}
 
export async function requireRole(roles: AllowedRole | AllowedRole[]) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.is_active) redirect('/login');

  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(user.role)) {
    throw new Error('Insufficient permissions');
  }
  return user;
}

/**
 * Check if current user has the required role(s) without throwing
 * @param roles - Single role or array of roles to check
 * @returns boolean indicating if user has permission
 */
export async function hasRole(roles: AllowedRole | AllowedRole[]): Promise<boolean> {
  try {
    await requireRole(roles);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current user's role safely
 * @returns user's role or null if not authenticated
 */
export async function getCurrentUserRole(): Promise<AllowedRole | null> {
  const user = await getCurrentUser();
  return user?.role ?? null;
}

// Convenience helpers ──────────────────────────────────────────────────────

/** Admin only - requires admin role */
export async function requireAdmin() {
  return await requireRole('admin');
}

/** Admin or regular employee - for general staff operations */
export async function requireAdminOrEmployee() {
  return await requireRole(['admin', 'employee']);
}

/** Any authenticated staff (admin, employee, stock_operator) */
export async function requireAnyStaff() {
  return await requireRole(['admin', 'employee', 'stock_operator']);
}

/** Can access stock management: admin or stock_operator */
export async function requireStockAccess() {
  return await requireRole(['admin', 'stock_operator']);
}

/** Can perform sales operations: admin, employee, or stock_operator */
export async function requireSalesAccess() {
  return await requireRole(['admin', 'employee', 'stock_operator']);
}

// Additional utility functions ──────────────────────────────────────────────

/**
 * Check if current user is admin
 * @returns true if user is admin, false otherwise
 */
export async function isAdmin(): Promise<boolean> {
  return await hasRole('admin');
}

/**
 * Check if current user can manage users (admin only)
 * @returns true if user can manage users
 */
export async function canManageUsers(): Promise<boolean> {
  return await hasRole('admin');
}

/**
 * Check if current user can view reports
 * @returns true if user can view reports (admin or employee)
 */
export async function canViewReports(): Promise<boolean> {
  return await hasRole(['admin', 'employee']);
}

// Action wrappers for server actions ────────────────────────────────────────

export function adminAction<T extends readonly unknown[], R>(
  actionFn: (user: CurrentUser, ...args: T) => Promise<R>
): (...args: T) => Promise<R>;
export function adminAction(actionFn: (user: CurrentUser, ...args: readonly unknown[]) => Promise<unknown>) {
  return async (...args: readonly unknown[]): Promise<unknown> => {
    const user = await requireAdmin();
    return actionFn(user, ...args);
  };
}

/**
 * Wrapper for authenticated user server actions (any staff role)
 * @param actionFn - The server action function to wrap
 * @returns wrapped function that requires authentication
 */
export function authAction<T extends readonly unknown[], R>(
  actionFn: (user: CurrentUser, ...args: T) => Promise<R>
): (...args: T) => Promise<R>;
export function authAction(actionFn: (user: CurrentUser, ...args: readonly unknown[]) => Promise<unknown>) {
  return async (...args: readonly unknown[]): Promise<unknown> => {
    const user = await requireAnyStaff();
    return actionFn(user, ...args);
  };
}

/** Admin or stock_operator — stock mutations and stock-area reads */
export function stockAccessAction<T extends readonly unknown[], R>(
  actionFn: (user: CurrentUser, ...args: T) => Promise<R>
): (...args: T) => Promise<R>;
export function stockAccessAction(
  actionFn: (user: CurrentUser, ...args: readonly unknown[]) => Promise<unknown>
) {
  return async (...args: readonly unknown[]): Promise<unknown> => {
    const user = await requireStockAccess();
    return actionFn(user, ...args);
  };
}

/** Dashboard routes: only admin and stock_operator */
export async function requireStockPageAccess(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.is_active) redirect('/login');
  if (user.role !== 'admin' && user.role !== 'stock_operator') redirect('/');
  return user;
}
