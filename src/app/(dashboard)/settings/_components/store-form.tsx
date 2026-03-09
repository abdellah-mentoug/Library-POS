"use client";

import { STORE_CONFIG } from "@/lib/utils/constants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "@/lib/i18n/use-translations";

export function StoreForm() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.storeConfig}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t.storeName}</Label>
              <Input value={STORE_CONFIG.name} readOnly />
            </div>
            <div className="space-y-2">
              <Label>{t.currency}</Label>
              <Input
                value={`${STORE_CONFIG.currency} (${STORE_CONFIG.currencySymbol.trim()})`}
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label>{t.address}</Label>
              <Input value={STORE_CONFIG.address} readOnly />
            </div>
            <div className="space-y-2">
              <Label>{t.phone}</Label>
              <Input
                value={STORE_CONFIG.phone || tc.notSet}
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label>{t.taxId}</Label>
              <Input
                value={STORE_CONFIG.taxId || tc.notSet}
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label>{t.defaultTaxRate}</Label>
              <Input value={`${STORE_CONFIG.defaultTaxRate}%`} readOnly />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t.receiptFooter}</Label>
            <Textarea value={STORE_CONFIG.receiptFooter} readOnly />
          </div>

          <div className="space-y-2">
            <Label>{t.receiptDisclaimer}</Label>
            <Textarea value={STORE_CONFIG.receiptDisclaimer} readOnly />
          </div>

          <p className="text-sm text-muted-foreground">
            {t.configEditNote}{" "}
            <code className="rounded bg-muted px-1 py-0.5">
              src/lib/utils/constants.ts
            </code>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
