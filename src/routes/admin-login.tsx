import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { loginAdmin } from "@/lib/auth.functions";

export const Route = createFileRoute("/admin-login")({
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const login = useServerFn(loginAdmin);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const m = useMutation({
    mutationFn: login,
    onSuccess: (res) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("fotojenik_admin", JSON.stringify(res));
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-primary/30 px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 backdrop-blur">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="text-2xl font-bold">Fotojenik Admin</span>
        </Link>

        <div className="rounded-2xl border bg-card p-8 shadow-xl">
          <h1 className="text-2xl font-bold">Admin Login</h1>
          <p className="mt-1 text-sm text-muted-foreground">Main system administrator access.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={m.isPending}>
              {m.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enter Dashboard
            </Button>
          </form>

          <div className="mt-6 border-t pt-4 text-center text-sm">
            <Link to="/login" className="text-muted-foreground hover:underline">
              ← Back to School Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
