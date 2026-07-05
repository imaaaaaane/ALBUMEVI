import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, StickyNote, Trash2, Calendar, Notebook, CheckCircle2, Loader2 } from "lucide-react";
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
import { useI18n } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseClient } from "@/lib/supabaseClient";

export const Route = createFileRoute("/dashboard/notes")({
  component: NotesView,
});

type Note = { 
  id: string; 
  title: string; 
  body: string; 
  created_at: string; 
  is_checked: boolean;
  user_id: string; 
};

function NotesView() {
  const { lang } = useI18n();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "" });

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["admin_notes"],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("notes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Note[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (note: { title: string; body: string }) => {
      const { data, error } = await supabaseClient
        .from("notes")
        .insert([{ title: note.title, body: note.body }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_notes"] });
      toast.success(lang === "TR" ? "Not başarıyla eklendi" : "Note added successfully");
      setOpen(false);
      setForm({ title: "", body: "" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseClient.from("notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_notes"] });
      toast.success(lang === "TR" ? "Not silindi" : "Note deleted");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_checked }: { id: string; is_checked: boolean }) => {
      const { error } = await supabaseClient.from("notes").update({ is_checked }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, is_checked }) => {
      await queryClient.cancelQueries({ queryKey: ["admin_notes"] });
      const previousNotes = queryClient.getQueryData<Note[]>(["admin_notes"]);
      if (previousNotes) {
        queryClient.setQueryData<Note[]>(
          ["admin_notes"],
          previousNotes.map((n) => (n.id === id ? { ...n, is_checked } : n))
        );
      }
      return { previousNotes };
    },
    onError: (err, variables, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(["admin_notes"], context.previousNotes);
      }
      toast.error(err.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_notes"] });
    },
  });

  const handleAdd = () => {
    if (!form.title.trim()) return;
    addMutation.mutate({ title: form.title.trim(), body: form.body.trim() });
  };

  const fmtDate = (ts: string) => {
    return new Date(ts).toLocaleDateString(lang === "TR" ? "tr-TR" : "en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Notlarım</h1>
          <p className="text-sm text-[#9E9696] mt-1">Kişisel notlarınızı ve hatırlatıcılarınızı burada düzenli tutun.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-bold rounded-xl h-10 px-6 shadow-lg shadow-[#A67C52]/20">
          <Plus className="mr-2 h-4 w-4" /> Yeni Not Oluştur
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-[#A67C52]" /></div>
      ) : notes.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#1a1a1e] bg-[#131316] py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#A67C52]/10 text-[#A67C52] mb-5"><Notebook className="h-8 w-8" /></div>
          <h3 className="text-xl font-bold text-white mb-2">Henüz bir not eklenmedi.</h3>
          <p className="text-[#9E9696] max-w-sm mb-6 text-sm leading-relaxed">Düşüncelerinizi ve hatırlatıcılarınızı organize etmeye başlayın.</p>
        </motion.div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-3">
          {notes.map((n, i) => (
            <motion.div key={n.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`group relative flex flex-col justify-between rounded-2xl border bg-[#131316] p-6 transition-all hover:-translate-y-1 hover:shadow-xl ${n.is_checked ? "border-[#A67C52]" : "border-[#1a1a1e] hover:border-[#A67C52]"}`}>
              <div className="absolute right-4 top-4 flex items-center gap-2">
                <button onClick={() => toggleMutation.mutate({ id: n.id, is_checked: !n.is_checked })} className={`p-1.5 rounded-full transition-colors ${n.is_checked ? "text-[#A67C52]" : "text-[#9E9696] hover:text-[#A67C52]"}`}>
                  <CheckCircle2 className="h-5 w-5" />
                </button>
                <button onClick={() => deleteMutation.mutate(n.id)} className="p-2 text-[#9E9696] opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="pr-12">
                <div className="flex items-center gap-2 text-[#A67C52] mb-3">
                  <StickyNote className="h-4 w-4" /><span className="text-[10px] font-bold uppercase tracking-widest">Not</span>
                  {n.is_checked && <span className="rounded-full bg-[#A67C52]/10 px-2 py-0.5 text-[10px] font-bold text-[#A67C52]">Gözden Geçirildi</span>}
                </div>
                <h3 className="text-lg font-bold text-white">{n.title}</h3>
                <p className="mt-3 text-sm text-[#9E9696] leading-relaxed">{n.body}</p>
              </div>
              <div className="mt-6 border-t border-[#1a1a1e] pt-4 text-xs text-[#9E9696] flex items-center gap-2"><Calendar className="h-3 w-3" />{fmtDate(n.created_at)}</div>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#131316] border-[#1a1a1e] text-white">
          <DialogHeader><DialogTitle>Yeni Not Oluştur</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <Input placeholder="Başlık" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-[#0A0A0A] border-[#1a1a1e] focus-visible:ring-[#A67C52]" />
            <Textarea placeholder="Not içeriği..." value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="bg-[#0A0A0A] border-[#1a1a1e] focus-visible:ring-[#A67C52] min-h-[120px]" />
          </div>
          <DialogFooter><Button onClick={() => setOpen(false)} variant="ghost" className="text-[#9E9696]">Vazgeç</Button><Button onClick={handleAdd} className="bg-[#A67C52] hover:bg-[#A67C52]/90">Kaydet</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
