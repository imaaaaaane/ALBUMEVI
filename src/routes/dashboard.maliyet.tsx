import { createFileRoute } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";
import { Calculator, Loader2, Edit2, TrendingUp, Plus, Trash2, Minus, GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseClient } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/dashboard/maliyet")({
  component: MaliyetView,
});

type ProductCost = {
  id: number;
  urun_adi: string;
  sira?: number;
  kategori?: string;
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
  
  
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState<string>("");

  const getCategory = (c: ProductCost) => {
    if (c.kategori) return c.kategori;
    if (c.urun_adi.toLowerCase().includes('panoramik')) return 'Panoramik Albümler';
    if (c.urun_adi.toLowerCase().includes('baskı') || c.urun_adi.toLowerCase().includes('baski')) return 'Baskı Ürünleri';
    return 'Diğer Ürünler';
  };

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ oldName, newName, itemIds }: { oldName: string, newName: string, itemIds: number[] }) => {
      const { error } = await supabaseClient
        .from("maliyetler")
        .update({ kategori: newName })
        .in("id", itemIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maliyetler"] });
      toast.success("Kategori adı güncellendi.");
      setEditingCategory(null);
    },
    onError: (err: any) => {
      toast.error(`Kategori güncellenirken hata oluştu: ${err.message}`);
    }
  });

  const handleCategorySave = (oldName: string, items: ProductCost[]) => {
    if (!newCategoryName.trim() || newCategoryName === oldName) {
      setEditingCategory(null);
      return;
    }
    
    // Optimistic update
    queryClient.setQueryData(["maliyetler"], (old: ProductCost[] | undefined) => {
      if (!old) return old;
      return old.map(c => getCategory(c) === oldName ? { ...c, kategori: newCategoryName } : c);
    });

    const itemIds = items.map(i => i.id);
    updateCategoryMutation.mutate({ oldName, newName: newCategoryName, itemIds });
  };


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
        .order("sira", { ascending: true })
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

  const sortedTableCosts = [...costs]; // Data is already sorted by 'sira' from Supabase

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

  
  
  const updateSiraMutation = useMutation({
    mutationFn: async (updates: { id: number; sira: number; kategori?: string }[]) => {
      // Use Promise.all to safely update only the 'sira' field without replacing other columns
      const updatePromises = updates.map(u => 
        supabaseClient.from("maliyetler").update({ sira: u.sira, ...(u.kategori !== undefined ? { kategori: u.kategori } : {}) }).eq("id", u.id)
      );
      const results = await Promise.all(updatePromises);
      const error = results.find(r => r.error)?.error;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maliyetler"] });
    },
    onError: (err: any) => {
      toast.error(`Sıralama güncellenirken hata oluştu: ${err.message}`);
    }
  });

  
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const { source, destination } = result;
    const sourceCategory = source.droppableId;
    const destinationCategory = destination.droppableId;
    
    const allItems = [...sortedTableCosts];
    
    const movedItemIndex = allItems.findIndex(c => c.id.toString() === result.draggableId);
    if (movedItemIndex === -1) return;
    
    const [movedItem] = allItems.splice(movedItemIndex, 1);
    
    if (sourceCategory !== destinationCategory) {
      movedItem.kategori = destinationCategory;
    }
    
    const destItems = allItems.filter(c => getCategory(c) === destinationCategory);
    const itemAfter = destItems[destination.index];
    
    let insertIndex = allItems.length;
    if (itemAfter) {
      insertIndex = allItems.findIndex(c => c.id === itemAfter.id);
    } else if (destItems.length > 0) {
      const lastItemInDest = destItems[destItems.length - 1];
      insertIndex = allItems.findIndex(c => c.id === lastItemInDest.id) + 1;
    }
    
    allItems.splice(insertIndex, 0, movedItem);
    
    queryClient.setQueryData(["maliyetler"], allItems);
    
    const updates = allItems.map((item, index) => ({
      id: item.id,
      sira: index,
      ...(sourceCategory !== destinationCategory ? { kategori: getCategory(item) } : {})
    }));
    
    updateSiraMutation.mutate(updates);
  };


  
  const otherItems = sortedTableCosts.filter(c => !c.urun_adi.toLowerCase().includes('panoramik') && !c.urun_adi.toLowerCase().includes('baskı') && !c.urun_adi.toLowerCase().includes('baski'));

  const calculateFormula = (urunAdi: string, sayfaSayisi: number = 1) => {
    const match = urunAdi.match(/(\d+)x(\d+)/);
    if (!match) return null;
    
    const w = parseFloat(match[1]);
    const h = parseFloat(match[2]);
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

  
  const renderTableRow = (item: ProductCost, index: number) => (
    <Draggable key={item.id} draggableId={item.id.toString()} index={index}>
      {(provided, snapshot) => (
        <tr 
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`border-b border-white/5 hover:bg-white/5 transition-colors group cursor-pointer ${snapshot.isDragging ? 'bg-[#1a1a1e] shadow-2xl z-50' : ''}`}
          onClick={() => setEditingProduct(item)}
        >
          <td className="px-2 py-2 w-8 text-center" onClick={(e) => e.stopPropagation()}>
            <div {...provided.dragHandleProps} className="text-[#9E9696] hover:text-white cursor-grab active:cursor-grabbing flex items-center justify-center h-full w-full">
              <GripVertical className="w-4 h-4" />
            </div>
          </td>
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
      )}
    </Draggable>
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
                      <th className="px-2 py-2 w-8 rounded-tl-lg"></th>
                      <th className="px-2 py-2 text-[11px] whitespace-nowrap min-w-[150px]">Ürün Adı</th>
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
                  
                  <DragDropContext onDragEnd={onDragEnd}>
                    {Array.from(new Set(sortedTableCosts.map(getCategory))).map((categoryName) => {
                      const items = sortedTableCosts.filter(c => getCategory(c) === categoryName);
                      if (items.length === 0) return null;
                      
                      const isOpen = openCategories[categoryName] ?? false;
                      
                      return (
                        <Droppable key={categoryName} droppableId={categoryName}>
                          {(provided) => (
                            <tbody ref={provided.innerRef} {...provided.droppableProps}>
                              <tr 
                                className="bg-[#1a1a1e] border-b border-white/5 transition-colors"
                              >
                                <td colSpan={14} className="px-4 py-3 text-sm">
                                  <div className="flex items-center gap-3">
                                    <button 
                                      className="text-[#A67C52] hover:text-[#A67C52]/80"
                                      onClick={() => setOpenCategories(prev => ({ ...prev, [categoryName]: !isOpen }))}
                                    >
                                      {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                    </button>
                                    
                                    {editingCategory === categoryName ? (
                                      <div className="flex items-center gap-2">
                                        <Input
                                          autoFocus
                                          value={newCategoryName}
                                          onChange={(e) => setNewCategoryName(e.target.value)}
                                          onBlur={() => handleCategorySave(categoryName, items)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleCategorySave(categoryName, items);
                                            if (e.key === 'Escape') setEditingCategory(null);
                                          }}
                                          className="h-8 w-64 bg-[#0A0A0A] border-[#1a1a1e] text-white"
                                        />
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2 group/header">
                                        <span className="font-bold text-[#A67C52]">{categoryName} ({items.length})</span>
                                        <button 
                                          onClick={() => {
                                            setEditingCategory(categoryName);
                                            setNewCategoryName(categoryName);
                                          }}
                                          className="opacity-0 group-hover/header:opacity-100 transition-opacity text-[#9E9696] hover:text-white"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                              {isOpen && items.map((item, index) => renderTableRow(item, index))}
                              {provided.placeholder}
                            </tbody>
                          )}
                        </Droppable>
                      );
                    })}
                  </DragDropContext>

                </table>
              </div>
            )}
            
            <div className="mt-6 flex justify-end gap-3">

              
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
                  type="number" step="any" 
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
                          type="number" step="any" 
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
