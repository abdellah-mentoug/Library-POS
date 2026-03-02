import { getAuthUser } from "@/lib/auth";
import { getPrintOrder } from "@/lib/actions/print-orders";
import {
  formatCurrency,
  formatPrintOrderNumber,
  formatDate,
  formatDateTime,
} from "@/lib/utils/format";
import { PrintOrderStatusBadge } from "../_components/status-badge";
import { StatusUpdateDialog } from "../_components/status-update-dialog";
import { PrintOrderDetailClient } from "../_components/print-order-detail-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Play,
  CheckCircle,
  Truck,
  XCircle,
} from "lucide-react";
import Link from "next/link";

interface PrintOrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PrintOrderDetailPage({
  params,
}: PrintOrderDetailPageProps) {
  const { id } = await params;
  const user = await getAuthUser();
  const order = await getPrintOrder(id);

  const isAdmin = user.role === "admin";
  const status = order.status as string;
  const filePaths: string[] = order.file_paths ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/print-orders">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">
              {formatPrintOrderNumber(order.order_number)}
            </h1>
            <PrintOrderStatusBadge status={status} />
            {order.is_paid ? (
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                Paid
              </Badge>
            ) : (
              <Badge variant="outline">Unpaid</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Created {formatDateTime(order.created_at)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Order Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">{order.customer_name}</p>
                  {order.customer_phone && (
                    <p className="text-sm text-muted-foreground">
                      {order.customer_phone}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Service Type</p>
                  <Badge variant="secondary" className="mt-1">
                    {(order.service_type as string).charAt(0).toUpperCase() +
                      (order.service_type as string).slice(1)}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="mt-1 whitespace-pre-wrap">{order.description}</p>
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Quantity</p>
                  <p className="text-lg font-semibold">{order.quantity}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Unit Price</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(order.unit_price)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Price</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(order.total_price)}
                  </p>
                </div>
              </div>

              {order.due_date && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Due Date</p>
                    <p className="font-medium">{formatDate(order.due_date)}</p>
                  </div>
                </>
              )}

              {order.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="mt-1 whitespace-pre-wrap">{order.notes}</p>
                  </div>
                </>
              )}

              {order.completed_at && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Completed At</p>
                    <p className="font-medium">
                      {formatDateTime(order.completed_at)}
                    </p>
                  </div>
                </>
              )}

              {order.delivered_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Delivered At</p>
                  <p className="font-medium">
                    {formatDateTime(order.delivered_at)}
                  </p>
                </div>
              )}

              {order.linked_sale_id && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Linked Sale</p>
                    <Button variant="link" className="h-auto p-0" asChild>
                      <Link href={`/sales/${order.linked_sale_id}`}>
                        View Sale Record
                      </Link>
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Files Section */}
          <Card>
            <CardHeader>
              <CardTitle>Attached Files</CardTitle>
            </CardHeader>
            <CardContent>
              <PrintOrderDetailClient
                orderId={order.id}
                filePaths={filePaths}
                isAdmin={isAdmin}
              />
            </CardContent>
          </Card>
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Status transitions */}
              {status === "registered" && (
                <>
                  <StatusUpdateDialog
                    orderId={order.id}
                    currentStatus={status}
                    newStatus="in_progress"
                    trigger={
                      <Button className="w-full" variant="default">
                        <Play className="mr-2 h-4 w-4" />
                        Start Processing
                      </Button>
                    }
                  />
                  <StatusUpdateDialog
                    orderId={order.id}
                    currentStatus={status}
                    newStatus="cancelled"
                    trigger={
                      <Button className="w-full" variant="destructive">
                        <XCircle className="mr-2 h-4 w-4" />
                        Cancel Order
                      </Button>
                    }
                  />
                </>
              )}

              {status === "in_progress" && (
                <>
                  <StatusUpdateDialog
                    orderId={order.id}
                    currentStatus={status}
                    newStatus="ready"
                    trigger={
                      <Button className="w-full" variant="default">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Mark Ready
                      </Button>
                    }
                  />
                  <StatusUpdateDialog
                    orderId={order.id}
                    currentStatus={status}
                    newStatus="cancelled"
                    trigger={
                      <Button className="w-full" variant="destructive">
                        <XCircle className="mr-2 h-4 w-4" />
                        Cancel Order
                      </Button>
                    }
                  />
                </>
              )}

              {status === "ready" && (
                <>
                  <StatusUpdateDialog
                    orderId={order.id}
                    currentStatus={status}
                    newStatus="delivered"
                    trigger={
                      <Button className="w-full" variant="default">
                        <Truck className="mr-2 h-4 w-4" />
                        Mark Delivered
                      </Button>
                    }
                  />
                  <StatusUpdateDialog
                    orderId={order.id}
                    currentStatus={status}
                    newStatus="cancelled"
                    trigger={
                      <Button className="w-full" variant="destructive">
                        <XCircle className="mr-2 h-4 w-4" />
                        Cancel Order
                      </Button>
                    }
                  />
                </>
              )}

              {status === "delivered" && (
                <p className="text-center text-sm text-muted-foreground">
                  This order has been delivered.
                </p>
              )}

              {status === "cancelled" && (
                <p className="text-center text-sm text-muted-foreground">
                  This order has been cancelled.
                </p>
              )}

              {/* Payment button */}
              {!order.is_paid &&
                (status === "ready" || status === "delivered") && (
                  <>
                    <Separator />
                    <PaymentSection orderId={order.id} total={order.total_price} />
                  </>
                )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Client component for payment — needs to be in a separate file or inline
// We'll make a small inline server-rendered section that delegates to a client component
function PaymentSection({ orderId, total }: { orderId: string; total: number }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">Collect Payment</p>
      <p className="mb-3 text-center text-2xl font-bold">
        {formatCurrency(total)}
      </p>
      <PaymentButton orderId={orderId} />
    </div>
  );
}

// This needs to be a client component — let's import it
import { PaymentButton } from "../_components/payment-button";
