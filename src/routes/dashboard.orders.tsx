import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { listOrders, updateOrderStatus, listInventory } from "@/lib/admin.functions";

export const Route = createFileRoute("/dashboard/orders")({
  component: ManageOrders,
});

const STATUSES = ["Pending", "Processing", "Shipped", "Completed"] as const;

const variant = (s: string) =>
  s === "Completed"
    ? "default"
    : s === "Shipped"
      ? "default"
      : s === "Processing"
        ? "secondary"
        : "outline";

function ManageOrders() {
  const fetchOrders = useServerFn(listOrders);
  const fetchInventory = useServerFn(listInventory);
  const updateStatus = useServerFn(updateOrderStatus);
  const qc = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => fetchOrders(),
  });
  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => fetchInventory(),
  });

  const m = useMutation({
    mutationFn: updateStatus,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Status updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalStock = inventory.reduce((s, i: any) => s + (i.stock_count ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Manage Orders</h1>
          <p className="text-sm text-muted-foreground">
            Update tracking status. Stock totals from inventory.
          </p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-2 text-sm">
          <span className="text-muted-foreground">Total stock remaining: </span>
          <span className="font-semibold">{totalStock.toLocaleString()}</span>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>School</TableHead>
              <TableHead>Package</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Loading…
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No orders yet.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((o: any) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}</TableCell>
                  <TableCell>{o.school_name}</TableCell>
                  <TableCell>{o.package_name}</TableCell>
                  <TableCell className="text-right">{o.quantity}</TableCell>
                  <TableCell className="text-right">
                    ${Number(o.total_price).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={variant(o.order_status) as any}>{o.order_status}</Badge>
                      <Select
                        value={o.order_status}
                        onValueChange={(v) => m.mutate({ data: { id: o.id, status: v as any } })}
                      >
                        <SelectTrigger className="h-7 w-[130px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
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
