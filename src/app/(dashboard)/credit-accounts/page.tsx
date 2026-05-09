import { getLocale } from "@/lib/i18n/get-locale";
import { messages } from "@/lib/i18n/translations";
import { ModulePageShell } from "../_components/module-page-shell";

export default async function CreditAccountsPage() {
  const locale = await getLocale();
  const t = (messages[locale] as Record<string, any>).creditAccounts as {
    title: string;
    description: string;
    badge: string;
    hint: string;
    stats: { activeAccounts: string; openBalance: string; overdue: string };
    table: { title: string; columns: { name: string; status: string; amount: string } };
    status: { review: string; active: string; pending: string };
    actions: { newAccount: string; viewCustomers: string };
  };

  return (
    <ModulePageShell
      title={t.title}
      description={t.description}
      badge={t.badge}
      hint={t.hint}
      stats={[
        { label: t.stats.activeAccounts, value: "24" },
        { label: t.stats.openBalance, value: "€4,820" },
        { label: t.stats.overdue, value: "3" },
      ]}
      tableTitle={t.table.title}
      tableColumns={t.table.columns}
      tableRows={[
        { name: "North Campus", status: t.status.review, amount: "€1,240" },
        { name: "Book Club West", status: t.status.active, amount: "€760" },
        { name: "School Account A3", status: t.status.pending, amount: "€2,120" },
      ]}
      actions={{
        primaryLabel: t.actions.newAccount,
        secondaryLabel: t.actions.viewCustomers,
        primaryHref: "/customers/new",
        secondaryHref: "/customers",
      }}
    />
  );
}
