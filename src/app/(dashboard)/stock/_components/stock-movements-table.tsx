"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useTranslations } from "@/lib/i18n/use-translations";
import { formatDate } from "@/lib/utils/format";

interface StockMovement {
  id: string;
  product_id: string;
  quantity_change: number;
  reason: string;
  reference_id: string | null;
  reference_type: string | null;
  notes: string | null;
  created_at: string;
  products: {
    name: string;
    barcode: string | null;
  };
  profiles: {
    full_name: string | null;
  } | null;
}

interface StockMovementsTableProps {
  stockMovements: StockMovement[];
}

export function StockMovementsTable({ stockMovements }: StockMovementsTableProps) {
  const t = useTranslations("stock");
  const [search, setSearch] = useState("");

  const filteredMovements = stockMovements.filter(
    (movement) =>
      movement.products.name.toLowerCase().includes(search.toLowerCase()) ||
      (movement.products.barcode &&
        movement.products.barcode.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t.stockMovements || "Stock Movements"}</h2>
        <Input
          placeholder={t.searchPlaceholder || "Search by product name or barcode..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.date || "Date"}</TableHead>
              <TableHead>{t.product || "Product"}</TableHead>
              <TableHead>{t.reason || "Reason"}</TableHead>
              <TableHead>{t.quantity || "Quantity"}</TableHead>
              <TableHead>{t.reference || "Reference"}</TableHead>
              <TableHead>{t.notes || "Notes"}</TableHead>
              <TableHead>{t.createdBy}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMovements.map((movement) => (
              <TableRow key={movement.id}>
                <TableCell>{formatDate(movement.created_at)}</TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{movement.products.name}</div>
                    {movement.products.barcode && (
                      <div className="text-sm text-muted-foreground">
                        {movement.products.barcode}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>{movement.reason}</TableCell>
                <TableCell>
                  <span
                    className={
                      movement.quantity_change > 0 ? "text-green-600" : "text-red-600"
                    }
                  >
                    {movement.quantity_change > 0 ? "+" : ""}
                    {movement.quantity_change}
                  </span>
                </TableCell>
                <TableCell>
                  {movement.reference_type && movement.reference_id
                    ? `${movement.reference_type} #${movement.reference_id.slice(-8)}`
                    : "-"}
                </TableCell>
                <TableCell>{movement.notes || "-"}</TableCell>
                <TableCell>{movement.profiles?.full_name || "System"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}