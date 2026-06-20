import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, StickyNote, Trash2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/notes")({
  component: NotesView,
});

type Note = { id: string; title: string; body: string; createdAt: number };

const STORAGE_KEY = "fotojenik_notes";

const SEED: Note[] = [
  {
    id: "n1",
    title: "Extra lighting for Tetouan High",
    body: "Bring extra ring lights and a reflector for the Tetouan High group photo session. The gym has poor overhead lighting.",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
  },
  {
    id: "n2",
    title: "Beverly Hills custom backgrounds",
    body: "Check with the art department about custom backdrop options for Beverly Hills School. They requested a skyline theme.",
    createdAt: Date.now() - 1000 * 60 * 60 * 12,
  },
  {
    id: "n3",
    title: "Q3 pricing review reminder",
    body: "Review package pricing before the new term. Consider a volume discount for schools ordering over 500 prints.",
    createdAt: Date.now() - 1000 * 60 * 45,
  },
];

function NotesView() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "" });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(STORAGE_KEY);
    const initial = raw ? (JSON.parse(raw) as Note[]) : SEED;
    setNotes(initial);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    }
  }, [notes]);

  const handleAdd = () => {
    if (!form.title.trim()) return;
    const note: Note = {
      id: crypto.randomUUID(),
      title: form.title.trim(),
      body: form.body.trim(),
      createdAt: Date.now(),
    };
    setNotes((prev) => [note, ...prev]);
    setForm({ title: "", body: "" });
    setOpen(false);
    toast.success("Note added");
  };

  const handleDelete = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    toast.success("Note deleted");
  };

  const fmtDate = (ts: number) => {
    return new Date(ts).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notes</h1>
          <p className="text-sm text-muted-foreground">
            Quick thoughts and reminders for the admin team.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add New Note
        </Button>
      </div>

      {/* Sticky-note grid */}
      {notes.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No notes yet. Click “Add New Note” to create one.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((n) => (
            <div
              key={n.id}
              className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:bg-card/80"
            >
              <button
                onClick={() => handleDelete(n.id)}
                className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-primary/15 hover:text-primary group-hover:opacity-100"
                aria-label="Delete note"
              >
                <Trash2 className="h-4 w-4" />
              </button>

              <div className="pr-6">
                <div className="flex items-center gap-2 text-primary">
                  <StickyNote className="h-3.5 w-3.5" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Note</span>
                </div>
                <h3 className="mt-2 text-sm font-semibold leading-snug text-foreground">
                  {n.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{n.body}</p>
              </div>

              <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {fmtDate(n.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Note Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>New Note</DialogTitle>
            <DialogDescription>Jot down a quick reminder or idea.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <label htmlFor="note-title" className="text-sm font-medium">
                Title
              </label>
              <Input
                id="note-title"
                placeholder="e.g. Bring extra batteries"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="note-body" className="text-sm font-medium">
                Body
              </label>
              <Textarea
                id="note-body"
                placeholder="Write your note here..."
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                className="min-h-[120px] resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!form.title.trim()}>
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
