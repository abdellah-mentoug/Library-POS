import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StockLevelBadge } from "./stock-level-badge";
import type { StockSummaryRow } from "@/lib/actions/stock";
import { formatDate } from "@/lib/utils/format";
import { getLocale } from "@/lib/i18n/get-locale";
import { messages } from "@/lib/i18n/translations";

interface StockTableProps {
  rows: StockSummaryRow[];
}

export async function StockTable({ rows }: StockTableProps) {
  const locale = await getLocale();
  const t = messages[locale].stock;

  if (!rows.length) {
    return <p className="text-muted-foreground py-8 text-center">{t.noProducts}</p>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t.product}</TableHead>
            <TableHead>{t.category}</TableHead>
            <TableHead className="text-end">{t.quantity}</TableHead>
            <TableHead className="text-end">{t.threshold}</TableHead>
            <TableHead>{t.lastMovement}</TableHead>
            <TableHead className="text-end">{t.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <Link
                  href={`/products/${r.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {r.name}
                </Link>
                {r.barcode && (
                  <div className="text-xs text-muted-foreground">{r.barcode}</div>
                )}
              </TableCell>
              <TableCell>{r.category_name ?? "—"}</TableCell>
              <TableCell className="text-end">
                <StockLevelBadge quantity={r.stock_quantity} threshold={r.low_stock_threshold} />
              </TableCell>
              <TableCell className="text-end">{r.low_stock_threshold}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {r.last_movement_at
                  ? `${formatDate(r.last_movement_at)}${r.last_movement_reason ? ` · ${r.last_movement_reason}` : ""}`
                  : "—"}
              </TableCell>
              <TableCell className="text-end">
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/stock/entry?productId=${r.id}`}>{t.quickEntry}</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/stock/exit?productId=${r.id}`}>{t.quickExit}</Link>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
