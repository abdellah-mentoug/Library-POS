"use server";

import { adminAction } from "@/lib/actions/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isValidUuid } from "@/lib/utils/validation";
import { revalidatePath } from "next/cache";

export async function getPurchaseOrders() {
  return adminAction(async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("purchase_orders")
      .select("*, suppliers(name)")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  });
}

export async function getPurchaseOrder(id: string) {
  if (!isValidUuid(id)) throw new Error("Invalid purchase order ID");
  return adminAction(async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("purchase_orders")
      .select(
        `*, suppliers(id, name, contact_person, email, phone),
         purchase_items(id, product_id, quantity_ordered, quantity_received, unit_cost, line_total,
           products(id, name, barcode, stock_quantity)
         ),
         profiles:created_by(full_name)`
      )
      .eq("id", id)
      .single();

    if (error) throw new Error(error.message);
    return data;
  });
}

interface CreatePOInput {
  supplier_id: string;
  expected_date?: string;
  notes?: string;
  items: Array<{
    product_id: string;
    quantity_ordered: number;
    unit_cost: number;
  }>;
}

export async function createPurchaseOrder(input: CreatePOInput) {
  return adminAction(async (user) => {
    if (!input.supplier_id) {
      return { error: "Supplier is required" };
    }
    if (!input.items || input.items.length === 0) {
      return { error: "At least one line item is required" };
    }

    // Validate items
    for (const item of input.items) {
      if (!item.product_id) return { error: "Each item needs a product" };
      if (item.quantity_ordered <= 0)
        return { error: "Quantity must be greater than 0" };
      if (item.unit_cost < 0) return { error: "Unit cost cannot be negative" };
    }

    const subtotal = input.items.reduce(
      (sum, item) => sum + item.unit_cost * item.quantity_ordered,
      0
    );

    const supabase = createAdminClient();

    // Create PO
    const { data: po, error: poError } = await supabase
      .from("purchase_orders")
      .insert({
        supplier_id: input.supplier_id,
        status: "draft",
        subtotal: Math.round(subtotal * 100) / 100,
        tax_total: 0,
        total: Math.round(subtotal * 100) / 100,
        notes: input.notes || null,
        expected_date: input.expected_date || null,
        created_by: user.id,
      })
      .select("id, po_number")
      .single();

    if (poError) return { error: poError.message };

    // Create line items
    const lineItems = input.items.map((item) => ({
      purchase_order_id: po.id,
      product_id: item.product_id,
      quantity_ordered: item.quantity_ordered,
      quantity_received: 0,
      unit_cost: item.unit_cost,
      line_total: Math.round(item.unit_cost * item.quantity_ordered * 100) / 100,
    }));

    const { error: itemsError } = await supabase
      .from("purchase_items")
      .insert(lineItems);

    if (itemsError) return { error: itemsError.message };

    revalidatePath("/purchases");
    return { success: true, id: po.id, poNumber: po.po_number };
  });
}

export async function updatePurchaseOrderStatus(
  id: string,
  status: "ordered" | "cancelled"
) {
  if (!isValidUuid(id)) return { error: "Invalid purchase order ID" };
  return adminAction(async () => {
    const supabase = createAdminClient();

    const updateData: Record<string, unknown> = { status };
    if (status === "cancelled") {
      // No special handling needed
    }

    const { error } = await supabase
      .from("purchase_orders")
      .update(updateData)
      .eq("id", id);

    if (error) return { error: error.message };

    revalidatePath("/purchases");
    revalidatePath(`/purchases/${id}`);
    return { success: true };
  });
}

interface ReceiveItem {
  purchase_item_id: string;
  product_id: string;
  quantity_to_receive: number;
}

export async function receivePurchaseOrder(
  poId: string,
  receivedItems: ReceiveItem[]
) {
  if (!isValidUuid(poId)) return { error: "Invalid purchase order ID" };
  return adminAction(async (user) => {
    const itemsToProcess = receivedItems.filter(
      (item) => item.quantity_to_receive > 0
    );

    if (itemsToProcess.length === 0) {
      return { error: "Select at least one item to receive" };
    }

    const supabase = createAdminClient();

    // Process each item
    for (const item of itemsToProcess) {
      // Get current purchase item data
      const { data: purchaseItem, error: fetchError } = await supabase
        .from("purchase_items")
        .select("quantity_ordered, quantity_received")
        .eq("id", item.purchase_item_id)
        .single();

      if (fetchError) return { error: fetchError.message };

      const newReceived =
        purchaseItem.quantity_received + item.quantity_to_receive;
      if (newReceived > purchaseItem.quantity_ordered) {
        return {
          error: `Cannot receive more than ordered quantity for an item`,
        };
      }

      // Update purchase item received qty
      const { error: updateItemError } = await supabase
        .from("purchase_items")
        .update({ quantity_received: newReceived })
        .eq("id", item.purchase_item_id);

      if (updateItemError) return { error: updateItemError.message };

      // Increment product stock
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("stock_quantity")
        .eq("id", item.product_id)
        .single();

      if (productError) return { error: productError.message };

      const { error: stockError } = await supabase
        .from("products")
        .update({
          stock_quantity: product.stock_quantity + item.quantity_to_receive,
        })
        .eq("id", item.product_id);

      if (stockError) return { error: stockError.message };

      // Create stock movement
      const { error: movementError } = await supabase
        .from("stock_movements")
        .insert({
          product_id: item.product_id,
          quantity_change: item.quantity_to_receive,
          reason: "purchase_received",
          notes: `Received from PO`,
          created_by: user.id,
        });

      if (movementError) return { error: movementError.message };
    }

    // Check if all items are fully received
    const { data: allItems, error: checkError } = await supabase
      .from("purchase_items")
      .select("quantity_ordered, quantity_received")
      .eq("purchase_order_id", poId);

    if (checkError) return { error: checkError.message };

    const allFullyReceived = allItems.every(
      (item) => item.quantity_received >= item.quantity_ordered
    );

    const anyReceived = allItems.some((item) => item.quantity_received > 0);

    let newStatus: string;
    if (allFullyReceived) {
      newStatus = "received";
    } else if (anyReceived) {
      newStatus = "partially_received";
    } else {
      newStatus = "ordered";
    }

    const poUpdate: Record<string, unknown> = { status: newStatus };
    if (newStatus === "received") {
      poUpdate.received_date = new Date().toISOString();
    }

    const { error: statusError } = await supabase
      .from("purchase_orders")
      .update(poUpdate)
      .eq("id", poId);

    if (statusError) return { error: statusError.message };

    revalidatePath("/purchases");
    revalidatePath(`/purchases/${poId}`);
    revalidatePath("/products");
    return { success: true, itemsReceived: itemsToProcess.length };
  });
}
