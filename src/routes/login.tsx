import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Loader2, ArrowLeft } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { loginSchool } from "@/lib/school.functions";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

export const Route = createFileRoute("/login")({
  component: SchoolLogin,
});

function SchoolLogin() {
  const navigate = useNavigate();
  const { t, dir } = useI18n();
  const login = useServerFn(loginSchool);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const m = useMutation({
    mutationFn: login,
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
      className="relative flex min-h-screen items-center justify-center bg-[#0A0A0A] text-white px-4 font-sans select-none"
    >
      {/* Top bar with Back Link & Language Switcher */}
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
        <Link to="/" className="mb-8 flex flex-col items-center justify-center gap-3 group">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-transform group-hover:scale-105">
            <Camera className="h-6 w-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white lowercase">
            album<span className="text-red-500">evi</span>
          </span>
        </Link>

        {/* Card */}
        <div className="rounded-3xl border border-white/5 bg-[#111111] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <h1 className="text-2xl font-bold text-center tracking-tight">
            {t("login.school.title")}
          </h1>
          <p className="mt-2 text-sm text-gray-400 text-center leading-relaxed">
            {t("login.school.subtitle")}
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-gray-300 text-sm font-semibold">
                {t("login.username")}
              </Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t("login.username.placeholder")}
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
              {t("login.button.signIn")}
            </Button>
          </form>

          <div className="mt-8 border-t border-white/5 pt-5 text-center text-sm">
            <Link
              to="/admin-login"
              className="text-red-500 hover:text-red-400 transition-colors font-medium"
            >
              {t("login.button.adminLink")}
            </Link>
          </div>
        </div>
      </div>

      {/* Decorative ambient background blur */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[120px] -z-10" />
    </div>
  );
}
