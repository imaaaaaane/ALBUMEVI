import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Input } from "@/components/ui/input";
import { Bell, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";


export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    if (typeof window !== "undefined") {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw redirect({ to: "/admin-login" });
      }
    }
  },
  component: DashboardLayout,
});

function DashboardLayout() {


  return (
    <div className="albumevi-dark">
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background text-foreground">
          <AppSidebar />
          <div className="flex flex-1 flex-col">
            <header className="flex h-16 items-center gap-3 border-b border-white/5 bg-background/60 px-4 backdrop-blur">
              <SidebarTrigger className="flex items-center justify-center h-9 w-9 bg-transparent hover:bg-white/5 border border-transparent hover:border-white/10 text-white/70 hover:text-white rounded-xl transition-all duration-200" />
              <div className="relative ml-2 max-w-md flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Ara..."
                  className="h-9 border-border bg-card pl-9 text-sm placeholder:text-muted-foreground focus-visible:ring-primary"
                />
              </div>
              <div className="ml-auto flex items-center gap-3">
              </div>
            </header>
            <main className="flex-1 p-6">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
}
