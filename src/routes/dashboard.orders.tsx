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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageTransition } from "@/components/page-transition";
import { Loader2, Eye, Package, Calendar } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchAllRows,
  fetchAllRowsSafe,
  parseSelectionTokens,
} from "@/lib/supabase-fetch-all";

export const Route = createFileRoute("/dashboard/orders")({
  component: ManageOrders,
});

interface OrderPackageLine {
  key: string;
  name: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  directOrderId?: string;
}

interface AggregatedOrder {
  id: string;
  schoolId: string | null;
  directOrderId?: string;
  schoolName: string;
  orderDate: string;
  rawDate: string | null;
  status: string;
  packages: OrderPackageLine[];
  totalQuantity: number;
  totalPrice: number;
}

function OrderDetailsModal({
  order,
  isOpen,
  onClose,
}: {
  order: AggregatedOrder | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      if (!order) throw new Error("Sipariş bulunamadı");

      if (order.schoolId) {
        const { data: school, error: fetchErr } = await (supabase as any)
          .from("schools")
          .select("id, package_statuses")
          .eq("id", order.schoolId)
          .maybeSingle();

        if (fetchErr) throw fetchErr;

        if (school) {
          const currentStatuses = school.package_statuses || {};
          const updatedStatuses = { ...currentStatuses, global_status: newStatus };

          const { error } = await (supabase as any)
            .from("schools")
            .update({ package_statuses: updatedStatuses })
            .eq("id", order.schoolId);

          if (error) throw error;
        }
      }

      if (order.directOrderId) {
        const { error: directErr } = await (supabase as any)
          .from("orders")
          .update({ order_status: newStatus })
          .eq("id", order.directOrderId);
        if (directErr) throw directErr;
      }

      return newStatus;
    },
    onSuccess: (newStatus) => {
      toast.success("Sipariş durumu güncellendi");
      qc.invalidateQueries({ queryKey: ["aggregated_orders"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      if (order) {
        order.status = newStatus;
      }
    },
    onError: (e: any) => {
      toast.error("Durum güncellenemedi: " + e.message);
    },
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
          <div className="bg-black/40 border border-white/10 p-5 rounded-2xl flex justify-between items-center gap-4">
            <div>
              <h3 className="text-[#A67C52] font-semibold text-xs tracking-wider uppercase mb-1">
                Okul Adı
              </h3>
              <p className="text-xl font-bold leading-none">{order.schoolName}</p>
            </div>

            <div className="flex flex-col items-end">
              <h3 className="text-[#A67C52] font-semibold text-xs tracking-wider uppercase mb-2">
                Sipariş Durumu
              </h3>
              <select
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-sm font-medium text-white outline-none focus:ring-2 focus:ring-[#A67C52] transition-all cursor-pointer hover:bg-white/10"
                value={order.status}
                onChange={handleStatusChange}
                disabled={updateStatusMutation.isPending}
              >
                {![
                  "Sipariş Yok",
                  "Bekliyor",
                  "Hazırlanıyor",
                  "Üretimde",
                  "Kargoya Hazır",
                  "Kargoya Verildi",
                  "Teslim Edildi",
                  "Tamamlandı",
                ].includes(order.status) && (
                  <option value={order.status} className="bg-[#131316]">
                    {order.status}
                  </option>
                )}
                <option value="Sipariş Yok" className="bg-[#131316]">
                  Sipariş Yok
                </option>
                <option value="Bekliyor" className="bg-[#131316]">
                  Bekliyor
                </option>
                <option value="Hazırlanıyor" className="bg-[#131316]">
                  Hazırlanıyor
                </option>
                <option value="Üretimde" className="bg-[#131316]">
                  Üretimde
                </option>
                <option value="Kargoya Hazır" className="bg-[#131316]">
                  Kargoya Hazır
                </option>
                <option value="Kargoya Verildi" className="bg-[#131316]">
                  Kargoya Verildi
                </option>
                <option value="Teslim Edildi" className="bg-[#131316]">
                  Teslim Edildi
                </option>
                <option value="Tamamlandı" className="bg-[#131316]">
                  Tamamlandı
                </option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider px-1">
              Hazırlanacak Ürünler
            </h4>

            <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
              {order.packages.length === 0 ? (
                <div className="text-center py-6 text-white/40 text-sm border border-white/5 border-dashed rounded-xl">
                  Bu okul için henüz bir paket seçimi yapılmamış.
                </div>
              ) : (
                order.packages.map((pkg) => (
                  <div
                    key={pkg.key}
                    className="flex items-center justify-between bg-[#151515] hover:bg-white/5 transition-colors border border-white/5 p-4 rounded-xl"
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold text-white">{pkg.name}</span>
                      <span className="text-xs text-white/40 mt-0.5">
                        {pkg.quantity} Adet
                        {pkg.unitPrice > 0 ? ` x ${pkg.unitPrice.toLocaleString("tr-TR")} ₺` : ""}
                      </span>
                    </div>
                    <div className="text-white font-medium bg-black/40 px-3 py-1 rounded-lg border border-white/5">
                      {pkg.totalPrice.toLocaleString("tr-TR")} ₺
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-white/10 flex items-center justify-between px-1">
            <span className="text-lg text-white/70 font-medium">Toplam Tutar</span>
            <span className="text-2xl font-bold text-[#A67C52]">
              {order.totalPrice.toLocaleString("tr-TR")} ₺
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ManageOrders() {
  const [selectedOrder, setSelectedOrder] = useState<AggregatedOrder | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const { data: aggregatedOrders = [], isLoading } = useQuery({
    queryKey: ["aggregated_orders"],
    queryFn: async () => {
      setFetchError(null);
      try {
        // Fetch 100% of records across all related tables without any filters or row caps
        const [schoolsData, classesData, studentsData, spData, pData, directOrdersData] =
          await Promise.all([
            fetchAllRows<any>(supabase, "schools", "*", "created_at", false),
            fetchAllRowsSafe<any>(supabase, "classes", "*"),
            fetchAllRowsSafe<any>(supabase, "students", "*"),
            fetchAllRowsSafe<any>(supabase, "school_products", "*"),
            fetchAllRowsSafe<any>(supabase, "products", "*"),
            fetchAllRowsSafe<any>(supabase, "orders", "*", "created_at", false),
          ]);

        const pMap = new Map<string, any>();
        (pData || []).forEach((p: any) => {
          if (p?.id != null) pMap.set(String(p.id), p);
        });

        // Map all school_products per school (preserving every assigned package, not just 2)
        const spListMap = new Map<string, any[]>();
        const spBySchoolAndProduct = new Map<string, Map<string, any>>();
        (spData || []).forEach((sp: any) => {
          const sid = String(sp.school_id ?? "");
          if (!sid) return;
          if (!spListMap.has(sid)) spListMap.set(sid, []);
          spListMap.get(sid)!.push(sp);

          if (!spBySchoolAndProduct.has(sid)) {
            spBySchoolAndProduct.set(sid, new Map());
          }
          spBySchoolAndProduct.get(sid)!.set(String(sp.product_id), sp);
        });

        // Build school map from 100% of schools
        const schoolBuckets = new Map<
          string,
          {
            id: string;
            schoolId: string | null;
            directOrderId?: string;
            schoolName: string;
            rawDate: string | null;
            packageStatuses: Record<string, any>;
            fallbackStatus?: string;
            linesMap: Map<string, OrderPackageLine>;
          }
        >();

        (schoolsData || []).forEach((school: any) => {
          const sid = String(school.id);
          schoolBuckets.set(sid, {
            id: sid,
            schoolId: school.id,
            schoolName: school.name || "İsimsiz Okul",
            rawDate: school.created_at || null,
            packageStatuses: school.package_statuses || {},
            linesMap: new Map<string, OrderPackageLine>(),
          });
        });

        const ensureSchoolBucket = (
          rawSchoolId: string | null | undefined,
          fallbackName = "Bilinmeyen / Eşleşmeyen Okul",
          fallbackDate: string | null = null,
        ) => {
          const bucketKey = rawSchoolId ? String(rawSchoolId) : "__orphan_school__";
          if (!schoolBuckets.has(bucketKey)) {
            schoolBuckets.set(bucketKey, {
              id: bucketKey,
              schoolId: rawSchoolId ? String(rawSchoolId) : null,
              schoolName: rawSchoolId
                ? `${fallbackName} (${String(rawSchoolId).slice(0, 8)})`
                : fallbackName,
              rawDate: fallbackDate,
              packageStatuses: {},
              linesMap: new Map<string, OrderPackageLine>(),
            });
          }
          const bucket = schoolBuckets.get(bucketKey)!;
          if (!bucket.rawDate && fallbackDate) {
            bucket.rawDate = fallbackDate;
          }
          return bucket;
        };

        // Map all classes, preserving classes even if their parent school record is missing
        const classToSchoolMap = new Map<string, string | null>();
        (classesData || []).forEach((cls: any) => {
          const cid = String(cls.id);
          const sid = cls.school_id ? String(cls.school_id) : null;
          classToSchoolMap.set(cid, sid);
          if (sid && !schoolBuckets.has(sid)) {
            ensureSchoolBucket(sid, "Eşleşmeyen Okul", cls.created_at || null);
          }
        });

        // Aggregate 100% of student selections without dropping orphaned classes, schools, or products
        (studentsData || []).forEach((student: any) => {
          const tokens = parseSelectionTokens(student?.selection);
          if (tokens.length === 0) return;

          const cid = student?.class_id ? String(student.class_id) : null;
          const resolvedSchoolId =
            (cid && classToSchoolMap.has(cid) ? classToSchoolMap.get(cid) : null) ||
            (student?.school_id ? String(student.school_id) : null);

          const bucket = ensureSchoolBucket(
            resolvedSchoolId,
            "Eşleşmeyen Okul",
            student?.created_at || null,
          );

          const sid = bucket.schoolId ? String(bucket.schoolId) : "";
          const schoolSpMap = spBySchoolAndProduct.get(sid);
          const schoolSpList = spListMap.get(sid) || [];

          tokens.forEach((token) => {
            let matchedSp = schoolSpMap?.get(token) || null;
            if (!matchedSp && token === "paket1" && schoolSpList[0]) {
              matchedSp = schoolSpList[0];
            } else if (!matchedSp && token === "paket2" && schoolSpList[1]) {
              matchedSp = schoolSpList[1];
            }

            const resolvedProductId = matchedSp ? String(matchedSp.product_id) : token;
            const catalogProduct = pMap.get(resolvedProductId);

            const unitPrice = Number(
              matchedSp?.custom_price ?? catalogProduct?.base_price ?? 0,
            );
            const packageName =
              catalogProduct?.name ||
              (token === "paket1"
                ? "Paket 1"
                : token === "paket2"
                  ? "Paket 2"
                  : `Paket (${resolvedProductId.slice(0, 8)})`);

            const lineKey = `sel_${resolvedProductId}`;
            const existing = bucket.linesMap.get(lineKey);
            if (existing) {
              existing.quantity += 1;
              existing.totalPrice += unitPrice;
            } else {
              bucket.linesMap.set(lineKey, {
                key: lineKey,
                name: packageName,
                unitPrice,
                quantity: 1,
                totalPrice: unitPrice,
              });
            }
          });
        });

        // Also include 100% of direct rows from public.orders without dropping missing/null school_id rows
        const standaloneDirectOrders: AggregatedOrder[] = [];
        (directOrdersData || []).forEach((ord: any) => {
          const qty = Number(ord?.quantity) || 0;
          const total = Number(ord?.total_price) || 0;
          const unitPrice = qty > 0 ? Math.round((total / qty) * 100) / 100 : total;
          const pkgName = ord?.package_name || "Sipariş Paketi";

          if (ord?.school_id && schoolBuckets.has(String(ord.school_id))) {
            const bucket = schoolBuckets.get(String(ord.school_id))!;
            const lineKey = `direct_${ord.id}`;
            bucket.linesMap.set(lineKey, {
              key: lineKey,
              name: pkgName,
              unitPrice,
              quantity: qty,
              totalPrice: total,
              directOrderId: ord.id,
            });
            if (!bucket.fallbackStatus && ord.order_status) {
              bucket.fallbackStatus = ord.order_status;
            }
            if (!bucket.rawDate && ord.created_at) {
              bucket.rawDate = ord.created_at;
            }
          } else {
            // Orphaned order row (null school_id or deleted school): preserve as its own visible row
            const formattedDate = ord?.created_at
              ? new Date(ord.created_at).toLocaleDateString("tr-TR")
              : "—";
            standaloneDirectOrders.push({
              id: `direct_order_${ord.id}`,
              schoolId: ord?.school_id ? String(ord.school_id) : null,
              directOrderId: ord.id,
              schoolName:
                ord?.school_name ||
                (ord?.school_id
                  ? `Silinmiş / Eşleşmeyen Okul (${String(ord.school_id).slice(0, 8)})`
                  : "Okul Atanmamış Sipariş"),
              orderDate: formattedDate,
              rawDate: ord?.created_at || null,
              status: ord?.order_status || "Bekliyor",
              packages: [
                {
                  key: `direct_${ord.id}`,
                  name: pkgName,
                  unitPrice,
                  quantity: qty,
                  totalPrice: total,
                  directOrderId: ord.id,
                },
              ],
              totalQuantity: qty,
              totalPrice: total,
            });
          }
        });

        const results: AggregatedOrder[] = [];

        schoolBuckets.forEach((bucket) => {
          const packages = Array.from(bucket.linesMap.values());
          const totalQuantity = packages.reduce((sum, p) => sum + p.quantity, 0);
          const totalPrice = packages.reduce((sum, p) => sum + p.totalPrice, 0);

          const globalStatus = bucket.packageStatuses?.global_status;
          let computedStatus = globalStatus || bucket.fallbackStatus;
          if (!computedStatus || computedStatus === "Sipariş Yok") {
            computedStatus = totalQuantity > 0 ? "Bekliyor" : computedStatus || "Sipariş Yok";
          }

          const formattedDate = bucket.rawDate
            ? new Date(bucket.rawDate).toLocaleDateString("tr-TR")
            : "—";

          results.push({
            id: bucket.id,
            schoolId: bucket.schoolId,
            schoolName: bucket.schoolName,
            orderDate: formattedDate,
            rawDate: bucket.rawDate,
            status: computedStatus,
            packages,
            totalQuantity,
            totalPrice,
          });
        });

        return [...results, ...standaloneDirectOrders];
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
              <TableHead className="text-right text-white/50 font-semibold py-4">
                İşlemler
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fetchError ? (
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableCell
                  colSpan={5}
                  className="text-center py-12 text-rose-500 font-semibold text-lg"
                >
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
                  Henüz kayıtlı bir sipariş bulunmuyor.
                </TableCell>
              </TableRow>
            ) : (
              aggregatedOrders.map((o) => (
                <TableRow
                  key={o.id}
                  className="border-white/10 hover:bg-white/5 transition-colors cursor-pointer group"
                  onClick={() => {
                    setSelectedOrder(o);
                  }}
                >
                  <TableCell className="font-semibold text-white py-4">
                    <div>{o.schoolName}</div>
                    {o.totalQuantity > 0 && (
                      <div className="text-xs text-white/45 font-normal mt-0.5">
                        {o.totalQuantity} adet sipariş
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-white/70">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-white/40" />
                      {o.orderDate}
                    </div>
                  </TableCell>
                  <TableCell className="font-bold text-[#A67C52]">
                    {o.totalPrice.toLocaleString("tr-TR")} ₺
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="bg-[#A67C52]/10 text-[#A67C52] border-[#A67C52]/20 font-normal"
                    >
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
