import { createFileRoute } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";
import { Package, ScrollText, Zap, Layers, GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseClient } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

export const Route = createFileRoute("/dashboard/ham-madde")({
  component: HamMaddeView,
});

type HamMadde = {
  id: string | number;
  malzeme_adi: string;
  sira?: number;
  plaka_en: number;
  plaka_boy: number;
  plaka_fiyat: number;
  ilac_fiyati?: number;
  adet?: number;
};

const PLAKA_NAMES = ['PVC', 'MDF 1.5', 'MDF 2.7', 'MDF 4', 'KUMAŞ'];
const RULO_NAMES = ['BASKI'];
const SABIT_NAMES = ['İŞÇİLİK', 'LAZER', 'GENEL GİDERLER'];

const defaultList: HamMadde[] = [
  { id: '1', malzeme_adi: 'BASKI', plaka_en: 0, plaka_boy: 0, plaka_fiyat: 0, ilac_fiyati: 0, adet: 1 },
  { id: '2', malzeme_adi: 'PVC', plaka_en: 660, plaka_boy: 1070, plaka_fiyat: 0 },
  { id: '3', malzeme_adi: 'MDF 1.5', plaka_en: 2800, plaka_boy: 2100, plaka_fiyat: 0 },
  { id: '4', malzeme_adi: 'MDF 2.7', plaka_en: 2800, plaka_boy: 2100, plaka_fiyat: 0 },
  { id: '5', malzeme_adi: 'MDF 4', plaka_en: 2800, plaka_boy: 2100, plaka_fiyat: 0 },
  { id: '6', malzeme_adi: 'KUMAŞ', plaka_en: 1400, plaka_boy: 1000, plaka_fiyat: 0 },
  { id: '7', malzeme_adi: 'İŞÇİLİK', plaka_en: 0, plaka_boy: 0, plaka_fiyat: 0 },
  { id: '8', malzeme_adi: 'LAZER', plaka_en: 0, plaka_boy: 0, plaka_fiyat: 0 },
  { id: '9', malzeme_adi: 'GENEL GİDERLER', plaka_en: 0, plaka_boy: 0, plaka_fiyat: 0 }
];

function HamMaddeView() {
  const queryClient = useQueryClient();
  const [hamMaddeler, setHamMaddeler] = useState<HamMadde[]>(defaultList);
  
  const [selectedPanoramik, setSelectedPanoramik] = useState<string>('none');
  const [selectedBaski, setSelectedBaski] = useState<string>('none');

  const [localYields, setLocalYields] = useState<Record<string, number>>({});

  const fetchHamMaddeler = async () => {
    try {
      const { data, error } = await supabaseClient.from('ham_maddeler').select('*').order('sira', { ascending: true }).order('malzeme_adi', { ascending: true });
      if (error) throw error;
      
      if (!data || data.length === 0) { 
        setHamMaddeler(defaultList); 
      } else { 
        setHamMaddeler(data); 
      }
    } catch (error) {
      console.error('Supabase fetch error:', error);
      setHamMaddeler(defaultList);
    }
  };

  useEffect(() => {
    fetchHamMaddeler();
  }, []);

  const { data: allAlbums = [] } = useQuery({
    queryKey: ['albums_unique'],
    queryFn: async () => {
      const { data, error } = await supabaseClient.from('maliyetler').select('urun_adi');
      if (error) throw error;
      if (!data) return [];
      const unique = Array.from(new Set(data.map((d: any) => d.urun_adi)));
      return unique.sort() as string[];
    }
  });

  const panoramikList = allAlbums.filter(a => a?.toLowerCase().includes('panoramik'));
  const baskiList = allAlbums.filter(a => a?.toLowerCase().includes('baskı') || a?.toLowerCase().includes('baski'));

  const { data: yieldsPanoramik = [] } = useQuery({
    queryKey: ['ebatlama_verimi', selectedPanoramik],
    queryFn: async () => {
      if (selectedPanoramik === 'none') return [];
      const { data, error } = await supabaseClient
        .from('ebatlama_verimi')
        .select('*')
        .eq('urun_adi', selectedPanoramik);
      if (error) throw error;
      return data || [];
    },
    enabled: selectedPanoramik !== 'none'
  });

  const { data: yieldsBaski = [] } = useQuery({
    queryKey: ['ebatlama_verimi', selectedBaski],
    queryFn: async () => {
      if (selectedBaski === 'none') return [];
      const { data, error } = await supabaseClient
        .from('ebatlama_verimi')
        .select('*')
        .eq('urun_adi', selectedBaski);
      if (error) throw error;
      return data || [];
    },
    enabled: selectedBaski !== 'none'
  });

  const { data: selectedAlbumCosts } = useQuery({
    queryKey: ['album_costs', selectedBaski],
    queryFn: async () => {
      if (!selectedBaski || selectedBaski === 'none') return null;
      const { data, error } = await supabaseClient
        .from('maliyetler')
        .select('rulo_fiyati, ilac_fiyati')
        .eq('urun_adi', selectedBaski)
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data || { rulo_fiyati: 0, ilac_fiyati: 0 };
    },
    enabled: selectedBaski !== 'none'
  });

  const updateAlbumCostMutation = useMutation({
    mutationFn: async (payload: { field: string, value: number }) => {
      const { error } = await supabaseClient
        .from('maliyetler')
        .update({ [payload.field]: payload.value })
        .eq('urun_adi', selectedBaski);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['album_costs', selectedBaski] });
    }
  });

  const { data: globalMaliyetler } = useQuery({
    queryKey: ['global_maliyetler'],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from('maliyetler')
        .select('genel_giderler, iscilik, lazer')
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
  });

  const [yeniFiyatlar, setYeniFiyatlar] = useState<Record<string, string>>({});

  const handleSabitGiderSubmit = async (hm: HamMadde) => {
    const val = yeniFiyatlar[hm.id];
    if (!val) return;
    
    const numericVal = Number(val);
    
    let maliyetColumn = null;
    const name = hm.malzeme_adi.toUpperCase();
    if (name === 'GENEL GİDERLER') maliyetColumn = 'genel_giderler';
    if (name === 'İŞÇİLİK') maliyetColumn = 'iscilik';
    if (name === 'LAZER') maliyetColumn = 'lazer';

    if (maliyetColumn) {
      const { error } = await supabaseClient
        .from('maliyetler')
        .update({ [maliyetColumn]: numericVal })
        .not('id', 'is', null);
        
      if (error) {
        toast.error("Maliyetler güncellenemedi.");
        return;
      }
    }
    
    // Also sync ham_maddeler to be safe
    updateMutation.mutate({
      malzeme_adi: hm.malzeme_adi,
      plaka_en: hm.plaka_en,
      plaka_boy: hm.plaka_boy,
      plaka_fiyat: numericVal
    });

    queryClient.invalidateQueries({ queryKey: ['global_maliyetler'] });
    setYeniFiyatlar(prev => ({...prev, [hm.id]: ''}));

    toast.success(`${hm.malzeme_adi} maliyeti güncellendi.`);
  };

  const getEskiFiyat = (hm: HamMadde) => {
    const name = hm.malzeme_adi.toUpperCase();
    if (globalMaliyetler) {
      if (name === 'GENEL GİDERLER') return globalMaliyetler.genel_giderler || 0;
      if (name === 'İŞÇİLİK') return globalMaliyetler.iscilik || 0;
      if (name === 'LAZER') return globalMaliyetler.lazer || 0;
    }
    return Number(hm.plaka_fiyat) || 0;
  };

  const [localRuloFiyat, setLocalRuloFiyat] = useState<string>('');
  const [localIlacFiyat, setLocalIlacFiyat] = useState<string>('');

  useEffect(() => {
    if (selectedBaski !== 'none' && selectedAlbumCosts) {
      setLocalRuloFiyat(selectedAlbumCosts.rulo_fiyati?.toString() || '0');
      setLocalIlacFiyat(selectedAlbumCosts.ilac_fiyati?.toString() || '0');
    } else if (selectedBaski === 'none') {
      const baskiHm = hamMaddeler.find(h => h.malzeme_adi === 'BASKI');
      setLocalRuloFiyat(baskiHm?.plaka_fiyat?.toString() || '0');
      setLocalIlacFiyat(baskiHm?.ilac_fiyati?.toString() || '0');
    }
  }, [selectedBaski, selectedAlbumCosts, hamMaddeler]);

  const handleRuloBlur = (hm: HamMadde) => {
    if (selectedBaski !== 'none') {
      updateAlbumCostMutation.mutate({ field: 'rulo_fiyati', value: Number(localRuloFiyat) || 0 });
    } else {
      handleUpdate(hm, 'plaka_fiyat', localRuloFiyat);
    }
  };

  const handleIlacBlur = (hm: HamMadde) => {
    if (selectedBaski !== 'none') {
      updateAlbumCostMutation.mutate({ field: 'ilac_fiyati', value: Number(localIlacFiyat) || 0 });
    } else {
      handleUpdate(hm, 'ilac_fiyati', localIlacFiyat);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (payload: { malzeme_adi: string; plaka_en: number; plaka_boy: number; plaka_fiyat: number; ilac_fiyati?: number; adet?: number; }) => {
      const { data, error } = await supabaseClient
        .from("ham_maddeler")
        .update({
          plaka_en: payload.plaka_en,
          plaka_boy: payload.plaka_boy,
          plaka_fiyat: payload.plaka_fiyat,
          ilac_fiyati: payload.ilac_fiyati,
          adet: payload.adet
        })
        .eq("malzeme_adi", payload.malzeme_adi);
        
      if (error) {
        console.error("Supabase update error:", error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      // Background re-fetch to ensure sync without blocking UI
      fetchHamMaddeler();
    },
    onError: (error) => {
      console.error("Güncelleme hatası:", error);
    }
  });

  const updateYieldMutation = useMutation({
    mutationFn: async (payload: { urun_adi: string; malzeme_adi: string; cikan_adet: number }) => {
      const { data, error } = await supabaseClient
        .from('ebatlama_verimi')
        .upsert(
          { 
            urun_adi: payload.urun_adi, 
            malzeme_adi: payload.malzeme_adi, 
            cikan_adet: payload.cikan_adet 
          }, 
          { onConflict: 'urun_adi,malzeme_adi' }
        );

      if (error) {
        console.error("Supabase upsert error:", error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ebatlama_verimi'] });
    },
    onError: (error) => {
      console.error("Verim güncelleme hatası:", error);
    }
  });

  const handleUpdate = (hm: HamMadde, field: 'plaka_en' | 'plaka_boy' | 'plaka_fiyat' | 'ilac_fiyati' | 'adet', val: string) => {
    const numericVal = Number(val) || 0;
    
    updateMutation.mutate({
      malzeme_adi: hm.malzeme_adi,
      plaka_en: field === 'plaka_en' ? numericVal : hm.plaka_en,
      plaka_boy: field === 'plaka_boy' ? numericVal : hm.plaka_boy,
      plaka_fiyat: field === 'plaka_fiyat' ? numericVal : hm.plaka_fiyat,
      ilac_fiyati: field === 'ilac_fiyati' ? numericVal : hm.ilac_fiyati,
      adet: field === 'adet' ? numericVal : hm.adet,
    });
  };

  const handleYieldUpdate = (malzeme_adi: string, val: string, type: 'panoramik' | 'baski') => {
    const album = type === 'panoramik' ? selectedPanoramik : selectedBaski;
    if (album === 'none') return;
    const numericVal = Number(val) || 0;
    updateYieldMutation.mutate({
      urun_adi: album,
      malzeme_adi,
      cikan_adet: numericVal
    });
  };

  const handleLocalChange = (id: string | number, field: keyof HamMadde, val: string) => {
    const numericVal = val === '' ? 0 : Number(val);
    setHamMaddeler(prev => prev.map(hm => hm.id === id ? { ...hm, [field]: numericVal } : hm));
  };

  const handleLocalYieldChange = (malzeme_adi: string, val: string) => {
    const numericVal = val === '' ? 0 : Number(val);
    setLocalYields(prev => ({ ...prev, [malzeme_adi]: numericVal }));
  };

  const normalizeString = (str: string) => (str || '').trim().toUpperCase();

  const getYieldValue = (malzeme_adi: string, type: 'panoramik' | 'baski') => {
    const norm = normalizeString(malzeme_adi);
    // Prefer local unsaved yield for immediate reactivity
    const localKey = Object.keys(localYields).find(k => normalizeString(k) === norm);
    if (localKey !== undefined && localYields[localKey] !== undefined) {
      return localYields[localKey];
    }
    
    // Otherwise return database value
    const list = type === 'panoramik' ? yieldsPanoramik : yieldsBaski;
    const found = list.find((y: any) => normalizeString(y.malzeme_adi) === norm);
    return found ? found.cikan_adet : 0;
  };

  const handlePanoramikChange = (val: string) => {
    setSelectedPanoramik(val);
    setLocalYields({});
  };

  const handleBaskiChange = (val: string) => {
    setSelectedBaski(val);
    setLocalYields({});
  };

  const plakaMaterials = hamMaddeler.filter(m => PLAKA_NAMES.includes(normalizeString(m.malzeme_adi)));
  const ruloMaterials = hamMaddeler.filter(m => RULO_NAMES.includes(normalizeString(m.malzeme_adi)));
  const sabitGiderler = hamMaddeler.filter(m => SABIT_NAMES.includes(normalizeString(m.malzeme_adi)));

  const isPanoramikSelected = selectedPanoramik !== 'none';
  
  const updateSiraMutation = useMutation({
    mutationFn: async (updates: { id: string | number; sira: number }[]) => {
      const updatePromises = updates.map(u => 
        supabaseClient.from("ham_maddeler").update({ sira: u.sira }).eq("id", u.id)
      );
      const results = await Promise.all(updatePromises);
      const error = results.find(r => r.error)?.error;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ham_maddeler"] });
    },
    onError: (err: any) => {
      toast.error(`Sıralama güncellenirken hata oluştu: ${err.message}`);
    }
  });

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const { source, destination } = result;
    if (source.droppableId !== destination.droppableId) return; // Only allow sorting within same table

    const getList = (id: string) => {
      if (id === "plaka") return plakaMaterials;
      if (id === "rulo") return ruloMaterials;
      if (id === "sabit") return sabitGiderler;
      return [];
    };

    const list = Array.from(getList(source.droppableId));
    const [moved] = list.splice(source.index, 1);
    list.splice(destination.index, 0, moved);

    // Reconstruct hamMaddeler with new order for this section
    const newHamMaddeler = [...hamMaddeler];
    
    // We can map over list and update the items in newHamMaddeler
    // Wait, since we are only reordering a sublist, we can extract the sorted indices
    // To do this properly, we can just replace the items in newHamMaddeler that match
    // But wait, if they are sorted by sira globally, we can just assign sira as the current index in the new total array.
    // Or we can just re-map the sublist's sira values?
    // Actually, if we just reconstruct:
    const updatedOrder = [
      ...(source.droppableId === "plaka" ? list : plakaMaterials),
      ...(source.droppableId === "rulo" ? list : ruloMaterials),
      ...(source.droppableId === "sabit" ? list : sabitGiderler),
      ...hamMaddeler.filter(hm => !PLAKA_NAMES.includes(normalizeString(hm.malzeme_adi)) && !RULO_NAMES.includes(normalizeString(hm.malzeme_adi)) && !SABIT_NAMES.includes(normalizeString(hm.malzeme_adi)))
    ];

    setHamMaddeler(updatedOrder);

    const updates = updatedOrder.map((item, index) => ({
      id: item.id,
      sira: index
    }));
    
    updateSiraMutation.mutate(updates);
  };

  const isBaskiSelected = selectedBaski !== 'none';

  return (
    <DragDropContext onDragEnd={onDragEnd}>
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-white/5">
            <Layers className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Ham Madde Maliyetleri</h1>
            <p className="text-[#9E9696] mt-1">Malzeme ve gider gruplarının güncel fiyat tanımlamaları.</p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* TABLE 1: PLAKA VE TABAKA */}
        <div className="bg-[#131316] rounded-2xl border border-white/5 shadow-xl overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-black/20">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-bold text-white">Plaka ve Tabaka Maliyetleri</h2>
            </div>
            <div className="w-full sm:w-72">
              <Select value={selectedPanoramik} onValueChange={handlePanoramikChange}>
                <SelectTrigger className="w-full bg-[#0A0A0A] border-[#1a1a1e] text-white focus:ring-blue-500">
                  <SelectValue placeholder="Panoramik Ebat Seçin" />
                </SelectTrigger>
                <SelectContent className="bg-[#131316] border-[#1a1a1e] text-white">
                  <SelectItem value="none">Seçim Yok (Yalnızca Fiyatlar)</SelectItem>
                  {panoramikList.map(a => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[#9E9696] text-xs font-medium uppercase tracking-wider">
                  <th className="px-2 py-4 w-8"></th><th className="px-4 py-4 whitespace-nowrap">Malzeme Adı</th>
                  <th className="px-6 py-4">Plaka Eni (mm)</th>
                  <th className="px-6 py-4">Plaka Boyu (mm)</th>
                  <th className="px-6 py-4">Plaka Fiyatı (₺)</th>
                  {isPanoramikSelected && (
                    <>
                      <th className="px-6 py-4 text-[#A67C52]">Çıkan Adet</th>
                      <th className="px-6 py-4 text-[#A67C52]">Birim Maliyeti (₺)</th>
                    </>
                  )}
                </tr>
              </thead>
              <Droppable droppableId="plaka">
                  {(provided) => (
                    <tbody ref={provided.innerRef} {...provided.droppableProps} className="divide-y divide-white/5">
                      {plakaMaterials.map((hm, index) => {
                  const adet = Number(isPanoramikSelected ? getYieldValue(hm.malzeme_adi, 'panoramik') : 0) || 0;
                  const fiyat = Number(hm.plaka_fiyat) || 0;
                  const birimMaliyet = adet > 0 ? (fiyat / adet) : 0;
                  return (
                    <Draggable key={hm.id} draggableId={hm.id.toString()} index={index}>
                        {(provided, snapshot) => (
                          <tr 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`hover:bg-white/[0.02] transition-colors group ${snapshot.isDragging ? 'bg-[#1a1a1e] shadow-2xl z-50' : ''}`}
                          >
                            <td className="px-2 py-4 text-center">
                              <div {...provided.dragHandleProps} className="text-[#9E9696] hover:text-white cursor-grab active:cursor-grabbing flex justify-center">
                                <GripVertical className="w-4 h-4" />
                              </div>
                            </td>
                      <td className="px-4 py-4 text-white font-bold whitespace-nowrap">{hm.malzeme_adi}</td>
                      <td className="px-6 py-4 w-32">
                        <Input 
                          type="number" 
                          value={hm.plaka_en || ''}
                          className="h-10 bg-[#0A0A0A] border-[#1a1a1e] text-center font-medium text-white focus-visible:ring-blue-500"
                          onChange={(e) => handleLocalChange(hm.id, 'plaka_en', e.target.value)}
                          onBlur={(e) => handleUpdate(hm, 'plaka_en', e.target.value)}
                        />
                      </td>
                      <td className="px-6 py-4 w-32">
                        <Input 
                          type="number" 
                          value={hm.plaka_boy || ''}
                          className="h-10 bg-[#0A0A0A] border-[#1a1a1e] text-center font-medium text-white focus-visible:ring-blue-500"
                          onChange={(e) => handleLocalChange(hm.id, 'plaka_boy', e.target.value)}
                          onBlur={(e) => handleUpdate(hm, 'plaka_boy', e.target.value)}
                        />
                      </td>
                      <td className="px-6 py-4 w-40">
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number" 
                            value={hm.plaka_fiyat || ''}
                            className="h-10 bg-[#0A0A0A] border-[#1a1a1e] text-right font-medium text-white focus-visible:ring-blue-500"
                            onChange={(e) => handleLocalChange(hm.id, 'plaka_fiyat', e.target.value)}
                            onBlur={(e) => handleUpdate(hm, 'plaka_fiyat', e.target.value)}
                          />
                          <span className="text-[#9E9696]">₺</span>
                        </div>
                      </td>
                      {isPanoramikSelected && (
                        <>
                          <td className="px-6 py-4 w-32">
                            <Input 
                              type="number" 
                              value={adet || ''}
                              className="h-10 bg-[#A67C52]/10 border-[#A67C52]/30 text-center font-medium text-white focus-visible:ring-[#A67C52]"
                              onChange={(e) => handleLocalYieldChange(hm.malzeme_adi, e.target.value)}
                              onBlur={(e) => handleYieldUpdate(hm.malzeme_adi, e.target.value, 'panoramik')}
                            />
                          </td>
                          <td className="px-6 py-4 text-white font-bold text-lg">
                            {birimMaliyet.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                          </td>
                        </>
                      )}
                    </tr>
                        )}
                      </Draggable>
                  );
                })}
                {provided.placeholder}
              </tbody>
            )}
          </Droppable>
            </table>
          </div>
        </div>

        {/* TABLE 2: RULO MALİYETLERİ */}
        <div className="bg-[#131316] rounded-2xl border border-white/5 shadow-xl overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-black/20">
            <div className="flex items-center gap-3">
              <ScrollText className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-bold text-white">Rulo Maliyetleri</h2>
            </div>
            <div className="w-full sm:w-72">
              <Select value={selectedBaski} onValueChange={handleBaskiChange}>
                <SelectTrigger className="w-full bg-[#0A0A0A] border-[#1a1a1e] text-white focus:ring-purple-500">
                  <SelectValue placeholder="Baskı Ebadı Seçin" />
                </SelectTrigger>
                <SelectContent className="bg-[#131316] border-[#1a1a1e] text-white">
                  <SelectItem value="none">Seçim Yok (Yalnızca Fiyatlar)</SelectItem>
                  {baskiList.map(a => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[#9E9696] text-xs font-medium uppercase tracking-wider">
                  <th className="px-2 py-4 w-8"></th><th className="px-4 py-4 whitespace-nowrap">Malzeme Adı</th>
                  <th className="px-6 py-4">Rulo Fiyatı (₺)</th>
                  <th className="px-6 py-4">İlaç Fiyatı (₺)</th>
                  
                  {isBaskiSelected && (
                    <>
                      <th className="px-6 py-4 text-[#A67C52]">Çıkan Adet</th>
                      <th className="px-6 py-4 text-[#A67C52]">Birim Maliyeti (₺)</th>
                    </>
                  )}
                </tr>
              </thead>
              <Droppable droppableId="rulo">
                  {(provided) => (
                    <tbody ref={provided.innerRef} {...provided.droppableProps} className="divide-y divide-white/5">
                      {ruloMaterials.map((hm, index) => {
                  const cikanAdet = Number(isBaskiSelected ? getYieldValue(hm.malzeme_adi, 'baski') : 0) || 0;
                  const fiyat = Number(localRuloFiyat) || 0;
                  const ilac = Number(localIlacFiyat) || 0;
                  const toplamRulo = fiyat + ilac;
                  const birimMaliyet = cikanAdet > 0 ? (toplamRulo / cikanAdet) : 0;
                  return (
                    <Draggable key={hm.id} draggableId={hm.id.toString()} index={index}>
                        {(provided, snapshot) => (
                          <tr 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`hover:bg-white/[0.02] transition-colors group ${snapshot.isDragging ? 'bg-[#1a1a1e] shadow-2xl z-50' : ''}`}
                          >
                            <td className="px-2 py-4 text-center">
                              <div {...provided.dragHandleProps} className="text-[#9E9696] hover:text-white cursor-grab active:cursor-grabbing flex justify-center">
                                <GripVertical className="w-4 h-4" />
                              </div>
                            </td>
                      <td className="px-4 py-4 text-white font-bold whitespace-nowrap">{hm.malzeme_adi}</td>
                      <td className="px-6 py-4 w-40">
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number" 
                            value={localRuloFiyat}
                            className="h-10 bg-[#0A0A0A] border-[#1a1a1e] text-right font-medium text-white focus-visible:ring-purple-500"
                            onChange={(e) => setLocalRuloFiyat(e.target.value)}
                            onBlur={() => handleRuloBlur(hm)}
                          />
                          <span className="text-[#9E9696]">₺</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 w-40">
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number" 
                            value={localIlacFiyat}
                            className="h-10 bg-[#0A0A0A] border-[#1a1a1e] text-right font-medium text-white focus-visible:ring-purple-500"
                            onChange={(e) => setLocalIlacFiyat(e.target.value)}
                            onBlur={() => handleIlacBlur(hm)}
                          />
                          <span className="text-[#9E9696]">₺</span>
                        </div>
                      </td>

                      {isBaskiSelected && (
                        <>
                          <td className="px-6 py-4 w-32">
                            <Input 
                              type="number" 
                              value={cikanAdet || ''}
                              className="h-10 bg-[#A67C52]/10 border-[#A67C52]/30 text-center font-medium text-white focus-visible:ring-[#A67C52]"
                              onChange={(e) => handleLocalYieldChange(hm.malzeme_adi, e.target.value)}
                              onBlur={(e) => handleYieldUpdate(hm.malzeme_adi, e.target.value, 'baski')}
                            />
                          </td>
                          <td className="px-6 py-4 text-white font-bold text-lg">
                            {birimMaliyet.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                          </td>
                        </>
                      )}
                    </tr>
                        )}
                      </Draggable>
                  );
                })}
                {provided.placeholder}
              </tbody>
            )}
          </Droppable>
            </table>
          </div>
        </div>

        {/* TABLE 3: SABİT GİDERLER */}
        <div className="bg-[#131316] rounded-2xl border border-white/5 shadow-xl overflow-hidden">
          <div className="p-6 border-b border-white/5 flex items-center gap-3 bg-black/20">
            <Zap className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-bold text-white">Sabit Giderler ve İşlem Maliyetleri</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[#9E9696] text-xs font-medium uppercase tracking-wider">
                  <th className="px-2 py-4 w-8"></th><th className="px-4 py-4 w-1/3 whitespace-nowrap">İşlem Adı</th>
                  <th className="px-6 py-4 w-1/3">Eski Fiyat (₺)</th>
                  <th className="px-6 py-4 w-1/3">Yeni Fiyat (₺)</th>
                </tr>
              </thead>
              <Droppable droppableId="sabit">
                  {(provided) => (
                    <tbody ref={provided.innerRef} {...provided.droppableProps} className="divide-y divide-white/5">
                      {sabitGiderler.map((hm, index) => {
                  const eskiFiyat = getEskiFiyat(hm);
                  return (
                  <Draggable key={hm.id} draggableId={hm.id.toString()} index={index}>
                        {(provided, snapshot) => (
                          <tr 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`hover:bg-white/[0.02] transition-colors group ${snapshot.isDragging ? 'bg-[#1a1a1e] shadow-2xl z-50' : ''}`}
                          >
                            <td className="px-2 py-4 text-center">
                              <div {...provided.dragHandleProps} className="text-[#9E9696] hover:text-white cursor-grab active:cursor-grabbing flex justify-center">
                                <GripVertical className="w-4 h-4" />
                              </div>
                            </td>
                    <td className="px-4 py-4 text-white font-bold whitespace-nowrap">{hm.malzeme_adi}</td>
                    <td className="px-6 py-4 text-[#9E9696] font-medium text-lg">
                      {eskiFiyat.toLocaleString('tr-TR')} ₺
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 max-w-[200px]">
                        <Input 
                          type="number" 
                          value={yeniFiyatlar[hm.id] || ''}
                          className="h-10 bg-[#0A0A0A] border-[#1a1a1e] text-right font-medium text-white focus-visible:ring-yellow-500"
                          onChange={(e) => setYeniFiyatlar(prev => ({...prev, [hm.id]: e.target.value}))}
                          onBlur={() => handleSabitGiderSubmit(hm)}
                        />
                        <span className="text-[#9E9696]">₺</span>
                      </div>
                    </td>
                  </tr>
                        )}
                      </Draggable>
                  );
                })}
                {provided.placeholder}
              </tbody>
            )}
          </Droppable>
            </table>
          </div>
        </div>

      </div>
    </div>
    </DragDropContext>
  );
}
