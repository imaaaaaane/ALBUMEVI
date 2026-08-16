import { createFileRoute } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";
import { Calculator, Loader2, Edit2, TrendingUp, Plus, Trash2, Minus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseClient } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/dashboard/maliyet")({
  component: MaliyetView,
});

type ProductCost = {
  id: number;
  urun_adi: string;
  sayfa_sayisi: number;
  baski: number;
  pvc: number;
  mdf_1_5: number;
  mdf_2_7: number;
  mdf_4: number;
  kumas: number;
  iscilik: number;
  lazer: number;
  genel_giderler: number;
}

function MaliyetView() {
  const queryClient = useQueryClient();
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [editingProduct, setEditingProduct] = useState<ProductCost | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isZamModalOpen, setIsZamModalOpen] = useState(false);
  const [zamData, setZamData] = useState({ column: 'baski', type: 'percentage', amount: '' });
  const [isUpdatingBulk, setIsUpdatingBulk] = useState(false);
  const [newProductId, setNewProductId] = useState<string>("");
  const [newSayfaSayisi, setNewSayfaSayisi] = useState<number>(1);
  const [formulaConfirmData, setFormulaConfirmData] = useState<{item: ProductCost, calc: any} | null>(null);

  const { data: hamMaddeler = [] } = useQuery({
    queryKey: ["ham_maddeler"],
    queryFn: async () => {
      const { data, error } = await supabaseClient.from("ham_maddeler").select("*");
      if (error) throw error;
      return data;
    }
  });
  const [isPanoramikOpen, setIsPanoramikOpen] = useState(false);
  const [isBaskiOpen, setIsBaskiOpen] = useState(false);
  const [isDigerOpen, setIsDigerOpen] = useState(false);

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
    mutationFn: async ({ productName, sayfaSayisi }: { productName: string, sayfaSayisi: number }) => {
      const payload = {
        urun_adi: productName,
        sayfa_sayisi: sayfaSayisi,
        baski: 0,
        pvc: 0,
        mdf_1_5: 0,
        mdf_2_7: 0,
        mdf_4: 0,
        kumas: 0,
        iscilik: 0,
        lazer: 0,
        genel_giderler: 0
      };
      const { error } = await supabaseClient.from("maliyetler").insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maliyetler"] });
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
      addMutation.mutate({ productName: selectedProd.name, sayfaSayisi: newSayfaSayisi });
    }
  };

  const { data: costs = [], isLoading } = useQuery({
    queryKey: ["maliyetler"],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("maliyetler")
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
        sayfa_sayisi: updatedCost.sayfa_sayisi,
        baski: updatedCost.baski,
        pvc: updatedCost.pvc,
        mdf_1_5: updatedCost.mdf_1_5,
        mdf_2_7: updatedCost.mdf_2_7,
        mdf_4: updatedCost.mdf_4,
        kumas: updatedCost.kumas,
        iscilik: updatedCost.iscilik,
        lazer: updatedCost.lazer,
        genel_giderler: updatedCost.genel_giderler
      };
      
      const { error } = await supabaseClient
        .from("maliyetler")
        .update(payload)
        .eq("id", updatedCost.id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maliyetler"] });
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
        .from("maliyetler")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maliyetler"] });
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
    const sayfa = Number(c.sayfa_sayisi ?? 1);
    return (
      (Number(c.baski || 0) * sayfa) +
      (Number(c.pvc || 0) * (sayfa + 1)) +
      Number(c.mdf_1_5 || 0) +
      Number(c.mdf_2_7 || 0) +
      Number(c.mdf_4 || 0) +
      Number(c.kumas || 0) +
      Number(c.iscilik || 0) +
      Number(c.lazer || 0) +
      Number(c.genel_giderler || 0)
    );
  };

  const selectedProduct = costs.find(c => c.id.toString() === selectedProductId);
  const totalOrderCost = selectedProduct ? calculateUnitCost(selectedProduct) * quantity : 0;

  const sortedCosts = [...costs].sort((a, b) => calculateUnitCost(b) - calculateUnitCost(a));
  const maxCost = sortedCosts.length > 0 ? calculateUnitCost(sortedCosts[0]) : 0;

  const sortedTableCosts = [...costs].sort((a, b) => {
    const aPan = a.urun_adi.toLowerCase().includes('panoramik');
    const bPan = b.urun_adi.toLowerCase().includes('panoramik');

    if (aPan && !bPan) return -1;
    if (!aPan && bPan) return 1;

    const parseDimensions = (name: string) => {
      const match = name.match(/(\d+)x(\d+)/i);
      return match ? { w: parseInt(match[1]), h: parseInt(match[2]) } : { w: 0, h: 0 };
    };

    const aDim = parseDimensions(a.urun_adi);
    const bDim = parseDimensions(b.urun_adi);

    if (aDim.w !== bDim.w) return aDim.w - bDim.w;
    return aDim.h - bDim.h;
  });

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

  const handleTopluZam = async () => {
    const amountNum = Number(zamData.amount);
    if (!amountNum || amountNum <= 0) return;
    
    setIsUpdatingBulk(true);
    try {
      // 1. Fetch current data
      const { data: currentData, error: fetchError } = await supabaseClient.from('maliyetler').select('*');
      if (fetchError) throw fetchError;

      // 2. Calculate new values
      const updatedData = currentData.map((row: any) => {
        const oldVal = Number(row[zamData.column]) || 0;
        let newVal = oldVal;
        
        if (zamData.type === 'percentage') {
          // Percentage increase (e.g., +25% raw material cost)
          newVal = oldVal + (oldVal * (amountNum / 100));
        } else {
          // Fixed TL increase (only apply if the item actually uses this material)
          if (oldVal > 0) newVal = oldVal + amountNum;
        }
        
        return {
          ...row,
          [zamData.column]: Math.round(newVal) // Round to nearest integer for clean UI
        };
      });

      // 3. Bulk Update via Upsert
      const { error: updateError } = await supabaseClient.from('maliyetler').upsert(updatedData);
      if (updateError) throw updateError;

      setIsZamModalOpen(false);
      setZamData({ column: 'baski', type: 'percentage', amount: '' });
      queryClient.invalidateQueries({ queryKey: ["maliyetler"] });
      toast.success("Toplu zam başarıyla uygulandı.");
    } catch (error) {
      console.error('Bulk update error:', error);
      toast.error("Toplu zam uygulanırken hata oluştu.");
    } finally {
      setIsUpdatingBulk(false);
    }
  };

  const panoramikItems = sortedTableCosts.filter(c => c.urun_adi.toLowerCase().includes('panoramik'));
  const baskiItems = sortedTableCosts.filter(c => c.urun_adi.toLowerCase().includes('baskı') || c.urun_adi.toLowerCase().includes('baski'));
  const otherItems = sortedTableCosts.filter(c => !c.urun_adi.toLowerCase().includes('panoramik') && !c.urun_adi.toLowerCase().includes('baskı') && !c.urun_adi.toLowerCase().includes('baski'));

  const calculateFormula = (urunAdi: string, sayfaSayisi: number = 1) => {
    const match = urunAdi.match(/(\d+)x(\d+)/);
    if (!match) return null;
    
    const w = parseInt(match[1]);
    const h = parseInt(match[2]);
    const area = (w * h) / 10000; // Convert cm² to m²
    
    const getPrice = (adi: string) => hamMaddeler.find(h => h.malzeme_adi === adi)?.fiyat || 0;
    
    return {
      baski_new: Math.round(area * sayfaSayisi * getPrice('baski')),
      pvc_new: Math.round(area * (sayfaSayisi + 1) * getPrice('pvc')),
      mdf_new: Math.round(area * getPrice('mdf_1_5')),
      kumas_new: Math.round(area * 1.5 * getPrice('kumas')), // 50% extra for folding
    };
  };

  const handleApplyFormula = (item: ProductCost) => {
    const calc = calculateFormula(item.urun_adi, item.sayfa_sayisi || 1);
    if (!calc) {
      toast.error("Bu ürün ebat (Örn: 30x60) formatında değil, hesaplanamaz.");
      return;
    }
    setFormulaConfirmData({ item, calc });
  };

  const executeFormulaUpdate = async () => {
    if (!formulaConfirmData) return;
    const { item, calc } = formulaConfirmData;
    
    const payload = {
      baski: calc.baski_new,
      pvc: calc.pvc_new,
      mdf_1_5: calc.mdf_new,
      kumas: calc.kumas_new
    };
    
    const { error } = await supabaseClient.from('maliyetler').update(payload).eq('id', item.id);
    if (error) {
      toast.error("Güncelleme başarısız.");
    } else {
      toast.success("Maliyetler güncellendi.");
      queryClient.invalidateQueries({ queryKey: ["maliyetler"] });
    }
    setFormulaConfirmData(null);
  };

  const renderTableRow = (item: ProductCost) => (
    <tr 
      key={item.id} 
      className="border-b border-white/5 hover:bg-white/5 transition-colors group cursor-pointer"
      onClick={() => setEditingProduct(item)}
    >
      <td className="px-2 py-2 text-xs font-medium text-white whitespace-nowrap">{item.urun_adi}</td>
      <td className="px-2 py-2 text-xs text-white/80">{item.baski} ₺</td>
      <td className="px-2 py-2 text-xs text-white/80">{item.pvc} ₺</td>
      <td className="px-2 py-2 text-xs text-white/80">{item.mdf_1_5} ₺</td>
      <td className="px-2 py-2 text-xs text-white/80">{item.mdf_2_7} ₺</td>
      <td className="px-2 py-2 text-xs text-white/80">{item.mdf_4} ₺</td>
      <td className="px-2 py-2 text-xs text-white/80">{item.kumas} ₺</td>
      <td className="px-2 py-2 text-xs text-white/80">{item.iscilik} ₺</td>
      <td className="px-2 py-2 text-xs text-white/80">{item.lazer} ₺</td>
      <td className="px-2 py-2 text-xs text-white/80">{item.genel_giderler} ₺</td>
      <td className="px-2 py-2 text-xs">
        <Input 
          type="number" 
          min="1"
          value={item.sayfa_sayisi ?? 1} 
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            const val = Number(e.target.value) || 1;
            queryClient.setQueryData(["maliyetler"], (old: ProductCost[] | undefined) => {
              if (!old) return old;
              return old.map(c => c.id === item.id ? { ...c, sayfa_sayisi: val } : c);
            });
          }}
          onBlur={(e) => {
            const val = Number(e.target.value) || 1;
            updateMutation.mutate({ ...item, sayfa_sayisi: val });
          }}
          className="w-14 bg-[#0A0A0A] border-[#1a1a1e] h-7 text-xs text-center p-0.5 text-white"
        />
      </td>
      <td className="px-2 py-2 text-xs whitespace-nowrap font-bold text-[#A67C52]">{calculateUnitCost(item).toLocaleString()} ₺</td>
      <td className="px-2 py-2 text-xs text-right whitespace-nowrap">
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10" onClick={(e) => { e.stopPropagation(); handleApplyFormula(item); }} title="Reçete Hesapla">
            <Calculator className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-[#9E9696] hover:text-[#A67C52]" onClick={(e) => { e.stopPropagation(); setEditingProduct(item); }}>
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10" onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="p-4 md:p-8 space-y-8 w-full mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Maliyet Hesaplama</h1>
        <p className="text-sm text-[#9E9696] mt-1">
          Ürün bazlı maliyet konfigürasyonu ve hızlı sipariş hesaplamaları.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-9">
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
                      <th className="px-2 py-2 text-[11px] whitespace-nowrap rounded-tl-lg min-w-[150px]">Ürün Adı</th>
                      <th className="px-2 py-2 text-[11px]">Baskı</th>
                      <th className="px-2 py-2 text-[11px]">PVC</th>
                      <th className="px-2 py-2 text-[11px] whitespace-nowrap">MDF 1.5</th>
                      <th className="px-2 py-2 text-[11px] whitespace-nowrap">MDF 2.7</th>
                      <th className="px-2 py-2 text-[11px] whitespace-nowrap">MDF 4</th>
                      <th className="px-2 py-2 text-[11px]">Kumaş</th>
                      <th className="px-2 py-2 text-[11px]">İşçilik</th>
                      <th className="px-2 py-2 text-[11px]">Lazer</th>
                      <th className="px-2 py-2 text-[11px] whitespace-nowrap">Genel Giderler</th>
                      <th className="px-2 py-2 text-[11px] whitespace-nowrap">Sayfalar</th>
                      <th className="px-2 py-2 text-[11px] whitespace-nowrap font-bold text-[#A67C52]">Birim Maliyeti</th>
                      <th className="px-2 py-2 text-[11px] whitespace-nowrap rounded-tr-lg text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {panoramikItems.length > 0 && (
                      <React.Fragment>
                        <tr 
                          className="bg-[#1a1a1e] border-b border-white/5 cursor-pointer hover:bg-[#1a1a1e]/80 transition-colors"
                          onClick={() => setIsPanoramikOpen(!isPanoramikOpen)}
                        >
                          <td colSpan={13} className="px-4 py-3 font-bold text-[#A67C52] text-sm">
                            <div className="flex items-center gap-2">
                              {isPanoramikOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                              Panoramik Albümler ({panoramikItems.length})
                            </div>
                          </td>
                        </tr>
                        {isPanoramikOpen && panoramikItems.map(renderTableRow)}
                      </React.Fragment>
                    )}
                    
                    {baskiItems.length > 0 && (
                      <React.Fragment>
                        <tr 
                          className="bg-[#1a1a1e] border-b border-white/5 cursor-pointer hover:bg-[#1a1a1e]/80 transition-colors"
                          onClick={() => setIsBaskiOpen(!isBaskiOpen)}
                        >
                          <td colSpan={13} className="px-4 py-3 font-bold text-[#A67C52] text-sm">
                            <div className="flex items-center gap-2">
                              {isBaskiOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                              Baskı Ürünleri ({baskiItems.length})
                            </div>
                          </td>
                        </tr>
                        {isBaskiOpen && baskiItems.map(renderTableRow)}
                      </React.Fragment>
                    )}

                    {otherItems.length > 0 && (
                      <React.Fragment>
                        <tr 
                          className="bg-[#1a1a1e] border-b border-white/5 cursor-pointer hover:bg-[#1a1a1e]/80 transition-colors"
                          onClick={() => setIsDigerOpen(!isDigerOpen)}
                        >
                          <td colSpan={13} className="px-4 py-3 font-bold text-[#A67C52] text-sm">
                            <div className="flex items-center gap-2">
                              {isDigerOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                              Diğer Ürünler ({otherItems.length})
                            </div>
                          </td>
                        </tr>
                        {isDigerOpen && otherItems.map(renderTableRow)}
                      </React.Fragment>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="mt-6 flex justify-end gap-3">

              <Button 
                onClick={() => setIsZamModalOpen(true)}
                className="bg-slate-800 hover:bg-slate-700 text-white gap-2 font-bold px-6 shadow-lg rounded-xl transition-colors"
              >
                <TrendingUp className="w-4 h-4" /> Toplu Zam Uygula
              </Button>
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

        <div className="xl:col-span-3 space-y-8">
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

      <Dialog open={isZamModalOpen} onOpenChange={(open) => !open && setIsZamModalOpen(false)}>
        <DialogContent className="bg-[#131316] border-[#1a1a1e] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-400" /> Toplu Zam Uygula</DialogTitle>
            <DialogDescription className="text-[#9E9696]">
              Tüm ürünlerde belirli bir maliyet kalemini toplu olarak artırın.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6 space-y-4">
            <div>
              <label className="block text-sm font-bold text-[#9E9696] mb-2">Maliyet Kalemi</label>
              <Select value={zamData.column} onValueChange={(val) => setZamData({ ...zamData, column: val })}>
                <SelectTrigger className="w-full bg-[#0A0A0A] border-[#1a1a1e] text-white h-12 rounded-xl focus:ring-[#A67C52]">
                  <SelectValue placeholder="Seçiniz" />
                </SelectTrigger>
                <SelectContent className="bg-[#131316] border-[#1a1a1e] text-white">
                  <SelectItem value="baski">Baskı</SelectItem>
                  <SelectItem value="pvc">PVC</SelectItem>
                  <SelectItem value="mdf_1_5">MDF 1.5mm</SelectItem>
                  <SelectItem value="mdf_2_7">MDF 2.7mm</SelectItem>
                  <SelectItem value="mdf_4">MDF 4mm</SelectItem>
                  <SelectItem value="kumas">Kumaş</SelectItem>
                  <SelectItem value="iscilik">İşçilik</SelectItem>
                  <SelectItem value="lazer">Lazer</SelectItem>
                  <SelectItem value="genel_giderler">Genel Giderler</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#9E9696] mb-2">Zam Tipi</label>
              <Select value={zamData.type} onValueChange={(val) => setZamData({ ...zamData, type: val })}>
                <SelectTrigger className="w-full bg-[#0A0A0A] border-[#1a1a1e] text-white h-12 rounded-xl focus:ring-[#A67C52]">
                  <SelectValue placeholder="Seçiniz" />
                </SelectTrigger>
                <SelectContent className="bg-[#131316] border-[#1a1a1e] text-white">
                  <SelectItem value="percentage">% Yüzde</SelectItem>
                  <SelectItem value="fixed">₺ Sabit Tutar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#9E9696] mb-2">Zam Miktarı</label>
              <Input 
                type="number"
                value={zamData.amount}
                onChange={(e) => setZamData({ ...zamData, amount: e.target.value })}
                placeholder={zamData.type === 'percentage' ? "Örn: 25 (Yüzde 25)" : "Örn: 50 (50 TL)"}
                className="w-full bg-[#0A0A0A] border-[#1a1a1e] text-white h-12 rounded-xl focus:ring-[#A67C52]"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="ghost" onClick={() => setIsZamModalOpen(false)} className="text-[#9E9696] hover:text-white">
              İptal
            </Button>
            <Button 
              onClick={handleTopluZam} 
              disabled={isUpdatingBulk}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 rounded-xl"
            >
              {isUpdatingBulk ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uygulanıyor...</>
              ) : "Uygula"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!formulaConfirmData} onOpenChange={(open) => !open && setFormulaConfirmData(null)}>
        <DialogContent className="bg-[#131316] border-[#1a1a1e] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-400" />
              Reçete Hesaplandı
            </DialogTitle>
            <DialogDescription className="text-[#9E9696]">
              {formulaConfirmData?.item.urun_adi} için güncel ham madde fiyatlarına göre önerilen maliyetler:
            </DialogDescription>
          </DialogHeader>
          
          {formulaConfirmData && (
            <div className="py-4 space-y-3">
              <div className="flex justify-between items-center bg-[#0A0A0A] p-3 rounded-xl border border-white/5">
                <span className="text-[#9E9696] font-medium">Baskı</span>
                <span className="font-bold text-white text-lg">{formulaConfirmData.calc.baski_new} ₺</span>
              </div>
              <div className="flex justify-between items-center bg-[#0A0A0A] p-3 rounded-xl border border-white/5">
                <span className="text-[#9E9696] font-medium">PVC</span>
                <span className="font-bold text-white text-lg">{formulaConfirmData.calc.pvc_new} ₺</span>
              </div>
              <div className="flex justify-between items-center bg-[#0A0A0A] p-3 rounded-xl border border-white/5">
                <span className="text-[#9E9696] font-medium">MDF</span>
                <span className="font-bold text-white text-lg">{formulaConfirmData.calc.mdf_new} ₺</span>
              </div>
              <div className="flex justify-between items-center bg-[#0A0A0A] p-3 rounded-xl border border-white/5">
                <span className="text-[#9E9696] font-medium">Kumaş</span>
                <span className="font-bold text-white text-lg">{formulaConfirmData.calc.kumas_new} ₺</span>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-end gap-3 border-t border-[#1a1a1e] pt-4">
            <Button variant="ghost" onClick={() => setFormulaConfirmData(null)} className="text-[#9E9696] hover:text-white">
              İptal
            </Button>
            <Button 
              onClick={executeFormulaUpdate} 
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 shadow-lg shadow-blue-900/20 rounded-xl transition-colors"
            >
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

            <label className="block text-sm font-bold text-[#9E9696] mb-3 mt-4">Sayfa Sayısı</label>
            <Input 
              type="number" 
              min="1"
              value={newSayfaSayisi} 
              onChange={(e) => setNewSayfaSayisi(Number(e.target.value) || 1)} 
              className="bg-[#0A0A0A] border-[#1a1a1e] text-white h-12 rounded-xl focus-visible:ring-[#A67C52]" 
            />
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
              <div className="flex flex-col gap-2 bg-white/5 p-4 rounded-xl border border-white/5 mb-2">
                <label className="block text-xs font-bold text-[#A67C52] uppercase tracking-wider">Sayfa Sayısı</label>
                <div>
                  <span className="block text-[10px] text-[#9E9696] mb-1">Adet</span>
                  <Input 
                    type="number" 
                    value={editingProduct.sayfa_sayisi ?? 1} 
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setEditingProduct({
                        ...editingProduct,
                        sayfa_sayisi: val
                      });
                    }} 
                    className="bg-[#0A0A0A] border-[#1a1a1e] focus-visible:ring-[#A67C52]" 
                  />
                </div>
              </div>
              {[
                { label: 'Baskı', field: 'baski', isAutoQty: true },
                { label: 'PVC', field: 'pvc', isAutoQty: true },
                { label: 'MDF 1.5mm', field: 'mdf_1_5' },
                { label: 'MDF 2.7mm', field: 'mdf_2_7' },
                { label: 'MDF 4mm', field: 'mdf_4' },
                { label: 'Kumaş', field: 'kumas' },
                { label: 'İşçilik', field: 'iscilik' },
                { label: 'Lazer', field: 'lazer' },
                { label: 'Genel Giderler', field: 'genel_giderler' }
              ].map((item) => (
                <div key={item.field} className="flex flex-col gap-2 bg-white/5 p-4 rounded-xl border border-white/5">
                  <label className="block text-xs font-bold text-[#A67C52] uppercase tracking-wider">{item.label}</label>
                  <div className={`grid ${item.isAutoQty ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                    <div>
                      <span className="block text-[10px] text-[#9E9696] mb-1">Birim Fiyat (₺)</span>
                      <Input 
                        type="number" 
                        value={editingProduct[item.field as keyof ProductCost] ?? 0} 
                        onChange={(e) => handleEditChange(item.field as keyof ProductCost, e.target.value)} 
                        className="bg-[#0A0A0A] border-[#1a1a1e] focus-visible:ring-[#A67C52]" 
                      />
                    </div>
                    {item.isAutoQty && (
                      <div>
                        <span className="block text-[10px] text-[#9E9696] mb-1">Adet (Otomatik)</span>
                        <Input 
                          type="number" 
                          readOnly
                          value={item.field === 'baski' ? (editingProduct.sayfa_sayisi ?? 1) : ((editingProduct.sayfa_sayisi ?? 1) + 1)} 
                          className="bg-[#0A0A0A] border-[#1a1a1e] focus-visible:ring-[#A67C52] opacity-50 cursor-not-allowed" 
                        />
                      </div>
                    )}
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
