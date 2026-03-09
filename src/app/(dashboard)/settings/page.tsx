import { requireAdmin } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Store } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "@/lib/i18n/t-server";

export default async function SettingsPage() {
  await requireAdmin();
  const t = await getTranslations("settings");

  const settingsLinks = [
    {
      title: t.userManagement,
      description: t.userManagementDesc,
      href: "/settings/users",
      icon: Users,
    },
    {
      title: t.storeSettings,
      description: t.storeSettingsDesc,
      href: "/settings/store",
      icon: Store,
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t.title}</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {settingsLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader className="flex flex-row items-center gap-3">
                  <Icon className="h-8 w-8 text-muted-foreground" />
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
