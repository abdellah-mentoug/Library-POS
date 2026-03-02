# QA Breaker Agent Memory

## Project Structure
- Category form: `src/app/(dashboard)/categories/_components/category-form.tsx`
- Category actions: `src/lib/actions/categories.ts`
- Category tree: `src/app/(dashboard)/categories/_components/category-tree.tsx`
- Validation schemas: `src/lib/utils/validation.ts`
- Product form: `src/app/(dashboard)/products/_components/product-form.tsx`
- Product actions: `src/lib/actions/products.ts`
- Action guards: `src/lib/actions/guard.ts`
- Select component: `src/components/ui/select.tsx` (radix-ui based)
- Middleware: `src/middleware.ts` (auth only, no form data manipulation)

## Validation Architecture (Zod v4.3.6)
- `optionalUuid` helper in validation.ts:4-6 handles nullable UUID fields
- Accepts: valid UUID, "", "none", null, undefined. Rejects everything else.
- Transform maps "", "none", undefined -> null. null falls through as-is (accidental but correct).
- Client + server run SAME Zod parse independently (dual validation, fragile duplication)
- Error display: only `issues[0].message` shown -- no field name context ("Invalid UUID" with no hint)
- Product form normalizes "none" -> "" on formData (lines 68-70), category form does NOT

## Systemic Vulnerability: Unvalidated ID Parameters
- ALL server actions accept `id: string` without UUID validation
- Raw strings go directly to `.eq("id", id)` in Supabase queries
- Affected: products.ts, categories.ts, customers.ts, suppliers.ts, sales.ts, stock.ts, print-orders.ts, purchases.ts
- PostgreSQL rejects non-UUID with "invalid input syntax for type uuid"
- This is the MOST LIKELY source of "Invalid UUID" errors users report
- Server actions are HTTP POST endpoints -- attackable without UI

## Confirmed Non-Issues
- "none" string from Select IS properly handled by optionalUuid
- Middleware does NOT modify form data
- No interceptors modify FormData between form and server action
- category_id flow through product form is safe (3-layer defense: form mutation, falsy coercion, Zod transform)

## Fragile Areas
- Client validates parsed.data but sends raw formData to server (divergence risk)
- `is_active` field exists in DB but NOT in CategorySchema or category form
- Redundant `|| null` after Zod transform on insert/update lines (defense-in-depth, not a bug)
