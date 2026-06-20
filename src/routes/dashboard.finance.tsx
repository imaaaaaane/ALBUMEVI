import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DollarSign, FileWarning, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getFinanceSummary, listOrders } from "@/lib/admin.functions";
import { OrderActions } from "@/components/order-actions";

export const Route = createFileRoute("/dashboard/finance")({
  component: Accounting,
});

const fmt = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

function TxStatusBadge({ status }: { status: string }) {
  const isPaid = status === "Completed";
  return isPaid ? (
    <Badge variant="outline" className="border-border bg-transparent text-muted-foreground">
      Paid
    </Badge>
  ) : (
    <Badge className="border-transparent bg-primary text-primary-foreground hover:bg-primary/90">
      Pending
    </Badge>
  );
}

function Accounting() {
  const fetchSummary = useServerFn(getFinanceSummary);
  const fetchOrders = useServerFn(listOrders);
  const { data, isLoading } = useQuery({
    queryKey: ["finance"],
    queryFn: () => fetchSummary(),
  });
  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: () => fetchOrders(),
  });

  const totalRevenue = data?.totalRevenue ?? 0;
  const pendingInvoices = orders.filter((o: any) => o.order_status !== "Completed").length;
  const completedOrders = orders.filter((o: any) => o.order_status === "Completed").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Accounting</h1>
        <p className="text-sm text-muted-foreground">
          Financial overview and recent school transactions.
        </p>
      </div>

      {/* Top metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Total Revenue
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-bold">{isLoading ? "…" : fmt(totalRevenue)}</div>
          <div className="mt-1 text-xs text-muted-foreground">Across all orders</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Pending Invoices
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
              <FileWarning className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-bold">{pendingInvoices}</div>
          <div className="mt-1 text-xs text-muted-foreground">Awaiting payment</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Completed Orders
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-bold">{completedOrders}</div>
          <div className="mt-1 text-xs text-muted-foreground">Successfully fulfilled</div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-semibold">Recent Transactions</h2>
            <p className="text-xs text-muted-foreground">Live feed of school order submissions.</p>
          </div>
          <Badge className="border-transparent bg-primary/15 text-primary hover:bg-primary/20">
            {orders.length} Total
          </Badge>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">School Name</TableHead>
              <TableHead className="text-muted-foreground">Ordered Items</TableHead>
              <TableHead className="text-right text-muted-foreground">Amount</TableHead>
              <TableHead className="text-muted-foreground">Date</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-right text-muted-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No transactions yet.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((o: any) => (
                <TableRow key={o.id} className="border-border">
                  <TableCell className="font-medium">{o.school_name}</TableCell>
                  <TableCell>
                    {o.package_name}
                    <span className="text-muted-foreground"> × {o.quantity}</span>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {fmt(Number(o.total_price))}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(o.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <TxStatusBadge status={o.order_status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <OrderActions orderId={o.id} status={o.order_status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
