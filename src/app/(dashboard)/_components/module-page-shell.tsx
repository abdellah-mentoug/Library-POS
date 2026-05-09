import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Stat = {
  label: string;
  value: string;
};

type Row = {
  name: string;
  status: string;
  amount: string;
};

interface ModulePageShellProps {
  title: string;
  description: string;
  badge: string;
  hint: string;
  stats: Stat[];
  tableTitle: string;
  tableColumns: {
    name: string;
    status: string;
    amount: string;
  };
  tableRows: Row[];
  actions: {
    primaryLabel: string;
    secondaryLabel: string;
    primaryHref: string;
    secondaryHref: string;
  };
}

export function ModulePageShell({
  title,
  description,
  badge,
  hint,
  stats,
  tableTitle,
  tableColumns,
  tableRows,
  actions,
}: ModulePageShellProps) {
  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <Card className="border-[#d9c7a3] bg-gradient-to-br from-[#fffdf8] via-[#fbf6ed] to-[#f5eee1] dark:border-border dark:from-card dark:via-card dark:to-card">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-[#2f4f3f] text-[#f8f1e4] hover:bg-[#2f4f3f]/90">
              {badge}
            </Badge>
            <span className="inline-flex items-center gap-1 text-xs text-[#6e5a3c] dark:text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              {hint}
            </span>
          </div>
          <div>
            <CardTitle className="text-3xl font-bold tracking-tight text-[#2b2417] dark:text-foreground">
              {title}
            </CardTitle>
            <p className="mt-1 text-sm text-[#5e513b] dark:text-muted-foreground">
              {description}
            </p>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-[#d7c19a]/25"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-[#2f4f3f] dark:text-foreground">
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>{tableTitle}</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              className="transition-all duration-200 hover:bg-[#f4ebdc] hover:text-[#3f3422]"
            >
              <Link href={actions.secondaryHref}>{actions.secondaryLabel}</Link>
            </Button>
            <Button
              asChild
              className="bg-[#2f4f3f] text-[#f8f1e4] transition-all duration-200 hover:bg-[#243d30]"
            >
              <Link href={actions.primaryHref}>
                {actions.primaryLabel}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tableColumns.name}</TableHead>
                <TableHead>{tableColumns.status}</TableHead>
                <TableHead className="text-right">{tableColumns.amount}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableRows.map((row) => (
                <TableRow
                  key={row.name}
                  className="transition-colors duration-200 hover:bg-[#f7f1e6]/70 dark:hover:bg-muted/50"
                >
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-[#efe2c9] text-[#4f3f28]">
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{row.amount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
