import { Badge } from "@/components/ui/badge";

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "destructive"; className: string }
> = {
  registered: {
    label: "Registered",
    variant: "default" as const,
    className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  },
  in_progress: {
    label: "In Progress",
    variant: "default" as const,
    className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  },
  ready: {
    label: "Ready",
    variant: "default" as const,
    className: "bg-green-100 text-green-800 hover:bg-green-100",
  },
  delivered: {
    label: "Delivered",
    variant: "default" as const,
    className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  },
  cancelled: {
    label: "Cancelled",
    variant: "destructive" as const,
    className: "",
  },
};

interface PrintOrderStatusBadgeProps {
  status: string;
}

export function PrintOrderStatusBadge({ status }: PrintOrderStatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    variant: "default" as const,
    className: "",
  };

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}
