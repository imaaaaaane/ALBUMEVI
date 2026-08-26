import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Camera, Check, FileDown, Loader2, Minus, Package, Plus, ShoppingBag, X, Truck, Settings, Clock
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

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
  const qc = useQueryClient();
  const { role, isLoading: authLoading } = useAuth();

  const { data, isLoading: dataLoading, error } = useQuery({
    queryKey: ["school", slug],
    queryFn: async () => {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug || '');
      const queryColumn = isUUID ? 'id' : 'unique_link_slug';

      // Hna rje3na l is_active li kayna f Supabase dyalk
      const { data: school, error } = await (supabase as any)
        .from("schools")
        .select("id, name, city, unique_link_slug, is_active, status")
        .eq(queryColumn, slug)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!school) throw new Error("School not found");

      const { data: orders } = await (supabase as any)
        .from("orders")
        .select("id, package_name, quantity, total_price, order_status, created_at")
        .eq("school_id", school.id)
        .order("created_at", { ascending: false });

      return { school, orders: orders ?? [] };
    },
  });

  const { data: dbStock = [] } = useQuery({
    queryKey: ["catalog"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("inventory")
        .select("id, item_name, stock_count, unit_price, created_at")
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const [selection, setSelection] = useState<Record<string, number>>({});
  const [orderNote, setOrderNote] = useState("");
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

      const { data: school, error: sErr } = await (supabase as any)
        .from("schools")
        .select("id")
        .eq("unique_link_slug", slug)
        .maybeSingle();
      if (sErr || !school) throw new Error("School not found");

      for (const item of items) {
        const qty = selection[item.id];
        const itemTotal = qty * item.price;
        const { error } = await (supabase as any).from("orders").insert({
          school_id: school.id,
          package_name: item.name,
          quantity: qty,
          total_price: itemTotal,
          order_status: "Pending",
          note: orderNote // Siftna l-mola7ada hna
        });
        if (error) throw new Error(error.message);

        total += itemTotal;
      }
      return { items: items.length, total };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["school", slug] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      setSelection({});
      setOrderNote("");
      setTray(false);
      setConfirm({ items: res.items, total: res.total, when: new Date() });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (dataLoading || authLoading) {
    return (
      <div dir={dir} className="albumevi-dark flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div dir={dir} className="albumevi-dark flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-foreground">
        <h1 className="text-xl font-semibold">Okul bulunamadı</h1>
        <p className="text-sm text-muted-foreground">Bu bağlantı geçersiz veya süresi dolmuş olabilir.</p>
        <Link to="/" className="text-primary underline">Ana sayfaya dön</Link>
      </div>
    );
  }

  const { school, orders } = data;

  // Hna k-n-verifiw is_active
  const isSchoolActive = school.is_active === true;

  if (!isSchoolActive && role !== "admin") {
    return (
      <div dir={dir} className="albumevi-dark flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-foreground text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500 mb-2">
          <X className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-red-500">Erişim Engellendi</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          Bu okulun portal erişimi durdurulmuş veya süresi dolmuştur. Lütfen sistem yöneticisi ile iletişime geçin.
        </p>
        <Link to="/" className="text-primary underline mt-4">Ana sayfaya dön</Link>
      </div>
    );
  }

  const selectedItems = catalog.filter((c) => (selection[c.id] ?? 0) > 0);
  const totalQty = selectedItems.reduce((s, i) => s + selection[i.id], 0);
  const totalPrice = selectedItems.reduce((s, i) => s + selection[i.id] * i.price, 0);

  const latestOrder = orders[0];
  const currentStatus = latestOrder?.order_status || "None";

  const funnelStages = [
    { id: "Pending", label: "Bekliyor", icon: Clock },
    { id: "Processing", label: "Üretimde", icon: Settings },
    { id: "Shipped", label: "Kargoya Hazır", icon: Package },
    { id: "Completed", label: "Teslim Edildi", icon: Truck },
  ];

  const currentStageIndex = funnelStages.findIndex(s => s.id === currentStatus);

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
    <div dir={dir} className="albumevi-dark min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Camera className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold">Albumevi</span>
            <span className="ml-3 hidden text-sm text-muted-foreground sm:inline">
              | {school.name}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Button variant="outline" size="sm" onClick={() => setTray(true)} className="relative border-border bg-card hover:bg-accent">
              <ShoppingBag className="mr-2 h-4 w-4" />
              Seçimi İncele
              {totalQty > 0 && (
                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                  {totalQty}
                </span>
              )}
            </Button>
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">Çıkış yap</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8 pb-32">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hoş geldiniz, {school.name}</h1>
          <p className="text-sm text-muted-foreground">
            {school.city ? `${school.city} — ` : ""}
            Kataloğu inceleyin ve paketlerinizi seçin.
          </p>
        </div>

        {orders.length > 0 && (
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Canlı Üretim Hunisi (Son Sipariş)</h2>
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              {funnelStages.map((stage, idx) => {
                const Icon = stage.icon;
                const isCompleted = idx <= currentStageIndex;
                const isCurrent = idx === currentStageIndex;
                return (
                  <div key={stage.id} className="flex flex-1 flex-col items-center gap-2 text-center">
                    <div className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full border-2 transition-colors",
                      isCurrent ? "border-primary bg-primary/20 text-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]" :
                        isCompleted ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className={cn("text-xs font-semibold", isCompleted ? "text-foreground" : "text-muted-foreground")}>
                      {stage.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {catalog.map((item) => {
            const qty = selection[item.id] ?? 0;
            const selected = qty > 0;
            return (
              <div key={item.id} className={cn("flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-colors", selected ? "border-primary" : "border-border hover:border-primary/40")}>
                <div className="relative flex h-40 items-center justify-center bg-background/80">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-card">
                      <Package className="h-5 w-5" />
                    </div>
                    <span className="text-xs">Ürün fotoğrafı</span>
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
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{String(item.id).slice(0, 8).toUpperCase()}</p>
                    <h3 className="mt-0.5 text-sm font-semibold leading-snug">{item.name}</h3>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-primary">${item.price.toFixed(2)}</span>
                  </div>
                  {selected ? (
                    <div className="flex items-center justify-between rounded-md border border-border bg-background/60 p-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-accent" onClick={() => dec(item.id)}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-semibold">{qty} seçildi</span>
                      <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-accent" onClick={() => inc(item.id)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => inc(item.id)}>
                      Paket Seç
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        <section className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-semibold">Sipariş geçmişiniz</h2>
          </div>
          {orders.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              Henüz sipariş yok. Yukarıdan paket seçip gönderin.
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
                    <Badge className={cn("border text-[10px] uppercase tracking-wider", o.order_status === "Completed" || o.order_status === "Shipped" ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400" : "border-primary/30 bg-primary/15 text-primary")}>
                      {o.order_status}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {totalQty > 0 && !tray && (
        <div className="fixed inset-x-0 bottom-4 z-40 px-4">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-xl border border-primary/40 bg-card/95 px-4 py-3 shadow-2xl backdrop-blur">
            <div className="flex items-center gap-3 text-sm">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <ShoppingBag className="h-4 w-4" />
              </span>
              <div>
                <div className="font-semibold">{totalQty} ürün seçildi</div>
                <div className="text-xs text-muted-foreground">Toplam ${totalPrice.toLocaleString()}</div>
              </div>
            </div>
            <Button onClick={() => setTray(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Seçimi İncele
            </Button>
          </div>
        </div>
      )}

      {tray && (
        <div className="fixed inset-0 z-50 flex justify-end bg-background/70 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setTray(false)} aria-hidden />
          <aside className="relative ml-auto flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold">Seçiminizi inceleyin</h2>
              <button type="button" onClick={() => setTray(false)} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {selectedItems.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">Henüz ürün seçilmedi.</p>
              ) : (
                <ul className="space-y-3">
                  {selectedItems.map((item) => (
                    <li key={item.id} className="flex items-center gap-3 rounded-lg border border-border bg-background/60 p-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-card text-muted-foreground">
                        <Package className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-sm font-semibold">{item.name}</div>
                        <div className="text-xs text-muted-foreground">${item.price.toFixed(2)} each</div>
                      </div>
                      <div className="flex items-center gap-1 rounded-md border border-border bg-card p-0.5">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => dec(item.id)}>
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-6 text-center text-sm font-semibold">{selection[item.id]}</span>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => inc(item.id)}>
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <button type="button" onClick={() => remove(item.id)} className="rounded-md p-1 text-muted-foreground hover:bg-accent">
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {selectedItems.length > 0 && (
              <div className="border-t border-border px-5 py-4 bg-background/30">
                <label className="text-sm font-semibold mb-2 block">Özel Notlar (İkiz Öğrenciler vb.)</label>
                <textarea
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="Varsa özel notunuzu buraya yazın..."
                  className="w-full rounded-md border border-border bg-background p-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
                  rows={3}
                />
              </div>
            )}

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
                Seçimi Gönder
              </Button>
            </div>
          </aside>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-primary/40 bg-card shadow-2xl">
            <div className="flex flex-col items-center gap-3 border-b border-border px-6 pt-8 pb-6 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                <Check className="h-7 w-7" />
              </span>
              <h2 className="text-xl font-bold">Seçim gönderildi</h2>
              <p className="text-sm text-muted-foreground">Siparişiniz Albumevi'ne inceleme için gönderildi.</p>
            </div>
            <div className="space-y-2 px-6 py-5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Okul</span>
                <span className="font-semibold">{school.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Paketler</span>
                <span className="font-semibold">{confirm.items}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Temel fiyat toplamı</span>
                <span className="font-semibold text-primary">
                  ${confirm.total.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Gönderildi</span>
                <span className="font-semibold">{confirm.when.toLocaleString()}</span>
              </div>
            </div>
            <div className="border-t border-border bg-background/40 px-6 py-4">
              <Button onClick={() => setConfirm(null)} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                Tamam
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}