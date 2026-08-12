import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageTransition } from "@/components/page-transition";
import { 
  Users, Image as ImageIcon, CreditCard, Box, ChevronRight, LayoutDashboard,
  CalendarDays, Settings, Package, Truck, Inbox, Plus, ChevronLeft,
  Sparkles, TrendingUp, AlertTriangle, CheckCircle, Info, LogOut, Search, Menu, Bell, Check,
  Calendar as CalendarIcon, Camera, Clock, AlertCircle, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { supabaseClient } from "@/lib/supabaseClient";

export const Route = createFileRoute("/dashboard/")({
  component: OverviewDashboard,
});

interface SessionItem {
  time: string;
  schoolName: string;
  type: string;
  location: string;
}

const SESSION_DETAILS: Record<number, SessionItem> = {
  15: {
    time: "10:00 AM",
    schoolName: "Batman Anadolu Lisesi",
    type: "Portrait Session",
    location: "Studio Hall A",
  },
  17: {
    time: "01:30 PM",
    schoolName: "Tilmerç Toki Primary School",
    type: "Group Session",
    location: "Classroom 3-B",
  },
  21: {
    time: "09:00 AM",
    schoolName: "Gazi Secondary School",
    type: "Retake Session",
    location: "Auditorium",
  },
  25: {
    time: "11:00 AM",
    schoolName: "Raman Lisesi",
    type: "Portrait Session",
    location: "Studio Hall B",
  },
};

function OverviewDashboard() {
  const { t, lang } = useI18n();

  const [upcomingShoots, setUpcomingShoots] = useState<{id: string, school: string, days: number}[]>([]);
  const [recentOrders, setRecentOrders] = useState<{id: string, name: string}[]>([]);
  const [recentNotes, setRecentNotes] = useState<any[]>([]);
  const [funnelCounts, setFunnelCounts] = useState({ bekliyor: 0, uretimde: 0, kargoyaHazir: 0, teslimEdildi: 0 });
  const [popularPackages, setPopularPackages] = useState<{name: string, count: number, percentage: number}[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState<boolean>(true);
  const [dashboardShoots, setDashboardShoots] = useState<any[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number>(currentDate.getDate());

  useEffect(() => {
    async function fetchAlertData(showLoading = true) {
      try {
        if (showLoading) setIsLoadingAlerts(true);
        
        const { data: shoots, error: shootsError } = await supabaseClient
          .from("photo_shoots")
          .select("*")
          .order("shoot_date", { ascending: true });
          
        const { data: ordersData, error: ordersError } = await supabaseClient
          .from("schools")
          .select(`id, name, package_statuses, classes ( students ( selection ) )`);
          
        const { data: notesData, error: notesError } = await supabaseClient
          .from("notes")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5);

        console.log('Assistant Data:', { shoots, orders: ordersData, notes: notesData, errors: [shootsError, ordersError, notesError] });
        
        if (shootsError && shootsError.code !== "42P01") throw shootsError;
        
        setDashboardShoots(shoots || []);

        const tzOffsetMs = new Date().getTimezoneOffset() * 60 * 1000;
        const localNow = new Date(Date.now() - tzOffsetMs);
        
        const localTomorrow = new Date(localNow);
        localTomorrow.setDate(localNow.getDate() + 1);
        const tomorrowStr = localTomorrow.toISOString().split("T")[0];

        const localDayAfter = new Date(localNow);
        localDayAfter.setDate(localNow.getDate() + 2);
        const dayAfterStr = localDayAfter.toISOString().split("T")[0];

        const upcoming: { id: string; school: string; days: number }[] = [];
        (shoots || []).forEach(s => {
          if (!s.shoot_date) return;
          const sDateStr = s.shoot_date.split("T")[0];
          if (sDateStr === tomorrowStr) {
             upcoming.push({ id: `shoot-${s.id}`, school: s.school_name, days: 1 });
          } else if (sDateStr === dayAfterStr) {
             upcoming.push({ id: `shoot-${s.id}`, school: s.school_name, days: 2 });
          }
        });
        setUpcomingShoots(upcoming);

        // Rule 2: Order Confirmed
        const confirmed: {id: string, name: string}[] = [];
        (ordersData || []).forEach((school: any) => {
          let hasSelection = false;
          (school.classes || []).forEach((cls: any) => {
            (cls.students || []).forEach((student: any) => {
              if (student.selection && student.selection.length > 0) hasSelection = true;
            });
          });
          if (hasSelection) confirmed.push({ id: `order-${school.id}`, name: school.name });
        });
        setRecentOrders(confirmed.slice(0, 3)); // show max 3 to keep it clean

        // Rule 3: New Note in last 24h
        const yesterday = new Date();
        yesterday.setHours(yesterday.getHours() - 24);
        const newNotes = (notesData || []).filter(n => new Date(n.created_at) > yesterday);
        setRecentNotes(newNotes);

        // Rule 4: Funnel calculation & Popular Packages
        let bek = 0;
        let uret = 0;
        let kar = 0;
        let tes = 0;

        const { data: spData } = await supabaseClient.from("school_products").select("school_id, product_id");
        const { data: pData } = await supabaseClient.from("products").select("id, name");

        const pMap = new Map();
        (pData || []).forEach((p: any) => pMap.set(p.id, p.name));

        const spMap = new Map();
        (spData || []).forEach((sp: any) => {
          if (!spMap.has(sp.school_id)) spMap.set(sp.school_id, { paket1: null, paket2: null });
          const m = spMap.get(sp.school_id);
          if (!m.paket1) m.paket1 = sp.product_id;
          else m.paket2 = sp.product_id;
        });

        const packageCounts: Record<string, number> = {};
        let totalPackages = 0;

        (ordersData || []).forEach((school: any) => {
          let p1Count = 0;
          let p2Count = 0;

          const sProds = spMap.get(school.id) || { paket1: null, paket2: null };
          const p1Name = sProds.paket1 ? pMap.get(sProds.paket1) : "Paket 1";
          const p2Name = sProds.paket2 ? pMap.get(sProds.paket2) : "Paket 2";

          (school.classes || []).forEach((cls: any) => {
            (cls.students || []).forEach((student: any) => {
              if (student.selection) {
                let parsed: string[] = [];
                try {
                  parsed = JSON.parse(student.selection);
                } catch {
                  parsed = student.selection.split(',').filter(Boolean);
                }
                if (parsed.includes("paket1")) {
                  p1Count++;
                  packageCounts[p1Name] = (packageCounts[p1Name] || 0) + 1;
                  totalPackages++;
                }
                if (parsed.includes("paket2")) {
                  p2Count++;
                  packageCounts[p2Name] = (packageCounts[p2Name] || 0) + 1;
                  totalPackages++;
                }
              }
            });
          });

          const globalStatus = school.package_statuses?.global_status;
          let computedStatus = globalStatus;
          if (!computedStatus) {
             computedStatus = (p1Count > 0 || p2Count > 0) ? "Bekliyor" : "Sipariş Yok";
          }
          
          if (computedStatus === "Bekliyor") bek++;
          else if (computedStatus === "Hazırlanıyor" || computedStatus === "Üretimde") uret++;
          else if (computedStatus === "Kargoya Verildi") kar++;
          else if (computedStatus === "Tamamlandı") tes++;
        });
        
        setFunnelCounts({ bekliyor: bek, uretimde: uret, kargoyaHazir: kar, teslimEdildi: tes });

        const popArr = Object.keys(packageCounts).map(name => {
           return {
             name,
             count: packageCounts[name],
             percentage: totalPackages > 0 ? Math.round((packageCounts[name] / totalPackages) * 100) : 0
           };
        });
        popArr.sort((a, b) => b.count - a.count);
        setPopularPackages(popArr.slice(0, 4));

      } catch (err) {
        console.error("Akıllı asistan veri çekme hatası:", err);
      } finally {
        if (showLoading) setIsLoadingAlerts(false);
      }
    }
    
    fetchAlertData(true);

    const channel = supabaseClient.channel("dashboard-alerts")
      .on("postgres_changes", { event: "*", schema: "public", table: "photo_shoots" }, () => fetchAlertData(false))
      .on("postgres_changes", { event: "*", schema: "public", table: "schools" }, () => fetchAlertData(false))
      .on("postgres_changes", { event: "*", schema: "public", table: "notes" }, () => fetchAlertData(false))
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, []);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const daysInPrevMonth = getDaysInMonth(year, month - 1);

  const calendarDays = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    calendarDays.push({ day: daysInPrevMonth - i, isCurrentMonth: false, dateStr: null });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const dStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    calendarDays.push({ day: i, isCurrentMonth: true, dateStr: dStr });
  }
  const remainingCells = 42 - calendarDays.length;
  for (let i = 1; i <= remainingCells; i++) {
    calendarDays.push({ day: i, isCurrentMonth: false, dateStr: null });
  }

  const activeSessions = dashboardShoots.filter(s => {
    if (!s.shoot_date) return false;
    const dt = new Date(s.shoot_date);
    return dt.getFullYear() === year && dt.getMonth() === month && dt.getDate() === selectedDay;
  });
  
  const highlightedDays = dashboardShoots.map(s => {
    if (!s.shoot_date) return null;
    const dt = new Date(s.shoot_date);
    if (dt.getFullYear() === year && dt.getMonth() === month) return dt.getDate();
    return null;
  }).filter(Boolean);

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  return (
    <PageTransition className="flex flex-col gap-6 w-full pb-12">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">
          Genel Bakış
        </h1>
        <p className="text-sm text-white/60 mt-1 font-medium">
          Yönetici paneline hoş geldiniz, güncel özet aşağıdadır.
        </p>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Photo Sessions Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="lg:col-span-1 bg-gradient-to-b from-[#1c1a17] to-[#12100e] border border-white/10 border-t-[#D4B8A8]/20 rounded-2xl p-4 relative overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#D4B8A8]/10 flex items-center justify-center text-[#D4B8A8]">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white leading-tight">Fotoğraf Çekimleri</h2>
                <p className="text-xs text-white/60 font-semibold mt-0.5">
                  {currentDate.toLocaleDateString(lang === "TR" ? "tr-TR" : "en-US", { month: "long", year: "numeric" })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handlePrevMonth} className="w-8 h-8 rounded-full border border-white/10 bg-transparent flex items-center justify-center hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={handleNextMonth} className="w-8 h-8 rounded-full border border-white/10 bg-transparent flex items-center justify-center hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-y-1 gap-x-1 text-center text-[10px] font-medium">
            {/* Days of Week Headers */}
            {(lang === "TR" ? ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]).map((d) => (
              <div key={d} className="text-gray-300 uppercase tracking-wider font-semibold py-1">
                {d}
              </div>
            ))}

            {/* Days */}
            {calendarDays.map((item, i) => {
              const isSelected = item.isCurrentMonth && item.day === selectedDay;
              const hasHighlight = item.isCurrentMonth && highlightedDays.includes(item.day);
              
              return (
                <div
                  key={i}
                  onClick={() => item.isCurrentMonth && setSelectedDay(item.day)}
                  className={`
                    relative w-7 h-7 mx-auto rounded-lg flex items-center justify-center cursor-pointer transition-all
                    ${item.isCurrentMonth ? "text-white hover:bg-white/10" : "text-white/20 pointer-events-none"}
                    ${isSelected ? "bg-[#D4B8A8] text-[#12100E] font-bold shadow-[0_0_10px_rgba(212,184,168,0.4)] hover:bg-[#D4B8A8]/90" : ""}
                  `}
                >
                  {item.day}
                  {hasHighlight && !isSelected && (
                    <span className="absolute bottom-1 w-1 h-1 bg-[#D4B8A8] rounded-full" />
                  )}
                  {hasHighlight && isSelected && (
                    <span className="absolute bottom-1 w-1 h-1 bg-[#12100E] rounded-full" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected Day Info */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <h3 className="text-xs font-bold text-white mb-3 flex items-center justify-between">
              <span>Günün Çekimleri</span>
              <span className="text-[10px] bg-[#D4B8A8]/20 text-[#D4B8A8] px-2 py-0.5 rounded-full">
                {activeSessions.length} Kayıt
              </span>
            </h3>
            
            <AnimatePresence mode="popLayout">
              {activeSessions.length > 0 ? (
                <div className="space-y-2">
                  {activeSessions.map((session, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-[#151515] border border-white/10 p-3 rounded-2xl flex flex-col gap-2"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#D4B8A8]/10 flex items-center justify-center text-[#D4B8A8] border border-white/5">
                          <Camera className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-sm leading-tight">
                            {session.school_name}
                          </h3>
                          <p className="text-[10px] text-white/60 font-medium mt-0.5">
                            {session.photographer_name || "Fotoğrafçı Atanmadı"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] font-semibold text-white/80 bg-[#12100E] px-2 py-1 rounded-md self-start border border-white/5">
                        <Clock className="w-3 h-3 text-[#D4B8A8]" />
                        <span>{session.shoot_time || "Belirsiz"}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <motion.div
                  key="no-session"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-4 text-xs text-white/40 font-medium bg-[#151515]/50 border border-dashed border-white/10 rounded-2xl"
                >
                  Bu tarihte çekim bulunmuyor.
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Right Column: Akıllı Asistan */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
          className="lg:col-span-2 h-full flex"
        >
          <div className="bg-gradient-to-b from-[#1c1a17] to-[#12100e] border border-white/10 border-t-[#D4B8A8]/20 rounded-2xl p-6 flex flex-col flex-1 w-full shadow-2xl">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#D4B8A8]/10 flex items-center justify-center text-[#D4B8A8]">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white leading-tight">Akıllı Asistan</h2>
                <p className="text-xs text-gray-300 font-semibold mt-0.5">Dikkat Gerektirenler</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {isLoadingAlerts ? (
                <div className="col-span-full text-center py-8 text-sm text-white/40 font-medium">Asistan analiz yapıyor...</div>
              ) : (
                <>
                  {upcomingShoots.filter(a => !dismissedAlerts.includes(a.id)).length === 0 && 
                   recentOrders.filter(a => !dismissedAlerts.includes(a.id)).length === 0 && 
                   recentNotes.filter(a => !dismissedAlerts.includes(`note-${a.id}`)).length === 0 && (
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      className="col-span-full bg-[#151515] border border-white/10 rounded-2xl p-4 flex items-center justify-center gap-3 text-center"
                    >
                      <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                      <p className="text-sm font-medium text-white/80">
                        Harika! Tüm işler yolunda.
                      </p>
                    </motion.div>
                  )}

                  {upcomingShoots.filter(a => !dismissedAlerts.includes(a.id)).map((item) => (
                    <motion.div
                      key={item.id}
                      whileHover={{ scale: 1.01 }}
                      className="bg-[#151515] border border-white/10 rounded-2xl p-4 flex items-start gap-4 transition-colors relative group"
                    >
                      <div className="bg-amber-500/10 p-2 rounded-lg text-amber-400 shrink-0 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <p className="text-sm text-gray-200 font-medium leading-snug pt-0.5">
                        {item.days === 1 
                          ? `Yarın ${item.school} çekimi var!` 
                          : `Dikkat: ${item.school} çekimine 2 gün kaldı!`}
                      </p>
                      <button 
                        onClick={() => setDismissedAlerts(prev => [...prev, item.id])} 
                        className="ml-auto p-2 text-white/30 hover:text-emerald-400 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}

                  {recentOrders.filter(a => !dismissedAlerts.includes(a.id)).map((school) => (
                    <motion.div
                      key={school.id}
                      whileHover={{ scale: 1.01 }}
                      className="bg-[#151515] border border-white/10 rounded-2xl p-4 flex items-start gap-4 transition-colors relative group"
                    >
                      <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-400 shrink-0 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                      <p className="text-sm text-gray-300 font-medium leading-snug pt-0.5">
                        <span className="font-bold text-white block mb-0.5">Sipariş Onayı</span>
                        {school.name} paket seçimlerini tamamladı.
                      </p>
                      <button 
                        onClick={() => setDismissedAlerts(prev => [...prev, school.id])} 
                        className="ml-auto p-2 text-white/30 hover:text-emerald-400 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}

                  {recentNotes.filter(a => !dismissedAlerts.includes(`note-${a.id}`)).map((note) => {
                    const author = note.author_name || "Yönetici";
                    const nId = `note-${note.id}`;
                    return (
                      <motion.div
                        key={nId}
                        whileHover={{ scale: 1.01 }}
                        className="bg-[#151515] border border-white/10 rounded-2xl p-4 flex items-start gap-4 transition-colors relative group"
                      >
                        <div className="bg-[#D4B8A8]/10 p-2 rounded-lg text-[#D4B8A8] shrink-0 border border-white/5">
                          <Info className="w-5 h-5" />
                        </div>
                        <p className="text-sm text-white/80 font-medium leading-snug pt-0.5">
                          <span className="font-bold text-white block mb-0.5">Yeni Not</span>
                          {author} tarafından eklendi.
                        </p>
                        <button 
                          onClick={() => setDismissedAlerts(prev => [...prev, nId])} 
                          className="ml-auto p-2 text-white/30 hover:text-emerald-400 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </motion.div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* NEW WIDGET: Canlı Üretim Hunisi */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
        className="bg-gradient-to-b from-[#1c1a17] to-[#12100e] border border-white/10 border-t-[#D4B8A8]/20 rounded-2xl p-6 w-full shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
           <div className="w-10 h-10 rounded-xl bg-[#D4B8A8]/10 flex items-center justify-center text-[#D4B8A8]">
             <Settings className="w-5 h-5" />
           </div>
           <div>
             <h2 className="text-lg font-bold text-white leading-tight">Canlı Üretim Hunisi</h2>
             <p className="text-xs text-gray-300 font-semibold mt-0.5">Siparişlerin anlık üretim ve lojistik durumları</p>
           </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
          {/* Connecting line for desktop */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-[2px] bg-white/5 -translate-y-1/2 z-0 rounded-full" />
          
          {/* Stage 1 */}
          <div className="bg-[#151515] border border-white/10 rounded-2xl p-5 relative z-10 flex flex-col items-center text-center">
             <div className="w-12 h-12 rounded-full bg-[#D4B8A8]/5 border border-[#D4B8A8]/20 flex items-center justify-center mb-3 text-[#D4B8A8]/60 shadow-[0_0_15px_rgba(212,184,168,0.05)]">
               <Inbox className="w-5 h-5" />
             </div>
             <h3 className="text-sm font-semibold text-gray-200 mb-1">Bekliyor</h3>
             <p className="text-3xl font-bold text-white tracking-tight">{funnelCounts?.bekliyor || 0}</p>
             <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Sipariş</span>
          </div>

          {/* Stage 2 */}
          <div className="bg-[#151515] border border-indigo-500/20 rounded-2xl p-5 relative z-10 flex flex-col items-center text-center shadow-[0_0_15px_rgba(99,102,241,0.05)]">
             <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-3 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
               <Settings className="w-5 h-5 animate-spin-slow" />
             </div>
             <h3 className="text-sm font-bold text-white mb-1">Üretimde</h3>
             <p className="text-3xl font-bold text-white tracking-tight">{funnelCounts?.uretimde || 0}</p>
             <span className="text-[10px] text-indigo-400/80 font-bold uppercase tracking-widest mt-1">Sipariş</span>
          </div>

          {/* Stage 3 */}
          <div className="bg-[#151515] border border-amber-500/20 rounded-2xl p-5 relative z-10 flex flex-col items-center text-center shadow-[0_0_15px_rgba(245,158,11,0.05)]">
             <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
               <Package className="w-5 h-5" />
             </div>
             <h3 className="text-sm font-semibold text-gray-200 mb-1">Kargoya Hazır</h3>
             <p className="text-3xl font-bold text-white tracking-tight">{funnelCounts?.kargoyaHazir || 0}</p>
             <span className="text-[10px] text-amber-400/80 font-bold uppercase tracking-widest mt-1">Sipariş</span>
          </div>

          {/* Stage 4 */}
          <div className="bg-[#151515] border border-emerald-500/20 rounded-2xl p-5 relative z-10 flex flex-col items-center text-center shadow-[0_0_15px_rgba(16,185,129,0.05)]">
             <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
               <Truck className="w-5 h-5" />
             </div>
             <h3 className="text-sm font-semibold text-gray-200 mb-1">Teslim Edildi</h3>
             <p className="text-3xl font-bold text-white tracking-tight">{funnelCounts?.teslimEdildi || 0}</p>
             <span className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-widest mt-1">Sipariş</span>
          </div>
        </div>
      </motion.div>

      {/* NEW WIDGET: Popüler Paketler & Trendler */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
        className="bg-gradient-to-b from-[#1c1a17] to-[#12100e] border border-white/10 border-t-[#D4B8A8]/20 rounded-2xl p-6 w-full shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
           <div className="w-10 h-10 rounded-xl bg-[#D4B8A8]/10 flex items-center justify-center text-[#D4B8A8]">
             <TrendingUp className="w-5 h-5" />
           </div>
           <div>
             <h2 className="text-lg font-bold text-white leading-tight">Popüler Paketler & Trendler</h2>
             <p className="text-xs text-gray-300 font-semibold mt-0.5">En çok tercih edilen paketlerin analizi</p>
           </div>
        </div>

        {popularPackages.length === 0 ? (
          <div className="text-center py-6 text-sm text-white/40 font-medium bg-[#151515] border border-white/5 rounded-2xl">
            Henüz yeterli sipariş verisi yok.
          </div>
        ) : (
          <div className="space-y-5">
            {popularPackages.map((pkg, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-200 font-medium text-sm">{pkg.name}</span>
                  <span className="text-gray-400 text-sm font-semibold">{pkg.count} Sipariş</span>
                </div>
                <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${pkg.percentage}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.2 + (idx * 0.1) }}
                    className="absolute left-0 top-0 h-full bg-[#D4B8A8] rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

    </PageTransition>
  );
}
