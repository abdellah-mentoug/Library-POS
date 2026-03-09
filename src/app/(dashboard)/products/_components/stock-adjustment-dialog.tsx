"use client";

import { useState, useTransition } from "react";
import { adjustStock } from "@/lib/actions/stock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useTranslations } from "@/lib/i18n/use-translations";

interface StockAdjustmentDialogProps {
  productId: string;
  productName: string;
  currentStock: number;
  trigger: React.ReactNode;
}

export function StockAdjustmentDialog({
  productId,
  productName,
  currentStock,
  trigger,
}: StockAdjustmentDialogProps) {
  const t = useTranslations("products");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const reason = formData.get("reason") as string;
    const quantity = parseInt(formData.get("quantity") as string, 10);
    const notes = (formData.get("notes") as string) || undefined;

    if (!reason || isNaN(quantity) || quantity === 0) {
      setError("Please enter a valid quantity and reason");
      return;
    }

    const change =
      reason === "adjustment_remove" || reason === "damaged"
        ? -Math.abs(quantity)
        : Math.abs(quantity);

    startTransition(async () => {
      const result = await adjustStock(productId, change, reason, notes);
      if (result && "error" in result && result.error) {
        setError(result.error as string);
      } else {
        toast.success(t.stockAdjusted);
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.adjustStock}: {productName}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {t.currentStock}: <strong>{currentStock}</strong>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">{t.reason}</Label>
            <Select name="reason" required>
              <SelectTrigger>
                <SelectValue placeholder={t.reason} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="adjustment_add">{t.adjustmentAdd}</SelectItem>
                <SelectItem value="adjustment_remove">{t.adjustmentRemove}</SelectItem>
                <SelectItem value="stocktake">{t.stocktake}</SelectItem>
                <SelectItem value="return">{t.returnStock}</SelectItem>
                <SelectItem value="damaged">{t.damaged}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">{t.quantity} *</Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              min="1"
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{tc.notes}</Label>
            <Textarea id="notes" name="notes" disabled={isPending} />
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? tc.processing : t.adjustStock}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
