"use client";

import { useState } from "react";
import { StockMovementsTable } from "./stock-movements-table";
import { StockAdjustmentForm } from "./stock-adjustment-form";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useTranslations } from "@/lib/i18n/use-translations";

interface StockMovement {
  id: string;
  product_id: string;
  quantity: number;
  movement_type: string;
  reference_type: string;
  reference_id: string;
  notes: string | null;
  created_at: string;
  products: {
    name: string;
    barcode: string | null;
  };
}

interface StockClientProps {
  stockMovements: StockMovement[];
}

export function StockClient({ stockMovements }: StockClientProps) {
  const t = useTranslations("stock");
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t.title || "Stock Management"}</h1>
        <Button onClick={() => setAdjustmentOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t.adjustStock || "Adjust Stock"}
        </Button>
      </div>

      <StockMovementsTable stockMovements={stockMovements} />

      <StockAdjustmentForm
        open={adjustmentOpen}
        onOpenChange={setAdjustmentOpen}
      />
    </>
  );
}