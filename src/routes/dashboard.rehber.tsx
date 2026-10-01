import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Send, Phone, MapPin, Building2, User, ChevronDown, ChevronUp, Edit2, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/dashboard/rehber")({
  component: RehberComponent,
});

interface Prospect {
  id: string;
  created_at: string;
  school_name: string;
  district: string;
  principal_name: string;
  principal_phone: string;
  meeting_status: string;
  notes?: string;
}

function RehberComponent() {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);

  // Form states
  const [schoolName, setSchoolName] = useState("");
  const [district, setDistrict] = useState("");
  const [principalName, setPrincipalName] = useState("");
  const [principalPhone, setPrincipalPhone] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: prospects = [], isLoading } = useQuery<Prospect[]>({
    queryKey: ["rehber_prospects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rehber_prospects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const addProspectMutation = useMutation({
    mutationFn: async (newProspect: Partial<Prospect>) => {
      const { data, error } = await supabase.from("rehber_prospects")
        .insert([newProspect]);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rehber_prospects"] });
      toast.success("Okul başarıyla rehbere eklendi.");
      setIsAddModalOpen(false);
      setSchoolName("");
      setDistrict("");
      setPrincipalName("");
      setPrincipalPhone("");
    },
    onError: (error) => {
      toast.error("Hata oluştu: " + error.message);
    }
  });

  const updateProspectMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Prospect> }) => {
      const { error } = await supabase.from("rehber_prospects")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rehber_prospects"] });
      toast.success("Durum güncellendi.");
    },
  });

  const deleteProspectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rehber_prospects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rehber_prospects"] });
      toast.success("Okul rehberden silindi.");
    },
    onError: (error) => {
      toast.error("Silme hatası: " + error.message);
    }
  });

  const editProspectMutation = useMutation({
    mutationFn: async (updates: Partial<Prospect> & { id: string }) => {
      const { id, ...data } = updates;
      const { error } = await supabase.from("rehber_prospects").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rehber_prospects"] });
      toast.success("Okul bilgileri güncellendi.");
      setEditingProspect(null);
    },
    onError: (error) => {
      toast.error("Güncelleme hatası: " + error.message);
    }
  });
  const filteredAndSortedProspects = prospects
    .filter((p) => 
      p.school_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.district.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => a.school_name.localeCompare(b.school_name, 'tr'));


  const handleAddSubmit = () => {
    if (!schoolName || !district) return toast.error("Okul adı ve bölge zorunludur.");
    addProspectMutation.mutate({
      school_name: schoolName,
      district,
      principal_name: principalName,
      principal_phone: principalPhone,
    });
  };

  const handleEditSubmit = () => {
    if (!editingProspect) return;
    if (!editingProspect.school_name || !editingProspect.district) {
      return toast.error("Okul adı ve bölge zorunludur.");
    }
    editProspectMutation.mutate(editingProspect);
  };

  return (
    <div className="flex-1 overflow-auto bg-[#0a0a0a] min-h-screen">
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">
              Rehber
            </h1>
            <p className="text-sm text-[#9E9696] mt-0.5 font-medium">
              Potansiyel okul ve müşteri görüşmelerinin takibi
            </p>
          </div>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-bold cursor-pointer rounded-xl h-11 px-5 shadow-[0_0_12px_rgba(166,124,82,0.3)]"
          >
            <Plus className="mr-2 h-4 w-4" /> Rehber Ekle
          </Button>
        </div>

        <div className="relative max-w-md w-full">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Okul adı veya bölge ara..."
            className="w-full bg-white/5 border-white/10 text-white placeholder-gray-400 h-11 rounded-xl pr-10 focus-visible:ring-[#A67C52]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="text-white/50 col-span-full">Yükleniyor...</div>
          ) : filteredAndSortedProspects.length === 0 ? (
            <div className="text-white/50 col-span-full py-10 text-center">
              Arama kriterlerine uygun okul bulunamadı.
            </div>
          ) : (
            filteredAndSortedProspects.map((item, index) => (
              <SchoolCard 
                key={item.id || index} 
                item={item} 
                updateProspectMutation={updateProspectMutation} 
                onEdit={() => setEditingProspect(item)}
                onDelete={() => {
                  if (window.confirm("Bu okulu rehberden silmek istediğinize emin misiniz?")) {
                    deleteProspectMutation.mutate(item.id);
                  }
                }}
              />
            ))
          )}
        </div>
      </div>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#111111] border-white/10 text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Yeni Okul Ekle</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Okul Adı</Label>
              <Input
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
                placeholder="Örn: Atatürk İlkokulu"
              />
            </div>
            <div className="grid gap-2">
              <Label>Bölge</Label>
              <Input
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
                placeholder="Örn: Kadıköy"
              />
            </div>
            <div className="grid gap-2">
              <Label>Müdür Adı</Label>
              <Input
                value={principalName}
                onChange={(e) => setPrincipalName(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
                placeholder="Ad Soyad"
              />
            </div>
            <div className="grid gap-2">
              <Label>Müdür Telefonu</Label>
              <Input
                value={principalPhone}
                onChange={(e) => setPrincipalPhone(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
                placeholder="05XX XXX XX XX"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={addProspectMutation.isPending}
              onClick={handleAddSubmit}
              className="w-full bg-[#A67C52] hover:bg-[#A67C52]/90 text-white"
            >
              {addProspectMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingProspect} onOpenChange={(open) => !open && setEditingProspect(null)}>
        <DialogContent className="sm:max-w-[425px] bg-[#111111] border-white/10 text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Okul Düzenle</DialogTitle>
          </DialogHeader>
          {editingProspect && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Okul Adı</Label>
                <Input
                  value={editingProspect.school_name}
                  onChange={(e) => setEditingProspect({ ...editingProspect, school_name: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="grid gap-2">
                <Label>Bölge</Label>
                <Input
                  value={editingProspect.district}
                  onChange={(e) => setEditingProspect({ ...editingProspect, district: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="grid gap-2">
                <Label>Müdür Adı</Label>
                <Input
                  value={editingProspect.principal_name}
                  onChange={(e) => setEditingProspect({ ...editingProspect, principal_name: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="grid gap-2">
                <Label>Müdür Telefonu</Label>
                <Input
                  value={editingProspect.principal_phone}
                  onChange={(e) => setEditingProspect({ ...editingProspect, principal_phone: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              disabled={editProspectMutation.isPending}
              onClick={handleEditSubmit}
              className="w-full bg-[#A67C52] hover:bg-[#A67C52]/90 text-white"
            >
              {editProspectMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SchoolCard({ item, updateProspectMutation, onEdit, onDelete }: { item: Prospect, updateProspectMutation: any, onEdit: () => void, onDelete: () => void }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#131316] border border-white/5 p-6 rounded-2xl flex flex-col justify-between overflow-hidden h-fit"
    >
      <div 
        className="cursor-pointer flex items-center justify-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#A67C52]" />
            {item.school_name}
          </h3>
          <div className="flex items-center text-sm text-[#9E9696] mt-1 gap-2">
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {item.district}
            </div>
            <span className="text-white/20">•</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
              item.meeting_status === 'olumlu' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
              item.meeting_status === 'olumsuz' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
              item.meeting_status === 'bekleme' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
              'bg-gray-500/10 text-gray-400 border border-gray-500/20'
            }`}>
              {item.meeting_status}
            </span>
          </div>
        </div>
        <div className="text-[#9E9696]">
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </div>

      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-6 space-y-4"
        >
          <div className="space-y-2 bg-white/[0.02] p-3 rounded-lg border border-white/5">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <User className="w-4 h-4 text-white/50" /> {item.principal_name || "Belirtilmedi"}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Phone className="w-4 h-4 text-white/50" /> {item.principal_phone || "Belirtilmedi"}
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#9E9696]">Görüşme</span>
                <Select
                  value={item.meeting_status === "yapılmadı" ? "yapılmadı" : "yapıldı"}
                  onValueChange={(val) => updateProspectMutation.mutate({ id: item.id, updates: { meeting_status: val === "yapıldı" ? "olumlu" : "yapılmadı" } })}
                >
                  <SelectTrigger className={`w-[120px] h-8 text-xs focus:ring-0 ${item.meeting_status === "yapılmadı" ? "bg-white/5 border-white/10 text-white" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111111] border-white/10 text-white">
                    <SelectItem value="yapılmadı">Yapılmadı</SelectItem>
                    <SelectItem value="yapıldı">Yapıldı</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {item.meeting_status !== "yapılmadı" && (
                <div className="flex items-center justify-between pl-4 border-l border-white/10 ml-1">
                  <span className="text-xs text-[#9E9696]">Sonuç</span>
                  <Select
                    value={item.meeting_status}
                    onValueChange={(val) => updateProspectMutation.mutate({ id: item.id, updates: { meeting_status: val } })}
                  >
                    <SelectTrigger className={`w-[105px] h-7 text-[11px] focus:ring-0 ${
                      item.meeting_status === "olumlu" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : 
                      item.meeting_status === "bekleme" ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                      "bg-red-500/10 border-red-500/20 text-red-400"
                    }`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111111] border-white/10 text-white">
                      <SelectItem value="olumlu">Olumlu</SelectItem>
                      <SelectItem value="bekleme">Bekleme</SelectItem>
                      <SelectItem value="olumsuz">Olumsuz</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2">
            <Label className="text-sm text-[#9E9696] mb-2 block">Notlar</Label>
            <Textarea 
              className="bg-white/5 border-white/10 text-white min-h-[80px] text-sm resize-none"
              placeholder="Okul ile ilgili notlar..."
              defaultValue={item.notes || ""}
              onBlur={(e) => {
                if (e.target.value !== item.notes) {
                  updateProspectMutation.mutate({ id: item.id, updates: { notes: e.target.value } });
                }
              }}
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-white/5 mt-4 pt-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-400/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

        </motion.div>
      )}
    </motion.div>
  );
}
