"use client";

import { useState, useTransition } from "react";
import { useCartStore, useCartTotals } from "@/lib/store/cart-store";
import { createSale } from "@/lib/actions/sales";
import { generateReceiptPDF } from "@/lib/utils/receipt-pdf";
import { STORE_CONFIG } from "@/lib/utils/constants";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cashierName: string;
}

export function PaymentDialog({
  open,
  onOpenChange,
  cashierName,
}: PaymentDialogProps) {
  const items = useCartStore((s) => s.items);
  const customerId = useCartStore((s) => s.customerId);
  const customerName = useCartStore((s) => s.customerName);
  const discountType = useCartStore((s) => s.discountType);
  const notes = useCartStore((s) => s.notes);
  const clearCart = useCartStore((s) => s.clearCart);
  const { subtotal, taxTotal, cartDiscount, total } = useCartTotals();

  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer">("cash");
  const [amountTendered, setAmountTendered] = useState("");
  const [reference, setReference] = useState("");
  const [isPending, startTransition] = useTransition();

  const amountPaid =
    paymentMethod === "cash"
      ? parseFloat(amountTendered) || 0
      : total;

  const changeGiven =
    paymentMethod === "cash"
      ? Math.max(0, Math.round((amountPaid - total) * 100) / 100)
      : 0;

  const canConfirm =
    paymentMethod === "cash" ? amountPaid >= total : true;

  function handleConfirm() {
    startTransition(async () => {
      try {
        const result = await createSale({
          items: items.map((item) => ({
            productId: item.productId,
            productName: item.name,
            productBarcode: item.barcode,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            costPrice: item.costPrice,
            taxRate: item.taxRate,
            taxAmount: item.taxAmount,
            discountAmount: item.discountAmount,
            lineTotal: item.lineTotal,
          })),
          customerId,
          subtotal,
          taxTotal,
          discountAmount: cartDiscount,
          discountType,
          total,
          paymentMethod,
          amountPaid,
          changeGiven,
          paymentDetails: reference ? { reference } : undefined,
          notes: notes || undefined,
        });

        toast.success(`Sale #${result.saleNumber} completed!`);

        // Generate and open receipt PDF
        try {
          const doc = generateReceiptPDF(
            {
              saleNumber: result.saleNumber,
              date: formatDateTime(new Date()),
              cashierName,
              customerName: customerName || undefined,
              items: items.map((item) => ({
                name: item.name,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                lineTotal: item.lineTotal,
              })),
              subtotal,
              taxTotal,
              discountAmount: cartDiscount,
              total,
              paymentMethod,
              amountPaid,
              changeGiven,
            },
            {
              name: STORE_CONFIG.name,
              address: STORE_CONFIG.address,
              phone: STORE_CONFIG.phone,
              taxId: STORE_CONFIG.taxId || undefined,
            }
          );

          const pdfBlob = doc.output("blob");
          const url = URL.createObjectURL(pdfBlob);
          const printWindow = window.open(url);
          if (printWindow) {
            printWindow.addEventListener("load", () => {
              printWindow.print();
            });
          }
        } catch (pdfError) {
          console.error("Receipt PDF error:", pdfError);
        }

        clearCart();
        onOpenChange(false);
        setAmountTendered("");
        setReference("");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Sale failed"
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Payment</DialogTitle>
        </DialogHeader>

        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">Amount Due</p>
          <p className="text-3xl font-bold">{formatCurrency(total)}</p>
        </div>

        <Tabs
          value={paymentMethod}
          onValueChange={(v) => setPaymentMethod(v as "cash" | "card" | "transfer")}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="cash">Cash</TabsTrigger>
            <TabsTrigger value="card">Card</TabsTrigger>
            <TabsTrigger value="transfer">Transfer</TabsTrigger>
          </TabsList>

          <TabsContent value="cash" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount_tendered">Amount Tendered</Label>
              <Input
                id="amount_tendered"
                type="number"
                step="0.01"
                min={total}
                value={amountTendered}
                onChange={(e) => setAmountTendered(e.target.value)}
                placeholder={total.toFixed(2)}
                autoFocus
              />
            </div>
            {amountPaid >= total && (
              <div className="rounded-md bg-green-50 p-3 text-center">
                <p className="text-sm text-muted-foreground">Change</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(changeGiven)}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="card" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="card_ref">Reference (optional)</Label>
              <Input
                id="card_ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Transaction reference"
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Amount: {formatCurrency(total)}
            </p>
          </TabsContent>

          <TabsContent value="transfer" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="transfer_ref">Reference (optional)</Label>
              <Input
                id="transfer_ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Transfer reference"
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Amount: {formatCurrency(total)}
            </p>
          </TabsContent>
        </Tabs>

        <Button
          className="w-full"
          size="lg"
          disabled={!canConfirm || isPending}
          onClick={handleConfirm}
        >
          {isPending
            ? "Processing..."
            : `Confirm ${formatCurrency(total)}`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
