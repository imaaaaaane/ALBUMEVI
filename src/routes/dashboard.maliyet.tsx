import { createFileRoute } from "@tanstack/react-router";
import React, { useState } from "react";
import { Calculator, Loader2, Edit2, TrendingUp, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseClient } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/dashboard/maliyet")({
  component: MaliyetView,
});

type ProductCost = {
  id: number;
  urun_adi: string;
  baski: number;
  baski_adet: number;
  pvc: number;
  pvc_adet: number;
  mdf: number;
  mdf_adet: number;
  kumas: number;
  kumas_adet: number;
  iscilik: number;
  iscilik_adet: number;
  lazer: number;
  lazer_adet: number;
}

function MaliyetView() {
  const queryClient = useQueryClient();
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [editingProduct, setEditingProduct] = useState<ProductCost | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProductId, setNewProductId] = useState<string>("");

  const { data: products = [] } = useQuery({
    queryKey: ["products_inventory"],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("products")
        .select("id, name")
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (productName: string) => {
      const payload = {
        urun_adi: productName,
        baski: 0, baski_adet: 0,
        pvc: 0, pvc_adet: 0,
        mdf: 0, mdf_adet: 0,
        kumas: 0, kumas_adet: 0,
        iscilik: 0, iscilik_adet: 0,
        lazer: 0, lazer_adet: 0
      };
      const { error } = await supabaseClient.from("product_costs").insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product_costs"] });
      toast.success("Yeni ürün maliyeti başarıyla eklendi.");
      setIsAddingProduct(false);
      setNewProductId("");
    },
    onError: (err: any) => {
      toast.error(`Ekleme hatası: ${err.message}`);
    }
  });

  const handleAddSubmit = () => {
    if (!newProductId) {
      toast.error("Lütfen bir ürün seçin");
      return;
    }
    const selectedProd = products.find((p: any) => p.id.toString() === newProductId);
    if (selectedProd) {
      addMutation.mutate(selectedProd.name);
    }
  };

  const { data: costs = [], isLoading } = useQuery({
    queryKey: ["product_costs"],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("product_costs")
        .select("*")
        .order("id", { ascending: true });
      
      if (error) throw error;
      
      return data.map((item: any) => ({
        ...item,
        urun_adi: item.urunAdi || item.urun_adi || "Unknown"
      })) as ProductCost[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updatedCost: ProductCost) => {
      const payload = {
        baski: updatedCost.baski,
        baski_adet: updatedCost.baski_adet,
        pvc: updatedCost.pvc,
        pvc_adet: updatedCost.pvc_adet,
        mdf: updatedCost.mdf,
        mdf_adet: updatedCost.mdf_adet,
        kumas: updatedCost.kumas,
        kumas_adet: updatedCost.kumas_adet,
        iscilik: updatedCost.iscilik,
        iscilik_adet: updatedCost.iscilik_adet,
        lazer: updatedCost.lazer,
        lazer_adet: updatedCost.lazer_adet
      };
      
      const { error } = await supabaseClient
        .from("product_costs")
        .update(payload)
        .eq("id", updatedCost.id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product_costs"] });
      toast.success("Maliyet başarıyla güncellendi.");
      setEditingProduct(null);
    },
    onError: (err: any) => {
      toast.error(`Güncelleme hatası: ${err.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabaseClient
        .from("product_costs")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product_costs"] });
      toast.success("Ürün başarıyla silindi");
    },
    onError: (err: any) => {
      toast.error(`Silme hatası: ${err.message}`);
    }
  });

  const handleDelete = (id: number) => {
    if (window.confirm("Bu ürün maliyetini silmek istediğinize emin misiniz?")) {
      deleteMutation.mutate(id);
    }
  };

  const calculateUnitCost = (c: ProductCost) => {
    return (
      (Number(c.baski || 0) * Number(c.baski_adet ?? 1)) +
      (Number(c.pvc || 0) * Number(c.pvc_adet ?? 1)) +
      (Number(c.mdf || 0) * Number(c.mdf_adet ?? 1)) +
      (Number(c.kumas || 0) * Number(c.kumas_adet ?? 1)) +
      (Number(c.iscilik || 0) * Number(c.iscilik_adet ?? 1)) +
      (Number(c.lazer || 0) * Number(c.lazer_adet ?? 1))
    );
  };

  const selectedProduct = costs.find(c => c.id.toString() === selectedProductId);
  const totalOrderCost = selectedProduct ? calculateUnitCost(selectedProduct) * quantity : 0;

  const sortedCosts = [...costs].sort((a, b) => calculateUnitCost(b) - calculateUnitCost(a));
  const maxCost = sortedCosts.length > 0 ? calculateUnitCost(sortedCosts[0]) : 0;

  const handleEditChange = (field: keyof ProductCost, value: string) => {
    if (!editingProduct) return;
    setEditingProduct({
      ...editingProduct,
      [field]: Number(value) || 0
    });
  };

  const handleSave = () => {
    if (editingProduct) {
      updateMutation.mutate(editingProduct);
    }
  };

  return (
    <div className="p-8 space-y-8 w-full 2xl:max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Maliyet Hesaplama</h1>
        <p className="text-sm text-[#9E9696] mt-1">
          Ürün bazlı maliyet konfigürasyonu ve hızlı sipariş hesaplamaları.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <div className="bg-[#131316] border border-white/5 rounded-3xl p-6 shadow-xl relative min-h-[400px]">
            <h3 className="text-lg font-bold text-white mb-4">Maliyet Tablosu</h3>
            
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#A67C52]" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-[#9E9696] uppercase bg-white/5">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg">Ürün Adı</th>
                      <th className="px-4 py-3">Baskı</th>
                      <th className="px-4 py-3">PVC</th>
                      <th className="px-4 py-3">MDF</th>
                      <th className="px-4 py-3">Kumaş</th>
                      <th className="px-4 py-3">İşçilik</th>
                      <th className="px-4 py-3">Lazer</th>
                      <th className="px-4 py-3 font-bold text-[#A67C52]">Birim Maliyeti</th>
                      <th className="px-4 py-3 rounded-tr-lg text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costs.map((item) => (
                      <tr 
                        key={item.id} 
                        className="border-b border-white/5 hover:bg-white/5 transition-colors group cursor-pointer"
                        onClick={() => setEditingProduct(item)}
                      >
                        <td className="px-4 py-3 font-medium text-white">{item.urun_adi}</td>
                        <td className="px-4 py-3 text-white/80">{item.baski} ₺</td>
                        <td className="px-4 py-3 text-white/80">{item.pvc} ₺</td>
                        <td className="px-4 py-3 text-white/80">{item.mdf} ₺</td>
                        <td className="px-4 py-3 text-white/80">{item.kumas} ₺</td>
                        <td className="px-4 py-3 text-white/80">{item.iscilik} ₺</td>
                        <td className="px-4 py-3 text-white/80">{item.lazer} ₺</td>
                        <td className="px-4 py-3 font-bold text-[#A67C52]">{calculateUnitCost(item).toLocaleString()} ₺</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#9E9696] hover:text-[#A67C52]" onClick={(e) => { e.stopPropagation(); setEditingProduct(item); }}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10" onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="mt-6 flex justify-end">
              <Button 
                onClick={() => setIsAddingProduct(true)}
                className="bg-[#A67C52] hover:bg-[#A67C52]/90 text-white gap-2 font-bold px-6 shadow-lg shadow-[#A67C52]/20 rounded-xl"
              >
                <Plus className="w-5 h-5" />
                Yeni Ekle
              </Button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-8">
          <div className="bg-[#131316] border border-[#A67C52]/30 rounded-3xl p-6 shadow-[0_0_15px_rgba(166,124,82,0.1)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#A67C52]/20 flex items-center justify-center">
                <Calculator className="w-5 h-5 text-[#A67C52]" />
              </div>
              <h3 className="text-lg font-bold text-white">Hızlı Sipariş Hesaplayıcı</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#9E9696] mb-1">Ürün Seçin</label>
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger className="w-full bg-white/5 border-white/10 text-white h-12 rounded-xl focus:ring-[#A67C52]">
                    <SelectValue placeholder="Ürün Adı" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111111] border-white/10 text-white">
                    {costs.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.urun_adi}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#9E9696] mb-1">Adet</label>
                <Input 
                  type="number" 
                  min="1" 
                  value={quantity} 
                  onChange={(e) => setQuantity(Number(e.target.value) || 1)} 
                  className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus-visible:ring-[#A67C52]" 
                />
              </div>

              <div className="pt-4 mt-4 border-t border-white/10">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[#9E9696] text-sm">Birim Maliyeti</span>
                  <span className="text-white font-medium">{selectedProduct ? calculateUnitCost(selectedProduct).toLocaleString() : 0} ₺</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold text-lg">Toplam Sipariş Maliyeti</span>
                  <span className="text-2xl font-extrabold text-[#12B76A]">{totalOrderCost.toLocaleString()} ₺</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#131316] border border-[#A67C52]/30 rounded-3xl p-6 shadow-[0_0_15px_rgba(166,124,82,0.1)]">
            <div className="flex items-center gap-3 mb-6 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-[#A67C52]/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#A67C52]" />
              </div>
              <h3 className="text-lg font-bold text-white">Maliyet Analizi</h3>
            </div>
            
            <div className="space-y-5 overflow-y-auto max-h-[400px] pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {sortedCosts.map((item, index) => {
                const unitCost = calculateUnitCost(item);
                const isMostExpensive = index === 0 && sortedCosts.length > 1;
                const isCheapest = index === sortedCosts.length - 1 && sortedCosts.length > 1;
                const percentage = maxCost > 0 ? (unitCost / maxCost) * 100 : 0;
                
                return (
                  <div key={item.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-white/90">{item.urun_adi}</span>
                      <span className="text-sm font-bold text-white">{unitCost.toLocaleString()} ₺</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${isMostExpensive ? 'bg-red-500/80' : isCheapest ? 'bg-[#12B76A]/80' : 'bg-[#A67C52]/80'}`} 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      {isMostExpensive && (
                        <span className="text-[10px] text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded whitespace-nowrap border border-red-500/20">
                          En Yüksek Maliyet
                        </span>
                      )}
                      {isCheapest && (
                        <span className="text-[10px] text-[#12B76A] font-bold bg-[#12B76A]/10 px-2 py-0.5 rounded whitespace-nowrap border border-[#12B76A]/20">
                          En Düşük Maliyet
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isAddingProduct} onOpenChange={(open) => !open && setIsAddingProduct(false)}>
        <DialogContent className="bg-[#131316] border-[#1a1a1e] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Yeni Ürün Maliyeti Ekle
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-6">
            <label className="block text-sm font-bold text-[#9E9696] mb-3">Envanterden Ürün Seçin</label>
            <Select value={newProductId} onValueChange={setNewProductId}>
              <SelectTrigger className="w-full bg-[#0A0A0A] border-[#1a1a1e] text-white h-12 rounded-xl focus:ring-[#A67C52]">
                <SelectValue placeholder="Ürün Adı" />
              </SelectTrigger>
              <SelectContent className="bg-[#111111] border-white/10 text-white max-h-[300px]">
                {products.map((p: any) => (
                  <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter className="border-t border-[#1a1a1e] pt-4">
            <Button variant="ghost" onClick={() => setIsAddingProduct(false)} className="text-[#9E9696] hover:text-white">
              İptal
            </Button>
            <Button onClick={handleAddSubmit} disabled={addMutation.isPending} className="bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-bold px-6 shadow-lg shadow-[#A67C52]/20">
              {addMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent className="bg-[#131316] border-[#1a1a1e] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Maliyet Düzenle: <span className="text-[#A67C52]">{editingProduct?.urun_adi}</span>
            </DialogTitle>
          </DialogHeader>
          
          {editingProduct && (
            <div className="grid grid-cols-1 gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
              {[
                { label: 'Baskı', field: 'baski', qtyField: 'baski_adet' },
                { label: 'PVC', field: 'pvc', qtyField: 'pvc_adet' },
                { label: 'MDF', field: 'mdf', qtyField: 'mdf_adet' },
                { label: 'Kumaş', field: 'kumas', qtyField: 'kumas_adet' },
                { label: 'İşçilik', field: 'iscilik', qtyField: 'iscilik_adet' },
                { label: 'Lazer', field: 'lazer', qtyField: 'lazer_adet' }
              ].map((item) => (
                <div key={item.field} className="flex flex-col gap-2 bg-white/5 p-4 rounded-xl border border-white/5">
                  <label className="block text-xs font-bold text-[#A67C52] uppercase tracking-wider">{item.label}</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[10px] text-[#9E9696] mb-1">Birim Fiyat (₺)</span>
                      <Input 
                        type="number" 
                        value={editingProduct[item.field as keyof ProductCost] ?? 0} 
                        onChange={(e) => handleEditChange(item.field as keyof ProductCost, e.target.value)} 
                        className="bg-[#0A0A0A] border-[#1a1a1e] focus-visible:ring-[#A67C52]" 
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#9E9696] mb-1">Adet</span>
                      <Input 
                        type="number" 
                        value={editingProduct[item.qtyField as keyof ProductCost] ?? 1} 
                        onChange={(e) => handleEditChange(item.qtyField as keyof ProductCost, e.target.value)} 
                        className="bg-[#0A0A0A] border-[#1a1a1e] focus-visible:ring-[#A67C52]" 
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <DialogFooter className="mt-4 border-t border-[#1a1a1e] pt-4">
            <Button variant="ghost" onClick={() => setEditingProduct(null)} className="text-[#9E9696] hover:text-white">
              İptal
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-bold px-6 shadow-lg shadow-[#A67C52]/20">
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
