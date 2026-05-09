import { getLocale } from "@/lib/i18n/get-locale";
import { messages } from "@/lib/i18n/translations";
import { ModulePageShell } from "../_components/module-page-shell";

export default async function QuotesPage() {
  const locale = await getLocale();
  const t = (messages[locale] as Record<string, any>).quotes as {
    title: string;
    description: string;
    badge: string;
    hint: string;
    stats: { activeQuotes: string; conversionRate: string; expiringSoon: string };
    table: { title: string; columns: { name: string; status: string; amount: string } };
    status: { draft: string; sent: string; approved: string };
    actions: { newQuote: string; openCustomers: string };
  };

  return (
    <ModulePageShell
      title={t.title}
      description={t.description}
      badge={t.badge}
      hint={t.hint}
      stats={[
        { label: t.stats.activeQuotes, value: "18" },
        { label: t.stats.conversionRate, value: "42%" },
        { label: t.stats.expiringSoon, value: "5" },
      ]}
      tableTitle={t.table.title}
      tableColumns={t.table.columns}
      tableRows={[
        { name: "Q-2026-118", status: t.status.draft, amount: "€390" },
        { name: "Q-2026-119", status: t.status.sent, amount: "€1,080" },
        { name: "Q-2026-120", status: t.status.approved, amount: "€650" },
      ]}
      actions={{
        primaryLabel: t.actions.newQuote,
        secondaryLabel: t.actions.openCustomers,
        primaryHref: "/customers",
        secondaryHref: "/reports",
      }}
    />
  );
}
