import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, PlusCircle, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabaseClient as supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute('/dashboard/finance_/albumevi')({
  component: AlbumeviSalesPage,
});

function AlbumeviSalesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { teamId } = useAuth();

  // Create Modal State
  const [isAlbumeviModalOpen, setAlbumeviModalOpen] = useState(false);
  const [albumeviForm, setAlbumeviForm] = useState({ company_name: "", product_id: "", quantity: 1, unit_price: 0, paid_amount: 0, description: "" });

  // Edit Modal State
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ company_name: "", product_id: "", quantity: 1, unit_price: 0, paid_amount: 0, description: "" });

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
    mutationFn: async (input: { company_name: string; product_name: string; quantity: number; total_price: number; paid_amount: number; description: string }) => {
      const { data, error } = await (supabase as any).from("albumevi_sales").insert({
        ...input,
        team_id: teamId === "all" ? null : teamId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["albumevi_sales"] });
      queryClient.invalidateQueries({ queryKey: ["finance_metrics"] });
      toast.success("Satış başarıyla eklendi");
      setAlbumeviModalOpen(false);
      setAlbumeviForm({ company_name: "", product_id: "", quantity: 1, unit_price: 0, paid_amount: 0, description: "" });
    },
    onError: (error: any) => {
      toast.error("Satış eklenirken bir hata oluştu: " + error.message);
    }
  });

  const editMutation = useMutation({
    mutationFn: async (input: { id: string; company_name: string; product_name: string; quantity: number; total_price: number; paid_amount: number; description: string }) => {
      const { id, ...updateData } = input;
      const { data, error } = await (supabase as any)
        .from("albumevi_sales")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["albumevi_sales"] });
      queryClient.invalidateQueries({ queryKey: ["finance_metrics"] });
      toast.success("Satış başarıyla güncellendi");
      setEditModalOpen(false);
      setEditingId(null);
    },
    onError: (error: any) => {
      toast.error("Güncellenirken hata oluştu: " + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("albumevi_sales")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["albumevi_sales"] });
      queryClient.invalidateQueries({ queryKey: ["finance_metrics"] });
      toast.success("Satış başarıyla silindi");
    },
    onError: (error: any) => {
      toast.error("Silinirken hata oluştu: " + error.message);
    }
  });

  const openEditModal = (sale: any) => {
    // Find product id based on product_name to prefill select if possible
    const prod = products.find((p: any) => p.name === sale.product_name);
    
    setEditingId(sale.id);
    setEditForm({
      company_name: sale.company_name,
      product_id: prod ? prod.id : "",
      quantity: sale.quantity,
      unit_price: sale.quantity > 0 ? sale.total_price / sale.quantity : 0,
      paid_amount: sale.paid_amount || 0,
      description: sale.description || "",
    });
    setEditModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Bu satışı silmek istediğinize emin misiniz?")) {
      deleteMutation.mutate(id);
    }
  };

  const totalPaid = sales.reduce((acc: number, sale: any) => acc + (Number(sale.paid_amount) || 0), 0);
  const totalRemaining = sales.reduce((acc: number, sale: any) => acc + ((Number(sale.total_price) || 0) - (Number(sale.paid_amount) || 0)), 0);

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
                <th className="px-6 py-4 font-semibold text-right">Ödenen</th>
                <th className="px-6 py-4 font-semibold text-right">Kalan</th>
                <th className="px-6 py-4 font-semibold text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-[#9E9696]">Yükleniyor...</td></tr>
              ) : sales.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-[#9E9696]">Kayıt bulunamadı.</td></tr>
              ) : (
                sales.map((sale: any) => {
                  const paidAmount = Number(sale.paid_amount || 0);
                  const totalPrice = Number(sale.total_price || 0);
                  const remaining = totalPrice - paidAmount;
                  
                  return (
                    <tr key={sale.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 text-[#9E9696]">{new Date(sale.created_at).toLocaleDateString("tr-TR")}</td>
                      <td className="px-6 py-4 font-medium text-white">{sale.company_name}</td>
                      <td className="px-6 py-4 text-white">{sale.product_name}</td>
                      <td className="px-6 py-4 text-center text-white">{sale.quantity}</td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-[#A67C52]">
                        {totalPrice.toLocaleString("tr-TR")} ₺
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-green-500">
                        {paidAmount.toLocaleString("tr-TR")} ₺
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-red-500">
                        {remaining.toLocaleString("tr-TR")} ₺
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditModal(sale)}
                            className="h-8 w-8 text-[#9E9696] hover:text-white hover:bg-white/10"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(sale.id)}
                            className="h-8 w-8 text-[#9E9696] hover:text-red-500 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-6 bg-white/[0.02] border-t border-white/5 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center max-w-4xl mx-auto">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 transition-all">
              <span className="text-xs font-semibold text-[#9E9696] uppercase tracking-wider block">TOPLAM ÖDENEN</span>
              <h4 className="font-mono text-2xl font-black text-[#12B76A] mt-1.5">{Math.round(totalPaid).toLocaleString()} ₺</h4>
            </div>
            <div className="p-4 rounded-2xl bg-[#A67C52]/10 border border-[#A67C52]/20 transition-all">
              <span className="text-xs font-semibold text-[#A67C52] uppercase tracking-wider block">TOPLAM KALAN BORÇ</span>
              <h4 className="font-mono text-2xl font-black text-[#A67C52] mt-1.5">{Math.round(totalRemaining).toLocaleString()} ₺</h4>
            </div>
          </div>
        </div>
      </div>

      {/* Albumevi Create Sales Modal */}
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
            <div className="grid gap-2">
              <Label>Ödenen Tutar (₺)</Label>
              <Input
                type="number"
                min="0"
                value={albumeviForm.paid_amount}
                onChange={(e) => setAlbumeviForm(prev => ({ ...prev, paid_amount: parseFloat(e.target.value) || 0 }))}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label>Açıklama</Label>
              <Input
                value={albumeviForm.description}
                onChange={(e) => setAlbumeviForm(prev => ({ ...prev, description: e.target.value }))}
                className="bg-white/5 border-white/10 text-white"
                placeholder="İsteğe bağlı notlar..."
              />
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
                    paid_amount: albumeviForm.paid_amount,
                    description: albumeviForm.description,
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

      {/* Albumevi Edit Sales Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#111111] text-white border-white/10">
          <DialogHeader>
            <DialogTitle>Satışı Düzenle</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Firma/Fotoğrafçı Adı</Label>
              <Input
                value={editForm.company_name}
                onChange={(e) => setEditForm(prev => ({ ...prev, company_name: e.target.value }))}
                className="bg-white/5 border-white/10 text-white"
                placeholder="Örn: X Fotoğrafçılık"
              />
            </div>
            <div className="grid gap-2">
              <Label>Ürün Seç</Label>
              <Select
                value={editForm.product_id}
                onValueChange={(v) => {
                  const prod = products.find((p: any) => p.id === v);
                  setEditForm(prev => ({ 
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
                value={editForm.quantity}
                onChange={(e) => setEditForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label>Toplam Tutar</Label>
              <div className="h-10 px-3 flex items-center bg-white/5 border border-white/10 rounded-md text-white font-mono">
                {(editForm.quantity * editForm.unit_price).toLocaleString('tr-TR')} ₺
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Ödenen Tutar (₺)</Label>
              <Input
                type="number"
                min="0"
                value={editForm.paid_amount}
                onChange={(e) => setEditForm(prev => ({ ...prev, paid_amount: parseFloat(e.target.value) || 0 }))}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label>Açıklama</Label>
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                className="bg-white/5 border-white/10 text-white"
                placeholder="İsteğe bağlı notlar..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setEditModalOpen(false); setEditingId(null); }}
              className="bg-transparent border-white/10 text-white hover:bg-white/5 hover:text-white"
            >
              İptal
            </Button>
            <Button
              onClick={() => {
                if (!editingId) return;
                const prod = products.find((p: any) => p.id === editForm.product_id);
                // If product_id doesn't match an existing product (e.g. if the original product was deleted), 
                // we still need a product name. If we don't have prod, we fallback or require them to pick.
                if (editForm.company_name && prod && editForm.quantity > 0) {
                  editMutation.mutate({
                    id: editingId,
                    company_name: editForm.company_name,
                    product_name: prod.name,
                    quantity: editForm.quantity,
                    total_price: editForm.quantity * editForm.unit_price,
                    paid_amount: editForm.paid_amount,
                    description: editForm.description,
                  });
                } else {
                  toast.error("Lütfen geçerli bir ürün seçin ve alanları doldurun.");
                }
              }}
              disabled={editMutation.isPending}
              className="bg-[#A67C52] text-white hover:bg-[#A67C52]/90"
            >
              {editMutation.isPending ? "Güncelleniyor..." : "Güncelle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
