"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { voidSale } from "@/lib/actions/sales";
import { useTranslations } from "@/lib/i18n/use-translations";
import { interpolate } from "@/lib/i18n/locales";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface VoidSaleDialogProps {
  saleId: string;
  saleNumber: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VoidSaleDialog({
  saleId,
  saleNumber,
  open,
  onOpenChange,
}: VoidSaleDialogProps) {
  const t = useTranslations("sales");
  const tc = useTranslations("common");
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleVoid() {
    if (!reason.trim()) return;

    startTransition(async () => {
      try {
        await voidSale(saleId, reason);
        toast.success(interpolate(t.saleVoided, { number: saleNumber }));
        onOpenChange(false);
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : t.voidFailed
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{interpolate(t.voidSaleTitle, { number: saleNumber })}</DialogTitle>
          <DialogDescription>
            {t.voidWarning}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">{t.voidReason}</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t.voidReasonPlaceholder}
              disabled={isPending}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {tc.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={handleVoid}
              disabled={isPending || !reason.trim()}
            >
              {isPending ? t.voiding : t.voidSale}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
