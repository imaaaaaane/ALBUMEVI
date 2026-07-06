import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  School,
  Package,
  Calendar,
  Wallet,
  LogOut,
  Plus,
  Globe,
  StickyNote,
  LayoutDashboard,
  Link as LinkIcon,
  ClipboardList,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

const SIDEBAR_ITEMS = [
  { title: "Genel Bakış", url: "/dashboard", icon: LayoutDashboard },
  { title: "Okul Yönetimi", url: "/dashboard/schools", icon: School },
  { title: "Siparişler", url: "/dashboard/orders", icon: ClipboardList },
  { title: "Ürün Envanteri", url: "/dashboard/inventory", icon: Package },
  { title: "Takvim", url: "/dashboard/calendar", icon: Calendar },
  { title: "Muhasebe", url: "/dashboard/finance", icon: Wallet },
  { title: "Notlar", url: "/dashboard/notes", icon: StickyNote },
];

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const { lang, setLang } = useI18n();

  const signOut = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("albumevi_admin");
      localStorage.removeItem("albumevi_school");
    }
    navigate({ to: "/" });
  };



  return (
    <Sidebar collapsible="icon" className="border-r border-white/5 bg-[#120E0E]">
      <SidebarHeader className="bg-[#120E0E] px-4 py-6 border-b border-white/5">
        <Link to="/dashboard" className="flex items-center">
          <img src="/logo.jpg" alt="Albumevi Logo" className="h-8 w-auto object-contain" />
        </Link>
      </SidebarHeader>
      
      <SidebarContent className="bg-[#120E0E] px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[#4A4A4A] font-bold text-[10px] uppercase tracking-wider px-3 mb-2">
            Çalışma Alanı
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {SIDEBAR_ITEMS.map((item) => {
                const isActive = item.url === "/dashboard" 
                  ? path === "/dashboard" || path === "/dashboard/"
                  : path === item.url || path.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="group p-0 h-auto"
                    >
                      <Link 
                        to={item.url} 
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all w-full ${
                          isActive 
                            ? "bg-[#A67C52] text-white font-bold shadow-[0_0_12px_rgba(166,124,82,0.3)]" 
                            : "text-[#9E9696] hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <motion.div
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          className="flex items-center gap-3 w-full"
                        >
                          <item.icon className={`h-4.5 w-4.5 transition-colors ${isActive ? "text-white" : "text-[#9E9696] group-hover:text-white"}`} />
                          <span className="text-sm font-semibold">{item.title}</span>
                        </motion.div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="bg-[#120E0E] px-4 py-4 border-t border-white/5 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#A67C52] text-sm font-bold text-white shadow-[0_0_10px_rgba(166,124,82,0.2)]">
              S
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-sm font-bold text-white">SERHAT GÜNEŞ</div>
              <div className="truncate text-xs text-[#9E9696] mt-0.5">
                Sistem Yöneticisi
              </div>
            </div>
          </div>
        </div>
        
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} className="flex items-center gap-2 p-0 h-auto">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-3 px-3 py-2.5 w-full text-xs font-semibold text-[#9E9696] hover:text-white hover:bg-white/5 rounded-xl transition-all cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Çıkış Yap</span>
              </motion.div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
