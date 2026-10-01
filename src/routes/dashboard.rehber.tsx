import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Send, Phone, MapPin, Building2, User, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
  presentation_status: boolean;
  photoshoot_status: boolean;
}

function RehberComponent() {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states
  const [schoolName, setSchoolName] = useState("");
  const [district, setDistrict] = useState("");
  const [principalName, setPrincipalName] = useState("");
  const [principalPhone, setPrincipalPhone] = useState("");

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

  const sendReportMutation = useMutation({
    mutationFn: async (prospect: Prospect) => {
      // Send Email Notification via EmailJS
      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

      if (serviceId && templateId && publicKey) {
        const emailData = {
          service_id: serviceId,
          template_id: templateId,
          user_id: publicKey,
          template_params: {
            subject: `Yeni Okul Raporu: ${prospect.school_name}`,
            school_name: prospect.school_name,
            district: prospect.district,
            principal_name: prospect.principal_name,
            principal_phone: prospect.principal_phone,
            meeting_status: prospect.meeting_status.toUpperCase(),
            presentation_status: prospect.presentation_status ? 'YAPILDI' : 'YAPILMADI',
            photoshoot_status: prospect.photoshoot_status ? 'YAPILDI' : 'YAPILMADI',
            date: new Date().toLocaleString('tr-TR'),
          }
        };

        const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(emailData)
        });

        if (!res.ok) {
          throw new Error("Email gönderilemedi");
        }
      } else {
        console.warn("EmailJS yapılandırması eksik, sadece PDF oluşturuluyor.");
      }

      // 2. Generate lightweight PDF using native window.print() approach for simplicity
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Rapor: ${prospect.school_name}</title>
              <style>
                body { font-family: sans-serif; padding: 40px; color: #333; }
                h1 { color: #A67C52; }
                .info-grid { display: grid; grid-template-columns: 150px 1fr; gap: 10px; margin-top: 20px; }
                .label { font-weight: bold; color: #666; }
                .status-box { margin-top: 30px; padding: 20px; background: #f9f9f9; border-radius: 8px; }
              </style>
            </head>
            <body>
              <h1>Okul Prospekt Raporu</h1>
              <div class="info-grid">
                <div class="label">Okul Adı:</div><div>${prospect.school_name}</div>
                <div class="label">Bölge:</div><div>${prospect.district}</div>
                <div class="label">Müdür Adı:</div><div>${prospect.principal_name}</div>
                <div class="label">Telefon:</div><div>${prospect.principal_phone}</div>
              </div>
              <div class="status-box">
                <h2>Süreç Durumu</h2>
                <p><strong>Görüşme:</strong> <span style="text-transform: uppercase;">${prospect.meeting_status}</span></p>
                <p><strong>Tanıtım:</strong> ${prospect.presentation_status ? 'YAPILDI' : 'YAPILMADI'}</p>
                <p><strong>Çekim:</strong> ${prospect.photoshoot_status ? 'YAPILDI' : 'YAPILMADI'}</p>
              </div>
              <p style="margin-top: 50px; font-size: 12px; color: #999;">Oluşturulma Tarihi: ${new Date().toLocaleString('tr-TR')}</p>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }
    },
    onSuccess: () => {
      toast.success("Rapor başarıyla gönderildi ve bildirildi.");
    }
  });

  const handleAddSubmit = () => {
    if (!schoolName || !district) return toast.error("Okul adı ve bölge zorunludur.");
    addProspectMutation.mutate({
      school_name: schoolName,
      district,
      principal_name: principalName,
      principal_phone: principalPhone,
    });
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="text-white/50 col-span-full">Yükleniyor...</div>
          ) : prospects.length === 0 ? (
            <div className="text-white/50 col-span-full py-10 text-center">
              Henüz rehbere okul eklenmedi.
            </div>
          ) : (
            prospects.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#131316] border border-white/5 p-6 rounded-2xl flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-[#A67C52]" />
                      {p.school_name}
                    </h3>
                    <div className="flex items-center text-sm text-[#9E9696] mt-1 gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {p.district}
                    </div>
                  </div>

                  <div className="space-y-2 bg-white/[0.02] p-3 rounded-lg border border-white/5">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <User className="w-4 h-4 text-white/50" /> {p.principal_name || "Belirtilmedi"}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Phone className="w-4 h-4 text-white/50" /> {p.principal_phone || "Belirtilmedi"}
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#9E9696]">Görüşme</span>
                      <Select
                        value={p.meeting_status}
                        onValueChange={(val) => updateProspectMutation.mutate({ id: p.id, updates: { meeting_status: val } })}
                      >
                        <SelectTrigger className="w-[120px] h-8 text-xs bg-white/5 border-white/10 text-white focus:ring-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#111111] border-white/10 text-white">
                          <SelectItem value="yapılmadı">Yapılmadı</SelectItem>
                          <SelectItem value="olumlu">Olumlu</SelectItem>
                          <SelectItem value="olumsuz">Olumsuz</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#9E9696]">Tanıtım</span>
                      <Select
                        value={p.presentation_status ? "yapıldı" : "yapılmadı"}
                        onValueChange={(val) => updateProspectMutation.mutate({ id: p.id, updates: { presentation_status: val === "yapıldı" } })}
                      >
                        <SelectTrigger className="w-[120px] h-8 text-xs bg-white/5 border-white/10 text-white focus:ring-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#111111] border-white/10 text-white">
                          <SelectItem value="yapılmadı">Yapılmadı</SelectItem>
                          <SelectItem value="yapıldı">Yapıldı</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#9E9696]">Çekim</span>
                      <Select
                        value={p.photoshoot_status ? "yapıldı" : "yapılmadı"}
                        onValueChange={(val) => updateProspectMutation.mutate({ id: p.id, updates: { photoshoot_status: val === "yapıldı" } })}
                      >
                        <SelectTrigger className="w-[120px] h-8 text-xs bg-white/5 border-white/10 text-white focus:ring-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#111111] border-white/10 text-white">
                          <SelectItem value="yapılmadı">Yapılmadı</SelectItem>
                          <SelectItem value="yapıldı">Yapıldı</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => sendReportMutation.mutate(p)}
                  disabled={sendReportMutation.isPending}
                  className="w-full mt-6 bg-white/5 hover:bg-white/10 text-white border border-white/10"
                >
                  <FileText className="w-4 h-4 mr-2 text-[#A67C52]" /> Rapor Gönder
                </Button>
              </motion.div>
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
    </div>
  );
}
