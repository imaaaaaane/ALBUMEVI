import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { loginSchool } from "@/lib/school.functions";

export const Route = createFileRoute("/login")({
  component: SchoolLogin,
});

function SchoolLogin() {
  const navigate = useNavigate();
  const login = useServerFn(loginSchool);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const m = useMutation({
    mutationFn: login,
    onSuccess: (school) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("fotojenik_school", JSON.stringify(school));
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Camera className="h-5 w-5" />
          </div>
          <span className="text-2xl font-bold">Fotojenik</span>
        </Link>

        <div className="rounded-2xl border bg-card p-8 shadow-xl">
          <h1 className="text-2xl font-bold">School Login</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to manage your school's photography sessions.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="school-admin"
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
              Sign In
            </Button>
          </form>

          <div className="mt-6 border-t pt-4 text-center text-sm">
            <Link to="/admin-login" className="text-primary hover:underline">
              Admin Login →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
