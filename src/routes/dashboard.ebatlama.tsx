import { createFileRoute } from "@tanstack/react-router";
import React, { useState, useMemo, useRef, useEffect } from "react";
import { toJpeg } from "html-to-image";
import { Plus, Trash2, Download, Settings, Box, LayoutGrid, Loader2, Layers, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Sun, Moon, ArrowRightLeft, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseClient } from "@/lib/supabaseClient";

export const Route = createFileRoute("/dashboard/ebatlama")({
  component: EbatlamaView,
});

type CutItem = {
  id: string;
  sira: number;
  parcaAdi: string;
  boy: string;
  en: string;
  adet: string;
  plaka_tipi?: string;
};

type Rect = { w: number, h: number, x: number, y: number, effW: number, effH: number, name?: string };
type Plate = { w: number, h: number, shelves: { rects: Rect[] }[] };

const packPiecesMaxRects = (reqPieces: any[], pw: number, ph: number, bicak: number, autoRotate: boolean) => {
  let pieces = [...reqPieces].sort((a, b) => (b.w * b.h) - (a.w * a.h));
  let plates = [];

  while (pieces.length > 0) {
    let freeRects = [{ x: 0, y: 0, w: pw, h: ph }];
    let placedRects: any[] = [];
    let unplaced = [];

    for (let i = 0; i < pieces.length; i++) {
      let p = pieces[i];
      let bestNodeIndex = -1;
      let bestShortSideFit = Infinity;
      let bestLongSideFit = Infinity;
      let placedW = p.w;
      let placedH = p.h;

      let orientations = [{ w: p.w, h: p.h }];
      if (autoRotate && p.w !== p.h) orientations.push({ w: p.h, h: p.w });

      for (let o of orientations) {
        for (let j = 0; j < freeRects.length; j++) {
          let fr = freeRects[j];
          if (fr.w >= o.w && fr.h >= o.h) {
            let leftoverW = fr.w - o.w;
            let leftoverH = fr.h - o.h;
            let shortSide = Math.min(leftoverW, leftoverH);
            let longSide = Math.max(leftoverW, leftoverH);

            if (shortSide < bestShortSideFit || (shortSide === bestShortSideFit && longSide < bestLongSideFit)) {
              bestNodeIndex = j;
              bestShortSideFit = shortSide;
              bestLongSideFit = longSide;
              placedW = o.w;
              placedH = o.h;
            }
          }
        }
      }

      if (bestNodeIndex !== -1) {
        let fr = freeRects[bestNodeIndex];
        let placed = { x: fr.x, y: fr.y, w: placedW, h: placedH, name: p.name };
        placedRects.push(placed);

        let pBicak = { x: placed.x, y: placed.y, w: placed.w + bicak, h: placed.h + bicak };
        let newFreeRects = [];

        for (let F of freeRects) {
          if (pBicak.x < F.x + F.w && pBicak.x + pBicak.w > F.x &&
              pBicak.y < F.y + F.h && pBicak.y + pBicak.h > F.y) {
            
            if (pBicak.y > F.y) newFreeRects.push({ x: F.x, y: F.y, w: F.w, h: pBicak.y - F.y });
            if (pBicak.y + pBicak.h < F.y + F.h) newFreeRects.push({ x: F.x, y: pBicak.y + pBicak.h, w: F.w, h: F.y + F.h - (pBicak.y + pBicak.h) });
            if (pBicak.x > F.x) newFreeRects.push({ x: F.x, y: F.y, w: pBicak.x - F.x, h: F.h });
            if (pBicak.x + pBicak.w < F.x + F.w) newFreeRects.push({ x: pBicak.x + pBicak.w, y: F.y, w: F.x + F.w - (pBicak.x + pBicak.w), h: F.h });
          } else {
            newFreeRects.push(F);
          }
        }

        freeRects = newFreeRects.filter((rect, idx) => {
          for (let j = 0; j < newFreeRects.length; j++) {
            if (idx !== j && rect.x >= newFreeRects[j].x && rect.y >= newFreeRects[j].y &&
                rect.x + rect.w <= newFreeRects[j].x + newFreeRects[j].w &&
                rect.y + rect.h <= newFreeRects[j].y + newFreeRects[j].h) return false;
          }
          return true;
        });
      } else {
        unplaced.push(p);
      }
    }
    plates.push({ w: pw, h: ph, shelves: [{ rects: placedRects }] });
    pieces = unplaced;
  }
  return plates;
};

function EbatlamaView() {
  const [isDark, setIsDark] = useState(true);
  const [viewMode, setViewMode] = useState<"2D" | "3D">("2D");
  
  const queryClient = useQueryClient();

  // Settings Query
  const { data: settings } = useQuery({
    queryKey: ["ebatlama_settings"],
    queryFn: async () => {
      const { data, error } = await supabaseClient.from("ebatlama_settings").select("*").eq("id", 1).single();
      if (error && error.code !== "PGRST116" && error.code !== "42P01") throw error;
      return data || { thickness: "2.7 mm", plate_size: "2800x2100", bicak_payi: "3", auto_rotate: true };
    }
  });

  // Items Query
  const { data: dbItems = [] } = useQuery({
    queryKey: ["ebatlama_items"],
    queryFn: async () => {
      const { data, error } = await supabaseClient.from("ebatlama_items").select("*").order("sira");
      if (error && error.code !== "42P01") throw error; // Ignore undefined table error
      if (!data) return [];
      
      const validData = data.filter(d => {
        const bStr = String(d.boy || "").toLowerCase();
        const eStr = String(d.en || "").toLowerCase();
        // Only block literally corrupt string placeholders like "Boy" or "En", allow empty string WIPs
        if (bStr.includes("boy") || eStr.includes("en")) return false;
        return true;
      });

      return validData.map(d => ({
        id: d.id,
        sira: d.sira,
        parcaAdi: d.parca_adi || "",
        boy: String(d.boy || ""),
        en: String(d.en || ""),
        adet: String(d.adet || "0"),
        plaka_tipi: d.plaka_tipi || ""
      })) as CutItem[];
    }
  });

  const [thickness, setThickness] = useState("1.5 mm");
  const [plateSize, setPlateSize] = useState("");
  const [bicakPayi, setBicakPayi] = useState("0");
  const [autoRotate, setAutoRotate] = useState(false);

  const [items, setItems] = useState<CutItem[]>([]);

  useEffect(() => {
    if (!plateSize) {
      setItems([]);
      return;
    }
    const filtered = dbItems.filter(i => i.plaka_tipi === plateSize);
    setItems(filtered);
  }, [dbItems, plateSize]);

  useEffect(() => {
    if (settings) {
      setThickness(settings.thickness || "1.5 mm");
      // Intentionally NOT setting plateSize to keep it empty on load
      setAutoRotate(false);
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: any) => {
      await supabaseClient.from("ebatlama_settings").upsert({ id: 1, ...newSettings });
    }
  });

  const upsertItemMutation = useMutation({
    mutationFn: async (item: CutItem) => {
      const { id, sira, parcaAdi, boy, en, adet } = item;
      
      const b = parseFloat(boy);
      const e = parseFloat(en);
      const a = parseFloat(adet);
      
      // Allow partial saves so inputs survive refresh. Block only obvious garbage strings.
      if (String(boy).toLowerCase().includes("boy") || String(en).toLowerCase().includes("en")) {
        return null;
      }

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const payload = { sira, parca_adi: parcaAdi, boy, en, adet, plaka_tipi: item.plaka_tipi || plateSize };
      
      if (isUUID) {
        const { data, error } = await supabaseClient.from("ebatlama_items").update(payload).eq("id", id).select().single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabaseClient.from("ebatlama_items").insert(payload).select().single();
        if (error) throw error;
        return { ...data, oldId: id }; // return oldId to update UI state
      }
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ["ebatlama_items"] });
        if (data.oldId) {
          // Immediately update UI with the new UUID to prevent duplicate inserts on next blur
          setItems(prev => prev.map(item => item.id === data.oldId ? { ...item, id: data.id } : item));
        }
      }
    }
  });

  
  const updateSiraMutation = useMutation({
    mutationFn: async (updates: { id: string; sira: number }[]) => {
      const updatePromises = updates.map(u => 
        supabaseClient.from("ebatlama_items").update({ sira: u.sira }).eq("id", u.id)
      );
      const results = await Promise.all(updatePromises);
      const error = results.find(r => r.error)?.error;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ebatlama_items"] });
    },
    onError: (err: any) => {
      toast.error(`Sıralama güncellenirken hata oluştu: ${err.message}`);
    }
  });

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const { source, destination } = result;
    if (source.index === destination.index) return;

    const list = Array.from(items);
    const [moved] = list.splice(source.index, 1);
    list.splice(destination.index, 0, moved);

    // Update local state immediately for snappy UI
    setItems(list);

    // Save to Supabase
    const updates = list.map((item, index) => ({
      id: item.id,
      sira: index + 1 // Keep 1-indexed or 0-indexed, up to preference
    })).filter(item => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id)); // Only send valid UUIDs to DB
    
    if (updates.length > 0) {
      updateSiraMutation.mutate(updates);
    }
  };

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabaseClient.from("ebatlama_items").delete().eq("id", id);
    }
  });

  // Realtime Sync
  useEffect(() => {
    const channel = supabaseClient
      .channel("ebatlama-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "ebatlama_items" }, () => {
        queryClient.invalidateQueries({ queryKey: ["ebatlama_items"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "ebatlama_settings" }, () => {
        queryClient.invalidateQueries({ queryKey: ["ebatlama_settings"] });
      })
      .subscribe();
    return () => { supabaseClient.removeChannel(channel); };
  }, [queryClient]);

  const printRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // 3D Controls
  const [rotX, setRotX] = useState(60);
  const [rotZ, setRotZ] = useState(-30);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragStartRot = useRef({ x: 60, z: -30 });

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  // Migrated from LocalStorage to Supabase

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
    setIsDark(!isDark);
  };

  const handleAddItem = () => {
    const newItem = { id: Date.now().toString(), sira: items.length + 1, parcaAdi: "", boy: "", en: "", adet: "0", plaka_tipi: plateSize };
    setItems(prev => [...prev, newItem]);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (viewMode !== "3D") return;
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    dragStartRot.current = { x: rotX, z: rotZ };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || viewMode !== "3D") return;
    const deltaX = e.clientX - dragStartPos.current.x;
    const deltaY = e.clientY - dragStartPos.current.y;
    setRotX(Math.min(85, Math.max(0, dragStartRot.current.x - deltaY * 0.5)));
    setRotZ(dragStartRot.current.z + deltaX * 0.5);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleRemoveItem = (id: string) => {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUUID) {
      deleteItemMutation.mutate(id);
    }
    const newItems = items.filter(item => item.id !== id).map((item, index) => ({
      ...item,
      sira: index + 1
    }));
    setItems(newItems);
  };

  const handleItemChange = (id: string, field: keyof CutItem, value: string) => {
    const newItems = items.map(item => item.id === id ? { ...item, [field]: value } : item);
    setItems(newItems);
  };

  const handleItemBlur = (id: string) => {
    const updatedItem = items.find(i => i.id === id);
    if (updatedItem) upsertItemMutation.mutate(updatedItem);
  };

  const handleSwapDimensions = (id: string) => {
    const newItems = items.map(item => {
      if (item.id === id) {
        return { ...item, boy: item.en, en: item.boy };
      }
      return item;
    });
    setItems(newItems);
    const updatedItem = newItems.find(i => i.id === id);
    if (updatedItem) upsertItemMutation.mutate(updatedItem);
  };

  const parseNumber = (val: string) => {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  };

  const calcM2 = (boy: string, en: string) => {
    const b = parseNumber(boy);
    const e = parseNumber(en);
    return (b / 1000) * (e / 1000);
  };

  const activeNames = Array.from(new Set(items.filter(item => {
    const adetNum = parseFloat(item.adet);
    return !isNaN(adetNum) && adetNum > 0 && item.parcaAdi && item.parcaAdi.trim() !== "";
  }).map(item => item.parcaAdi))).join(" & ");

  // -------------------------
  // EXACT OPTIMIZATION ALGORITHM
  // -------------------------
  const optimizationResults = useMemo(() => {
    if (!plateSize) return null;
    const parts = plateSize.split("x");
    if (parts.length !== 2) return null;

    let pw = parseNumber(parts[0]);
    let ph = parseNumber(parts[1]);
    const bp = parseNumber(bicakPayi);
    if (!pw || !ph) return null;

    if (ph > pw) {
      const temp = pw;
      pw = ph;
      ph = temp;
    }

    const reqPieces: { w: number, h: number, name?: string }[] = [];

    items.forEach(item => {
      const b = parseNumber(item.boy);
      const e = parseNumber(item.en);
      const adet = parseNumber(item.adet);
      if (b > 0 && e > 0 && adet > 0) {
        for (let i = 0; i < adet; i++) {
          reqPieces.push({ w: b, h: e, name: item.parcaAdi || "" }); // Do NOT sort here, let AutoRotate logic handle it
        }
      }
    });

    if (reqPieces.length === 0) return null;

    const plates = packPiecesMaxRects(reqPieces, pw, ph, bp, autoRotate);

    const gerekenPlaka = plates.length;
    const toplamParca = reqPieces.length;

    // Verimlilik calculates pure wood area vs total plate area
    const totalPackedArea = reqPieces.reduce((sum, p) => sum + (p.w * p.h), 0);
    const totalPlatesArea = gerekenPlaka * pw * ph;

    const verimlilik = totalPlatesArea > 0 ? (totalPackedArea / totalPlatesArea) * 100 : 0;
    const fire = 100 - verimlilik;

    return { plates, gerekenPlaka, toplamParca, verimlilik, fire, pw, ph };
  }, [items, plateSize, bicakPayi, autoRotate]);

  const handleDownload = () => {
    setIsDownloading(true);

    setTimeout(() => {
      const element = document.getElementById("print-export-container");
      if (element) {
        toJpeg(element, {
          quality: 1,
          backgroundColor: "#ffffff",
          filter: (node) => {
            if (node.id === "3d-controls") return false;
            return true;
          }
        })
          .then((dataUrl) => {
            const link = document.createElement("a");
            link.download = "kesim-semasi.jpg";
            link.href = dataUrl;
            link.click();
            toast.success("Sonuçlar başarıyla indirildi!");
          })
          .catch((err) => {
            console.error("Download error!", err);
            toast.error("İndirme sırasında bir hata oluştu.");
          })
          .finally(() => {
            setIsDownloading(false);
          });
      } else {
        setIsDownloading(false);
      }
    }, 150);
  };

  const plateSizeMapping: Record<string, string[]> = {
    "1.5 mm": ["660x1070 pvc", "1400x1000 kumaş", "2800x2100 mdf"],
    "2.7 mm": ["1700x2100 mdf", "2800x2100 mdf"],
    "4 mm": ["2800x2100 mdf"]
  };
  const availablePlateSizes = plateSizeMapping[thickness] || [];

  return (
    <div className="p-8 space-y-10 w-full 2xl:max-w-[1600px] mx-auto pb-24 transition-colors duration-300 min-h-screen">

      {/* Header / Branding */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
          <img src="/logo.jpg" alt="ALBÜMEVİ Logo" className="h-24 w-auto object-contain rounded-2xl shadow-xl shadow-black/50" />
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">Ebatlama</h1>
            <p className="text-[#A67C52] text-lg font-medium mt-2 uppercase tracking-widest">Kesim Optimizasyonu</p>
          </div>
        </div>
        <button
          onClick={toggleTheme}
          className="absolute right-0 top-0 p-3 rounded-full bg-white dark:bg-[#131316] border border-gray-200 dark:border-white/5 shadow-lg text-slate-600 dark:text-[#9E9696] hover:text-[#A67C52] transition-all"
        >
          {isDark ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Column: Material and List */}
        <div className="lg:col-span-3 space-y-8">

          {/* Malzeme Seçimi */}
          <div className="bg-white dark:bg-[#131316] border border-gray-200 dark:border-white/5 rounded-3xl p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[#A67C52]/20 flex items-center justify-center">
                <Settings className="w-6 h-6 text-[#A67C52]" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Malzeme Seçimi</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-[#9E9696] mb-2">Genel Kalınlık</label>
                <Select value={thickness} onValueChange={(v) => { 
                  setThickness(v); 
                  const newPlateSizes = plateSizeMapping[v] || [];
                  const newSettings: any = { thickness: v };
                  if (!newPlateSizes.includes(plateSize)) {
                    setPlateSize("");
                    newSettings.plate_size = "";
                  }
                  updateSettingsMutation.mutate(newSettings); 
                }}>
                  <SelectTrigger className="w-full bg-gray-50 dark:bg-[#0A0A0A] border-gray-200 dark:border-[#1a1a1e] text-slate-900 dark:text-white h-14 rounded-xl focus:ring-[#A67C52]">
                    <SelectValue placeholder="Seçiniz" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#111111] border-gray-200 dark:border-[#1a1a1e] text-slate-900 dark:text-white">
                    <SelectItem value="1.5 mm">1.5 mm</SelectItem>
                    <SelectItem value="2.7 mm">2.7 mm</SelectItem>
                    
                    <SelectItem value="4 mm">4 mm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-[#9E9696] mb-2">Plaka Ebatları (mm)</label>
                <Select value={plateSize} onValueChange={(v) => { 
                  setPlateSize(v); 
                  const defaultBicak = "0";
                  setBicakPayi(defaultBicak);
                  updateSettingsMutation.mutate({ plate_size: v, bicak_payi: defaultBicak }); 
                }}>
                  <SelectTrigger className="w-full bg-gray-50 dark:bg-[#0A0A0A] border-gray-200 dark:border-[#1a1a1e] text-slate-900 dark:text-white h-14 rounded-xl focus:ring-[#A67C52]">
                    <SelectValue placeholder="Seçiniz" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#111111] border-gray-200 dark:border-[#1a1a1e] text-slate-900 dark:text-white">
                    {availablePlateSizes.map(size => (
                      <SelectItem key={size} value={size}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-[#9E9696] mb-2">Bıçak Payı (mm)</label>
                <Input
                  type="number"
                  min="0"
                  value={bicakPayi}
                  onChange={(e) => { setBicakPayi(e.target.value); updateSettingsMutation.mutate({ bicak_payi: e.target.value }); }}
                  className="bg-gray-50 dark:bg-[#0A0A0A] border-gray-200 dark:border-[#1a1a1e] text-slate-900 dark:text-white h-14 w-full focus-visible:ring-[#A67C52] text-center"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-[#9E9696] mb-2">Otomatik Yönlendirme</label>
                <button
                  disabled
                  className="h-14 px-4 w-full rounded-xl flex items-center justify-between font-bold border transition-colors bg-red-500/10 text-red-500 border-red-500/50 opacity-50 cursor-not-allowed"
                >
                  Kapalı
                  <div className="w-4 h-4 rounded-full transition-colors bg-red-500" />
                </button>
              </div>
            </div>
          </div>

          {/* Ebatlama Listesi */}
          <div className="bg-white dark:bg-[#131316] border border-gray-200 dark:border-white/5 rounded-3xl p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[#A67C52]/20 flex items-center justify-center">
                <LayoutGrid className="w-6 h-6 text-[#A67C52]" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Ebatlama Listesi</h2>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-600 dark:text-[#9E9696] uppercase bg-gray-50 dark:bg-white/5">
                  <tr>
                    <th className="px-2 py-4 rounded-tl-lg w-8"></th>
                    <th className="px-4 py-4 w-40 text-center">Parça Adı</th>
                    <th className="px-4 py-4">Boy (mm)</th>
                    <th className="px-1 py-4 w-10 text-center"></th>
                    <th className="px-4 py-4">En (mm)</th>
                    <th className="px-4 py-4">Adet</th>
                    <th className="px-4 py-4">Birim (M²)</th>
                    <th className="px-4 py-4">Toplam (M²)</th>
                    <th className="px-4 py-4 rounded-tr-lg w-16 text-center">İşlem</th>
                  </tr>
                </thead>
                <Droppable droppableId="ebatlamaList">
                  {(provided) => (
                    <tbody ref={provided.innerRef} {...provided.droppableProps}>
                  {plateSize && items.map((item, index) => {
                    const birimM2 = calcM2(item.boy, item.en);
                    const adetNum = parseNumber(item.adet);
                    const toplamM2 = birimM2 * adetNum;

                    return (
                      <Draggable key={item.id} draggableId={item.id} index={items.indexOf(item)}>
                        {(provided, snapshot) => (
                          <tr 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${snapshot.isDragging ? 'bg-gray-100 dark:bg-[#1a1a1e] shadow-2xl z-50' : ''}`}
                          >
                            <td className="px-2 py-3 text-center">
                              <div {...provided.dragHandleProps} className="text-slate-400 dark:text-[#9E9696] hover:text-slate-600 dark:hover:text-white cursor-grab active:cursor-grabbing flex justify-center">
                                <GripVertical className="w-4 h-4" />
                              </div>
                            </td>
                        <td className="px-4 py-3">
                          <Input 
                            type="text"
                            value={item.parcaAdi || ""}
                            onChange={(e) => handleItemChange(item.id, "parcaAdi", e.target.value)}
                            onBlur={() => handleItemBlur(item.id)}
                            className="bg-white dark:bg-[#0A0A0A] border-gray-200 dark:border-[#1a1a1e] text-slate-900 dark:text-white h-10 w-full focus-visible:ring-[#A67C52] text-center"
                            placeholder="Örn: Kapak"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            min="0"
                            value={item.boy}
                            onChange={(e) => handleItemChange(item.id, "boy", e.target.value)}
                            onBlur={() => handleItemBlur(item.id)}
                            className="bg-white dark:bg-[#0A0A0A] border-gray-200 dark:border-[#1a1a1e] text-slate-900 dark:text-white h-10 w-full focus-visible:ring-[#A67C52] text-center"
                            placeholder="Boy"
                          />
                        </td>
                        <td className="px-1 py-3 text-center">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleSwapDimensions(item.id)}
                            className="h-8 w-8 text-slate-400 hover:text-[#A67C52] hover:bg-[#A67C52]/10 transition-colors"
                            title="Boy ve En'i Değiştir"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </Button>
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            min="0"
                            value={item.en}
                            onChange={(e) => handleItemChange(item.id, "en", e.target.value)}
                            onBlur={() => handleItemBlur(item.id)}
                            className="bg-white dark:bg-[#0A0A0A] border-gray-200 dark:border-[#1a1a1e] text-slate-900 dark:text-white h-10 w-full focus-visible:ring-[#A67C52] text-center"
                            placeholder="En"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            min="1"
                            value={item.adet}
                            onChange={(e) => handleItemChange(item.id, "adet", e.target.value)}
                            onBlur={() => handleItemBlur(item.id)}
                            className="bg-white dark:bg-[#0A0A0A] border-gray-200 dark:border-[#1a1a1e] text-slate-900 dark:text-white h-10 w-full focus-visible:ring-[#A67C52] text-center"
                            placeholder="Adet"
                          />
                        </td>
                        <td className="px-4 py-3 text-center font-medium text-slate-600 dark:text-white/80">{birimM2.toFixed(4)}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-900 dark:text-white">{toplamM2.toFixed(4)}</td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 h-10 w-10"
                            onClick={() => {
                              handleRemoveItem(item.id);
                              toast.success("Satır başarıyla silindi");
                            }}
                            disabled={items.length === 1}
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
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
            </DragDropContext>

            <div className="mt-6">
              <Button
                onClick={handleAddItem}
                variant="outline"
                className="w-full border-dashed border-[#A67C52]/50 text-[#A67C52] bg-transparent hover:bg-[#A67C52]/10 hover:text-[#A67C52] h-14 rounded-xl font-bold text-base"
              >
                <Plus className="w-5 h-5 mr-2" />
                Yeni Satır Ekle
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column: Optimization Results Summary & Visuals */}
        <div className="lg:col-span-1 space-y-6">
          {optimizationResults && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-[#131316] border border-gray-200 dark:border-white/5 rounded-2xl p-4 flex flex-col justify-center shadow-sm">
                <span className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-500 dark:text-[#9E9696]">Gereken Plaka</span>
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{optimizationResults.gerekenPlaka}</span>
              </div>
              <div className="bg-white dark:bg-[#131316] border border-gray-200 dark:border-white/5 rounded-2xl p-4 flex flex-col justify-center shadow-sm">
                <span className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-500 dark:text-[#9E9696]">Üretilen Parça</span>
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{optimizationResults.toplamParca}</span>
              </div>
              <div className="bg-white dark:bg-[#131316] border border-gray-200 dark:border-white/5 border-l-4 border-l-[#16A34A] rounded-2xl p-4 flex flex-col justify-center shadow-sm">
                <span className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-500 dark:text-[#9E9696]">Verimlilik</span>
                <span className="text-xl font-extrabold text-[#16A34A]">%{(optimizationResults.verimlilik).toFixed(1)}</span>
              </div>
              <div className="bg-white dark:bg-[#131316] border border-gray-200 dark:border-white/5 border-l-4 border-l-[#FCA5A5] rounded-2xl p-4 flex flex-col justify-center shadow-sm">
                <span className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-500 dark:text-[#9E9696]">Fire Oranı</span>
                <span className="text-xl font-extrabold text-[#FCA5A5]">%{(optimizationResults.fire).toFixed(1)}</span>
              </div>
            </div>
          )}

          {/* 2D Mini Preview */}
          <div className="bg-white dark:bg-[#131316] border border-[#A67C52]/30 rounded-3xl p-6 shadow-[0_0_15px_rgba(166,124,82,0.1)] flex flex-col h-auto">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <span className="flex items-center gap-2">
                <Box className="w-5 h-5 text-[#A67C52]" />
                2D Yerleşim Planı
              </span>
            </h3>

            {!optimizationResults || optimizationResults.plates.length === 0 ? (
              <div className="flex-1 min-h-[300px] bg-gray-50 dark:bg-[#0A0A0A] border border-gray-200 dark:border-[#1a1a1e] rounded-xl flex flex-col items-center justify-center relative overflow-hidden">
                <span className="text-slate-400 dark:text-white/20 text-sm font-medium">Yerleşim Bekleniyor</span>
              </div>
            ) : (
              <div className="flex-1 bg-gray-50 dark:bg-[#0A0A0A] border border-gray-200 dark:border-[#1a1a1e] rounded-xl p-4 flex flex-col gap-6 overflow-y-auto max-h-[600px] custom-scrollbar">
                {optimizationResults.plates.map((plate, pIdx) => (
                  <div key={pIdx} className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#9E9696] font-bold uppercase tracking-wider">
                      <span>Plaka {pIdx + 1}</span>
                      <span>{optimizationResults.pw}x{optimizationResults.ph}</span>
                    </div>
                    {/* Visual Container (Guillotine Strict Positioning) */}
                    <div
                      className="relative bg-[#FCA5A5] border-[3px] border-[#8B5A2B] rounded-sm overflow-hidden mx-auto shadow-inner block"
                      style={{
                        aspectRatio: `${optimizationResults.pw} / ${optimizationResults.ph}`,
                        width: "100%",
                        backgroundImage: "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
                        backgroundSize: "20px 20px"
                      }}
                    >
                      {plate.shelves.map((shelf, sIdx) => (
                        <React.Fragment key={sIdx}>
                          {shelf.rects.map((rect, rIdx) => {
                            const isTiny = (rect.w / plate.w) < 0.07 || (rect.w / rect.h) < 0.7;
                            return (
                              <div
                                key={rIdx}
                                title={`${rect.name ? rect.name + ' - ' : ''}${rect.w}x${rect.h}`}
                                className="absolute bg-[#16A34A] border-[0.5px] border-[#FFFFFF] flex flex-col items-center justify-center shadow-sm overflow-hidden"
                                style={{
                                  top: `${(rect.y / plate.h) * 100}%`,
                                  left: `${(rect.x / plate.w) * 100}%`,
                                  width: `${(rect.w / plate.w) * 100}%`,
                                  height: `${(rect.h / plate.h) * 100}%`
                                }}
                              >
                                <div className="flex flex-col items-center justify-center w-full h-full text-center overflow-hidden p-0.5">
                                  {isTiny ? (
                                    <span className="font-bold text-white drop-shadow-md leading-none flex flex-col items-center justify-center" style={{ fontSize: 'min(12px, max(6px, 1.5cqw))' }}>
                                      <span>{rect.w}</span>
                                      <span className="text-[0.7em] opacity-80 my-[1px] leading-none">x</span>
                                      <span>{rect.h}</span>
                                    </span>
                                  ) : (
                                    <span className="font-bold text-white drop-shadow-md leading-none flex items-center justify-center tracking-tight" style={{ fontSize: 'min(14px, max(7px, 2cqw))' }}>
                                      {rect.w}x{rect.h}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detaylı Kesim Şeması & 3D Görünüm */}
      <div id="kesim-semasi-container" ref={printRef} className="bg-white dark:bg-[#131316] border border-gray-200 dark:border-[#ffffff0d] rounded-3xl p-8 shadow-xl mt-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#A67C5233] flex items-center justify-center">
              <Layers className="w-6 h-6 text-[#A67C52]" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-[#FFFFFF]">Detaylı Kesim Şeması</h2>
          </div>

          <div className="flex items-center gap-4 bg-gray-50 dark:bg-[#0A0A0A] p-1.5 rounded-xl border border-gray-200 dark:border-[#1a1a1e]">
            <button
              onClick={() => setViewMode("2D")}
              className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${viewMode === "2D" ? "bg-white dark:bg-[#1a1a1e] text-slate-900 dark:text-[#FFFFFF] shadow-md border border-gray-200 dark:border-transparent" : "text-slate-500 dark:text-[#9E9696] hover:text-slate-900 dark:hover:text-[#FFFFFF]"
                }`}
            >
              2D Görünüm
            </button>
            <button
              onClick={() => setViewMode("3D")}
              className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${viewMode === "3D" ? "bg-white dark:bg-[#1a1a1e] text-slate-900 dark:text-[#FFFFFF] shadow-md border border-gray-200 dark:border-transparent" : "text-slate-500 dark:text-[#9E9696] hover:text-slate-900 dark:hover:text-[#FFFFFF]"
                }`}
            >
              3D Görünüm
            </button>
          </div>
        </div>

        {/* Aksiyon Butonları */}
        <div className="flex items-center justify-end gap-4 mb-8">
          <Button
            onClick={handleDownload}
            disabled={isDownloading}
            className="bg-[#A67C52] hover:bg-[#A67C52E6] text-[#FFFFFF] font-bold h-12 px-6 rounded-xl shadow-lg shadow-[#A67C5233] gap-2"
          >
            {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            Sonuçları İndir (JPG)
          </Button>
        </div>

        {/* MAIN EXPORT CONTAINER */}
        <div
          id="print-export-container"
          className={`p-8 -m-4 sm:-m-8 rounded-xl transition-colors duration-200 ${isDownloading ? 'bg-white overflow-hidden shadow-none ring-0' : 'bg-gray-50 dark:bg-[#0A0A0A] shadow-inner border border-gray-200 dark:border-[#1a1a1e]'}`}
          style={isDownloading ? { width: '1200px' } : undefined}
        >
          {/* Header & Legend */}
          <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 border-b pb-4 gap-4 ${isDownloading ? 'border-gray-200' : 'border-gray-200 dark:border-[#1a1a1e]'}`}>
            <div className="flex items-center gap-6">
              {activeNames && (
                <div className="bg-[#A67C52]/10 px-4 py-2.5 rounded-xl border border-[#A67C52]/20">
                  <span className="text-2xl font-extrabold text-[#A67C52] uppercase tracking-wider">{activeNames}</span>
                </div>
              )}
              <div>
                <h2 className={`text-3xl font-bold mb-2 ${isDownloading ? 'text-black' : 'text-slate-900 dark:text-white'}`}>Kesim Şeması</h2>
                {optimizationResults && (
                  <p className={`font-medium ${isDownloading ? 'text-gray-600' : 'text-slate-500 dark:text-[#9E9696]'}`}>
                    Plaka Ebatı: {optimizationResults.pw}x{optimizationResults.ph} mm
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 bg-[#16A34A] border shadow-sm ${isDownloading ? 'border-white' : 'border-gray-200 dark:border-[#1a1a1e]'}`}></div>
                <span className={`font-semibold text-sm ${isDownloading ? 'text-black' : 'text-slate-600 dark:text-[#9E9696]'}`}>İşlenen Parça</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-[#FCA5A5] border border-[#8B5A2B] shadow-sm"></div>
                <span className={`font-semibold text-sm ${isDownloading ? 'text-black' : 'text-slate-600 dark:text-[#9E9696]'}`}>Fire Alanı</span>
              </div>
            </div>
          </div>

          {/* Export View Summary Cards */}
          {optimizationResults && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              <div className={`${isDownloading ? 'bg-white border-gray-200' : 'bg-white dark:bg-[#131316] border-gray-200 dark:border-[#1a1a1e]'} border rounded-xl p-6 flex flex-col justify-center shadow-sm`}>
                <span className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDownloading ? 'text-gray-500' : 'text-slate-500 dark:text-[#9E9696]'}`}>Gereken Plaka</span>
                <span className={`text-4xl font-extrabold ${isDownloading ? 'text-black' : 'text-slate-900 dark:text-white'}`}>
                  {optimizationResults.gerekenPlaka} <span className={`text-xl font-medium ${isDownloading ? 'text-gray-400' : 'text-slate-400 dark:text-[#FFFFFF80]'}`}>adet</span>
                </span>
              </div>
              <div className={`${isDownloading ? 'bg-white border-gray-200' : 'bg-white dark:bg-[#131316] border-gray-200 dark:border-[#1a1a1e]'} border rounded-xl p-6 flex flex-col justify-center shadow-sm`}>
                <span className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDownloading ? 'text-gray-500' : 'text-slate-500 dark:text-[#9E9696]'}`}>Üretilen Parça</span>
                <span className={`text-4xl font-extrabold ${isDownloading ? 'text-black' : 'text-slate-900 dark:text-white'}`}>
                  {optimizationResults.toplamParca} <span className={`text-xl font-medium ${isDownloading ? 'text-gray-400' : 'text-slate-400 dark:text-[#FFFFFF80]'}`}>adet</span>
                </span>
              </div>
              <div className={`${isDownloading ? 'bg-white border-gray-200' : 'bg-white dark:bg-[#131316] border-gray-200 dark:border-[#1a1a1e]'} border rounded-xl p-6 border-l-4 border-l-[#16A34A] flex flex-col justify-center shadow-sm`}>
                <span className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDownloading ? 'text-gray-500' : 'text-slate-500 dark:text-[#9E9696]'}`}>Verimlilik %</span>
                <span className="text-4xl font-extrabold text-[#16A34A]">
                  %{optimizationResults.verimlilik.toFixed(1)}
                </span>
              </div>
              <div className={`${isDownloading ? 'bg-white border-gray-200' : 'bg-white dark:bg-[#131316] border-gray-200 dark:border-[#1a1a1e]'} border rounded-xl p-6 border-l-4 border-l-[#FCA5A5] flex flex-col justify-center shadow-sm`}>
                <span className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDownloading ? 'text-gray-500' : 'text-slate-500 dark:text-[#9E9696]'}`}>Fire Oranı %</span>
                <span className="text-4xl font-extrabold text-[#FCA5A5]">
                  %{(optimizationResults.fire).toFixed(1)}
                </span>
              </div>
            </div>
          )}

          {/* 2D / 3D Sahnesi (Main View) */}
          {!optimizationResults || optimizationResults.plates.length === 0 ? (
            <div className={`h-[400px] border rounded-2xl flex items-center justify-center ${isDownloading ? 'bg-gray-50 border-gray-200' : 'bg-white dark:bg-[#131316] border-gray-200 dark:border-[#1a1a1e]'}`}>
              <span className={`text-lg font-medium ${isDownloading ? 'text-gray-400' : 'text-slate-400 dark:text-[#FFFFFF33]'}`}>Görüntülenecek veri yok</span>
            </div>
          ) : (
            <div className="flex flex-col gap-16">
              {optimizationResults.plates.map((plate, pIdx) => (
                <div key={pIdx} className="w-full">
                  <h4 className={`text-center font-bold tracking-widest mb-8 text-xl ${isDownloading ? 'text-gray-500' : 'text-slate-500 dark:text-[#FFFFFF80]'}`}>PLAKA {pIdx + 1}</h4>

                  {/* 2D Detailed View */}
                  {viewMode === "2D" && (
                    <div
                      className="relative bg-[#FCA5A5] border-[4px] border-[#8B5A2B] rounded-md overflow-hidden mx-auto shadow-2xl block"
                      style={{
                        aspectRatio: `${optimizationResults.pw} / ${optimizationResults.ph}`,
                        width: "100%",
                        maxWidth: "1000px",
                        backgroundImage: "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
                        backgroundSize: "20px 20px"
                      }}
                    >
                      {plate.shelves.map((shelf, sIdx) => (
                        <React.Fragment key={sIdx}>
                          {shelf.rects.map((rect, rIdx) => {
                            const isTiny = (rect.w / plate.w) < 0.07 || (rect.w / rect.h) < 0.7;
                            return (
                              <div
                                key={rIdx}
                                title={`${rect.name ? rect.name + ' - ' : ''}${rect.w}x${rect.h}`}
                                className="absolute bg-[#16A34A] border-[0.5px] border-[#FFFFFF] flex flex-col items-center justify-center shadow-sm overflow-hidden"
                                style={{
                                  top: `${(rect.y / plate.h) * 100}%`,
                                  left: `${(rect.x / plate.w) * 100}%`,
                                  width: `${(rect.w / plate.w) * 100}%`,
                                  height: `${(rect.h / plate.h) * 100}%`
                                }}
                              >
                                <div className="flex flex-col items-center justify-center w-full h-full text-center overflow-hidden p-0.5">
                                  {isTiny ? (
                                    <span className="font-bold text-white drop-shadow-md leading-none flex flex-col items-center justify-center" style={{ fontSize: 'min(12px, max(6px, 1.5cqw))' }}>
                                      <span>{rect.w}</span>
                                      <span className="text-[0.7em] opacity-80 my-[1px] leading-none">x</span>
                                      <span>{rect.h}</span>
                                    </span>
                                  ) : (
                                    <span className="font-bold text-white drop-shadow-md leading-none flex items-center justify-center tracking-tight" style={{ fontSize: 'min(14px, max(7px, 2cqw))' }}>
                                      {rect.w}x{rect.h}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </div>
                  )}

                  {/* 3D Interactive View */}
                  {viewMode === "3D" && (
                    <div
                      className="relative mx-auto w-full max-w-[1000px] h-[700px] flex items-center justify-center perspective-[2000px] cursor-move"
                      style={{ perspective: "2000px" }}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                    >
                      <div
                        className={`relative ${isDragging ? '' : 'transition-transform duration-300 ease-out'}`}
                        style={{
                          transformStyle: "preserve-3d",
                          transform: `rotateX(${rotX}deg) rotateZ(${rotZ}deg) ${isDownloading ? 'scale(1.2)' : 'scale(1)'}`,
                          height: isDownloading ? "550px" : "450px",
                          maxHeight: "60vh",
                          aspectRatio: `${optimizationResults.pw} / ${optimizationResults.ph}`,
                        }}
                      >
                        {/* Depth layer */}
                        <div
                          className="absolute inset-0 bg-[#8c6239] rounded-sm shadow-2xl"
                          style={{
                            transform: `translateZ(-${thickness === "4 mm" ? 12 : thickness === "3 mm" ? 9 : thickness === "2.7 mm" ? 8 : thickness === "1.5 mm" ? 6 : 4}px)`,
                          }}
                        ></div>

                        {/* Base surface */}
                        <div
                          className="absolute inset-0 bg-[#593d22] rounded-sm"
                          style={{
                            transform: `translateZ(-${(thickness === "4 mm" ? 12 : thickness === "3 mm" ? 9 : thickness === "2.7 mm" ? 8 : thickness === "1.5 mm" ? 6 : 4) / 2}px) scale(0.99)`,
                          }}
                        ></div>

                        {/* Top surface */}
                        <div
                          className="absolute inset-0 bg-[#FCA5A5] border-[3px] border-[#8B5A2B] overflow-hidden block"
                          style={{
                            transform: "translateZ(0)",
                            backgroundImage: "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
                            backgroundSize: "20px 20px"
                          }}
                        >
                          {/* Cut pieces mapped on top */}
                          {plate.shelves.map((shelf, sIdx) => (
                            <React.Fragment key={sIdx}>
                              {shelf.rects.map((rect, rIdx) => {
                                const isTiny = (rect.w / plate.w) < 0.07 || (rect.w / rect.h) < 0.7;
                                return (
                                  <div
                                    key={rIdx}
                                    title={`${rect.name ? rect.name + ' - ' : ''}${rect.w}x${rect.h}`}
                                    className="absolute bg-[#16A34A] border-[0.5px] border-[#FFFFFF] flex flex-col items-center justify-center shadow-sm overflow-hidden"
                                    style={{
                                      top: `${(rect.y / plate.h) * 100}%`,
                                      left: `${(rect.x / plate.w) * 100}%`,
                                      width: `${(rect.w / plate.w) * 100}%`,
                                      height: `${(rect.h / plate.h) * 100}%`
                                    }}
                                  >
                                    <div className="flex flex-col items-center justify-center w-full h-full text-center overflow-hidden p-0.5">
                                      {isTiny ? (
                                        <span className="font-bold text-white drop-shadow-md leading-none flex flex-col items-center justify-center" style={{ fontSize: 'min(12px, max(6px, 1.5cqw))' }}>
                                          <span>{rect.w}</span>
                                          <span className="text-[0.7em] opacity-80 my-[1px] leading-none">x</span>
                                          <span>{rect.h}</span>
                                        </span>
                                      ) : (
                                        <span className="font-bold text-white drop-shadow-md leading-none flex items-center justify-center tracking-tight" style={{ fontSize: 'min(14px, max(7px, 2cqw))' }}>
                                          {rect.w}x{rect.h}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </React.Fragment>
                          ))}
                        </div>

                        {/* Shadow */}
                        <div
                          className="absolute inset-0 bg-black/60 blur-2xl rounded-sm"
                          style={{
                            transform: `translateZ(-50px) scale(0.95)`,
                          }}
                        ></div>
                      </div>

                      {/* 3D Control Panel */}
                      <div id="3d-controls" className="absolute bottom-6 right-6 bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-[#1a1a1e] rounded-xl p-3 flex flex-col items-center gap-2 shadow-2xl z-10 select-none">
                        <button onClick={() => setRotX(prev => Math.max(0, prev - 15))} className="p-2 bg-gray-50 dark:bg-[#1a1a1e] hover:bg-[#A67C52] text-slate-500 dark:text-[#9E9696] hover:text-white rounded-lg transition-colors shadow-sm">
                          <ChevronUp className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setRotZ(prev => prev - 15)} className="p-2 bg-gray-50 dark:bg-[#1a1a1e] hover:bg-[#A67C52] text-slate-500 dark:text-[#9E9696] hover:text-white rounded-lg transition-colors shadow-sm">
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <button onClick={() => { setRotX(60); setRotZ(-30); }} className="px-3 py-2 text-xs font-bold text-white bg-slate-800 dark:bg-[#1a1a1e] hover:bg-[#A67C52] rounded-lg transition-colors shadow-sm">
                            Sıfırla
                          </button>
                          <button onClick={() => setRotZ(prev => prev + 15)} className="p-2 bg-gray-50 dark:bg-[#1a1a1e] hover:bg-[#A67C52] text-slate-500 dark:text-[#9E9696] hover:text-white rounded-lg transition-colors shadow-sm">
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                        <button onClick={() => setRotX(prev => Math.min(85, prev + 15))} className="p-2 bg-gray-50 dark:bg-[#1a1a1e] hover:bg-[#A67C52] text-slate-500 dark:text-[#9E9696] hover:text-white rounded-lg transition-colors shadow-sm">
                          <ChevronDown className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}