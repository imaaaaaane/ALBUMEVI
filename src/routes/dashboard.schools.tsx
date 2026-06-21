import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  Plus,
  Link2,
  Copy,
  Loader2,
  School as SchoolIcon,
  Package,
  FileWarning,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { addSchool, listSchools, listOrders, getFinanceSummary } from "@/lib/admin.functions";
import { OrderActions } from "@/components/order-actions";

export const Route = createFileRoute("/dashboard/schools")({
  component: ManageSchools,
});

function ManageSchools() {
  const fetchList = useServerFn(listSchools);
  const fetchOrders = useServerFn(listOrders);
  const fetchFinance = useServerFn(getFinanceSummary);
  const createSchool = useServerFn(addSchool);
  const qc = useQueryClient();

  const { data: schools = [], isLoading } = useQuery({
    queryKey: ["schools"],
    queryFn: () => fetchList(),
  });
  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: () => fetchOrders(),
  });
  const { data: finance } = useQuery({
    queryKey: ["finance"],
    queryFn: () => fetchFinance(),
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", city: "", login_username: "", password: "" });

  // Listen for sidebar "Add New School" trigger
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("albumevi:add-school", handler);
    return () => window.removeEventListener("albumevi:add-school", handler);
  }, []);

  const m = useMutation({
    mutationFn: createSchool,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schools"] });
      qc.invalidateQueries({ queryKey: ["finance"] });
      setOpen(false);
      setForm({ name: "", city: "", login_username: "", password: "" });
      toast.success("School added with unique link");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const activeOrders = orders.filter((o: any) => o.order_status !== "Completed").length;
  const pendingInvoices = (finance?.invoices ?? []).filter((i) => i.balance_due > 0).length;

  const stats = [
    {
      label: "Total Schools",
      value: schools.length,
      icon: SchoolIcon,
      hint: "Registered partners",
    },
    { label: "Active Orders", value: activeOrders, icon: Package, hint: "Not yet completed" },
    {
      label: "Pending Invoices",
      value: pendingInvoices,
      icon: FileWarning,
      hint: "Schools with balance due",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manage Schools</h1>
          <p className="text-sm text-muted-foreground">
            Registered schools and their unique ordering links.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" /> Add New School
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a school</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>School name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Greenfield Elementary"
                />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Jakarta"
                />
              </div>
              <div className="space-y-2">
                <Label>Login username</Label>
                <Input
                  value={form.login_username}
                  onChange={(e) => setForm({ ...form, login_username: e.target.value })}
                  placeholder="greenfield"
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="At least 6 characters"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => m.mutate({ data: form })}
                disabled={
                  m.isPending || !form.name || !form.login_username || form.password.length < 6
                }
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {m.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate & Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 3-column summary grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                {s.label}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
                <s.icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-bold">{s.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{s.hint}</div>
          </div>
        ))}
      </div>

      {/* Recent orders / pending review */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-semibold">Recent Orders</h2>
            <p className="text-xs text-muted-foreground">
              New school selections appear here automatically.
            </p>
          </div>
          <Badge className="border-transparent bg-primary/15 text-primary hover:bg-primary/20">
            {orders.filter((o: any) => o.order_status === "Pending").length} Pending Review
          </Badge>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">School</TableHead>
              <TableHead className="text-muted-foreground">Package</TableHead>
              <TableHead className="text-right text-muted-foreground">Qty</TableHead>
              <TableHead className="text-right text-muted-foreground">Total</TableHead>
              <TableHead className="text-muted-foreground">Submitted</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-right text-muted-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No orders submitted yet.
                </TableCell>
              </TableRow>
            ) : (
              orders.slice(0, 8).map((o: any) => {
                const isPending = o.order_status === "Pending";
                return (
                  <TableRow key={o.id} className="border-border">
                    <TableCell className="font-medium">{o.school_name}</TableCell>
                    <TableCell>{o.package_name}</TableCell>
                    <TableCell className="text-right">{o.quantity}</TableCell>
                    <TableCell className="text-right">
                      ${Number(o.total_price).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(o.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          o.order_status === "Completed"
                            ? "border-transparent bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20"
                            : isPending
                              ? "border-transparent bg-primary/20 text-primary hover:bg-primary/25"
                              : "border-transparent bg-amber-500/15 text-amber-400 hover:bg-amber-500/20"
                        }
                      >
                        {isPending ? "Pending Review" : o.order_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <OrderActions orderId={o.id} status={o.order_status} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Schools table */}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-semibold">All schools</h2>
            <p className="text-xs text-muted-foreground">Click a link to copy it to clipboard.</p>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">School</TableHead>
              <TableHead className="text-muted-foreground">City</TableHead>
              <TableHead className="text-muted-foreground">Username</TableHead>
              <TableHead className="text-muted-foreground">Unique Link</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Loading…
                </TableCell>
              </TableRow>
            ) : schools.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No schools yet. Add your first one.
                </TableCell>
              </TableRow>
            ) : (
              schools.map((s) => {
                const link = `${origin}/school/${s.unique_link_slug}`;
                return (
                  <TableRow key={s.id} className="border-border">
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.city || "—"}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {s.login_username}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(link);
                          toast.success("Link copied");
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/60 px-2 py-1 text-xs hover:border-primary/60 hover:text-primary"
                      >
                        <Link2 className="h-3 w-3" />
                        /school/{s.unique_link_slug}
                        <Copy className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge className="border-transparent bg-primary/15 text-primary hover:bg-primary/20">
                        Active
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Info / how-it-works footer card */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Info className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold">How school links work</h3>
            <p className="text-sm text-muted-foreground">
              Each school gets a unique ordering URL of the form
              <span className="mx-1 rounded bg-background/60 px-1.5 py-0.5 font-mono text-xs text-foreground">
                /school/&lt;slug&gt;
              </span>
              that you can share with their administrators. Schools sign in with their username &
              password to browse packages, place orders, and download invoices. All data flows back
              into the Orders and Finance dashboards in real time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
