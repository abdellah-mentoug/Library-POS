"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { receivePurchaseOrder } from "@/lib/actions/purchases";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface PurchaseItem {
  id: string;
  product_id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  products: { id: string; name: string; barcode: string | null; stock_quantity: number } | null;
}

interface ReceiveFormProps {
  poId: string;
  items: PurchaseItem[];
}

export function ReceiveForm({ poId, items }: ReceiveFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    items.forEach((item) => {
      init[item.id] = 0;
    });
    return init;
  });

  const remaining = (item: PurchaseItem) =>
    item.quantity_ordered - item.quantity_received;

  function fillAll() {
    const filled: Record<string, number> = {};
    items.forEach((item) => {
      filled[item.id] = remaining(item);
    });
    setQuantities(filled);
  }

  function clearAll() {
    const cleared: Record<string, number> = {};
    items.forEach((item) => {
      cleared[item.id] = 0;
    });
    setQuantities(cleared);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const receivedItems = items
      .filter((item) => (quantities[item.id] || 0) > 0)
      .map((item) => ({
        purchase_item_id: item.id,
        product_id: item.product_id,
        quantity_to_receive: quantities[item.id],
      }));

    if (receivedItems.length === 0) {
      setError("Enter quantity for at least one item");
      return;
    }

    startTransition(async () => {
      const result = await receivePurchaseOrder(poId, receivedItems);

      if (result && "error" in result && result.error) {
        setError(result.error as string);
      } else if (result && "itemsReceived" in result) {
        toast.success(`Stock received for ${result.itemsReceived} item(s)`);
        router.push(`/purchases/${poId}`);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Items to Receive</CardTitle>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={fillAll}>
              Fill All
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearAll}
            >
              Clear All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-center">Ordered</TableHead>
                <TableHead className="text-center">Received</TableHead>
                <TableHead className="text-center">Remaining</TableHead>
                <TableHead className="text-center">Receive Now</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const rem = remaining(item);
                const fullyReceived = rem === 0;
                return (
                  <TableRow
                    key={item.id}
                    className={fullyReceived ? "opacity-50" : ""}
                  >
                    <TableCell className="font-medium">
                      {item.products?.name || "Unknown Product"}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.quantity_ordered}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.quantity_received}
                    </TableCell>
                    <TableCell className="text-center">{rem}</TableCell>
                    <TableCell className="text-center">
                      {fullyReceived ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <Input
                          type="number"
                          min={0}
                          max={rem}
                          value={quantities[item.id] || 0}
                          onChange={(e) =>
                            setQuantities({
                              ...quantities,
                              [item.id]: Math.min(
                                parseInt(e.target.value) || 0,
                                rem
                              ),
                            })
                          }
                          className="mx-auto w-20 text-center"
                          disabled={isPending}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {fullyReceived ? (
                        <Badge className="bg-green-100 text-green-800">
                          Complete
                        </Badge>
                      ) : item.quantity_received > 0 ? (
                        <Badge className="bg-orange-100 text-orange-800">
                          Partial
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {error && (
            <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Receiving..." : "Receive Stock"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/purchases/${poId}`)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
