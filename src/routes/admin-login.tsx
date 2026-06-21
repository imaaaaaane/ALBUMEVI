import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldCheck, ArrowLeft } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { loginAdmin } from "@/lib/auth.functions";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

export const Route = createFileRoute("/admin-login")({
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const { t, dir } = useI18n();
  const login = useServerFn(loginAdmin);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const m = useMutation({
    mutationFn: login,
    onSuccess: (res) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("albumevi_admin", JSON.stringify(res));
      }
      navigate({ to: "/dashboard/schools" });
    },
    onError: () => {
      toast.error("Invalid Credentials", {
        style: {
          background: "#1a0505",
          color: "#E53E3E",
          border: "1px solid rgba(229, 62, 62, 0.4)",
        },
      });
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    m.mutate({ data: { email, password } });
  };

  return (
    <div
      dir={dir}
      className="relative flex min-h-screen items-center justify-center bg-[#0A0A0A] text-white px-4 font-sans select-none"
    >
      {/* Top bar with Home Link & Language Switcher */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>{t("school.backHome")}</span>
        </Link>
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md relative z-10 pt-12">
        {/* Brand logo */}
        <Link
          to="/"
          className="mb-8 flex flex-col items-center justify-center gap-3 group text-white"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 border border-white/10 backdrop-blur shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-transform group-hover:scale-105">
            <ShieldCheck className="h-6 w-6 text-red-500" />
          </div>
          <span className="text-2xl font-bold tracking-tight lowercase">
            album<span className="text-red-500">evi</span> admin
          </span>
        </Link>

        {/* Card */}
        <div className="rounded-3xl border border-white/5 bg-[#111111] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <h1 className="text-2xl font-bold text-center tracking-tight">
            {t("login.admin.title")}
          </h1>
          <p className="mt-2 text-sm text-gray-400 text-center leading-relaxed">
            {t("login.admin.subtitle")}
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300 text-sm font-semibold">
                {t("login.email")}
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("login.email.placeholder")}
                required
                className="h-11 border-white/10 bg-white/5 text-white placeholder:text-gray-500 focus-visible:ring-red-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300 text-sm font-semibold">
                {t("login.password")}
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("login.password.placeholder")}
                required
                className="h-11 border-white/10 bg-white/5 text-white placeholder:text-gray-500 focus-visible:ring-red-500"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
              disabled={m.isPending}
            >
              {m.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("login.button.enter")}
            </Button>
          </form>

          <div className="mt-8 border-t border-white/5 pt-5 text-center text-sm">
            <Link
              to="/login"
              className="text-red-500 hover:text-red-400 transition-colors font-medium"
            >
              {t("login.button.schoolLink")}
            </Link>
          </div>
        </div>
      </div>

      {/* Decorative ambient background blur */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[120px] -z-10" />
    </div>
  );
}
