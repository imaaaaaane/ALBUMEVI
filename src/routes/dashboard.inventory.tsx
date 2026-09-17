import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ImagePlus } from "lucide-react";
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
import { getR2PublicUrl } from "@/lib/r2";
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

function SortableProductCard({
  p,
  onEdit,
  onDelete,
  onUploadImage,
  isUploading,
}: {
  p: any;
  onEdit: () => void;
  onDelete: () => void;
  onUploadImage: (file: File) => void;
  isUploading: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: p.id,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);


  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-xl transition-all duration-300 hover:border-[#A67C52]/50 hover:bg-white/10 relative cursor-grab active:cursor-grabbing h-full"
    >
      <div
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-20"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onUploadImage(file);
            }
          }}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 p-1 text-white/40 hover:text-[#A67C52] hover:bg-[#A67C52]/10 rounded-md"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <ImagePlus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 p-1 text-white/40 hover:text-[#A67C52] hover:bg-[#A67C52]/10 rounded-md"
          onClick={onEdit}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 p-1 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded-md"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {p.image_url ? (
        <div className="h-28 w-full bg-black/40 overflow-hidden relative border-b border-white/5">
          <img
            src={getR2PublicUrl(p.image_url)}
            alt={p.name}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
          <h3 className="absolute bottom-2 left-0 w-full text-xs font-bold text-center truncate px-2 text-white">
            {p.name}
          </h3>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-3 h-28 bg-black/20 border-b border-white/5 relative">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#A67C52]/30 bg-[#A67C52]/10 text-[#A67C52] mb-1.5">
            <Package className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-bold text-center truncate w-full px-1">{p.name}</h3>
        </div>
      )}

      <div className="flex flex-col p-3 bg-white/5 flex-1">
        <div className="flex flex-col text-[10px] text-gray-400 mb-2 gap-1 mt-1">
          {p.name.toLowerCase().includes('panoramik') ? (
            <>
              <div className="flex justify-between">
                <span>5 Sayfa:</span>
                <span className="text-[#A67C52] font-semibold">{p.sayfa_fiyatlari?.["5"] ? `${Number(p.sayfa_fiyatlari["5"]).toLocaleString()} ₺` : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span>10 Sayfa:</span>
                <span className="text-[#A67C52] font-semibold">{p.sayfa_fiyatlari?.["10"] ? `${Number(p.sayfa_fiyatlari["10"]).toLocaleString()} ₺` : '-'}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between mt-auto">
              <span>Satış Fiyatı:</span>
              <span className="text-[#A67C52] font-semibold">{p.sayfa_fiyatlari?.["single"] ? `${Number(p.sayfa_fiyatlari["single"]).toLocaleString()} ₺` : '-'}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-auto pt-2 border-t border-white/5 pointer-events-none">
          <div>
            <span className="text-white/60 group-hover:text-white transition-colors block text-[9px]">
              Satılan
            </span>
            <span className="font-medium text-[#A67C52] text-[10px]">{p.sold_count || 0} Adet</span>
          </div>
          <div>
            <span className="text-white/60 group-hover:text-white transition-colors block text-[9px]">
              Gelir
            </span>
            <span className="font-medium text-[#A67C52] text-[10px]">
              {Number(p.total_revenue || 0).toLocaleString()} ₺
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Inventory() {
  const { teamId } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const initialFiyatlari: Record<string, string> = {
    "5": "0",
    "10": "0",
  };
  const [form, setForm] = useState({ name: "", sayfa_fiyatlari: initialFiyatlari });

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<{
    id: string;
    name: string;
    image_url: string | null;
    file: File | null;
    sayfa_fiyatlari: Record<string, string>;
  }>({
    id: "",
    name: "",
    image_url: null,
    file: null,
    sayfa_fiyatlari: initialFiyatlari,
  });

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
        { data: ordersData, error: oError },
      ] = await Promise.all([
        (supabase as any)
          .from("products")
          .select("*")
          .order("sira", { ascending: true })
          .order("created_at", { ascending: true }),
        (supabase as any)
          .from("school_products")
          .select("school_id, product_id, custom_price")
          .order("id", { ascending: true }),
        (supabase as any)
          .from("students")
          .select("id, class_id, selection")
          .not("selection", "is", null),
        (supabase as any).from("classes").select("id, school_id"),
        (supabase as any).from("albumevi_sales").select("product_id, quantity"),
        (supabase as any).from("orders").select("package_name, quantity"),
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
            paket2: null,
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
          pStat.sold_count += sale.quantity || 1;
        }
      });

      // Aggregate from orders (matches by package_name)
      (ordersData ?? []).forEach((order: any) => {
        const pStat = productsWithStats.find(
          (p: any) => (p.name || "").toLowerCase() === (order.package_name || "").toLowerCase(),
        );
        if (pStat) {
          pStat.sold_count += order.quantity || 1;
        }
      });

      // Calculate Total Revenue based on base_price * sold_count
      productsWithStats.forEach((p: any) => {
        p.total_revenue = (p.sold_count || 0) * (p.base_price || 0);
      });

      // Intelligent Dimension Sorting
      productsWithStats.sort((a: any, b: any) => {
        const siraA = a.sira || 0;
        const siraB = b.sira || 0;

        // If either has been manually reordered
        if (siraA > 0 || siraB > 0) {
          return (siraA === 0 ? 99999 : siraA) - (siraB === 0 ? 99999 : siraB);
        }

        // Both sira 0 -> sort by parsed dimensions
        const extractDim = (name: string) => {
          if (!name) return 0;
          const match = name.match(/(\d+)\s*[xX*]\s*(\d+)/);
          if (match) {
            return parseFloat(match[1]) * parseFloat(match[2]);
          }
          return 0;
        };

        const dimA = extractDim(a.name);
        const dimB = extractDim(b.name);

        if (dimA && dimB && dimA !== dimB) {
          return dimA - dimB;
        }

        return (a.name || "").localeCompare(b.name || "");
      });

      return productsWithStats;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (input: {
      name: string;
      sayfa_fiyatlari: Record<string, string>;
    }) => {
      const { data, error } = await (supabase as any)
        .from("products")
        .insert({
          name: input.name,
          sayfa_fiyatlari: input.sayfa_fiyatlari,
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
      setForm({ name: "", sayfa_fiyatlari: initialFiyatlari });
    },
    onError: (e: Error) => toast.error(e.message || "Ürün eklenemedi"),
  });

  const updateMutation = useMutation({
    mutationFn: async (input: {
      id: string;
      name: string;
      image_url: string | null;
      file: File | null;
      sayfa_fiyatlari: Record<string, string>;
    }) => {
      await supabase.auth.getSession();

      let finalImageUrl = input.image_url;

      if (input.file) {
        const fileExt = input.file.name.split(".").pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await (supabase as any).storage
          .from("urun-resimleri")
          .upload(fileName, input.file);

        if (uploadError) throw new Error(`Resim yüklenemedi: ${uploadError.message}`);

        const {
          data: { publicUrl },
        } = (supabase as any).storage.from("urun-resimleri").getPublicUrl(fileName);

        finalImageUrl = publicUrl;
      }

      const { data, error } = await (supabase as any)
        .from("products")
        .update({
          name: input.name,
          image_url: finalImageUrl,
          sayfa_fiyatlari: input.sayfa_fiyatlari,
        })
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw new Error(`Güncelleme başarısız: ${error.message}`);
      return data;
    },
    onSuccess: () => {
      toast.success("Ürün başarıyla güncellendi");
      qc.invalidateQueries({ queryKey: ["products"] });
      setEditOpen(false);
    },
    onError: (e: Error) => toast.error(e.message || "Güncellenemedi"),
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);

  const uploadImageMutation = useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const fileExt = file.name.split(".").pop();
      const fileName = `${id}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("urun-resimleri")
        .upload(fileName, file);

      if (uploadError) throw new Error(`Resim yüklenemedi: ${uploadError.message}`);

      const {
        data: { publicUrl },
      } = supabase.storage.from("urun-resimleri").getPublicUrl(fileName);

      const { error: updateError } = await (supabase as any)
        .from("products")
        .update({ image_url: publicUrl })
        .eq("id", id);

      if (updateError) throw new Error(`Veritabanı güncellenemedi: ${updateError.message}`);

      return publicUrl;
    },
    onSuccess: () => {
      toast.success("Resim başarıyla yüklendi");
      qc.invalidateQueries({ queryKey: ["products"] });
      setUploadingImageId(null);
    },
    onError: (e: any) => {
      toast.error(e.message);
      setUploadingImageId(null);
    },
  });

  const updateSiraMutation = useMutation({
    mutationFn: async (updates: { id: string; sira: number }[]) => {
      const updatePromises = updates.map((u) =>
        (supabase as any).from("products").update({ sira: u.sira }).eq("id", u.id),
      );
      const results = await Promise.all(updatePromises);
      const error = results.find((r) => r.error)?.error;
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err: any) => {
      toast.error(`Sıralama güncellenirken hata oluştu: ${err.message}`);
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = products.findIndex((p: any) => p.id === active.id);
      const newIndex = products.findIndex((p: any) => p.id === over.id);

      const newArray = arrayMove(products, oldIndex, newIndex);

      // Update cache optimistically
      qc.setQueryData(["products"], newArray);

      const updates = newArray.map((item: any, index: number) => ({
        id: item.id,
        sira: index + 1,
      }));

      updateSiraMutation.mutate(updates);
    }
  };

  const totalProducts = products.length;

  let totalRevenueAll = 0;
  let totalSoldAll = 0;
  products.forEach((p: any) => {
    totalRevenueAll += p.total_revenue || 0;
    totalSoldAll += p.sold_count || 0;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Lütfen isim girin");
      return;
    }
    addMutation.mutate({
      name: form.name.trim(),
      sayfa_fiyatlari: form.sayfa_fiyatlari,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      toast.error("Lütfen isim girin");
      return;
    }
    updateMutation.mutate({
      id: editForm.id,
      name: editForm.name.trim(),
      image_url: editForm.image_url,
      file: editForm.file,
      sayfa_fiyatlari: editForm.sayfa_fiyatlari,
    });
  };

  const groupedProducts: Record<string, any[]> = {
    'Panoramik': [],
    'Baskı': [],
    'Canvas': [],
    'Okul İşleri': [],
    'Diğer': []
  };

  products.forEach((p: any) => {
    const name = (p.name || '').toLowerCase();
    const cat = (p.category || '').toLowerCase();
    
    if (cat.includes('panoramik') || name.includes('panoramik')) {
      groupedProducts['Panoramik'].push(p);
    } else if (cat.includes('canvas') || name.includes('canvas') || cat.includes('kanvas') || name.includes('kanvas')) {
      groupedProducts['Canvas'].push(p);
    } else if (cat.includes('baskı') || name.includes('baskı') || cat.includes('baski') || name.includes('baski')) {
      groupedProducts['Baskı'].push(p);
    } else if (cat.includes('ahşap') || name.includes('ahşap') || cat.includes('ahsap') || name.includes('ahsap') || cat.includes('album') || name.includes('album') || cat.includes('albüm') || name.includes('albüm') || cat.includes('okul') || name.includes('okul')) {
      groupedProducts['Okul İşleri'].push(p);
    } else {
      groupedProducts['Diğer'].push(p);
    }
  });

  const displayedProducts = selectedCategory ? groupedProducts[selectedCategory] || [] : [];

  return (
    <div className="space-y-8 min-h-screen bg-[#131316] text-white selection:bg-[#A67C52] selection:text-white pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4">
          {selectedCategory && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedCategory(null)}
              className="h-12 w-12 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-white shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {selectedCategory ? `${selectedCategory} Envanteri` : "Ürün Envanteri"}
            </h1>
            <p className="text-sm text-white/50 mt-1">
              Okullar için sunulacak paketleri ve varsayılan fiyatlarını yönetin.
            </p>
          </div>
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
        <StatCard
          label="Genel Toplam Gelir"
          value={`${totalRevenueAll.toLocaleString()} ₺`}
          icon={DollarSign}
        />
        <StatCard
          label="Son Güncelleme"
          value={
            products.length
              ? new Date(products[products.length - 1]?.created_at).toLocaleDateString("tr-TR")
              : "-"
          }
          icon={Clock}
        />
      </div>

      {/* Products grid */}
      {/* Dynamic Main View */}
      {isLoading ? (
        <div className="rounded-2xl border border-white/5 bg-white/5 p-12 text-center text-white/50">
          Ürünler yükleniyor...
        </div>
      ) : !selectedCategory ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(groupedProducts).map(([category, items]) => {
            if (category === 'Okul İşleri' && items.length === 0) return null;
            const coverImage = items.find(p => p.image_url)?.image_url;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className="relative group overflow-hidden rounded-3xl border border-white/10 bg-white/5 aspect-video hover:border-[#A67C52]/50 hover:shadow-xl hover:shadow-[#A67C52]/10 transition-all duration-300 text-left"
              >
                {coverImage ? (
                  <>
                    <img src={getR2PublicUrl(coverImage)} alt={category} className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/80 to-transparent pointer-events-none" />
                  </>
                ) : (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                    <Package className="w-16 h-16 text-[#A67C52]/20 group-hover:text-[#A67C52]/40 transition-colors" />
                  </div>
                )}
                <div className="absolute bottom-6 left-6 right-6 z-10">
                  <h3 className="text-3xl font-black text-white drop-shadow-md">{category}</h3>
                  <p className="text-[#A67C52] font-semibold mt-1 bg-black/40 inline-block px-3 py-1 rounded-full text-xs backdrop-blur-sm border border-white/5">
                    {items.length} Ürün
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2.5">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={displayedProducts.map((p: any) => p.id)}
              strategy={rectSortingStrategy}
            >
              {displayedProducts.map((p: any) => (
                <SortableProductCard
                  key={p.id}
                  p={p}
                  onEdit={() => {
                    setEditForm({
                      id: p.id,
                      name: p.name,
                      image_url: p.image_url || null,
                      file: null,
                      sayfa_fiyatlari: p.sayfa_fiyatlari || {
                        "5": "0",
                        "10": "0",
                      },
                    });
                    setEditOpen(true);
                  }}
                  onDelete={() => {
                    if (confirm("Bu ürünü silmek istediğinize emin misiniz?")) {
                      deleteMutation.mutate(p.id);
                    }
                  }}
                  onUploadImage={(file) => {
                    setUploadingImageId(p.id);
                    uploadImageMutation.mutate({ id: p.id, file });
                  }}
                  isUploading={uploadingImageId === p.id}
                />
              ))}
            </SortableContext>
          </DndContext>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="group flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/10 bg-transparent p-3 text-center transition-all hover:border-[#A67C52]/60 hover:bg-white/5 cursor-pointer"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#A67C52]/30 bg-[#A67C52]/10 text-[#A67C52] transition-transform group-hover:scale-110">
              <Plus className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white mb-0.5">Yeni Ürün Ekle</div>
              <p className="text-[9px] text-white/40 max-w-[120px] mx-auto leading-tight">
                Envantere yeni bir ürün veya paket seçeneği ekleyin.
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Add Product Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-white/10 bg-[#131316] text-white max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Yeni Ürün Ekle</DialogTitle>
            <DialogDescription className="text-white/50">
              Sisteme yeni bir paket veya ürün tanımlayın.
            </DialogDescription>
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
            <div className="space-y-4 pt-4 border-t border-white/10">
              <h4 className="font-semibold text-[#A67C52]">Fiyatlandırma</h4>
              {form.name.toLowerCase().includes('panoramik') ? (
                <div className="grid grid-cols-2 gap-4">
                  {[5, 10].map((num) => (
                    <div key={num} className="space-y-2">
                      <Label className="text-white/70">{num} Sayfa Fiyatı (₺)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.sayfa_fiyatlari[String(num)] || "0"}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            sayfa_fiyatlari: {
                              ...form.sayfa_fiyatlari,
                              [String(num)]: e.target.value,
                            },
                          })
                        }
                        className="bg-white/5 border-white/10 text-white rounded-xl h-10 focus-visible:ring-[#A67C52]"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-white/70">Satış Fiyatı (₺)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.sayfa_fiyatlari["single"] || "0"}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        sayfa_fiyatlari: {
                          ...form.sayfa_fiyatlari,
                          ["single"]: e.target.value,
                        },
                      })
                    }
                    className="bg-white/5 border-white/10 text-white rounded-xl h-10 focus-visible:ring-[#A67C52]"
                  />
                </div>
              )}
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
            <DialogTitle className="text-xl font-bold">Ürünü Düzenle</DialogTitle>
            <DialogDescription className="text-white/50">
              {editForm.name} için fiyat ve resim güncelleyin.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-5 mt-4">
            <div className="space-y-2">
              <Label className="text-white/70">Ürün Adı</Label>
              <Input
                placeholder="Örn: Albüm Paketi"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="bg-white/5 border-white/10 text-white rounded-xl h-12 focus-visible:ring-[#A67C52]"
              />
            </div>

            <div className="space-y-4 pt-4 border-t border-white/10">
              <h4 className="font-semibold text-[#A67C52]">Fiyatlandırma</h4>
              {editForm.name.toLowerCase().includes('panoramik') ? (
                <div className="grid grid-cols-2 gap-4">
                  {[5, 10].map((num) => (
                    <div key={num} className="space-y-2">
                      <Label className="text-white/70">{num} Sayfa Fiyatı (₺)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editForm.sayfa_fiyatlari[String(num)] || "0"}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            sayfa_fiyatlari: {
                              ...editForm.sayfa_fiyatlari,
                              [String(num)]: e.target.value,
                            },
                          })
                        }
                        className="bg-white/5 border-white/10 text-white rounded-xl h-10 focus-visible:ring-[#A67C52]"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-white/70">Satış Fiyatı (₺)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.sayfa_fiyatlari["single"] || "0"}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        sayfa_fiyatlari: {
                          ...editForm.sayfa_fiyatlari,
                          ["single"]: e.target.value,
                        },
                      })
                    }
                    className="bg-white/5 border-white/10 text-white rounded-xl h-10 focus-visible:ring-[#A67C52]"
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Ürün Resmi</Label>
              <div className="flex items-center gap-4">
                {editForm.image_url || editForm.file ? (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                    <img
                      src={editForm.file ? URL.createObjectURL(editForm.file) : getR2PublicUrl(editForm.image_url!)}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, image_url: null, file: null })}
                      className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-white text-xs"
                    >
                      Kaldır
                    </button>
                  </div>
                ) : (
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setEditForm({ ...editForm, file: e.target.files[0] });
                        }
                      }}
                      className="bg-white/5 border-white/10 text-white rounded-xl h-12 focus-visible:ring-[#A67C52] pt-2.5"
                    />
                  </div>
                )}
                {(editForm.image_url || editForm.file) && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditForm({ ...editForm, image_url: null, file: null })}
                    className="h-12 px-4 rounded-xl border-white/10 bg-white/5 text-white/70 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                  >
                    Resmi Kaldır
                  </Button>
                )}
              </div>
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
