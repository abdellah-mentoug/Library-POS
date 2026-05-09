import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { StockHistoryRow } from "@/lib/actions/stock";
import { formatDateTime } from "@/lib/utils/format";
import { MovementReasonBadge } from "./movement-reason-badge";
import { getLocale } from "@/lib/i18n/get-locale";
import { messages } from "@/lib/i18n/translations";

interface Props {
  rows: StockHistoryRow[];
}

export async function StockHistoryTable({ rows }: Props) {
  const locale = await getLocale();
  const t = messages[locale].stockHistory;
  const tc = messages[locale].common;

  if (!rows.length) {
    return <p className="text-muted-foreground py-8 text-center">{t.noMovements}</p>;
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t.dateTime}</TableHead>
            <TableHead>{t.productLink}</TableHead>
            <TableHead>{t.movement}</TableHead>
            <TableHead>{t.filterReason}</TableHead>
            <TableHead>{t.referenceType}</TableHead>
            <TableHead>{tc.notes}</TableHead>
            <TableHead>{t.operator}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((m) => (
            <TableRow key={m.id}>
              <TableCell className="whitespace-nowrap text-sm">
                {formatDateTime(m.created_at)}
              </TableCell>
              <TableCell>
                <Link
                  href={`/products/${m.product_id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {m.product_name}
                </Link>
                {m.product_barcode && (
                  <div className="text-xs text-muted-foreground">{m.product_barcode}</div>
                )}
              </TableCell>
              <TableCell>
                <span
                  className={
                    m.quantity_change >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"
                  }
                >
                  {m.quantity_change > 0 ? "+" : ""}
                  {m.quantity_change}
                </span>
              </TableCell>
              <TableCell>
                <MovementReasonBadge reason={m.reason} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {m.reference_type && m.reference_id
                  ? `${m.reference_type}`
                  : "—"}
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-sm">
                {m.notes || "—"}
              </TableCell>
              <TableCell className="text-sm">{m.created_by_name ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
