"use client";

import { STORE_CONFIG } from "@/lib/utils/constants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function StoreForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Store Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Store Name</Label>
              <Input value={STORE_CONFIG.name} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input
                value={`${STORE_CONFIG.currency} (${STORE_CONFIG.currencySymbol.trim()})`}
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={STORE_CONFIG.address} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={STORE_CONFIG.phone || "Not set"}
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label>Tax ID</Label>
              <Input
                value={STORE_CONFIG.taxId || "Not set"}
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label>Default Tax Rate</Label>
              <Input value={`${STORE_CONFIG.defaultTaxRate}%`} readOnly />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Receipt Footer</Label>
            <Textarea value={STORE_CONFIG.receiptFooter} readOnly />
          </div>

          <div className="space-y-2">
            <Label>Receipt Disclaimer</Label>
            <Textarea value={STORE_CONFIG.receiptDisclaimer} readOnly />
          </div>

          <p className="text-sm text-muted-foreground">
            To update these values, edit the configuration in{" "}
            <code className="rounded bg-muted px-1 py-0.5">
              src/lib/utils/constants.ts
            </code>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
