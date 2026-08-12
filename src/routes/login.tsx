import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Camera, Loader2, ArrowLeft, Info, CheckCircle2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/login")({
  component: SchoolLogin,
});

function SchoolLogin() {
  const navigate = useNavigate();
  const { t, dir } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showGuide, setShowGuide] = useState(true);

  const m = useMutation({
    mutationFn: async ({ data }: { data: { username: string; password: string } }) => {
      const { data: schoolId, error } = await supabase.rpc("verify_school_password", {
        _username: data.username,
        _password: data.password,
      });
      if (error) throw new Error(error.message);
      if (!schoolId) throw new Error("Invalid username or password");

      const { data: school, error: sErr } = await supabase
        .from("schools")
        .select("id, name, unique_link_slug")
        .eq("id", schoolId as unknown as string)
        .single();
      if (sErr || !school) throw new Error("School not found");
      return school;
    },
    onSuccess: (school) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("albumevi_school", JSON.stringify(school));
      }
      navigate({ to: "/school/$slug", params: { slug: school.unique_link_slug } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    m.mutate({ data: { username, password } });
  };

  return (
    <div
      dir={dir}
      className="relative flex min-h-screen items-center justify-center bg-cover bg-center text-white px-4 font-sans select-none overflow-hidden"
      style={{
        /* USER WILL INSERT BACKGROUND IMAGE URL HERE */
        // backgroundImage: 'url("https://example.com/your-aesthetic-background.jpg")'
        backgroundColor: "#0A0A0A" // Fallback solid color
      }}
    >
      {/* Dark overlay with blur effect for cinematic depth */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md -z-10" />

      {/* Top bar with Back Link & Language Switcher */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-20">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Ana sayfaya dön</span>
        </Link>
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md relative z-10 pt-12">
        {/* Brand logo */}
        <Link to="/" className="mb-8 flex flex-col items-center justify-center gap-3 group">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-transform group-hover:scale-105">
            <Camera className="h-6 w-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white lowercase">
            album<span className="text-[#A67C52]">evi</span>
          </span>
        </Link>

        <AnimatePresence mode="wait">
          {showGuide ? (
            <motion.div
              key="guide"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden"
            >
              {/* Decorative gradient for Kılavuz */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#A67C52] rounded-full blur-[80px] opacity-20 pointer-events-none" />
              
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-white/10 rounded-lg border border-white/10">
                  <Info className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Hoş Geldiniz</h1>
              </div>

              <div className="space-y-4 mb-8 text-white/80 text-sm leading-relaxed">
                <p>
                  Sisteme giriş yapmadan önce lütfen aşağıdaki adımları okuyun.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[#A67C52] shrink-0" />
                    <span>Okul yöneticisi olarak size verilen <strong>Kullanıcı Adı</strong> ve <strong>Şifre</strong> ile sisteme giriş yapmalısınız.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[#A67C52] shrink-0" />
                    <span>Giriş yaptıktan sonra okulunuza ait <strong>öğrenci paket seçimlerini</strong> ve <strong>siparişleri</strong> yönetebilirsiniz.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[#A67C52] shrink-0" />
                    <span>Sistemle ilgili herhangi bir sorunda <strong>Albumevi Destek</strong> ekibiyle iletişime geçebilirsiniz.</span>
                  </li>
                </ul>
              </div>

              <Button 
                onClick={() => setShowGuide(false)}
                className="w-full h-12 bg-white text-black hover:bg-gray-200 font-bold rounded-xl shadow-lg transition-all active:scale-[0.98]"
              >
                Anladım, Devam Et
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8"
            >
              <h1 className="text-2xl font-bold text-center tracking-tight text-white">
                Okul Girişi
              </h1>
              <p className="mt-2 text-sm text-white/70 text-center leading-relaxed">
                Okulunuzun fotoğraf çekim seanslarını yönetmek için giriş yapın.
              </p>

              <form onSubmit={onSubmit} className="mt-8 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-white/90 text-sm font-semibold">
                    Kullanıcı Adı
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="okul-yoneticisi"
                    required
                    className="h-12 border-white/20 bg-white/10 text-white placeholder:text-white/40 focus-visible:ring-white/50 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white/90 text-sm font-semibold">
                    Şifre
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="h-12 border-white/20 bg-white/10 text-white placeholder:text-white/40 focus-visible:ring-white/50 rounded-xl"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 bg-white text-black hover:bg-gray-200 font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={m.isPending}
                >
                  {m.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Giriş Yap
                </Button>
              </form>

              <div className="mt-8 border-t border-white/10 pt-5 text-center text-sm">
                <Link
                  to="/admin-login"
                  className="text-white/70 hover:text-white transition-colors font-medium"
                >
                  Yönetici Girişi →
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
