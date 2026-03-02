"use client";

import { useCartStore, useCartTotals } from "@/lib/store/cart-store";
import { formatCurrency } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react";

interface CartProps {
  onCheckout: () => void;
}

export function Cart({ onCheckout }: CartProps) {
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const setItemDiscount = useCartStore((s) => s.setItemDiscount);
  const discountType = useCartStore((s) => s.discountType);
  const discountValue = useCartStore((s) => s.discountValue);
  const setCartDiscount = useCartStore((s) => s.setCartDiscount);
  const notes = useCartStore((s) => s.notes);
  const setNotes = useCartStore((s) => s.setNotes);
  const clearCart = useCartStore((s) => s.clearCart);

  const { subtotal, taxTotal, cartDiscount, total, itemCount } =
    useCartTotals();

  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <ShoppingCart className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">
          Scan a barcode or search for a product to start
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold">
          Cart ({itemCount} item{itemCount !== 1 ? "s" : ""})
        </h3>
        <Button variant="ghost" size="sm" onClick={clearCart}>
          Clear
        </Button>
      </div>

      {/* Cart items */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        {items.map((item) => (
          <div
            key={item.productId}
            className="rounded-lg border p-3 space-y-2"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium line-clamp-2 flex-1">
                {item.name}
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive shrink-0"
                onClick={() => removeItem(item.productId)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() =>
                    updateQuantity(
                      item.productId,
                      Math.max(1, item.quantity - 1)
                    )
                  }
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center text-sm font-medium">
                  {item.quantity}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() =>
                    updateQuantity(item.productId, item.quantity + 1)
                  }
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(item.unitPrice)} each
                </p>
                <p className="text-sm font-semibold">
                  {formatCurrency(item.lineTotal)}
                </p>
              </div>
            </div>

            {/* Per-item discount */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Discount:</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                className="h-7 w-24 text-xs"
                placeholder="0.00"
                value={item.discountAmount || ""}
                onChange={(e) =>
                  setItemDiscount(
                    item.productId,
                    parseFloat(e.target.value) || 0
                  )
                }
              />
            </div>
          </div>
        ))}
      </div>

      <Separator className="my-3" />

      {/* Cart discount */}
      <div className="space-y-2">
        <Label className="text-xs">Cart Discount</Label>
        <div className="flex gap-2">
          <Select
            value={discountType || "none"}
            onValueChange={(v) =>
              setCartDiscount(
                v === "none" ? null : (v as "fixed" | "percentage"),
                v === "none" ? 0 : discountValue
              )
            }
          >
            <SelectTrigger className="h-8 w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="fixed">Fixed</SelectItem>
              <SelectItem value="percentage">Percent (%)</SelectItem>
            </SelectContent>
          </Select>
          {discountType && (
            <Input
              type="number"
              min="0"
              step="0.01"
              className="h-8 w-24"
              value={discountValue || ""}
              onChange={(e) =>
                setCartDiscount(discountType, parseFloat(e.target.value) || 0)
              }
            />
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="mt-2 space-y-1">
        <Label className="text-xs">Notes</Label>
        <Textarea
          className="h-16 text-xs"
          placeholder="Optional notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <Separator className="my-3" />

      {/* Totals */}
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {taxTotal > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span>{formatCurrency(taxTotal)}</span>
          </div>
        )}
        {cartDiscount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span>-{formatCurrency(cartDiscount)}</span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>

      <Button className="mt-3 w-full" size="lg" onClick={onCheckout}>
        Charge {formatCurrency(total)}
      </Button>
    </div>
  );
}
