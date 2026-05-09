import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("products")
    .select("id, name, barcode, stock_quantity, categories(name)")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []).map((p) => {
    const cat = p.categories as { name: string } | { name: string }[] | null;
    const category_name = Array.isArray(cat)
      ? cat[0]?.name ?? null
      : cat?.name ?? null;
    return {
      id: p.id,
      name: p.name,
      barcode: p.barcode,
      stock_quantity: p.stock_quantity,
      category_name,
    };
  });

  return NextResponse.json(rows);
}
