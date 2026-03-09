"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPrintOrder } from "@/lib/actions/print-orders";
import { PrintOrderSchema } from "@/lib/utils/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/i18n/use-translations";
import { interpolate } from "@/lib/i18n/locales";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

interface PrintOrderFormProps {
  customers: Customer[];
}

export function PrintOrderForm({ customers }: PrintOrderFormProps) {
  const t = useTranslations("printOrders");
  const tc = useTranslations("common");

  const SERVICE_TYPES = [
    { value: "printing", label: t.printing },
    { value: "copying", label: t.copying },
    { value: "binding", label: t.binding },
    { value: "laminating", label: t.laminating },
    { value: "scanning", label: t.scanning },
    { value: "other", label: t.other },
  ] as const;
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Customer selection
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null
  );
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Form fields
  const [serviceType, setServiceType] = useState<string>("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [totalOverridden, setTotalOverridden] = useState(false);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [notes, setNotes] = useState("");

  // Auto-calculate total unless overridden
  useEffect(() => {
    if (!totalOverridden) {
      setTotalPrice(quantity * unitPrice);
    }
  }, [quantity, unitPrice, totalOverridden]);

  // When selecting an existing customer, fill in name + phone
  function handleCustomerSelect(customerId: string) {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      setSelectedCustomerId(customer.id);
      setCustomerName(customer.name);
      setCustomerPhone(customer.phone || "");
    }
    setCustomerOpen(false);
  }

  // Reset customer fields when toggling between new/existing
  function handleNewCustomerToggle(checked: boolean) {
    setIsNewCustomer(checked);
    setSelectedCustomerId(null);
    setCustomerName("");
    setCustomerPhone("");
  }

  function handleTotalChange(value: string) {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      setTotalPrice(num);
      setTotalOverridden(true);
    } else if (value === "") {
      setTotalPrice(0);
      setTotalOverridden(false);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const input = {
      customer_name: customerName,
      customer_phone: customerPhone || undefined,
      customer_id: isNewCustomer ? null : selectedCustomerId,
      service_type: serviceType as
        | "printing"
        | "copying"
        | "binding"
        | "laminating"
        | "scanning"
        | "other",
      description,
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      notes: notes || undefined,
      due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : undefined,
    };

    const parsed = PrintOrderSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    startTransition(async () => {
      try {
        const result = await createPrintOrder(input);

        if (result && "error" in result) {
          setError(String(result.error));
        } else {
          toast.success(
            interpolate(t.orderCreated, { number: result.orderNumber })
          );
          router.push("/print-orders");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t.createFailed
        );
      }
    });
  }

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.createOrder}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Label className="text-base font-semibold">{t.customer}</Label>
              <div className="flex items-center gap-2">
                <Switch
                  id="new-customer"
                  checked={isNewCustomer}
                  onCheckedChange={handleNewCustomerToggle}
                  disabled={isPending}
                />
                <Label htmlFor="new-customer" className="text-sm font-normal">
                  {t.newCustomer}
                </Label>
              </div>
            </div>

            {isNewCustomer ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="customer_name">{t.customerName}</Label>
                  <Input
                    id="customer_name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={t.customerNamePlaceholder}
                    required
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_phone">{t.customerPhone}</Label>
                  <Input
                    id="customer_phone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder={t.customerPhonePlaceholder}
                    disabled={isPending}
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t.selectCustomer}</Label>
                  <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={customerOpen}
                        className="w-full justify-between"
                        disabled={isPending}
                        type="button"
                      >
                        {selectedCustomer
                          ? selectedCustomer.name
                          : t.searchCustomers}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput placeholder={t.searchCustomers} />
                        <CommandList>
                          <CommandEmpty>{t.noCustomerFound}</CommandEmpty>
                          <CommandGroup>
                            {customers.map((customer) => (
                              <CommandItem
                                key={customer.id}
                                value={customer.name}
                                onSelect={() =>
                                  handleCustomerSelect(customer.id)
                                }
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedCustomerId === customer.id
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span>{customer.name}</span>
                                  {customer.phone && (
                                    <span className="text-xs text-muted-foreground">
                                      {customer.phone}
                                    </span>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                {selectedCustomer && (
                  <div className="space-y-2">
                    <Label>{t.customerPhone}</Label>
                    <Input
                      value={customerPhone}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Service Details */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="service_type">{t.serviceType}</Label>
              <Select
                value={serviceType}
                onValueChange={setServiceType}
                disabled={isPending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t.selectServiceType} />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t.dueDate}</Label>
              <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                    disabled={isPending}
                    type="button"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "MMM dd, yyyy") : t.pickDate}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={(day) => {
                      setDueDate(day);
                      setDueDateOpen(false);
                    }}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t.description}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.descriptionPlaceholder}
              required
              disabled={isPending}
              rows={3}
            />
          </div>

          {/* Pricing */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="quantity">{t.quantity}</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit_price">{t.unitPrice}</Label>
              <Input
                id="unit_price"
                type="number"
                step="0.01"
                min={0}
                value={unitPrice}
                onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_price">{t.totalPrice}</Label>
              <Input
                id="total_price"
                type="number"
                step="0.01"
                min={0}
                value={totalPrice}
                onChange={(e) => handleTotalChange(e.target.value)}
                disabled={isPending}
              />
              {totalOverridden && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline"
                  onClick={() => {
                    setTotalOverridden(false);
                    setTotalPrice(quantity * unitPrice);
                  }}
                >
                  {t.resetAutoCalc}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t.notes}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.notesPlaceholder}
              disabled={isPending}
              rows={2}
            />
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? tc.creating : t.createOrder}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/print-orders")}
            >
              {tc.cancel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
