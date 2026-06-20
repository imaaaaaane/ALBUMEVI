import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Input } from "@/components/ui/input";
import { Bell, Search } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !localStorage.getItem("fotojenik_admin")) {
      throw redirect({ to: "/admin-login" });
    }
  },
  component: DashboardLayout,
});

function DashboardLayout() {
  return (
    <div className="fotojenik-dark">
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background text-foreground">
          <AppSidebar />
          <div className="flex flex-1 flex-col">
            <header className="flex h-16 items-center gap-3 border-b border-border bg-background/60 px-4 backdrop-blur">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div className="relative ml-2 max-w-md flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search schools, products, links..."
                  className="h-9 border-border bg-card pl-9 text-sm placeholder:text-muted-foreground focus-visible:ring-primary"
                />
              </div>
              <div className="ml-auto flex items-center gap-3">
                <button
                  type="button"
                  className="relative flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
                </button>
                <div className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    A
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-xs font-medium leading-tight">Admin</div>
                    <div className="text-[10px] leading-tight text-muted-foreground">
                      Fotojenik HQ
                    </div>
                  </div>
                </div>
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
