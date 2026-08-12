import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageTransition } from "@/components/page-transition";
import { Loader2, Eye, Package, Calendar, CheckCircle2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard/orders")({
  component: ManageOrders,
});

interface AggregatedOrder {
  schoolId: string;
  schoolName: string;
  orderDate: string;
  status: string;
  package1Name: string;
  package1Price: number;
  package1Quantity: number;
  package2Name: string;
  package2Price: number;
  package2Quantity: number;
  totalPrice: number;
}

function OrderDetailsModal({ 
  order, 
  isOpen, 
  onClose 
}: { 
  order: AggregatedOrder | null; 
  isOpen: boolean; 
  onClose: () => void 
}) {
  const qc = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      if (!order) throw new Error("Sipariş bulunamadı");
      
      const { data: school, error: fetchErr } = await (supabase as any)
        .from("schools")
        .select("package_statuses")
        .eq("id", order.schoolId)
        .single();
        
      if (fetchErr) throw fetchErr;

      const currentStatuses = school.package_statuses || {};
      const updatedStatuses = { ...currentStatuses, global_status: newStatus };

      const { error } = await (supabase as any)
        .from("schools")
        .update({ package_statuses: updatedStatuses })
        .eq("id", order.schoolId);
        
      if (error) throw error;
      return newStatus;
    },
    onSuccess: (newStatus) => {
      toast.success("Sipariş durumu güncellendi");
      qc.invalidateQueries({ queryKey: ["aggregated_orders"] });
      // Modalı kapatmak yerine, sadece state güncellensin diye bir şey yapmıyoruz. 
      // Query invalidate edildiği için dışarıdaki data yenilenecek, modal açık kalabilir.
    },
    onError: (e: any) => {
      toast.error("Durum güncellenemedi: " + e.message);
    }
  });

  if (!order) return null;

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateStatusMutation.mutate(e.target.value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-gradient-to-br from-[#1a1714] to-[#131316] border border-white/10 text-white max-w-lg shadow-2xl backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-[#A67C52]" />
            Sipariş Detayı
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="bg-black/40 border border-white/10 p-5 rounded-2xl flex justify-between items-center">
            <div>
              <h3 className="text-[#A67C52] font-semibold text-xs tracking-wider uppercase mb-1">Okul Adı</h3>
              <p className="text-xl font-bold leading-none">{order.schoolName}</p>
            </div>
            
            <div className="flex flex-col items-end">
               <h3 className="text-[#A67C52] font-semibold text-xs tracking-wider uppercase mb-2">Sipariş Durumu</h3>
               <select
                 className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-sm font-medium text-white outline-none focus:ring-2 focus:ring-[#A67C52] transition-all cursor-pointer hover:bg-white/10"
                 value={order.status}
                 onChange={handleStatusChange}
                 disabled={updateStatusMutation.isPending}
               >
                 <option value="Sipariş Yok" className="bg-[#131316]">Sipariş Yok</option>
                 <option value="Bekliyor" className="bg-[#131316]">Bekliyor</option>
                 <option value="Hazırlanıyor" className="bg-[#131316]">Hazırlanıyor</option>
                 <option value="Kargoya Verildi" className="bg-[#131316]">Kargoya Verildi</option>
                 <option value="Tamamlandı" className="bg-[#131316]">Tamamlandı</option>
               </select>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider px-1">Hazırlanacak Ürünler</h4>
            
            <div className="space-y-2">
              {order.package1Quantity > 0 && (
                <div className="flex items-center justify-between bg-[#151515] hover:bg-white/5 transition-colors border border-white/5 p-4 rounded-xl">
                  <div className="flex flex-col">
                    <span className="font-semibold text-white">
                      {order.package1Name}
                    </span>
                    <span className="text-xs text-white/40 mt-0.5">
                      {order.package1Quantity} Adet x {order.package1Price} ₺
                    </span>
                  </div>
                  <div className="text-white font-medium bg-black/40 px-3 py-1 rounded-lg border border-white/5">
                    {order.package1Price * order.package1Quantity} ₺
                  </div>
                </div>
              )}

              {order.package2Quantity > 0 && (
                <div className="flex items-center justify-between bg-[#151515] hover:bg-white/5 transition-colors border border-white/5 p-4 rounded-xl">
                  <div className="flex flex-col">
                    <span className="font-semibold text-white">
                      {order.package2Name}
                    </span>
                    <span className="text-xs text-white/40 mt-0.5">
                      {order.package2Quantity} Adet x {order.package2Price} ₺
                    </span>
                  </div>
                  <div className="text-white font-medium bg-black/40 px-3 py-1 rounded-lg border border-white/5">
                    {order.package2Price * order.package2Quantity} ₺
                  </div>
                </div>
              )}
              
              {order.package1Quantity === 0 && order.package2Quantity === 0 && (
                <div className="text-center py-6 text-white/40 text-sm border border-white/5 border-dashed rounded-xl">
                  Bu okul için henüz bir paket seçimi yapılmamış.
                </div>
              )}
            </div>
          </div>
          
          <div className="pt-4 mt-2 border-t border-white/10 flex items-center justify-between px-1">
             <span className="text-lg text-white/70 font-medium">Toplam Tutar</span>
             <span className="text-2xl font-bold text-[#A67C52]">{order.totalPrice} ₺</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ManageOrders() {
  const [selectedOrder, setSelectedOrder] = useState<AggregatedOrder | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const { data: aggregatedOrders = [], isLoading } = useQuery({
    queryKey: ["aggregated_orders"],
    queryFn: async () => {
      setFetchError(null);
      try {
        const { data, error } = await supabase
          .from("schools")
          .select(`
            id, name, created_at, is_active, package_statuses,
            classes (
              students ( selection )
            )
          `);

        if (error) throw error;
        
        const { data: spData } = await (supabase as any).from("school_products").select("school_id, product_id, custom_price");
        const { data: pData } = await (supabase as any).from("products").select("id, name, base_price");

        const pMap = new Map();
        (pData || []).forEach((p: any) => pMap.set(p.id, p));

        const spMap = new Map();
        (spData || []).forEach((sp: any) => {
          if (!spMap.has(sp.school_id)) spMap.set(sp.school_id, { paket1: null, paket2: null });
          const m = spMap.get(sp.school_id);
          if (!m.paket1) m.paket1 = sp;
          else m.paket2 = sp;
        });

        const results: AggregatedOrder[] = [];

        (data || []).forEach((school: any) => {
          let p1Count = 0;
          let p2Count = 0;

          (school.classes || []).forEach((cls: any) => {
            (cls.students || []).forEach((student: any) => {
              if (student.selection) {
                let parsed: string[] = [];
                try {
                  parsed = JSON.parse(student.selection);
                } catch {
                  parsed = student.selection.split(',').filter(Boolean);
                }
                if (parsed.includes("paket1")) p1Count++;
                if (parsed.includes("paket2")) p2Count++;
              }
            });
          });
          
          const sProds = spMap.get(school.id) || { paket1: null, paket2: null };
          const p1_sp = sProds.paket1;
          const p2_sp = sProds.paket2;
          
          const p1 = p1_sp ? pMap.get(p1_sp.product_id) : null;
          const p2 = p2_sp ? pMap.get(p2_sp.product_id) : null;

          const p1Price = p1_sp?.custom_price || p1?.base_price || 0;
          const p2Price = p2_sp?.custom_price || p2?.base_price || 0;
          
          const p1Name = p1?.name || "Paket 1";
          const p2Name = p2?.name || "Paket 2";
          
          const total = (p1Count * p1Price) + (p2Count * p2Price);
          
          const globalStatus = school.package_statuses?.global_status;
          let computedStatus = globalStatus;
          if (!computedStatus) {
             computedStatus = (p1Count > 0 || p2Count > 0) ? "Bekliyor" : "Sipariş Yok";
          }

          results.push({
            schoolId: school.id,
            schoolName: school.name,
            orderDate: new Date(school.created_at).toLocaleDateString('tr-TR'),
            status: computedStatus,
            package1Name: p1Name,
            package1Price: p1Price,
            package1Quantity: p1Count,
            package2Name: p2Name,
            package2Price: p2Price,
            package2Quantity: p2Count,
            totalPrice: total
          });
        });
        return results;
      } catch (err: any) {
        setFetchError(err.message || "Bilinmeyen bir hata oluştu.");
        throw err;
      }
    },
  });

  return (
    <PageTransition className="space-y-6 text-white pb-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Okul Siparişleri</h1>
          <p className="text-sm text-white/50 mt-1">
            Okul bazlı toplam sipariş adetleri ve gelir dağılımı.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md overflow-hidden shadow-xl">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-white/50 font-semibold py-4">Okul Adı</TableHead>
              <TableHead className="text-white/50 font-semibold py-4">Sipariş Tarihi</TableHead>
              <TableHead className="text-white/50 font-semibold py-4">Toplam Tutar</TableHead>
              <TableHead className="text-white/50 font-semibold py-4">Durum</TableHead>
              <TableHead className="text-right text-white/50 font-semibold py-4">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fetchError ? (
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableCell colSpan={5} className="text-center py-12 text-rose-500 font-semibold text-lg">
                  Veri çekme hatası: {fetchError}
                </TableCell>
              </TableRow>
            ) : isLoading ? (
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableCell colSpan={5} className="text-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-[#A67C52] mx-auto" />
                  <p className="text-white/40 text-sm mt-3">Veriler hesaplanıyor...</p>
                </TableCell>
              </TableRow>
            ) : aggregatedOrders.length === 0 ? (
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableCell colSpan={5} className="text-center py-16 text-white/50">
                  Henüz onaylanmış bir sipariş bulunmuyor.
                </TableCell>
              </TableRow>
            ) : (
              aggregatedOrders.map((o) => (
                <TableRow 
                  key={o.schoolId} 
                  className="border-white/10 hover:bg-white/5 transition-colors cursor-pointer group"
                  onClick={() => {
                    setSelectedOrder(o);
                    setIsModalOpen(true);
                  }}
                >
                  <TableCell className="font-semibold text-white py-4">
                    {o.schoolName}
                  </TableCell>
                  <TableCell className="text-white/70">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-white/40" />
                      {o.orderDate}
                    </div>
                  </TableCell>
                  <TableCell className="font-bold text-[#A67C52]">
                    {o.totalPrice} ₺
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-[#A67C52]/10 text-[#A67C52] border-[#A67C52]/20 font-normal">
                      {o.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-white/50 group-hover:text-white group-hover:bg-white/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrder(o);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-2" /> Detay Gör
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <OrderDetailsModal 
        order={selectedOrder} 
        isOpen={!!selectedOrder} 
        onClose={() => setSelectedOrder(null)} 
      />
    </PageTransition>
  );
}
