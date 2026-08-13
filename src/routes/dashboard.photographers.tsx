import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Camera, UploadCloud, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const Route = createFileRoute("/dashboard/photographers")({
  component: PhotographersPage,
});

function PhotographersPage() {
  const { teamId } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name: "",
    role: "Fotoğrafçı",
    phone: "",
    img: "",
  });

  const { data: photographers = [], isLoading } = useQuery({
    queryKey: ["photographers", teamId],
    queryFn: async () => {
      if (!teamId) return [];
      let q = (supabase as any)
        .from("photographers")
        .select("*")
        .order("created_at", { ascending: false });
      if (teamId !== "all") {
        q = q.eq("team_id", teamId);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingId) {
        const { error } = await (supabase as any)
          .from("photographers")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("photographers")
          .insert({ ...payload, team_id: teamId === "all" ? null : teamId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photographers"] });
      toast.success(editingId ? "Çekimci güncellendi" : "Çekimci eklendi");
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Bir hata oluştu");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("photographers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photographers"] });
      toast.success("Çekimci silindi");
    },
    onError: (err: any) => {
      toast.error(err.message || "Silinirken hata oluştu");
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !teamId) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${teamId}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      setForm((prev) => ({ ...prev, img: publicUrlData.publicUrl }));
      toast.success("Fotoğraf yüklendi!");
    } catch (err: any) {
      toast.error(err.message || "Fotoğraf yüklenemedi.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    if (!form.full_name || !form.role) {
      toast.error("Ad ve Unvan alanları zorunludur.");
      return;
    }
    saveMutation.mutate(form);
  };

  const openAddModal = () => {
    setEditingId(null);
    setForm({ full_name: "", role: "Fotoğrafçı", phone: "", img: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (p: any) => {
    setEditingId(p.id);
    setForm({ full_name: p.full_name || "", role: p.role || "", phone: p.phone || "", img: p.img || "" });
    setIsModalOpen(true);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Çekimciler Yönetimi</h1>
          <p className="text-white/60 mt-2">
            Ekibinizdeki fotoğrafçıları ve rollerini yönetin. Bu liste ana sayfada görüntülenir.
          </p>
        </div>
        <Button
          onClick={openAddModal}
          className="bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-bold rounded-xl shadow-[0_0_15px_rgba(166,124,82,0.3)] transition-all"
        >
          <Plus className="w-5 h-5 mr-2" />
          Yeni Çekimci Ekle
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#A67C52]" />
        </div>
      ) : photographers.length === 0 ? (
        <div className="text-center py-20 border border-white/5 rounded-3xl bg-white/5">
          <Camera className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white">Henüz çekimci eklenmedi</h3>
          <p className="text-white/50 mt-2">Ekibinizi oluşturmak için ilk çekimcinizi ekleyin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {photographers.map((p: any) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={p.id}
              className="bg-[#12100E] border-t border-white/10 rounded-2xl overflow-hidden shadow-lg border-t-[#A67C52]/20"
            >
              <div className="aspect-[4/3] relative bg-black">
                {p.img ? (
                  <img src={p.img} alt={p.full_name} className="w-full h-full object-cover opacity-80" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-white/5 text-white/30">
                    Görsel Yok
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#12100E] via-transparent to-transparent" />
                <div className="absolute top-3 right-3 flex gap-2">
                  <button
                    onClick={() => openEditModal(p)}
                    className="p-2 bg-black/50 hover:bg-[#A67C52] text-white rounded-lg backdrop-blur-md transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm("Bu çekimciyi silmek istediğinize emin misiniz?")) {
                        deleteMutation.mutate(p.id);
                      }
                    }}
                    className="p-2 bg-black/50 hover:bg-red-500 text-white rounded-lg backdrop-blur-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-xl font-bold text-white">{p.full_name}</h3>
                <p className="text-[#A67C52] font-medium text-sm mt-1">{p.role}</p>
                {p.phone && (
                  <p className="text-white/60 text-sm mt-3 flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[10px]">📞</span>
                    {p.phone}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-[#131316] border border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingId ? "Çekimci Düzenle" : "Yeni Çekimci Ekle"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-white/70">Fotoğraf</Label>
              <div className="relative group border-2 border-dashed border-white/20 hover:border-[#A67C52] rounded-xl p-6 text-center transition-colors bg-white/5 overflow-hidden">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                />
                {isUploading ? (
                  <div className="flex flex-col items-center gap-2 pointer-events-none">
                    <Loader2 className="w-8 h-8 text-[#A67C52] animate-spin" />
                    <p className="text-white font-medium">Yükleniyor...</p>
                  </div>
                ) : form.img ? (
                  <div className="absolute inset-0 z-10">
                    <img src={form.img} alt="Preview" className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white font-bold drop-shadow-md">Değiştirmek için tıkla</p>
                    </div>
                  </div>
                ) : (
                  <div className="pointer-events-none flex flex-col items-center gap-2 relative z-10">
                    <UploadCloud className="w-8 h-8 text-[#A67C52]" />
                    <p className="text-white font-medium">Fotoğraf yükle</p>
                    <p className="text-white/50 text-xs">PNG, JPG</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white/70">Ad Soyad</Label>
              <Input
                id="full_name"
                placeholder="Örn. Can Kaya"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="bg-white/5 border-white/10 text-white rounded-xl focus-visible:ring-[#A67C52]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/70">Rol / Unvan</Label>
              <Input
                placeholder="Örn. Baş Fotoğrafçı"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="bg-white/5 border-white/10 text-white rounded-xl focus-visible:ring-[#A67C52]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/70">Telefon</Label>
              <Input
                placeholder="Örn. +90 555 123 4567"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="bg-white/5 border-white/10 text-white rounded-xl focus-visible:ring-[#A67C52]"
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending || isUploading}
              className="w-full bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-bold rounded-xl h-11"
            >
              {saveMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Kaydet"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
