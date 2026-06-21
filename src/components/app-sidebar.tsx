import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Camera,
  School,
  Package,
  Calendar,
  Wallet,
  LogOut,
  Plus,
  Globe,
  StickyNote,
} from "lucide-react";
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

const SIDEBAR_ITEMS = [
  { title: "Dashboard", url: "/dashboard/schools", icon: School },
  { title: "Product Inventory", url: "/dashboard/inventory", icon: Package },
  { title: "Calendar", url: "/dashboard/calendar", icon: Calendar },
  { title: "Accounting", url: "/dashboard/finance", icon: Wallet },
  { title: "Notes", url: "/dashboard/notes", icon: StickyNote },
];

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();

  const signOut = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("albumevi_admin");
      localStorage.removeItem("albumevi_school");
    }
    navigate({ to: "/" });
  };

  const triggerAddSchool = async () => {
    if (!path.startsWith("/dashboard/schools")) {
      await navigate({ to: "/dashboard/schools" });
    }
    if (typeof window !== "undefined") {
      setTimeout(() => window.dispatchEvent(new CustomEvent("albumevi:add-school")), 50);
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
            <Camera className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-base font-bold tracking-tight">Albumevi</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Admin Console
            </span>
          </div>
        </div>
        <div className="px-2 pb-2">
          <Button
            onClick={triggerAddSchool}
            className="h-9 w-full justify-center gap-2 bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            <span>Add New School</span>
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {SIDEBAR_ITEMS.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={path === item.url || path.startsWith(item.url)}
                  >
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="space-y-2 px-2 pb-2">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-md border border-sidebar-border bg-sidebar-accent/40 px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <span className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5" />
              Language
            </span>
            <span className="font-medium text-foreground">EN</span>
          </button>
          <div className="flex items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/40 px-2 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              A
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-xs font-medium">Admin</div>
              <div className="truncate text-[10px] text-muted-foreground">admin@albumevi.com</div>
            </div>
          </div>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
