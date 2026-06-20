import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Camera,
  Check,
  FileDown,
  Loader2,
  Minus,
  Package,
  Plus,
  ShoppingBag,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createSchoolOrder, getSchoolBySlug } from "@/lib/school.functions";
import { listInventory } from "@/lib/admin.functions";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

export const Route = createFileRoute("/school/$slug")({
  component: SchoolPortal,
});

type SizeTag = "Small" | "Medium" | "Large";
type CatalogItem = {
  id: string;
  name: string;
  price: number;
  size: SizeTag;
};

const FALLBACK_CATALOG: CatalogItem[] = [
  { id: "PRD-001", name: "Photo Album 20 pages", price: 39, size: "Small" },
  { id: "PRD-002", name: "Photo Album 30 pages", price: 54, size: "Medium" },
  { id: "PRD-003", name: "Premium Album", price: 89, size: "Large" },
  { id: "PRD-004", name: "Digital Only Pack", price: 19, size: "Small" },
  { id: "PRD-005", name: "Sports Team Pack", price: 49, size: "Medium" },
  { id: "PRD-006", name: "Yearbook Bundle", price: 119, size: "Large" },
];

const sizeFor = (price: number): SizeTag =>
  price < 30 ? "Small" : price < 70 ? "Medium" : "Large";

function SchoolPortal() {
  const { slug } = Route.useParams();
  const { t, dir } = useI18n();
  const fetchSchool = useServerFn(getSchoolBySlug);
  const fetchInventory = useServerFn(listInventory);
  const placeOrder = useServerFn(createSchoolOrder);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["school", slug],
    queryFn: () => fetchSchool({ data: { slug } }),
  });

  const { data: dbStock = [] } = useQuery({
    queryKey: ["catalog"],
    queryFn: () => fetchInventory(),
  });

  // qty by item id
  const [selection, setSelection] = useState<Record<string, number>>({});
  const [tray, setTray] = useState(false);
  const [confirm, setConfirm] = useState<null | { items: number; total: number; when: Date }>(null);

  const catalog: CatalogItem[] = useMemo(() => {
    if (dbStock.length) {
      return dbStock.map((s: any) => ({
        id: s.id,
        name: s.item_name,
        price: Number(s.unit_price),
        size: sizeFor(Number(s.unit_price)),
      }));
    }
    return FALLBACK_CATALOG;
  }, [dbStock]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const items = catalog.filter((c) => (selection[c.id] ?? 0) > 0);
      let total = 0;
      for (const item of items) {
        const qty = selection[item.id];
        await placeOrder({
          data: {
            slug,
            package_name: item.name,
            quantity: qty,
            unit_price: item.price,
          },
        });
        total += qty * item.price;
      }
      return { items: items.length, total };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["school", slug] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["finance"] });
      setSelection({});
      setTray(false);
      setConfirm({ items: res.items, total: res.total, when: new Date() });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div
        dir={dir}
        className="fotojenik-dark flex min-h-screen items-center justify-center bg-background"
      >
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div
        dir={dir}
        className="fotojenik-dark flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-foreground"
      >
        <h1 className="text-xl font-semibold">{t("school.notFound")}</h1>
        <p className="text-sm text-muted-foreground">{t("school.invalidLink")}</p>
        <Link to="/" className="text-primary underline">
          {t("school.backHome")}
        </Link>
      </div>
    );
  }

  const { school, orders, finance } = data;
  const selectedItems = catalog.filter((c) => (selection[c.id] ?? 0) > 0);
  const totalQty = selectedItems.reduce((s, i) => s + selection[i.id], 0);
  const totalPrice = selectedItems.reduce((s, i) => s + selection[i.id] * i.price, 0);
  const pendingInvoice = finance && Number(finance.balance_due) > 0;

  const inc = (id: string) => setSelection((p) => ({ ...p, [id]: (p[id] ?? 0) + 1 }));
  const dec = (id: string) =>
    setSelection((p) => {
      const next = (p[id] ?? 0) - 1;
      const copy = { ...p };
      if (next <= 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });
  const remove = (id: string) =>
    setSelection((p) => {
      const copy = { ...p };
      delete copy[id];
      return copy;
    });

  return (
    <div dir={dir} className="fotojenik-dark min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Camera className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold">Fotojenik</span>
            <span className="ml-3 hidden text-sm text-muted-foreground sm:inline">
              | {school.name}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTray(true)}
              className="relative border-border bg-card hover:bg-accent"
            >
              <ShoppingBag className="mr-2 h-4 w-4" />
              {t("school.reviewSelection")}
              {totalQty > 0 && (
                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                  {totalQty}
                </span>
              )}
            </Button>
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
              {t("school.signOut")}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8 pb-32">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("school.welcome")}, {school.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {school.city ? `${school.city} — ` : ""}
            {t("school.subtitle")}
          </p>
        </div>

        {/* Catalog grid */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {catalog.map((item) => {
            const qty = selection[item.id] ?? 0;
            const selected = qty > 0;
            return (
              <div
                key={item.id}
                className={cn(
                  "flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-colors",
                  selected ? "border-primary" : "border-border hover:border-primary/40",
                )}
              >
                {/* Image slot */}
                <div className="relative flex h-40 items-center justify-center bg-background/80">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-card">
                      <Package className="h-5 w-5" />
                    </div>
                    <span className="text-xs">{t("school.productPhoto")}</span>
                  </div>
                  <Badge className="absolute left-3 top-3 border border-primary/30 bg-primary/15 text-[10px] uppercase tracking-wider text-primary hover:bg-primary/20">
                    {item.size}
                  </Badge>
                  {selected && (
                    <span className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {String(item.id).slice(0, 8).toUpperCase()}
                    </p>
                    <h3 className="mt-0.5 text-sm font-semibold leading-snug">{item.name}</h3>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-primary">
                      ${item.price.toFixed(2)}
                    </span>
                  </div>
                  {selected ? (
                    <div className="flex items-center justify-between rounded-md border border-border bg-background/60 p-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 hover:bg-accent"
                        onClick={() => dec(item.id)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-semibold">
                        {qty} {t("school.selected")}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 hover:bg-accent"
                        onClick={() => inc(item.id)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => inc(item.id)}
                    >
                      {t("school.choosePackage")}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {/* Order history */}
        <section className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-semibold">{t("school.orderHistory")}</h2>
          </div>
          {orders.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              {t("school.noOrders")}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {orders.map((o: any) => (
                <li key={o.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div>
                    <div className="font-medium">{o.package_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString()} · Qty {o.quantity}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">${Number(o.total_price).toLocaleString()}</span>
                    <Badge
                      className={cn(
                        "border text-[10px] uppercase tracking-wider",
                        o.order_status === "Completed" || o.order_status === "Shipped"
                          ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                          : "border-primary/30 bg-primary/15 text-primary",
                      )}
                    >
                      {o.order_status}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Invoice */}
        {pendingInvoice && (
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-semibold">{t("school.pendingInvoice")}</h2>
            <div className="mt-3 flex items-center justify-between rounded-md border border-border bg-background/60 p-4">
              <div>
                <div className="text-sm text-muted-foreground">{t("school.balanceDue")}</div>
                <div className="text-xl font-bold">
                  ${Number(finance!.balance_due).toLocaleString()}
                </div>
              </div>
              {finance?.invoice_url ? (
                <Button asChild variant="outline" className="border-border bg-card">
                  <a href={finance.invoice_url} download>
                    <FileDown className="mr-2 h-4 w-4" /> {t("school.downloadInvoice")}
                  </a>
                </Button>
              ) : (
                <Button variant="outline" disabled className="border-border bg-card">
                  <FileDown className="mr-2 h-4 w-4" /> {t("school.invoicePending")}
                </Button>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Floating selection summary */}
      {totalQty > 0 && !tray && (
        <div className="fixed inset-x-0 bottom-4 z-40 px-4">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-xl border border-primary/40 bg-card/95 px-4 py-3 shadow-2xl backdrop-blur">
            <div className="flex items-center gap-3 text-sm">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <ShoppingBag className="h-4 w-4" />
              </span>
              <div>
                <div className="font-semibold">
                  {totalQty} {t("school.itemsSelected")}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("school.total")} ${totalPrice.toLocaleString()}
                </div>
              </div>
            </div>
            <Button
              onClick={() => setTray(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {t("school.reviewSelection")}
            </Button>
          </div>
        </div>
      )}

      {/* Tray overlay */}
      {tray && (
        <div className="fixed inset-0 z-50 flex justify-end bg-background/70 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setTray(false)} aria-hidden />
          <aside className="relative ml-auto flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold">{t("school.reviewYourSelection")}</h2>
              <button
                type="button"
                onClick={() => setTray(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {selectedItems.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  {t("school.noItemsSelected")}
                </p>
              ) : (
                <ul className="space-y-3">
                  {selectedItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 rounded-lg border border-border bg-background/60 p-3"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-card text-muted-foreground">
                        <Package className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-sm font-semibold">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          ${item.price.toFixed(2)} each
                        </div>
                      </div>
                      <div className="flex items-center gap-1 rounded-md border border-border bg-card p-0.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => dec(item.id)}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-6 text-center text-sm font-semibold">
                          {selection[item.id]}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => inc(item.id)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(item.id)}
                        className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label="Remove"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-border px-5 py-4">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="text-lg font-bold">${totalPrice.toLocaleString()}</span>
              </div>
              <Button
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={selectedItems.length === 0 || submitMutation.isPending}
                onClick={() => submitMutation.mutate()}
              >
                {submitMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("school.submitSelection")}
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Confirmation modal — premium dark + crimson */}
      {confirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-primary/40 bg-card shadow-2xl">
            <div className="flex flex-col items-center gap-3 border-b border-border px-6 pt-8 pb-6 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                <Check className="h-7 w-7" />
              </span>
              <h2 className="text-xl font-bold">{t("school.selectionSubmitted")}</h2>
              <p className="text-sm text-muted-foreground">{t("school.orderSent")}</p>
            </div>
            <div className="space-y-2 px-6 py-5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("school.school")}</span>
                <span className="font-semibold">{school.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("school.packages")}</span>
                <span className="font-semibold">{confirm.items}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("school.basePriceTotal")}</span>
                <span className="font-semibold text-primary">
                  ${confirm.total.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("school.submitted")}</span>
                <span className="font-semibold">{confirm.when.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-muted-foreground">{t("school.status")}</span>
                <Badge className="border-transparent bg-primary/20 text-primary hover:bg-primary/25">
                  {t("school.pendingReview")}
                </Badge>
              </div>
            </div>
            <div className="border-t border-border bg-background/40 px-6 py-4">
              <Button
                onClick={() => setConfirm(null)}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {t("school.done")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
