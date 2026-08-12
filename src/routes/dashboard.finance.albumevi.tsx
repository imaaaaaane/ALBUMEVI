import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabaseClient as supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/dashboard/finance/albumevi")({
  component: AlbumeviSalesPage,
});

function AlbumeviSalesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { teamId } = useAuth();

  const [isAlbumeviModalOpen, setAlbumeviModalOpen] = useState(false);
  const [albumeviForm, setAlbumeviForm] = useState({ company_name: "", product_id: "", quantity: 1, unit_price: 0 });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("products").select("id, name, base_price").order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["albumevi_sales", teamId],
    enabled: !!teamId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("albumevi_sales")
        .select("*")
        
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const albumeviMutation = useMutation({
    mutationFn: async (input: { company_name: string; product_name: string; quantity: number; total_price: number }) => {
      const { data, error } = await (supabase as any).from("albumevi_sales").insert({
        ...input,
        
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["albumevi_sales"] });
      queryClient.invalidateQueries({ queryKey: ["finance_metrics"] });
      toast.success("Satış başarıyla eklendi");
      setAlbumeviModalOpen(false);
      setAlbumeviForm({ company_name: "", product_id: "", quantity: 1, unit_price: 0 });
    },
    onError: (error: any) => {
      toast.error("Satış eklenirken bir hata oluştu: " + error.message);
    }
  });

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] text-white">
      <div className="flex items-center justify-between p-6 border-b border-white/5">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/dashboard/finance" })} className="text-[#9E9696] hover:text-white hover:bg-white/5">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Albümevi Satışları</h1>
            <p className="text-sm text-[#9E9696]">Albümevi'ne ait tüm satış ve sipariş kayıtları</p>
          </div>
        </div>
        <Button onClick={() => setAlbumeviModalOpen(true)} className="bg-[#A67C52] text-white hover:bg-[#A67C52]/90">
          <PlusCircle className="w-4 h-4 mr-2" /> Yeni Satış Ekle
        </Button>
      </div>

      <div className="p-6 flex-1 overflow-auto">
        <div className="bg-[#131316] border border-white/5 rounded-2xl overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[#9E9696] uppercase bg-white/5 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-semibold">Tarih</th>
                <th className="px-6 py-4 font-semibold">Firma/Fotoğrafçı</th>
                <th className="px-6 py-4 font-semibold">Ürün</th>
                <th className="px-6 py-4 font-semibold text-center">Adet</th>
                <th className="px-6 py-4 font-semibold text-right">Toplam Fiyat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-[#9E9696]">Yükleniyor...</td></tr>
              ) : sales.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-[#9E9696]">Kayıt bulunamadı.</td></tr>
              ) : (
                sales.map((sale: any) => (
                  <tr key={sale.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 text-[#9E9696]">{new Date(sale.created_at).toLocaleDateString("tr-TR")}</td>
                    <td className="px-6 py-4 font-medium text-white">{sale.company_name}</td>
                    <td className="px-6 py-4 text-white">{sale.product_name}</td>
                    <td className="px-6 py-4 text-center text-white">{sale.quantity}</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-[#A67C52]">
                      {Number(sale.total_price).toLocaleString("tr-TR")} ₺
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Albumevi Sales Modal */}
      <Dialog open={isAlbumeviModalOpen} onOpenChange={setAlbumeviModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#111111] text-white border-white/10">
          <DialogHeader>
            <DialogTitle>Yeni Albümevi Satışı</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Firma/Fotoğrafçı Adı</Label>
              <Input
                value={albumeviForm.company_name}
                onChange={(e) => setAlbumeviForm(prev => ({ ...prev, company_name: e.target.value }))}
                className="bg-white/5 border-white/10 text-white"
                placeholder="Örn: X Fotoğrafçılık"
              />
            </div>
            <div className="grid gap-2">
              <Label>Ürün Seç</Label>
              <Select
                value={albumeviForm.product_id}
                onValueChange={(v) => {
                  const prod = products.find((p: any) => p.id === v);
                  setAlbumeviForm(prev => ({ 
                    ...prev, 
                    product_id: v, 
                    unit_price: prod ? prod.base_price : 0 
                  }));
                }}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Ürün seçin" />
                </SelectTrigger>
                <SelectContent className="bg-[#111111] text-white border-white/10">
                  {products.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.base_price} ₺)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Adet</Label>
              <Input
                type="number"
                min="1"
                value={albumeviForm.quantity}
                onChange={(e) => setAlbumeviForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label>Toplam Tutar</Label>
              <div className="h-10 px-3 flex items-center bg-white/5 border border-white/10 rounded-md text-white font-mono">
                {(albumeviForm.quantity * albumeviForm.unit_price).toLocaleString('tr-TR')} ₺
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAlbumeviModalOpen(false)}
              className="bg-transparent border-white/10 text-white hover:bg-white/5 hover:text-white"
            >
              İptal
            </Button>
            <Button
              onClick={() => {
                const prod = products.find((p: any) => p.id === albumeviForm.product_id);
                if (albumeviForm.company_name && prod && albumeviForm.quantity > 0) {
                  albumeviMutation.mutate({
                    company_name: albumeviForm.company_name,
                    product_name: prod.name,
                    quantity: albumeviForm.quantity,
                    total_price: albumeviForm.quantity * albumeviForm.unit_price,
                  });
                } else {
                  toast.error("Lütfen tüm alanları doldurun.");
                }
              }}
              disabled={albumeviMutation.isPending}
              className="bg-[#A67C52] text-white hover:bg-[#A67C52]/90"
            >
              {albumeviMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
