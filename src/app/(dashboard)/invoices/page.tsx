import { getLocale } from "@/lib/i18n/get-locale";
import { messages } from "@/lib/i18n/translations";
import { ModulePageShell } from "../_components/module-page-shell";

export default async function InvoicesPage() {
  const locale = await getLocale();
  const t = (messages[locale] as Record<string, any>).invoices as {
    title: string;
    description: string;
    badge: string;
    hint: string;
    stats: { thisMonth: string; unpaid: string; avgValue: string };
    table: { title: string; columns: { name: string; status: string; amount: string } };
    status: { paid: string; unpaid: string; partial: string };
    actions: { newInvoice: string; openSales: string };
  };

  return (
    <ModulePageShell
      title={t.title}
      description={t.description}
      badge={t.badge}
      hint={t.hint}
      stats={[
        { label: t.stats.thisMonth, value: "€12,430" },
        { label: t.stats.unpaid, value: "7" },
        { label: t.stats.avgValue, value: "€312" },
      ]}
      tableTitle={t.table.title}
      tableColumns={t.table.columns}
      tableRows={[
        { name: "INV-2026-041", status: t.status.paid, amount: "€680" },
        { name: "INV-2026-042", status: t.status.unpaid, amount: "€1,220" },
        { name: "INV-2026-043", status: t.status.partial, amount: "€490" },
      ]}
      actions={{
        primaryLabel: t.actions.newInvoice,
        secondaryLabel: t.actions.openSales,
        primaryHref: "/sales",
        secondaryHref: "/reports/sales",
      }}
    />
  );
}
