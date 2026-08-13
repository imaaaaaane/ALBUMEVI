import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, useRef } from "react";
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
  Camera,
  Image as ImageIcon,
  UploadCloud,
  Loader2,
  Pencil
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SIDEBAR_ITEMS = [
  { title: "Genel Bakış", url: "/dashboard", icon: LayoutDashboard },
  { title: "Okul Yönetimi", url: "/dashboard/schools", icon: School },
  { title: "Siparişler", url: "/dashboard/orders", icon: ClipboardList },
  { title: "Ürün Envanteri", url: "/dashboard/inventory", icon: Package },
  { title: "Takvim", url: "/dashboard/calendar", icon: Calendar },
  { title: "Muhasebe", url: "/dashboard/finance", icon: Wallet },
  { title: "Notlar", url: "/dashboard/notes", icon: StickyNote },
  { title: "Çekimciler", url: "/dashboard/photographers", icon: Camera },
  { title: "Portfolyo", url: "/dashboard/portfolio", icon: ImageIcon },
];

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const { lang, setLang } = useI18n();
  const { user, role, teamId, fullName, avatarUrl, refreshProfile } = useAuth();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(fullName || user?.email || "");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      let newAvatarUrl = avatarUrl;
      
      if (editFile) {
        const fileExt = editFile.name.split('.').pop();
        const filePath = `${user.id}-${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, editFile, { upsert: true });
          
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
          
        newAvatarUrl = urlData.publicUrl;
      }
      
      const payload: any = {
        full_name: editName,
        avatar_url: newAvatarUrl
      };
      
      // Prevent UUID 'all' string error
      if (teamId) {
        payload.team_id = teamId === "all" ? null : teamId;
      }
      
      const { error } = await (supabase as any).from('profiles').update(payload).eq('id', user.id);
      
      if (error) throw error;
      
      toast.success("Profil güncellendi.");
      await refreshProfile();
      setIsEditingProfile(false);
    } catch (e: any) {
      toast.error(e.message || "Profil güncellenemedi.");
    } finally {
      setIsSaving(false);
    }
  };

  const activeItems = SIDEBAR_ITEMS.filter((item) => {
    if (role === "photographer") {
      return ["/dashboard", "/dashboard/schools", "/dashboard/orders", "/dashboard/calendar", "/dashboard/notes"].includes(item.url);
    }
    return true; // Admin sees all
  });

  const signOut = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("albumevi_admin");
      localStorage.removeItem("albumevi_school");
    }
    navigate({ to: "/" });
  };

  const userDisplayName = fullName || user?.email || "Kullanıcı";
  const userDisplayNameLower = userDisplayName.toLowerCase();
  
  let displayRole = "FOTOĞRAFÇILAR";
  if (userDisplayNameLower.includes("serhat")) {
    displayRole = "CEO";
  } else if (userDisplayNameLower.includes("imane")) {
    displayRole = "CO-CEO";
  }


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
              {activeItems.map((item) => {
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
          <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
            <DialogTrigger asChild>
              <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-2.5 cursor-pointer hover:bg-white/10 transition-colors group">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#A67C52] text-sm font-bold text-white shadow-[0_0_10px_rgba(166,124,82,0.2)] overflow-hidden relative">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="uppercase">{((fullName || user?.email || "K")[0])}</span>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="w-4 h-4" />
                  </div>
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="truncate text-sm font-bold text-white">
                    {userDisplayName}
                  </div>
                  <div className="truncate text-xs text-[#9E9696] mt-0.5 font-semibold tracking-wider">
                    {displayRole}
                  </div>
                </div>
              </div>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-[#131316] border border-white/10 text-white">
              <DialogHeader>
                <DialogTitle className="text-white">Profili Düzenle</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label className="text-white/70">Ad Soyad</Label>
                  <Input 
                    placeholder="Adınız Soyadınız" 
                    value={editName} 
                    onChange={(e) => setEditName(e.target.value)} 
                    className="bg-white/5 border-white/10 text-white rounded-xl focus-visible:ring-[#A67C52]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Profil Fotoğrafı</Label>
                  <div className="relative group border-2 border-dashed border-white/20 hover:border-[#A67C52] rounded-xl p-6 text-center transition-colors bg-white/5">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setEditFile(e.target.files[0]);
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="pointer-events-none flex flex-col items-center gap-2">
                      <UploadCloud className="w-8 h-8 text-[#A67C52]" />
                      {editFile ? (
                        <p className="text-white font-medium">{editFile.name}</p>
                      ) : (
                        <>
                          <p className="text-white font-medium">Fotoğrafı sürükleyin veya seçin</p>
                          <p className="text-white/50 text-xs">Yeni bir profil fotoğrafı yükleyin.</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={handleSaveProfile} 
                  disabled={isSaving}
                  className="w-full bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-bold rounded-xl"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Kaydet"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
