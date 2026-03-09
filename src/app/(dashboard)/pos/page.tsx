"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCartStore } from "@/lib/store/cart-store";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import { useTranslations } from "@/lib/i18n/use-translations";
import { interpolate } from "@/lib/i18n/locales";
import { ProductSearch } from "./_components/product-search";
import { Cart } from "./_components/cart";
import { PaymentDialog } from "./_components/payment-dialog";
import { toast } from "sonner";

export default function PosPage() {
  const t = useTranslations("pos");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [cashierName, setCashierName] = useState("Cashier");
  const addItem = useCartStore((s) => s.addItem);

  // Get cashier name on mount
  useEffect(() => {
    async function getCashier() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        if (profile) setCashierName(profile.full_name);
      }
    }
    getCashier();
  }, []);

  // Barcode scanner integration
  useBarcodeScanner({
    onScan: async (barcode) => {
      const supabase = createClient();
      const { data: product, error } = await supabase
        .from("products")
        .select("id, name, barcode, purchase_price, tax_rate, stock_quantity")
        .eq("barcode", barcode)
        .eq("is_active", true)
        .single();

      if (error || !product) {
        toast.error(interpolate(t.productNotFound, { barcode }));
        return;
      }

      addItem({
        productId: product.id,
        name: product.name,
        barcode: product.barcode,
        unitPrice: product.purchase_price,
        costPrice: product.purchase_price,
        taxRate: product.tax_rate,
      });

      toast.success(interpolate(t.added, { name: product.name }));
    },
  });

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4">
      {/* Left: Product search */}
      <div className="flex-[65] overflow-hidden rounded-lg border bg-card p-4">
        <ProductSearch />
      </div>

      {/* Right: Cart */}
      <div className="flex-[35] overflow-hidden rounded-lg border bg-card p-4">
        <Cart onCheckout={() => setPaymentOpen(true)} />
      </div>

      {/* Payment dialog */}
      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        cashierName={cashierName}
      />
    </div>
  );
}
