import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, UploadCloud, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/dashboard/portfolio")({
  component: PortfolioPage,
});

function PortfolioPage() {
  const queryClient = useQueryClient();
  const { teamId } = useAuth();
  const [isUploading, setIsUploading] = useState(false);

  const { data: portfolioImages = [], isLoading } = useQuery({
    queryKey: ["portfolio_images"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("portfolio_images")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("portfolio")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("portfolio")
        .getPublicUrl(fileName);

      // Insert into database
      const { error: dbError } = await (supabase as any)
        .from("portfolio_images")
        .insert({
          image_url: publicUrlData.publicUrl,
          team_id: teamId === "all" ? null : (teamId || null),
        });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio_images"] });
      toast.success("Fotoğraf portfolyoya eklendi!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Yükleme başarısız.");
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (image: any) => {
      // Optional: Delete from storage as well
      if (image.image_url) {
        const urlParts = image.image_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        if (fileName) {
          await supabase.storage.from("portfolio").remove([fileName]);
        }
      }

      // Delete from db
      const { error } = await (supabase as any)
        .from("portfolio_images")
        .delete()
        .eq("id", image.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio_images"] });
      toast.success("Fotoğraf silindi.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Silinirken hata oluştu.");
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    uploadMutation.mutate(file);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Portfolyo Yönetimi</h1>
          <p className="text-white/60 mt-2">
            Açılış sayfasında gösterilecek portfolyo görsellerini buradan ekleyip silebilirsiniz.
          </p>
        </div>
        
        <div className="relative overflow-hidden group">
          <Button
            disabled={isUploading}
            className="bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-bold rounded-xl shadow-[0_0_15px_rgba(166,124,82,0.3)] transition-all pointer-events-none"
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <UploadCloud className="w-5 h-5 mr-2" />
            )}
            {isUploading ? "Yükleniyor..." : "Yeni Görsel Yükle"}
          </Button>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#A67C52]" />
        </div>
      ) : portfolioImages.length === 0 ? (
        <div className="text-center py-20 border border-white/5 rounded-3xl bg-white/5">
          <ImageIcon className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white">Henüz portfolyo görseli yok</h3>
          <p className="text-white/50 mt-2">Sağ üstteki butondan yeni görsel yükleyebilirsiniz.</p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">
          {portfolioImages.map((image: any, index: number) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              key={image.id}
              className="relative group rounded-2xl overflow-hidden break-inside-avoid shadow-lg bg-[#12100E] border border-white/5"
            >
              <img
                src={image.image_url}
                alt="Portfolio Item"
                className="w-full h-auto object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                <button
                  onClick={() => {
                    if (window.confirm("Bu görseli silmek istediğinize emin misiniz?")) {
                      deleteMutation.mutate(image);
                    }
                  }}
                  className="self-end p-3 bg-red-500/90 hover:bg-red-500 text-white rounded-xl backdrop-blur-md transition-all translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 shadow-xl"
                  title="Görseli Sil"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
