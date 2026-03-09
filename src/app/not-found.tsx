import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getTranslations } from "@/lib/i18n/t-server";

export default async function NotFound() {
  const tc = await getTranslations("common");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="text-xl text-muted-foreground">{tc.pageNotFound}</p>
      <Button asChild>
        <Link href="/">{tc.backToDashboard}</Link>
      </Button>
    </div>
  );
}
