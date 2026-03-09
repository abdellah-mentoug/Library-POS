"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "@/lib/i18n/use-translations";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const tc = useTranslations("common");
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <h2 className="text-xl font-semibold">{tc.somethingWentWrong}</h2>
      <p className="text-muted-foreground">
        {error.message || tc.unexpectedError}
      </p>
      <Button onClick={reset}>{tc.tryAgain}</Button>
    </div>
  );
}
