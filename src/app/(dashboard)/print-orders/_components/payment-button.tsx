"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { convertPrintOrderToSale } from "@/lib/actions/print-orders";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";

interface PaymentButtonProps {
  orderId: string;
}

export function PaymentButton({ orderId }: PaymentButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "card" | "transfer"
  >("cash");

  function handleCollectPayment() {
    startTransition(async () => {
      try {
        const result = await convertPrintOrderToSale(orderId, paymentMethod);
        toast.success(`Payment collected! Sale #${result.saleNumber}`);
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to collect payment"
        );
      }
    });
  }

  return (
    <div className="space-y-2">
      <Select
        value={paymentMethod}
        onValueChange={(v) =>
          setPaymentMethod(v as "cash" | "card" | "transfer")
        }
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="cash">Cash</SelectItem>
          <SelectItem value="card">Card</SelectItem>
          <SelectItem value="transfer">Transfer</SelectItem>
        </SelectContent>
      </Select>
      <Button
        className="w-full"
        onClick={handleCollectPayment}
        disabled={isPending}
      >
        <CreditCard className="mr-2 h-4 w-4" />
        {isPending ? "Processing..." : "Collect Payment"}
      </Button>
    </div>
  );
}
