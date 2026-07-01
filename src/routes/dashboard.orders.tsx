import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageTransition } from "@/components/page-transition";
import { RefreshCw, CheckCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/dashboard/orders")({
  component: ManageOrders,
});

interface OrderItem {
  id: string;
  client: string;
  schoolName: string;
  status: "Pending" | "Completed";
  date: string;
}

function ManageOrders() {
  const [orders, setOrders] = useState<OrderItem[]>([
    { id: "ORD-001", client: "John Doe", schoolName: "Atatürk Primary School", status: "Pending", date: "2026-06-15" },
    { id: "ORD-002", client: "Jane Smith", schoolName: "Tilmerç Toki Middle School", status: "Completed", date: "2026-06-18" },
    { id: "ORD-003", client: "Ahmet Yılmaz", schoolName: "Batman High School", status: "Pending", date: "2026-06-20" },
    { id: "ORD-004", client: "Fatma Demir", schoolName: "Gazi Elementary School", status: "Completed", date: "2026-06-22" },
    { id: "ORD-005", client: "Mehmet Çelik", schoolName: "Raman Anadolu Lisesi", status: "Pending", date: "2026-06-25" },
  ]);

  const toggleStatus = (id: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === id) {
          return {
            ...o,
            status: o.status === "Pending" ? "Completed" : "Pending",
          };
        }
        return o;
      })
    );
  };

  return (
    <PageTransition className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manage Orders</h1>
          <p className="text-sm text-muted-foreground">
            Monitor client orders, toggle fulfillment status, and export reports.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>School Name</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => (
              <TableRow key={o.id} className="hover:bg-muted/40 transition-colors">
                <TableCell className="font-mono text-xs font-semibold">{o.id}</TableCell>
                <TableCell className="font-medium">{o.client}</TableCell>
                <TableCell>{o.schoolName}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{o.date}</TableCell>
                <TableCell>
                  <Badge
                    variant={o.status === "Completed" ? "default" : "outline"}
                    className={
                      o.status === "Completed"
                        ? "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/10"
                        : "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/10"
                    }
                  >
                    <span className="flex items-center gap-1.5">
                      {o.status === "Completed" ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <Clock className="h-3 w-3" />
                      )}
                      {o.status}
                    </span>
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-block"
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleStatus(o.id)}
                      className="h-8 gap-1.5 border-border hover:border-primary/50 text-xs font-semibold cursor-pointer"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Toggle Status
                    </Button>
                  </motion.div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PageTransition>
  );
}
