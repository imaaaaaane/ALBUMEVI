import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Input } from "@/components/ui/input";
import { Bell, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    if (typeof window !== "undefined") {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw redirect({ to: "/admin-login" });
      }
    }
  },
  component: DashboardLayout,
});

function NotificationBell() {
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    refetchInterval: 10000,
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = async () => {
    if (unreadCount === 0) return;
    await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-white/70 hover:text-white rounded-xl" onClick={markAsRead}>
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-black"></span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 bg-[#111111] border-white/10 text-white p-0">
        <div className="p-3 border-b border-white/10">
          <h4 className="font-bold">Bildirimler</h4>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">Bildirim yok.</div>
          ) : (
            notifications.map((n: any) => (
              <div key={n.id} className={`p-3 border-b border-white/5 text-sm ${n.is_read ? 'text-gray-400' : 'text-white bg-white/[0.02]'}`}>
                <p>{n.message}</p>
                <span className="text-[10px] text-gray-500">{new Date(n.created_at).toLocaleTimeString("tr-TR")}</span>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DashboardLayout() {
  return (
    <div className="albumevi-dark">
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background text-foreground">
          <AppSidebar />
          <div className="flex flex-1 flex-col transition-all duration-300 ease-in-out w-full overflow-hidden">
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
                <NotificationBell />
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
