"use client";

import { useState } from "react";
import { VoidSaleDialog } from "./void-sale-dialog";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import { useTranslations } from "@/lib/i18n/use-translations";

interface SaleDetailClientProps {
  saleId: string;
  saleNumber: string;
  status: string;
  isAdmin: boolean;
}

export function SaleDetailActions({
  saleId,
  saleNumber,
  status,
  isAdmin,
}: SaleDetailClientProps) {
  const t = useTranslations("sales");
  const [voidOpen, setVoidOpen] = useState(false);

  if (status !== "completed" || !isAdmin) return null;

  return (
    <>
      <Button variant="destructive" onClick={() => setVoidOpen(true)}>
        <XCircle className="mr-2 h-4 w-4" />
        {t.voidSale}
      </Button>
      <VoidSaleDialog
        saleId={saleId}
        saleNumber={saleNumber}
        open={voidOpen}
        onOpenChange={setVoidOpen}
      />
    </>
  );
}
