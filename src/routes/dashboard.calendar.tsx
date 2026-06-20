import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Camera, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/dashboard/calendar")({
  component: CalendarView,
});

type Shoot = {
  id: string;
  date: string; // YYYY-MM-DD
  time: string;
  school: string;
  type: string;
};

const SHOOT_TYPES = [
  "Class Group Photo",
  "Individual Portraits",
  "Sports Team",
  "Graduation",
  "Yearbook Session",
  "Event Coverage",
];

const SEED: Shoot[] = [
  {
    id: "s1",
    date: "2026-05-22",
    time: "09:00",
    school: "Beverly Hills School",
    type: "Class Group Photo",
  },
  {
    id: "s2",
    date: "2026-05-22",
    time: "13:30",
    school: "Greenfield Elementary",
    type: "Individual Portraits",
  },
  {
    id: "s3",
    date: "2026-05-26",
    time: "10:00",
    school: "Tetouan High",
    type: "Group Photo Session",
  },
  { id: "s4", date: "2026-06-02", time: "08:30", school: "Maple Leaf High", type: "Sports Team" },
  {
    id: "s5",
    date: "2026-06-09",
    time: "11:00",
    school: "Riverside Prep",
    type: "Yearbook Session",
  },
  { id: "s6", date: "2026-06-15", time: "14:00", school: "Oakridge Middle", type: "Graduation" },
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const STORAGE_KEY = "fotojenik.calendar.shoots";

function CalendarView() {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [shoots, setShoots] = useState<Shoot[]>(SEED);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ school: "", date: "", time: "09:00", type: SHOOT_TYPES[0] });

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setShoots(JSON.parse(raw));
    } catch {}
  }, []);

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(shoots));
    } catch {}
  }, [shoots]);

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
    const dt = new Date(s.date);
    if (dt.getFullYear() === year && dt.getMonth() === month) {
      const day = dt.getDate();
      shootsByDay.set(day, [...(shootsByDay.get(day) ?? []), s]);
    }
  }

  const upcoming = [...shoots]
    .filter((s) => new Date(s.date) >= new Date(today.toDateString()))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 6);

  const handleAdd = () => {
    if (!form.school.trim() || !form.date) return;
    const shoot: Shoot = {
      id: crypto.randomUUID(),
      school: form.school.trim(),
      date: form.date,
      time: form.time || "09:00",
      type: form.type,
    };
    setShoots((prev) => [...prev, shoot]);
    // Jump cursor to the new event's month
    const dt = new Date(form.date);
    setCursor(new Date(dt.getFullYear(), dt.getMonth(), 1));
    setForm({ school: "", date: "", time: "09:00", type: SHOOT_TYPES[0] });
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">Scheduled school photo shoots.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Event
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Schedule a Shoot</DialogTitle>
              <DialogDescription>Add a new photo session to the calendar.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="school">School Name</Label>
                <Input
                  id="school"
                  placeholder="e.g. Beverly Hills School"
                  value={form.school}
                  onChange={(e) => setForm({ ...form, school: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Shoot Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHOOT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={!form.school.trim() || !form.date}>
                Schedule Shoot
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
              <CalendarIcon className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">
                {MONTHS[month]} {year}
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
                Today
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
            {DAYS.map((d) => (
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
                        className={`mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday ? "bg-primary font-semibold text-primary-foreground" : "text-foreground"}`}
                      >
                        {day}
                      </div>
                      <div className="space-y-1">
                        {dayShoots.map((s) => (
                          <div
                            key={s.id}
                            className="truncate rounded border border-primary/40 bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary"
                            title={`${s.time} · ${s.school} — ${s.type}`}
                          >
                            <span className="font-medium">{s.time}</span> {s.school}
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
            <Camera className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Upcoming Shoots</h2>
          </div>
          <ul className="space-y-3">
            {upcoming.length === 0 ? (
              <li className="text-sm text-muted-foreground">No shoots scheduled.</li>
            ) : (
              upcoming.map((s) => {
                const dt = new Date(s.date);
                return (
                  <li
                    key={s.id}
                    className="flex gap-3 rounded-lg border border-border bg-background/40 p-3"
                  >
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-md bg-primary/15 text-primary">
                      <div className="text-[10px] uppercase">
                        {MONTHS[dt.getMonth()].slice(0, 3)}
                      </div>
                      <div className="text-lg font-bold leading-none">{dt.getDate()}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{s.school}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {s.time} · {s.type}
                      </div>
                    </div>
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
