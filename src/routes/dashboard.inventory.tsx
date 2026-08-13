import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Package, DollarSign, Clock, Trash2, Pencil } from "lucide-react";
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
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const Route = createFileRoute("/dashboard/inventory")({
  component: Inventory,
});

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
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
      <div className="absolute inset-y-0 left-0 w-1 bg-[#A67C52]" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-white/50">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-white">{value}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#A67C52]/20 text-[#A67C52]">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function Inventory() {
  const { teamId } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", base_price: "" });

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ id: "", name: "", base_price: "" });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      // 1. Fetch all data independently
      const [
        { data: pData, error: pError },
        { data: spData, error: spError },
        { data: stData, error: stError },
        { data: cData, error: cError },
        { data: albumeviSales, error: aError },
        { data: ordersData, error: oError }
      ] = await Promise.all([
        (supabase as any).from("products").select("id, name, base_price, created_at").order("created_at", { ascending: true }),
        (supabase as any).from("school_products").select("school_id, product_id, custom_price").order("id", { ascending: true }),
        (supabase as any).from("students").select("id, class_id, selection").not("selection", "is", null),
        (supabase as any).from("classes").select("id, school_id"),
        (supabase as any).from("albumevi_sales").select("product_id, quantity"),
        (supabase as any).from("orders").select("package_name, quantity")
      ]);

      if (pError) throw new Error(pError.message);

      const productsWithStats = (pData ?? []).map((p: any) => ({
        ...p,
        sold_count: 0,
        total_revenue: 0,
      }));

      // Create a map to quickly look up school_id from class_id
      const classMap = new Map();
      (cData ?? []).forEach((c: any) => classMap.set(c.id, c.school_id));

      const schoolMappings = new Map();
      (spData ?? []).forEach((sp: any) => {
        if (!schoolMappings.has(sp.school_id)) {
          schoolMappings.set(sp.school_id, {
            paket1: { id: sp.product_id, price: sp.custom_price },
            paket2: null
          });
        } else {
          const mapping = schoolMappings.get(sp.school_id);
          if (!mapping.paket2) {
             mapping.paket2 = { id: sp.product_id, price: sp.custom_price };
          }
        }
      });

      (stData ?? []).forEach((st: any) => {
        const schoolId = classMap.get(st.class_id);
        if (!schoolId) return;
        
        const mapping = schoolMappings.get(schoolId);
        if (!mapping) return;
        
        let selectedProduct = null;
        if (st.selection === "paket1") selectedProduct = mapping.paket1;
        if (st.selection === "paket2") selectedProduct = mapping.paket2;
        
        if (selectedProduct) {
           const pStat = productsWithStats.find((p: any) => p.id === selectedProduct.id);
           if (pStat) {
              pStat.sold_count += 1;
           }
        }
      });

      // Aggregate from albumevi_sales
      (albumeviSales ?? []).forEach((sale: any) => {
        const pStat = productsWithStats.find((p: any) => p.id === sale.product_id);
        if (pStat) {
          pStat.sold_count += (sale.quantity || 1);
        }
      });

      // Aggregate from orders (matches by package_name)
      (ordersData ?? []).forEach((order: any) => {
        const pStat = productsWithStats.find((p: any) => (p.name || "").toLowerCase() === (order.package_name || "").toLowerCase());
        if (pStat) {
          pStat.sold_count += (order.quantity || 1);
        }
      });

      // Calculate Total Revenue based on base_price * sold_count
      productsWithStats.forEach((p: any) => {
        p.total_revenue = (p.sold_count || 0) * (p.base_price || 0);
      });

      return productsWithStats;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (input: { name: string; base_price: number }) => {
      const { data, error } = await (supabase as any)
        .from("products")
        .insert({
          name: input.name,
          base_price: input.base_price,
          team_id: teamId === "all" ? null : teamId,
        })
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      toast.success("Ürün başarıyla eklendi");
      qc.invalidateQueries({ queryKey: ["products"] });
      setOpen(false);
      setForm({ name: "", base_price: "" });
    },
    onError: (e: Error) => toast.error(e.message || "Ürün eklenemedi"),
  });

  const updateMutation = useMutation({
    mutationFn: async (input: { id: string; base_price: number }) => {
      await supabase.auth.getSession();
      
      const { data, error } = await (supabase as any)
        .from("products")
        .update({ base_price: input.base_price })
        .eq("id", input.id)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      toast.success("Ürün fiyatı güncellendi");
      qc.invalidateQueries({ queryKey: ["products"] });
      setEditOpen(false);
    },
    onError: (e: Error) => toast.error(e.message || "Fiyat güncellenemedi"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("products").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Ürün silindi");
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast.error(e.message || "Ürün silinemedi"),
  });

  const totalProducts = products.length;
  
  let totalRevenueAll = 0;
  let totalSoldAll = 0;
  products.forEach((p: any) => {
     totalRevenueAll += p.total_revenue || 0;
     totalSoldAll += p.sold_count || 0;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(form.base_price);
    if (!form.name.trim() || Number.isNaN(price)) {
      toast.error("Lütfen isim ve fiyat alanlarını doldurun");
      return;
    }
    addMutation.mutate({ name: form.name.trim(), base_price: price });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(editForm.base_price);
    if (Number.isNaN(price)) {
      toast.error("Lütfen geçerli bir fiyat girin");
      return;
    }
    updateMutation.mutate({ id: editForm.id, base_price: price });
  };

  return (
    <div className="space-y-8 min-h-screen bg-[#131316] text-white selection:bg-[#A67C52] selection:text-white pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ürün Envanteri</h1>
          <p className="text-sm text-white/50 mt-1">
            Okullar için sunulacak paketleri ve varsayılan fiyatlarını yönetin.
          </p>
        </div>
        <Button
          onClick={() => setOpen(true)}
          className="bg-[#A67C52] text-white hover:bg-[#A67C52]/90 cursor-pointer h-12 px-6 rounded-xl shadow-lg shadow-[#A67C52]/20 font-semibold"
        >
          <Plus className="mr-2 h-5 w-5" /> Yeni Ürün Ekle
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Toplam Ürün" value={String(totalProducts)} icon={Package} />
        <StatCard label="Genel Toplam Gelir" value={`${totalRevenueAll.toLocaleString()} ₺`} icon={DollarSign} />
        <StatCard label="Son Güncelleme" value={products.length ? new Date(products[products.length - 1]?.created_at).toLocaleDateString("tr-TR") : "-"} icon={Clock} />
      </div>

      {/* Products grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading ? (
          <div className="col-span-full rounded-2xl border border-white/5 bg-white/5 p-12 text-center text-white/50">
            Ürünler yükleniyor...
          </div>
        ) : (
          <>
            {products.map((p: any) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={p.id} 
                className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-xl transition-all duration-300 hover:border-[#A67C52]/50 hover:bg-white/10 relative"
              >
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white/40 hover:text-[#A67C52] hover:bg-[#A67C52]/10 rounded-lg"
                    onClick={() => {
                      setEditForm({ id: p.id, name: p.name, base_price: p.base_price?.toString() || "0" });
                      setEditOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded-lg"
                    onClick={() => {
                      if (confirm("Bu ürünü silmek istediğinize emin misiniz?")) {
                        deleteMutation.mutate(p.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex flex-col items-center justify-center p-8 bg-black/20 border-b border-white/5 mt-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#A67C52]/30 bg-[#A67C52]/10 text-[#A67C52] mb-4">
                    <Package className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-center leading-snug">
                    {p.name}
                  </h3>
                </div>
                
                <div className="flex flex-col p-6 bg-white/5 flex-1">
                  <div className="text-sm text-white/50 mb-1">Varsayılan Fiyat</div>
                  <div className="text-3xl font-black text-[#A67C52] mb-4">{Number(p.base_price).toLocaleString()} ₺</div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-auto pt-4 border-t border-white/5">
                    <div>
                      <span className="text-white/60 group-hover:text-white transition-colors block text-xs">Satılan Miktar</span>
                      <span className="font-semibold text-[#A67C52]">{p.sold_count || 0} Adet</span>
                    </div>
                    <div>
                      <span className="text-white/60 group-hover:text-white transition-colors block text-xs">Toplam Gelir</span>
                      <span className="font-semibold text-[#A67C52]">{Number(p.total_revenue || 0).toLocaleString()} ₺</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="group flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-white/10 bg-transparent p-6 text-center transition-all hover:border-[#A67C52]/60 hover:bg-white/5 cursor-pointer"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#A67C52]/30 bg-[#A67C52]/10 text-[#A67C52] transition-transform group-hover:scale-110">
                <Plus className="h-8 w-8" />
              </div>
              <div>
                <div className="text-lg font-bold text-white mb-1">Yeni Ürün Ekle</div>
                <p className="text-sm text-white/40 max-w-[200px] mx-auto">
                  Envantere yeni bir ürün veya paket seçeneği ekleyin.
                </p>
              </div>
            </button>
          </>
        )}
      </div>

      {/* Add Product Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-white/10 bg-[#131316] text-white max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Yeni Ürün Ekle</DialogTitle>
            <DialogDescription className="text-white/50">Sisteme yeni bir paket veya ürün tanımlayın.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 mt-4">
            <div className="space-y-2">
              <Label className="text-white/70">Ürün Adı</Label>
              <Input
                placeholder="Örn: Albüm Paketi"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-white/5 border-white/10 text-white rounded-xl h-12 focus-visible:ring-[#A67C52]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Varsayılan Fiyat (₺)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="250"
                value={form.base_price}
                onChange={(e) => setForm({ ...form, base_price: e.target.value })}
                className="bg-white/5 border-white/10 text-white rounded-xl h-12 focus-visible:ring-[#A67C52]"
              />
            </div>
            <DialogFooter className="mt-8">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setOpen(false)} 
                className="text-white/50 hover:text-white hover:bg-white/5 h-12 px-6 rounded-xl"
              >
                İptal
              </Button>
              <Button
                type="submit"
                disabled={addMutation.isPending}
                className="bg-[#A67C52] text-white hover:bg-[#A67C52]/90 h-12 px-8 rounded-xl font-bold"
              >
                {addMutation.isPending ? "Ekleniyor..." : "Ekle"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Product Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="border-white/10 bg-[#131316] text-white max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Fiyatı Düzenle</DialogTitle>
            <DialogDescription className="text-white/50">{editForm.name} için fiyat güncelleyin.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-5 mt-4">
            <div className="space-y-2">
              <Label className="text-white/70">Varsayılan Fiyat (₺)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="250"
                value={editForm.base_price}
                onChange={(e) => setEditForm({ ...editForm, base_price: e.target.value })}
                className="bg-white/5 border-white/10 text-white rounded-xl h-12 focus-visible:ring-[#A67C52]"
              />
            </div>
            <DialogFooter className="mt-8">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setEditOpen(false)} 
                className="text-white/50 hover:text-white hover:bg-white/5 h-12 px-6 rounded-xl"
              >
                İptal
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="bg-[#A67C52] text-white hover:bg-[#A67C52]/90 h-12 px-8 rounded-xl font-bold"
              >
                {updateMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

