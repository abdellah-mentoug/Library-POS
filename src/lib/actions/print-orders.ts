"use server";

import { adminAction, authAction } from "@/lib/actions/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { PrintOrderSchema, isValidUuid } from "@/lib/utils/validation";
import { formatPrintOrderNumber } from "@/lib/utils/format";
import { revalidatePath } from "next/cache";

type PrintOrderStatus =
  | "registered"
  | "in_progress"
  | "ready"
  | "delivered"
  | "cancelled";

type PrintServiceType =
  | "printing"
  | "copying"
  | "binding"
  | "laminating"
  | "scanning"
  | "other";

interface PrintOrderInput {
  customer_name: string;
  customer_phone?: string;
  customer_id?: string | null;
  service_type: PrintServiceType;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string;
  due_date?: string;
}

interface PrintOrderUpdateInput {
  description?: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
  notes?: string;
  due_date?: string | null;
  customer_name?: string;
  customer_phone?: string;
  service_type?: PrintServiceType;
}

export async function getPrintOrders(statusFilter?: PrintOrderStatus) {
  return authAction(async () => {
    const supabase = await createClient();

    let query = supabase
      .from("print_orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to fetch print orders: ${error.message}`);
    return data;
  });
}

export async function getPrintOrder(id: string) {
  if (!isValidUuid(id)) throw new Error("Invalid print order ID");
  return authAction(async () => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("print_orders")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw new Error(`Print order not found: ${error.message}`);
    return data;
  });
}

export async function createPrintOrder(input: PrintOrderInput) {
  return authAction(async (user) => {
    const parsed = PrintOrderSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0].message);
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("print_orders")
      .insert({
        customer_name: parsed.data.customer_name,
        customer_phone: parsed.data.customer_phone || null,
        customer_id: parsed.data.customer_id || null,
        service_type: parsed.data.service_type,
        description: parsed.data.description,
        quantity: parsed.data.quantity,
        unit_price: parsed.data.unit_price,
        total_price: parsed.data.total_price,
        notes: parsed.data.notes || null,
        due_date: parsed.data.due_date || null,
        created_by: user.id,
      })
      .select("id, order_number")
      .single();

    if (error) throw new Error(`Failed to create print order: ${error.message}`);

    revalidatePath("/print-orders");

    return {
      id: data.id,
      orderNumber: formatPrintOrderNumber(data.order_number),
    };
  });
}

export async function updatePrintOrder(id: string, data: PrintOrderUpdateInput) {
  if (!isValidUuid(id)) throw new Error("Invalid print order ID");
  return authAction(async () => {
    const updatePayload: Record<string, unknown> = {};

    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.quantity !== undefined) updatePayload.quantity = data.quantity;
    if (data.unit_price !== undefined) updatePayload.unit_price = data.unit_price;
    if (data.total_price !== undefined) updatePayload.total_price = data.total_price;
    if (data.notes !== undefined) updatePayload.notes = data.notes || null;
    if (data.due_date !== undefined) updatePayload.due_date = data.due_date || null;
    if (data.customer_name !== undefined) updatePayload.customer_name = data.customer_name;
    if (data.customer_phone !== undefined) updatePayload.customer_phone = data.customer_phone || null;
    if (data.service_type !== undefined) updatePayload.service_type = data.service_type;

    if (Object.keys(updatePayload).length === 0) {
      throw new Error("No fields to update");
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("print_orders")
      .update(updatePayload)
      .eq("id", id);

    if (error) throw new Error(`Failed to update print order: ${error.message}`);

    revalidatePath("/print-orders");
    revalidatePath(`/print-orders/${id}`);

    return { success: true };
  });
}

export async function updatePrintOrderStatus(
  orderId: string,
  newStatus: PrintOrderStatus
) {
  if (!isValidUuid(orderId)) throw new Error("Invalid print order ID");
  return authAction(async () => {
    const supabase = createAdminClient();

    const updatePayload: Record<string, unknown> = {
      status: newStatus,
    };

    switch (newStatus) {
      case "in_progress":
        // Just update status, no extra timestamps
        break;
      case "ready":
        updatePayload.completed_at = new Date().toISOString();
        break;
      case "delivered":
        updatePayload.delivered_at = new Date().toISOString();
        break;
      case "cancelled":
        // Just update status, no extra timestamps
        break;
      default:
        throw new Error(`Invalid status transition: ${newStatus}`);
    }

    const { error } = await supabase
      .from("print_orders")
      .update(updatePayload)
      .eq("id", orderId);

    if (error)
      throw new Error(`Failed to update print order status: ${error.message}`);

    revalidatePath("/print-orders");
    revalidatePath(`/print-orders/${orderId}`);

    return { success: true };
  });
}

export async function convertPrintOrderToSale(
  orderId: string,
  paymentMethod?: "cash" | "card" | "transfer"
) {
  if (!isValidUuid(orderId)) throw new Error("Invalid print order ID");
  return authAction(async (user) => {
    const supabase = createAdminClient();

    // Fetch the print order
    const { data: order, error: fetchError } = await supabase
      .from("print_orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (fetchError || !order) {
      throw new Error("Print order not found");
    }

    if (order.is_paid) {
      throw new Error("Print order has already been paid");
    }

    if (!["ready", "delivered"].includes(order.status)) {
      throw new Error(
        "Print order must be in 'ready' or 'delivered' status to convert to sale"
      );
    }

    const orderLabel = formatPrintOrderNumber(order.order_number);

    // Create the sale record
    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert({
        customer_id: order.customer_id || null,
        cashier_id: user.id,
        subtotal: order.total_price,
        tax_total: 0,
        discount_amount: 0,
        total: order.total_price,
        payment_method: paymentMethod || "cash",
        amount_paid: order.total_price,
        change_given: 0,
        notes: `Print order #${orderLabel}`,
      })
      .select("id, sale_number")
      .single();

    if (saleError) throw new Error(`Sale creation failed: ${saleError.message}`);

    // Link the sale to the print order and mark as paid
    const { error: linkError } = await supabase
      .from("print_orders")
      .update({
        is_paid: true,
        linked_sale_id: sale.id,
      })
      .eq("id", orderId);

    if (linkError)
      throw new Error(`Failed to link sale to print order: ${linkError.message}`);

    revalidatePath("/print-orders");
    revalidatePath(`/print-orders/${orderId}`);
    revalidatePath("/pos");
    revalidatePath("/reports");

    return { saleId: sale.id, saleNumber: sale.sale_number };
  });
}

export async function deletePrintOrderFile(orderId: string, filePath: string) {
  if (!isValidUuid(orderId)) throw new Error("Invalid print order ID");
  return adminAction(async () => {
    const supabase = createAdminClient();

    // Delete the file from storage
    const { error: storageError } = await supabase.storage
      .from("print-files")
      .remove([filePath]);

    if (storageError)
      throw new Error(`Failed to delete file: ${storageError.message}`);

    // Fetch current file_paths to remove the deleted path
    const { data: order, error: fetchError } = await supabase
      .from("print_orders")
      .select("file_paths")
      .eq("id", orderId)
      .single();

    if (fetchError)
      throw new Error(`Failed to fetch print order: ${fetchError.message}`);

    const currentPaths: string[] = order.file_paths || [];
    const updatedPaths = currentPaths.filter((p: string) => p !== filePath);

    const { error: updateError } = await supabase
      .from("print_orders")
      .update({ file_paths: updatedPaths })
      .eq("id", orderId);

    if (updateError)
      throw new Error(`Failed to update file paths: ${updateError.message}`);

    revalidatePath("/print-orders");
    revalidatePath(`/print-orders/${orderId}`);

    return { success: true };
  });
}
