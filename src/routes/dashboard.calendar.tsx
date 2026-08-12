import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Camera, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/dashboard/calendar")({
  component: CalendarView,
});

type Shoot = {
  id: string;
  shoot_date: string;
  shoot_time: string;
  school_name: string;
  photographer_name: string;
  event_color?: string;
};

const PALETTE = [
  "#D4B8A8", // Nude Beige
  "#C5A8A9", // Dusty Rose
  "#B5A39D", // Warm Taupe
  "#98847E", // Soft Mocha
  "#C29F90", // Muted Clay
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December",
];
const MONTHS_TR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_TR = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

function CalendarView() {
  const { lang } = useI18n();
  const { teamId } = useAuth();
  const qc = useQueryClient();
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ school_name: "", photographer_name: "", photographer_id: "", date: "", time: "09:00", event_color: PALETTE[0] });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles", teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id, full_name, email")
        .eq("team_id", teamId)
        .eq("role", "photographer");
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  const { data: shoots = [] } = useQuery({
    queryKey: ["photo_shoots"],
    queryFn: async () => {
      const { data, error } = await supabase.from("photo_shoots" as any)
        .select("*")
        .order("shoot_date", { ascending: true })
        .order("shoot_time", { ascending: true });

      if (error) throw new Error(error.message);
      return (data as any[]) || [];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("photo_shoots" as any)
        .delete()
        .eq("id", id);
      
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Çekim silindi.");
      qc.invalidateQueries({ queryKey: ["photo_shoots"] });
    },
    onError: (e: Error) => toast.error(e.message || "Çekim silinemedi.")
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const shootsByDay = new Map<number, Shoot[]>();
  for (const s of shoots) {
    if (!s.shoot_date) continue;
    const dt = new Date(s.shoot_date);
    if (dt.getFullYear() === year && dt.getMonth() === month) {
      const day = dt.getDate();
      shootsByDay.set(day, [...(shootsByDay.get(day) ?? []), s]);
    }
  }

  const upcoming = [...shoots]
    .filter((s) => {
      if (!s.shoot_date) return false;
      const d = new Date(s.shoot_date);
      const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      return d.getTime() >= t.getTime();
    })
    .slice(0, 6);

  const handleAdd = async () => {
    if (!form.school_name.trim() || !form.date) return;
    
    setIsSubmitting(true);
    try {
      const newShoot = {
        school_name: form.school_name.trim(),
        photographer_name: form.photographer_name.trim(),
        photographer_id: form.photographer_id || null,
        shoot_date: form.date,
        shoot_time: form.time || "09:00",
        event_color: form.event_color,
        team_id: teamId,
      };

      const { error } = await (supabase as any)
        .from("photo_shoots")
        .insert(newShoot);
        
      if (error) {
        console.error("Insert Error:", error);
        throw error;
      }
      
      toast.success("Çekim başarıyla eklendi");
      qc.invalidateQueries({ queryKey: ["photo_shoots"] });
      
      const dt = new Date(form.date);
      setCursor(new Date(dt.getFullYear(), dt.getMonth(), 1));
      
      setForm({ school_name: "", photographer_name: "", photographer_id: "", date: "", time: "09:00", event_color: PALETTE[0] });
      setOpen(false);
    } catch (e: any) {
      console.error("Catch Block Error:", e);
      toast.error(`Kayıt hatası: ${e.message || "Bilinmeyen bir hata oluştu"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = (id: string) => {
    if (window.confirm("Bu çekimi silmek istediğinize emin misiniz?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Takvim Yönetimi</h1>
          <p className="text-sm text-muted-foreground">Çekim seanslarını ve etkinlikleri planlayın.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-[#A67C52] text-white hover:bg-[#A67C52]/90 shadow-sm shadow-[#A67C52]/20">
              <Plus className="h-4 w-4" /> Yeni Çekim Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Çekim Planla</DialogTitle>
              <DialogDescription>Yeni bir çekim seansı ekleyin.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="school">Okul Adı</Label>
                <Input
                  id="school"
                  placeholder={lang === "TR" ? "Örn. Batman Anadolu Lisesi" : "e.g. Beverly Hills School"}
                  value={form.school_name}
                  onChange={(e) => setForm({ ...form, school_name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="photographer">Fotoğrafçı Adı</Label>
                <select
                  id="photographer"
                  value={form.photographer_id}
                  onChange={(e) => {
                    const selected = profiles.find((p: any) => p.id === e.target.value);
                    if (selected) {
                      setForm({ ...form, photographer_name: selected.full_name || selected.email, photographer_id: selected.id });
                    } else {
                      setForm({ ...form, photographer_name: "", photographer_id: "" });
                    }
                  }}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" disabled>Fotoğrafçı (Ekip Üyesi) Seçiniz...</option>
                  {profiles.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {(p.full_name || p.email)?.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2 flex-col">
                  <Label>Tarih</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={`w-full justify-start text-left font-normal bg-background/50 border-border hover:bg-background/80 hover:text-foreground ${!form.date ? "text-muted-foreground" : ""}`}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
                        {form.date ? (
                          format(new Date(form.date), "dd MMMM yyyy", { locale: tr })
                        ) : (
                          <span>Tarih seçin</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                      <Calendar
                        mode="single"
                        selected={form.date ? new Date(form.date) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const yyyy = date.getFullYear();
                            const mm = String(date.getMonth() + 1).padStart(2, "0");
                            const dd = String(date.getDate()).padStart(2, "0");
                            setForm({ ...form, date: `${yyyy}-${mm}-${dd}` });
                          }
                        }}
                        initialFocus
                        locale={tr}
                        className="bg-card text-foreground rounded-md [&_[data-selected-single=true]]:bg-[#A67C52] [&_[data-selected-single=true]]:text-white [&_[data-selected-single=true]]:hover:bg-[#A67C52]/90"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="time">Saat</Label>
                  <Input
                    id="time"
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2 mt-2">
                <Label>Etkinlik Rengi</Label>
                <div className="flex items-center gap-3">
                  {PALETTE.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setForm({ ...form, event_color: hex })}
                      className={`h-7 w-7 rounded-full border-2 transition-all ${
                        form.event_color === hex
                          ? "border-white scale-110 shadow-sm"
                          : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: hex }}
                      title={`Renk: ${hex}`}
                      aria-label={`Renk seç: ${hex}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                {lang === "TR" ? "Vazgeç" : "Cancel"}
              </Button>
              <Button className="bg-[#A67C52] text-white hover:bg-[#A67C52]/90" onClick={handleAdd} disabled={!form.school_name.trim() || !form.date || isSubmitting}>
                {isSubmitting ? "Ekleniyor..." : (lang === "TR" ? "Çekim Planla" : "Schedule Shoot")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Calendar grid */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-[#A67C52]" />
              <h2 className="font-semibold">
                {lang === "TR" ? MONTHS_TR[month] : MONTHS[month]} {year}
              </h2>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCursor(new Date(year, month - 1, 1))}
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
              >
                Bugün
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCursor(new Date(year, month + 1, 1))}
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-border bg-background/40">
            {(lang === "TR" ? DAYS_TR : DAYS).map((d) => (
              <div
                key={d}
                className="px-3 py-2 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              const isToday =
                day === today.getDate() &&
                month === today.getMonth() &&
                year === today.getFullYear();
              const dayShoots = day ? (shootsByDay.get(day) ?? []) : [];
              return (
                <div
                  key={i}
                  className="min-h-24 border-b border-r border-border p-2 last:border-r-0 [&:nth-child(7n)]:border-r-0"
                >
                  {day && (
                    <>
                      <div
                        className={`mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday ? "bg-[#A67C52] font-semibold text-white shadow-md shadow-[#A67C52]/20" : "text-foreground"}`}
                      >
                        {day}
                      </div>
                      <div className="space-y-1">
                        {dayShoots.map((s) => (
                          <div
                            key={s.id}
                            className="truncate rounded border px-1.5 py-0.5 text-[10px]"
                            style={{
                              backgroundColor: `${s.event_color || "#A67C52"}26`,
                              borderColor: `${s.event_color || "#A67C52"}66`,
                              color: s.event_color || "#A67C52"
                            }}
                            title={`${s.shoot_time} · ${s.school_name} — ${s.photographer_name}`}
                          >
                            <span className="font-medium">{s.shoot_time ? s.shoot_time.slice(0, 5) : ""}</span> {s.school_name}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming shoots sidebar */}
        <aside className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Camera className="h-4 w-4 text-[#A67C52]" />
            <h2 className="font-semibold">Yaklaşan Çekimler</h2>
          </div>
          <ul className="space-y-3">
            {upcoming.length === 0 ? (
              <li className="text-sm text-muted-foreground">Yaklaşan çekim bulunmuyor.</li>
            ) : (
              upcoming.map((s) => {
                const dt = new Date(s.shoot_date);
                return (
                  <li
                    key={s.id}
                    className="flex gap-3 items-center rounded-lg border border-border bg-background/40 p-3 group relative pr-12"
                  >
                    <div 
                      className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-md"
                      style={{
                        backgroundColor: `${s.event_color || "#A67C52"}26`,
                        color: s.event_color || "#A67C52"
                      }}
                    >
                      <div className="text-[10px] uppercase">
                        {lang === "TR" ? MONTHS_TR[dt.getMonth()].slice(0, 3) : MONTHS[dt.getMonth()].slice(0, 3)}
                      </div>
                      <div className="text-lg font-bold leading-none">{dt.getDate()}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{s.school_name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {s.shoot_time ? s.shoot_time.slice(0,5) : ""} · {s.photographer_name}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteEvent(s.id)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-md text-white/40 hover:text-rose-500 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </aside>
      </div>
    </div>
  );
}
