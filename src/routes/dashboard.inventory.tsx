import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Package, ImagePlus, Pencil, Upload, DollarSign, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { addInventory, listInventory } from "@/lib/admin.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/inventory")({
  component: Inventory,
});

type SizeTag = "Small" | "Medium" | "Large";

const fallbackProducts: Array<{
  id: string;
  item_name: string;
  unit_price: number;
  stock_count: number;
  size: SizeTag;
}> = [
  {
    id: "PRD-001",
    item_name: "Photo Album 20 pages",
    unit_price: 39,
    stock_count: 220,
    size: "Small",
  },
  {
    id: "PRD-002",
    item_name: "Photo Album 30 pages",
    unit_price: 54,
    stock_count: 180,
    size: "Medium",
  },
  { id: "PRD-003", item_name: "Premium Album", unit_price: 89, stock_count: 75, size: "Large" },
  {
    id: "PRD-004",
    item_name: "Digital Only Pack",
    unit_price: 19,
    stock_count: 999,
    size: "Small",
  },
  { id: "PRD-005", item_name: "Sports Team Pack", unit_price: 49, stock_count: 95, size: "Medium" },
  { id: "PRD-006", item_name: "Yearbook Bundle", unit_price: 119, stock_count: 60, size: "Large" },
];

const sizeFor = (price: number): SizeTag =>
  price < 30 ? "Small" : price < 70 ? "Medium" : "Large";

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Package;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="absolute inset-y-0 left-0 w-1 bg-primary" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function Inventory() {
  const fetchInventory = useServerFn(listInventory);
  const createInventory = useServerFn(addInventory);
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ item_name: "", unit_price: "", stock_count: "" });

  const { data: dbStock = [], isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => fetchInventory(),
  });

  const addMutation = useMutation({
    mutationFn: (input: { item_name: string; unit_price: number; stock_count: number }) =>
      createInventory({ data: input }),
    onSuccess: () => {
      toast.success("Product added");
      qc.invalidateQueries({ queryKey: ["inventory"] });
      setOpen(false);
      setForm({ item_name: "", unit_price: "", stock_count: "" });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to add product"),
  });

  const products = dbStock.length
    ? dbStock.map((s: any, i: number) => ({
        id: `PRD-${String(i + 1).padStart(3, "0")}`,
        item_name: s.item_name,
        unit_price: Number(s.unit_price),
        stock_count: s.stock_count,
        size: sizeFor(Number(s.unit_price)),
      }))
    : fallbackProducts;

  const totalProducts = products.length;
  const avgPrice = totalProducts
    ? (products.reduce((s, p) => s + p.unit_price, 0) / totalProducts).toFixed(2)
    : "0.00";
  const pendingUploads = products.length * 2; // placeholder metric

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(form.unit_price);
    const stock = parseInt(form.stock_count, 10);
    if (!form.item_name.trim() || Number.isNaN(price) || Number.isNaN(stock)) {
      toast.error("Please fill in name, price, and stock");
      return;
    }
    addMutation.mutate({ item_name: form.item_name.trim(), unit_price: price, stock_count: stock });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Product Inventory</h1>
          <p className="text-sm text-muted-foreground">
            Photography packages available to schools.
          </p>
        </div>
        <Button
          onClick={() => setOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" /> Add New Product
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Products" value={String(totalProducts)} icon={Package} />
        <StatCard label="Average Price" value={`$${avgPrice}`} icon={DollarSign} />
        <StatCard label="Pending Uploads" value={String(pendingUploads)} icon={Clock} />
      </div>

      {/* Products grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading ? (
          <div className="col-span-full rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
            Loading products…
          </div>
        ) : (
          <>
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="group flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/60 p-6 text-center transition-colors hover:border-primary/60 hover:bg-card"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                <Package className="h-6 w-6" />
              </div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Plus className="h-4 w-4 text-primary" /> Add New Product
              </div>
              <p className="max-w-[12rem] text-xs text-muted-foreground">
                Create a new photography package
              </p>
            </button>
          </>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>Create a new photography package for schools.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="item_name">Product Name</Label>
              <Input
                id="item_name"
                placeholder="e.g. Premium Album"
                value={form.item_name}
                onChange={(e) => setForm({ ...form, item_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="unit_price">Base Price ($)</Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="49.00"
                  value={form.unit_price}
                  onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock_count">Stock Count</Label>
                <Input
                  id="stock_count"
                  type="number"
                  min="0"
                  placeholder="100"
                  value={form.stock_count}
                  onChange={(e) => setForm({ ...form, stock_count: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addMutation.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {addMutation.isPending ? "Adding…" : "Add Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProductCard({
  product,
}: {
  product: {
    id: string;
    item_name: string;
    unit_price: number;
    stock_count: number;
    size: SizeTag;
  };
}) {
  const sizeClasses: Record<SizeTag, string> = {
    Small: "bg-primary/15 text-primary border-primary/30",
    Medium: "bg-primary/20 text-primary border-primary/40",
    Large: "bg-primary text-primary-foreground border-primary",
  };
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-colors hover:border-primary/40">
      {/* Image slot */}
      <button
        type="button"
        onClick={() => toast.info("Image upload coming soon")}
        className="relative flex h-40 items-center justify-center bg-background/80 transition-colors hover:bg-background"
      >
        <div className="flex flex-col items-center gap-2 text-muted-foreground transition-colors group-hover:text-foreground">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-card">
            <ImagePlus className="h-5 w-5" />
          </div>
          <span className="text-xs font-medium">Upload Image</span>
        </div>
        <Badge
          className={cn(
            "absolute left-3 top-3 border text-[10px] uppercase tracking-wider",
            sizeClasses[product.size],
          )}
        >
          {product.size}
        </Badge>
      </button>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {product.id}
          </p>
          <h3 className="mt-0.5 text-sm font-semibold leading-snug text-foreground">
            {product.item_name}
          </h3>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold text-primary">${product.unit_price.toFixed(2)}</span>
          <span className="text-xs text-muted-foreground">{product.stock_count} in stock</span>
        </div>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-border bg-transparent hover:bg-accent"
            onClick={() => toast.info("Edit coming soon")}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
          </Button>
          <Button
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => toast.info("Upload coming soon")}
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload
          </Button>
        </div>
      </div>
    </div>
  );
}
