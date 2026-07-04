import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/page-transition";
import {
  Calendar as CalendarIcon,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  Camera,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";

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
  const [selectedDay, setSelectedDay] = useState<number | null>(15);

  // April 2026 Grid setup
  // April 1st, 2026 is Wednesday (index 3).
  // Days of March to display: 29, 30, 31 (muted)
  // Days of April: 1 to 30 (regular)
  // Days of May to display: 1, 2 (muted)
  const calendarDays = [
    { day: 29, isCurrentMonth: false },
    { day: 30, isCurrentMonth: false },
    { day: 31, isCurrentMonth: false },
    ...Array.from({ length: 30 }, (_, i) => ({ day: i + 1, isCurrentMonth: true })),
    { day: 1, isCurrentMonth: false },
    { day: 2, isCurrentMonth: false },
  ];

  const highlightedDays = [17, 21, 25];

  const activeSession = selectedDay ? SESSION_DETAILS[selectedDay] : null;

  return (
    <PageTransition className="space-y-8 pb-12">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">
          Genel Bakış
        </h1>
        <p className="text-sm text-[#9E9696] mt-1 font-medium">
          Yönetici paneline hoş geldiniz, güncel özet aşağıdadır.
        </p>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left Column: Photo Sessions Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="xl:col-span-7 bg-[#111111] border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#A67C52]/10 flex items-center justify-center text-[#A67C52]">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Fotoğraf Çekimleri</h2>
                <p className="text-xs text-[#9E9696] font-semibold mt-0.5">
                  {lang === "TR" ? "Nisan 2026" : "April 2026"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-y-4 gap-x-2 text-center text-sm font-medium">
            {/* Days of Week Headers */}
            {(lang === "TR" ? ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]).map((d) => (
              <div key={d} className="text-[#9E9696] text-xs font-semibold py-1">
                {d}
              </div>
            ))}

            {/* Days list */}
            {calendarDays.map((item, idx) => {
              const isHighlighted = item.isCurrentMonth && highlightedDays.includes(item.day);
              const isActive = item.isCurrentMonth && selectedDay === item.day;
              const hasDot = isHighlighted;

              return (
                <div key={idx} className="relative py-2 flex flex-col items-center justify-center min-h-[48px]">
                  <button
                    onClick={() => item.isCurrentMonth && setSelectedDay(item.day)}
                    className={`relative w-9 h-9 flex items-center justify-center rounded-full text-sm font-semibold transition-all cursor-pointer ${
                      !item.isCurrentMonth
                        ? "text-[#4A4A4A] cursor-default"
                        : isActive
                          ? "bg-[#A67C52] text-white shadow-[0_0_12px_rgba(166,124,82,0.4)]"
                          : "text-gray-200 hover:bg-white/5"
                    }`}
                    disabled={!item.isCurrentMonth}
                  >
                    {item.day}
                    
                    {/* Small Dot under days 17, 21, 25 */}
                    {hasDot && !isActive && (
                      <span className="absolute bottom-1 w-1 h-1 bg-[#A67C52] rounded-full" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Interactive Session Details Drawer */}
          <div className="mt-8 pt-6 border-t border-white/5">
            <AnimatePresence mode="wait">
              {activeSession ? (
                <motion.div
                  key={selectedDay}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="bg-[#151515] border border-white/5 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#A67C52]/10 flex items-center justify-center text-[#A67C52]">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">
                        {activeSession.schoolName}
                      </h3>
                      <p className="text-xs text-[#9E9696] font-medium mt-0.5">
                        {(activeSession.type === "Portrait Session"
                          ? (lang === "TR" ? "Portre Çekimi" : "Portrait Session")
                          : activeSession.type === "Group Session"
                            ? (lang === "TR" ? "Sınıf Grup Çekimi" : "Group Session")
                            : (lang === "TR" ? "Telafi Çekimi" : "Retake Session"))} • {activeSession.location}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-white">
                    <Clock className="w-3.5 h-3.5 text-[#A67C52]" />
                    <span>{activeSession.time}</span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="no-session"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-6 text-sm text-[#9E9696] font-medium bg-[#151515]/30 border border-dashed border-white/5 rounded-2xl"
                >
                  Bu tarihte çekim bulunmuyor: {selectedDay}.
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Right Column: Financial Summary */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
          className="xl:col-span-5 space-y-6"
        >
          {/* Header */}
          <div className="bg-[#111111] border border-white/5 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <div className="w-10 h-10 rounded-xl bg-[#12B76A]/10 flex items-center justify-center text-[#12B76A]">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Finansal Özet</h2>
                <p className="text-xs text-[#9E9696] font-semibold mt-0.5">Bu Ay</p>
              </div>
            </div>

            {/* Financial Cards */}
            <div className="space-y-4">
              {/* Card 1: Money In */}
              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                className="bg-[#151515] border border-[#12B76A]/20 rounded-2xl p-5 flex items-center justify-between hover:border-[#12B76A]/40 transition-colors cursor-pointer"
              >
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-[#9E9696] uppercase tracking-wider">
                    GELİR
                  </p>
                  <p className="text-2xl font-extrabold text-white">$45,678</p>
                  <p className="text-xs text-[#12B76A] font-medium flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>+23% geçen aya göre</span>
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#12B76A]/10 flex items-center justify-center text-[#12B76A] border border-[#12B76A]/20">
                  <ArrowUpRight className="w-6 h-6" />
                </div>
              </motion.div>

              {/* Card 2: Money Out */}
              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                className="bg-[#151515] border border-[#A67C52]/20 rounded-2xl p-5 flex items-center justify-between hover:border-[#A67C52]/40 transition-colors cursor-pointer"
              >
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-[#9E9696] uppercase tracking-wider">
                    GİDER
                  </p>
                  <p className="text-2xl font-extrabold text-white">$12,340</p>
                  <p className="text-xs text-[#A67C52] font-medium flex items-center gap-1">
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    <span>+12% geçen aya göre</span>
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#A67C52]/10 flex items-center justify-center text-[#A67C52] border border-[#A67C52]/20">
                  <ArrowDownRight className="w-6 h-6" />
                </div>
              </motion.div>

              {/* Card 3: Net Profit */}
              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                className="bg-[#151515] border border-[#A67C52]/20 rounded-2xl p-5 flex items-center justify-between hover:border-[#A67C52]/40 transition-colors cursor-pointer"
              >
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-[#9E9696] uppercase tracking-wider">
                    NET KÂR
                  </p>
                  <p className="text-2xl font-extrabold text-white">$33,338</p>
                  <p className="text-xs text-[#A67C52] font-medium flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>+27% geçen aya göre</span>
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#A67C52]/10 flex items-center justify-center text-[#A67C52] border border-[#A67C52]/20">
                  <ArrowUpRight className="w-6 h-6" />
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
