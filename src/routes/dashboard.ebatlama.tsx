import { createFileRoute } from "@tanstack/react-router";
import React, { useState, useMemo, useRef, useEffect } from "react";
import { toJpeg } from "html-to-image";
import { Plus, Trash2, Download, Settings, Box, LayoutGrid, Loader2, Layers, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Sun, Moon } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

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
};

type Rect = { w: number, h: number, x: number, y: number, effW: number, effH: number };
type Plate = { w: number, h: number, shelves: { rects: Rect[] }[] };

// STRICT SHELF PACKING ALGORITHM (Guillotine Cuts - No Overlaps)
function packPiecesShelf(plateW: number, plateH: number, pieces: { w: number, h: number }[], autoRotate: boolean, bicakPayi: number): Plate[] {
  const plates: Plate[] = [];
  let currentPlate: Plate = { w: plateW, h: plateH, shelves: [{ rects: [] }] };
  let currentX = 0;
  let currentY = 0;
  let shelfHeight = 0;

  // Add blade thickness to piece dimensions
  const mappedPieces = pieces.map(p => ({
    origW: p.w,
    origH: p.h,
    effW: p.w + bicakPayi,
    effH: p.h + bicakPayi,
  }));

  // Standardize orientation if Auto Rotate is ON to make clean shelves
  if (autoRotate) {
    mappedPieces.forEach(p => {
      if (p.effW > p.effH) {
        const tempE = p.effW; p.effW = p.effH; p.effH = tempE;
        const tempO = p.origW; p.origW = p.origH; p.origH = tempO;
      }
    });
  }

  // Sort by effective height descending for optimal shelf packing
  mappedPieces.sort((a, b) => b.effH - a.effH);

  for (const piece of mappedPieces) {
    let placed = false;

    // Test orientations based on user toggle
    const orientations = autoRotate ?
      [{ ew: piece.effW, eh: piece.effH, ow: piece.origW, oh: piece.origH },
      { ew: piece.effH, eh: piece.effW, ow: piece.origH, oh: piece.origW }] :
      [{ ew: piece.effW, eh: piece.effH, ow: piece.origW, oh: piece.origH }];

    for (const ori of orientations) {
      if (placed) break;
      // Fits on current shelf?
      if (currentX + ori.ew <= plateW && currentY + ori.eh <= plateH) {
        currentPlate.shelves[0].rects.push({
          x: currentX, y: currentY, w: ori.ow, h: ori.oh, effW: ori.ew, effH: ori.eh
        });
        currentX += ori.ew;
        shelfHeight = Math.max(shelfHeight, ori.eh);
        placed = true;
      }
    }

    if (!placed) {
      // Try new shelf on current plate
      for (const ori of orientations) {
        if (placed) break;
        if (ori.ew <= plateW && currentY + shelfHeight + ori.eh <= plateH) {
          currentY += shelfHeight;
          currentX = 0;
          shelfHeight = ori.eh;

          currentPlate.shelves[0].rects.push({
            x: currentX, y: currentY, w: ori.ow, h: ori.oh, effW: ori.ew, effH: ori.eh
          });
          currentX += ori.ew;
          placed = true;
        }
      }
    }

    if (!placed) {
      // Start a completely new plate
      if (currentPlate.shelves[0].rects.length > 0) {
        plates.push(currentPlate);
      }
      currentPlate = { w: plateW, h: plateH, shelves: [{ rects: [] }] };
      currentX = 0;
      currentY = 0;
      shelfHeight = 0;

      const ori = orientations[0];
      if (ori.ew <= plateW && ori.eh <= plateH) {
        shelfHeight = ori.eh;
        currentPlate.shelves[0].rects.push({
          x: currentX, y: currentY, w: ori.ow, h: ori.oh, effW: ori.ew, effH: ori.eh
        });
        currentX += ori.ew;
        placed = true;
      }
    }
  }

  if (currentPlate.shelves[0].rects.length > 0) {
    plates.push(currentPlate);
  }

  return plates;
}

function EbatlamaView() {
  const [isDark, setIsDark] = useState(true);
  const [viewMode, setViewMode] = useState<"2D" | "3D">("2D");
  const [thickness, setThickness] = useState<string>("2.7 mm");
  const [plateSize, setPlateSize] = useState<string>("2800x2100");
  const [bicakPayi, setBicakPayi] = useState<string>("3");
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const printRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [items, setItems] = useState<CutItem[]>([]);

  // 3D Controls
  const [rotX, setRotX] = useState(60);
  const [rotZ, setRotZ] = useState(-30);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragStartRot = useRef({ x: 60, z: -30 });

  // Reset State on Mount
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    setThickness("2.7 mm");
    setPlateSize("2800x2100");
    setBicakPayi("3");
    setAutoRotate(true);
    setItems([{ id: Date.now().toString(), sira: 1, parcaAdi: "", boy: "", en: "", adet: "1" }]);
    setViewMode("2D");
  }, []);

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
    setIsDark(!isDark);
  };

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      { id: Date.now().toString(), sira: prev.length + 1, parcaAdi: "", boy: "", en: "", adet: "1" }
    ]);
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
    const newItems = items.filter(item => item.id !== id).map((item, index) => ({
      ...item,
      sira: index + 1
    }));
    setItems(newItems);
  };

  const handleItemChange = (id: string, field: keyof CutItem, value: string) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
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

    const reqPieces: { w: number, h: number }[] = [];

    items.forEach(item => {
      const b = parseNumber(item.boy);
      const e = parseNumber(item.en);
      const adet = parseNumber(item.adet);
      if (b > 0 && e > 0 && adet > 0) {
        for (let i = 0; i < adet; i++) {
          reqPieces.push({ w: b, h: e }); // Do NOT sort here, let AutoRotate logic handle it
        }
      }
    });

    if (reqPieces.length === 0) return null;

    const plates = packPiecesShelf(pw, ph, reqPieces, autoRotate, bp);

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
                <Select value={thickness} onValueChange={setThickness}>
                  <SelectTrigger className="w-full bg-gray-50 dark:bg-[#0A0A0A] border-gray-200 dark:border-[#1a1a1e] text-slate-900 dark:text-white h-14 rounded-xl focus:ring-[#A67C52]">
                    <SelectValue placeholder="Seçiniz" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#111111] border-gray-200 dark:border-[#1a1a1e] text-slate-900 dark:text-white">
                    <SelectItem value="2 mm">2 mm</SelectItem>
                    <SelectItem value="2.7 mm">2.7 mm</SelectItem>
                    <SelectItem value="3 mm">3 mm</SelectItem>
                    <SelectItem value="4 mm">4 mm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-[#9E9696] mb-2">Plaka Ebatları (mm)</label>
                <Select value={plateSize} onValueChange={setPlateSize}>
                  <SelectTrigger className="w-full bg-gray-50 dark:bg-[#0A0A0A] border-gray-200 dark:border-[#1a1a1e] text-slate-900 dark:text-white h-14 rounded-xl focus:ring-[#A67C52]">
                    <SelectValue placeholder="Seçiniz" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#111111] border-gray-200 dark:border-[#1a1a1e] text-slate-900 dark:text-white">
                    <SelectItem value="660x1700">660x1700</SelectItem>
                    <SelectItem value="1400x1000">1400x1000</SelectItem>
                    <SelectItem value="2800x2100">2800x2100</SelectItem>
                    <SelectItem value="1700x2100">1700x2100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-[#9E9696] mb-2">Bıçak Payı (mm)</label>
                <Input
                  type="number"
                  min="0"
                  value={bicakPayi}
                  onChange={(e) => setBicakPayi(e.target.value)}
                  className="bg-gray-50 dark:bg-[#0A0A0A] border-gray-200 dark:border-[#1a1a1e] text-slate-900 dark:text-white h-14 w-full focus-visible:ring-[#A67C52] text-center"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-[#9E9696] mb-2">Otomatik Yönlendirme</label>
                <button
                  onClick={() => setAutoRotate(!autoRotate)}
                  className={`h-14 px-4 w-full rounded-xl flex items-center justify-between font-bold border transition-colors ${autoRotate
                    ? 'bg-green-500/10 text-green-500 border-green-500/50'
                    : 'bg-red-500/10 text-red-500 border-red-500/50'
                    }`}
                >
                  {autoRotate ? "Açık" : "Kapalı"}
                  <div className={`w-4 h-4 rounded-full transition-colors ${autoRotate ? 'bg-green-500' : 'bg-red-500'}`} />
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

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-600 dark:text-[#9E9696] uppercase bg-gray-50 dark:bg-white/5">
                  <tr>
                    <th className="px-4 py-4 rounded-tl-lg w-40 text-center">Parça Adı</th>
                    <th className="px-4 py-4">Boy (mm)</th>
                    <th className="px-4 py-4">En (mm)</th>
                    <th className="px-4 py-4">Adet</th>
                    <th className="px-4 py-4">Birim (M²)</th>
                    <th className="px-4 py-4">Toplam (M²)</th>
                    <th className="px-4 py-4 rounded-tr-lg w-16 text-center">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const birimM2 = calcM2(item.boy, item.en);
                    const adetNum = parseNumber(item.adet);
                    const toplamM2 = birimM2 * adetNum;

                    return (
                      <tr key={item.id} className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3">
                          <Input 
                            type="text"
                            value={item.parcaAdi || ""}
                            onChange={(e) => handleItemChange(item.id, "parcaAdi", e.target.value)}
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
                            className="bg-white dark:bg-[#0A0A0A] border-gray-200 dark:border-[#1a1a1e] text-slate-900 dark:text-white h-10 w-full focus-visible:ring-[#A67C52] text-center"
                            placeholder="Boy"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            min="0"
                            value={item.en}
                            onChange={(e) => handleItemChange(item.id, "en", e.target.value)}
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
                    );
                  })}
                </tbody>
              </table>
            </div>

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
                            return (
                              <div
                                key={rIdx}
                                className="absolute bg-[#16A34A] border border-[#FFFFFF] flex items-center justify-center overflow-hidden shadow-sm"
                                style={{
                                  top: `${(rect.y / plate.h) * 100}%`,
                                  left: `${(rect.x / plate.w) * 100}%`,
                                  width: `${(rect.w / plate.w) * 100}%`,
                                  height: `${(rect.h / plate.h) * 100}%`
                                }}
                              />
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
            <div>
              <h2 className={`text-3xl font-bold mb-2 ${isDownloading ? 'text-black' : 'text-slate-900 dark:text-white'}`}>Kesim Şeması</h2>
              {optimizationResults && (
                <p className={`font-medium ${isDownloading ? 'text-gray-600' : 'text-slate-500 dark:text-[#9E9696]'}`}>
                  Plaka Ebatı: {optimizationResults.pw}x{optimizationResults.ph} mm
                </p>
              )}
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
                            return (
                              <div
                                key={rIdx}
                                className="absolute bg-[#16A34A] border border-[#FFFFFF] flex items-center justify-center overflow-hidden shadow-sm"
                                style={{
                                  top: `${(rect.y / plate.h) * 100}%`,
                                  left: `${(rect.x / plate.w) * 100}%`,
                                  width: `${(rect.w / plate.w) * 100}%`,
                                  height: `${(rect.h / plate.h) * 100}%`
                                }}
                              >
                                <span className="text-[10px] font-bold text-[#FFFFFF] drop-shadow-md">
                                  {rect.w}x{rect.h}
                                </span>
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
                            transform: `translateZ(-${thickness === "4 mm" ? 12 : thickness === "3 mm" ? 9 : thickness === "2.7 mm" ? 8 : thickness === "2 mm" ? 6 : 4}px)`,
                          }}
                        ></div>

                        {/* Base surface */}
                        <div
                          className="absolute inset-0 bg-[#593d22] rounded-sm"
                          style={{
                            transform: `translateZ(-${(thickness === "4 mm" ? 12 : thickness === "3 mm" ? 9 : thickness === "2.7 mm" ? 8 : thickness === "2 mm" ? 6 : 4) / 2}px) scale(0.99)`,
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
                                return (
                                  <div
                                    key={rIdx}
                                    className="absolute bg-[#16A34A] border border-[#FFFFFF] flex items-center justify-center overflow-hidden shadow-sm"
                                    style={{
                                      top: `${(rect.y / plate.h) * 100}%`,
                                      left: `${(rect.x / plate.w) * 100}%`,
                                      width: `${(rect.w / plate.w) * 100}%`,
                                      height: `${(rect.h / plate.h) * 100}%`
                                    }}
                                  >
                                    <span className="text-[10px] font-bold text-[#FFFFFF] drop-shadow-md">
                                      {rect.w}x{rect.h}
                                    </span>
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