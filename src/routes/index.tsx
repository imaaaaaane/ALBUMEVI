import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Camera,
  Users,
  Calendar,
  ChevronDown,
  Clock,
  Award,
  GraduationCap,
  Package,
  ShieldCheck,
  BookOpen,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  Instagram,
  Facebook,
  ChevronRight,
  ArrowRight,
  X,
  Star,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getR2PublicUrl } from "@/lib/r2";

const PROCESS_STEPS: Array<{
  icon: typeof Calendar;
  title: string;
  desc: string;
  bgImage?: string;
}> = [
  {
    icon: Calendar,
    title: "Planlama",
    desc: "Okul yönetimiyle görüşüp, öğrencilere sunulacak ürün paketlerini ve çekim gününü netleştiriyoruz.",
    bgImage:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=800&auto=format&fit=crop",
  },
  {
    icon: Camera,
    title: "Çekim Günü",
    desc: "Profesyonel ekipmanlarımızla, çocukları yormadan eğlenceli bir çekim gerçekleştiriyoruz.",
    bgImage: "/cekim.jpg",
  },
  {
    icon: Users,
    title: "Sipariş ve Öğrenci Seçimi",
    desc: "Öğretmenlerimiz, sistemimiz üzerinden hangi öğrencilerin ürün/paket alacağını seçerek sipariş listelerini oluşturur.",
    bgImage: "/choice.jpg",
  },
  {
    icon: Package,
    title: "Teslimat",
    desc: "Yüksek kaliteli ürünler özenle hazırlanıyor ve zamanında okula teslim ediliyor.",
    bgImage:
      "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=800&auto=format&fit=crop",
  },
];

const PRODUCTS = [
  {
    id: "01",
    title: "Anıların Bavulu",
    subtitle: "Kancalı Geçme Ahşap Bavul Çerçeve",
    image: "/urun1.jpg",
  },
  {
    id: "02",
    title: "İlk Gün • Son Gün",
    subtitle: "Çift Taraflı Ahşap Kitap Hatırası",
    image: "/urun2.jpg",
  },
  {
    id: "03",
    title: "Hayallerime Yolculuk",
    subtitle: "Özel Tasarım Balon Ahşap Stand",
    image: "/urun3.jpg",
  },
  {
    id: "04",
    title: "Hatıra Sahnesi",
    subtitle: "Birlikte Büyüdük 3B Ahşap Sahne",
    image: "/urun4.jpg",
  },
  {
    id: "05",
    title: "Masamdaki Hatıra",
    subtitle: "İsimlikli & Kalemlikli Okul Çerçevesi",
    image: "/urun5.jpg",
  },
  {
    id: "06",
    title: "Anı Sandığım",
    subtitle: "Fotoğraflı Ahşap Mezuniyet Hatıra Kutusu",
    image: "/urun6.jpg",
  },
];

const GALLERY_IMAGES = [
  { id: "g1", src: "/galeri1.jpg", title: "Stüdyo Konsepti" },
  { id: "g2", src: "/galeri2.jpg", title: "Okul Portreleri" },
  { id: "g3", src: "/galeri3.jpg", title: "Okulumu Çok Seviyorum" },
  { id: "g4", src: "/galeri4.jpg", title: "Eğlenceli Hatıra Çekimi" },
  { id: "g5", src: "/galeri5.jpg", title: "Özel Stüdyo Kadrajı" },
  { id: "g6", src: "/galeri6.jpg", title: "Renkli Okul Anıları" },
];

const FAQS = [
  {
    q: "Mezuniyet cübbe ve keplerini siz mi temin ediyorsunuz?",
    a: "Evet, tüm mezuniyet kıyafetleri ve konsept aksesuarları ekibimiz tarafından okunuza getirilir.",
  },
  {
    q: "Çekimler okulu aksatır mı?",
    a: "Kesinlikle hayır. Programı ders saatlerine en uygun şekilde yapıyor ve hızlı, organize bir çekim sağlıyoruz.",
  },
  {
    q: "Veliler fotoğraf seçimi yapıyor mu?",
    a: "Hayır, süreç okulu yormamak adına çok pratik ilerler. Fotoğraf seçimi karmaşası yaşanmaz; öğretmenlerimiz sistem üzerinden sadece ürün alacak öğrencileri belirler ve sipariş listesini onaylar.",
  },
  {
    q: "Ürünler ne kadar sürede teslim ediliyor?",
    a: "Çekimler ve siparişler tamamlandıktan sonra, premium ürünlerimiz 2-3 hafta içerisinde özenle hazırlanıp okula teslim edilir.",
  },
];

const MotionLink = motion(Link);

const TypewriterHeadline = ({ text1, text2 }: { text1: string; text2: string }) => {
  return (
    <h1 className="font-serif text-4xl sm:text-5xl lg:text-[3.35rem] font-semibold italic leading-[1.12] tracking-tight text-white max-w-md">
      {text1}
      <br />
      <span className="text-[#D4B8A8] font-normal">{text2}</span>
    </h1>
  );
};

export const Route = createFileRoute("/")({
  component: Landing,
});

function useScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const updateProgress = () => {
      const rect = element.getBoundingClientRect();
      const height = window.innerHeight;
      let progress = 0;
      if (rect.top >= height) {
        progress = 0;
      } else if (rect.top <= 0) {
        progress = 1;
      } else {
        progress = 1 - rect.top / height;
      }
      element.style.setProperty("--wipe-progress", progress.toString());
    };

    window.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();
    return () => window.removeEventListener("scroll", updateProgress);
  }, []);

  return ref;
}

const heroContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const heroItemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

const heroImageVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 1,
      ease: [0.16, 1, 0.3, 1] as const,
      delay: 0.4,
    },
  },
};

function Landing() {
  const { t, dir } = useI18n();
  const [activeStep, setActiveStep] = useState(1);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const { data: dynamicPhotographers = [] } = useQuery({
    queryKey: ["public_photographers"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("photographers")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: dynamicPortfolio = [] } = useQuery({
    queryKey: ["public_portfolio_images"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("portfolio_images")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Katana scroll refs
  const servicesContainerRef = useScrollProgress();
  const processContainerRef = useScrollProgress();

  return (
    <div
      dir={dir}
      className="min-h-screen bg-zinc-950 text-white selection:bg-[#D4B8A8]/30 font-sans"
    >
      {/* HEADER: Sleek Glassmorphism Editorial Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-zinc-950/75 border-b border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 py-3">
          <Link to="/" className="flex items-center shrink-0">
            <img
              src="/logo-light.png"
              alt="Albumevi Logo"
              className="w-36 md:w-44 h-11 object-cover object-center"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm text-zinc-300 font-medium tracking-wide">
            <a href="#hizmetler" className="hover:text-[#D4B8A8] transition-colors duration-300">
              {t("nav.services")}
            </a>
            <a href="#surec" className="hover:text-[#D4B8A8] transition-colors duration-300">
              {t("nav.process")}
            </a>
            <a href="#cekimciler" className="hover:text-[#D4B8A8] transition-colors duration-300">
              Çekimciler
            </a>
            <a href="#galeri" className="hover:text-[#D4B8A8] transition-colors duration-300">
              {t("nav.gallery")}
            </a>
            <a href="#sss" className="hover:text-[#D4B8A8] transition-colors duration-300">
              SSS
            </a>
            <a href="#hakkimizda" className="hover:text-[#D4B8A8] transition-colors duration-300">
              {t("nav.about")}
            </a>
            <a href="#iletisim" className="hover:text-[#D4B8A8] transition-colors duration-300">
              {t("nav.contact")}
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <MotionLink
              to="/admin-login"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center justify-center px-4 py-1.5 text-sm font-medium bg-white/5 backdrop-blur-md border border-white/10 rounded-full transition-all duration-300 hover:-translate-y-0.5 hover:border-[#D4B8A8]/50 hover:text-[#D4B8A8] hover:shadow-lg hover:shadow-[#D4B8A8]/10 text-white"
            >
              {t("cta.adminLogin")}
            </MotionLink>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* CINEMATIC EDITORIAL HERO SECTION */}
      <div className="relative min-h-screen flex items-end lg:items-center justify-center overflow-hidden pt-28 pb-16 lg:py-24">
        {/* Full-Width Real Photo Background with Slow Zoom */}
        <div className="absolute inset-0 z-0 group overflow-hidden">
          <img
            src="/hero1.jpg"
            alt="Albumevi Editorial Hero"
            className="w-full h-full object-cover object-center scale-105 group-hover:scale-100 transition-transform duration-1000 ease-out"
          />
          {/* Lighter Dark Cinematic Gradient Overlays so background image pops out */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/55 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/75 via-zinc-950/35 to-transparent" />
          {/* Subtle Crimson & Gold Editorial Ambient Glow */}
          <div className="absolute -bottom-24 left-1/4 w-[500px] h-[500px] bg-[#D4B8A8]/15 blur-[140px] rounded-full pointer-events-none" />
          <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-rose-950/25 blur-[130px] rounded-full pointer-events-none" />
        </div>

        <main className="relative z-10 mx-auto max-w-[1440px] px-6 lg:px-12 w-full">
          <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8">
            {/* Editorial Typography Column */}
            <div className="w-full max-w-md space-y-6 text-left shrink-0">
              <TypewriterHeadline text1={t("hero.title1")} text2={t("hero.title2")} />

              <p className="text-base md:text-lg text-zinc-300/90 max-w-md leading-relaxed font-light">
                {t("hero.subtitle")}
              </p>

              <div className="pt-2">
                <div className="flex flex-wrap items-center gap-4">
                  <a
                    href="#galeri"
                    className="inline-flex items-center gap-2.5 bg-gradient-to-r from-[#D4B8A8] to-[#b39575] text-zinc-950 font-medium px-7 py-3.5 rounded-full text-sm tracking-wide transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#D4B8A8]/30 shadow-[0_8px_24px_rgba(212,184,168,0.2)]"
                  >
                    Portfolyoyu İncele <ArrowRight className="w-4 h-4" />
                  </a>

                  <div className="flex items-center gap-3 px-4 py-2.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:border-[#D4B8A8]/50 hover:shadow-2xl hover:shadow-[#D4B8A8]/10">
                    <div className="flex flex-col">
                      <div className="flex gap-1 text-[#D4B8A8] text-xs mb-0.5">
                        <span>★</span>
                        <span>★</span>
                        <span>★</span>
                        <span>★</span>
                        <span>★</span>
                      </div>
                      <p className="text-white text-xs font-bold tracking-wide">500+ Mutlu Okul</p>
                      <p className="text-zinc-400 text-[10px]">Sistemi aktif kullanıyor</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side Floating Editorial Glass Showcase */}
            <div className="ml-auto flex items-end justify-end gap-3.5 lg:translate-x-4 shrink-0">
              <div className="group relative w-36 sm:w-44 overflow-hidden rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-2 transition-all duration-300 hover:-translate-y-1 hover:border-[#D4B8A8]/50 hover:shadow-2xl hover:shadow-[#D4B8A8]/10">
                <div className="overflow-hidden rounded-xl">
                  <img
                    src="/home1.jpg"
                    alt="Editorial Portrait 1"
                    className="w-full h-44 sm:h-52 object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="mt-2 px-1.5 pb-0.5 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-[#D4B8A8]">
                    Kaliteli Çekim
                  </span>
                  <Camera className="w-3 h-3 text-[#D4B8A8]" />
                </div>
              </div>

              <div className="group relative w-36 sm:w-44 overflow-hidden rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-2 lg:translate-y-4 transition-all duration-300 hover:-translate-y-1 lg:hover:translate-y-3 hover:border-[#D4B8A8]/50 hover:shadow-2xl hover:shadow-[#D4B8A8]/10">
                <div className="overflow-hidden rounded-xl">
                  <img
                    src="/home2.jpg"
                    alt="Editorial Portrait 2"
                    className="w-full h-44 sm:h-52 object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="mt-2 px-1.5 pb-0.5 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-[#D4B8A8]">
                    Özel Ürünler
                  </span>
                  <Award className="w-3 h-3 text-[#D4B8A8]" />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* SERVICES GRID SECTION - Editorial & Glassmorphism */}
      <section id="hizmetler" className="relative bg-zinc-950 py-24 md:py-32 overflow-hidden">
        {/* Ambient Colorful Luxury Glows */}
        <div className="absolute top-1/3 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/10 blur-[150px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-fuchsia-500/10 blur-[150px] rounded-full pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 mx-auto max-w-7xl px-6 w-full"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="lg:col-span-5 flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                <p className="inline-block bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400 bg-clip-text text-transparent text-xs font-bold tracking-[0.25em] uppercase">
                  {t("services.badge")}
                </p>
                <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-medium italic leading-[1.18] tracking-tight bg-gradient-to-r from-white via-amber-100 to-orange-200 bg-clip-text text-transparent">
                  Premium Fotoğraf Deneyimi
                </h2>
                <p className="text-zinc-300/90 leading-relaxed text-sm sm:text-base">
                  {t("services.subtitle")}
                </p>
              </div>

              {/* Large Left Vertical Editorial Image */}
              <div className="group relative rounded-2xl w-full overflow-hidden bg-zinc-900/40 backdrop-blur-xl border border-white/10 p-2.5 shadow-2xl shadow-orange-500/15 hover:border-amber-400/50 transition-all duration-300">
                <div className="overflow-hidden rounded-2xl relative aspect-[4/5] w-full">
                  <img
                    src="/hizmet.jpg"
                    alt="Premium Fotoğraf Deneyimi"
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/85 via-zinc-950/15 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-zinc-200 bg-zinc-900/70 backdrop-blur-xl border border-white/15 px-4 py-3 rounded-xl shadow-lg">
                    <span className="font-medium tracking-wide">Gerçek Stüdyo & Okul Çekimlerimiz</span>
                    <span className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent font-bold tracking-wider uppercase text-[11px]">
                      100% Orijinal
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-6 content-end">
              {[
                {
                  icon: Camera,
                  title: t("services.card1.title"),
                  desc: t("services.card1.desc"),
                  iconBg:
                    "bg-gradient-to-br from-amber-400/25 via-orange-500/20 to-rose-500/25 border-amber-400/40 shadow-amber-500/25",
                  iconColor: "text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.65)]",
                  radialGlow:
                    "bg-[radial-gradient(circle_at_top_right,rgba(251,146,60,0.22),transparent_65%)]",
                  hoverBorder: "hover:border-amber-400/50 hover:shadow-amber-500/15",
                  titleGradient: "from-white via-amber-100 to-orange-300",
                },
                {
                  icon: Users,
                  title: t("services.card2.title"),
                  desc: t("services.card2.desc"),
                  iconBg:
                    "bg-gradient-to-br from-sky-400/25 via-cyan-500/20 to-indigo-500/25 border-sky-400/40 shadow-sky-500/25",
                  iconColor: "text-sky-300 drop-shadow-[0_0_8px_rgba(56,189,248,0.65)]",
                  radialGlow:
                    "bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.22),transparent_65%)]",
                  hoverBorder: "hover:border-sky-400/50 hover:shadow-sky-500/15",
                  titleGradient: "from-white via-sky-100 to-cyan-300",
                },
                {
                  icon: Clock,
                  title: t("services.card3.title"),
                  desc: t("services.card3.desc"),
                  iconBg:
                    "bg-gradient-to-br from-violet-400/25 via-purple-500/20 to-fuchsia-500/25 border-violet-400/40 shadow-purple-500/25",
                  iconColor: "text-fuchsia-300 drop-shadow-[0_0_8px_rgba(217,70,239,0.65)]",
                  radialGlow:
                    "bg-[radial-gradient(circle_at_top_right,rgba(192,132,252,0.22),transparent_65%)]",
                  hoverBorder: "hover:border-purple-400/50 hover:shadow-purple-500/15",
                  titleGradient: "from-white via-purple-100 to-fuchsia-300",
                },
                {
                  icon: Award,
                  title: t("services.card4.title"),
                  desc: t("services.card4.desc"),
                  iconBg:
                    "bg-gradient-to-br from-rose-400/25 via-pink-500/20 to-amber-500/25 border-rose-400/40 shadow-rose-500/25",
                  iconColor: "text-rose-300 drop-shadow-[0_0_8px_rgba(251,113,133,0.65)]",
                  radialGlow:
                    "bg-[radial-gradient(circle_at_top_right,rgba(251,113,133,0.22),transparent_65%)]",
                  hoverBorder: "hover:border-rose-400/50 hover:shadow-rose-500/15",
                  titleGradient: "from-white via-rose-100 to-amber-300",
                },
              ].map((service, idx) => {
                const ServiceIcon = service.icon;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: idx * 0.1 }}
                    className={`group relative bg-zinc-900/50 backdrop-blur-xl p-8 rounded-2xl border border-white/10 ${service.hoverBorder} transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl flex flex-col justify-between min-h-[260px] overflow-hidden`}
                  >
                    {/* Colorful Radial Mesh Glow in Card Background */}
                    <div
                      className={`absolute inset-0 ${service.radialGlow} opacity-55 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
                    />

                    <div className="relative z-10">
                      <div
                        className={`w-13 h-13 shrink-0 ${service.iconBg} border rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg`}
                      >
                        <ServiceIcon className={`w-6 h-6 ${service.iconColor}`} />
                      </div>
                      <h3
                        className={`font-serif text-xl sm:text-2xl font-semibold italic leading-snug mb-3 bg-gradient-to-r ${service.titleGradient} bg-clip-text text-transparent`}
                      >
                        {service.title}
                      </h3>
                    </div>
                    <p className="relative z-10 text-zinc-300/90 text-sm leading-relaxed">
                      {service.desc}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </section>

      {/* PHOTOGRAPHERS SECTION */}
      <section id="cekimciler" className="relative px-6 py-24 max-w-7xl mx-auto bg-zinc-950 overflow-hidden">
        {/* Subtle Colorful Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 blur-[140px] rounded-full pointer-events-none" />

        <div className="relative z-10 text-center mb-16">
          <p className="inline-block bg-gradient-to-r from-yellow-400 via-orange-400 to-rose-400 bg-clip-text text-transparent text-xs font-bold tracking-[0.25em] uppercase mb-3">
            Ekibimiz
          </p>
          <h2 className="font-serif text-4xl md:text-5xl font-medium italic tracking-tight bg-gradient-to-r from-white via-amber-100 to-orange-200 bg-clip-text text-transparent">
            Çekimcilerimiz
          </h2>
          <p className="text-zinc-300/90 mt-4 max-w-2xl mx-auto">
            Anılarınızı ölümsüzleştiren yetenekli profesyonel fotoğrafçılarımız.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 justify-center items-stretch max-w-7xl mx-auto">
          {dynamicPhotographers.map((photographer: any, idx: number) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              className="relative overflow-hidden flex flex-col items-center text-center group bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-orange-400/50 hover:shadow-2xl hover:shadow-orange-500/15"
            >
              {/* Soft Radial Glow inside Team Card */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.18),transparent_65%)] opacity-50 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              {/* Colorful Gradient Ring around Profile Picture */}
              <div className="relative z-10 w-44 h-44 rounded-full p-1 bg-gradient-to-tr from-yellow-400 via-orange-500 to-rose-500 shadow-[0_0_25px_rgba(249,115,22,0.3)] group-hover:shadow-[0_0_35px_rgba(249,115,22,0.55)] transition-all duration-500 mb-5">
                <div className="w-full h-full rounded-full p-1 bg-zinc-950 overflow-hidden">
                  <img
                    src={
                      photographer.img
                        ? getR2PublicUrl(photographer.img)
                        : photographer.image_url
                          ? getR2PublicUrl(photographer.image_url)
                          : ""
                    }
                    alt={photographer.name || photographer.full_name}
                    className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
              </div>

              <h3 className="relative z-10 text-xl font-bold bg-gradient-to-r from-white via-amber-100 to-orange-200 bg-clip-text text-transparent mt-1">
                {photographer.full_name || photographer.name}
              </h3>
              <p className="relative z-10 bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent text-xs font-bold tracking-widest uppercase mt-2 mb-5">
                {photographer.role || photographer.title}
              </p>

              <a
                href={`https://wa.me/${(photographer.phone || "").replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="relative z-10 mt-auto flex items-center justify-center gap-2 bg-white/5 backdrop-blur-md hover:bg-gradient-to-r hover:from-yellow-400 hover:via-orange-400 hover:to-amber-500 text-white hover:text-zinc-950 py-2.5 px-6 rounded-full border border-white/10 hover:border-transparent transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-orange-500/25 w-full font-medium"
              >
                <Phone className="w-4 h-4 text-amber-400 group-hover:text-current" />
                <span className="font-medium text-sm">{photographer.phone}</span>
              </a>
            </motion.div>
          ))}
        </div>
      </section>

      {/* URBAN SMOOTH SCROLL GALLERY MARQUEE SECTION */}
      <section id="galeri" className="relative py-24 w-full overflow-hidden bg-zinc-950">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
          <div>
            <p className="text-[#D4B8A8] text-xs font-bold tracking-[0.25em] uppercase mb-3">
              Portfolyo • Gerçek Çekimlerimiz
            </p>
            <h2 className="font-serif text-4xl md:text-5xl font-medium italic tracking-tight text-white">
              Unutulmaz Anılar
            </h2>
          </div>
          <p className="text-zinc-400 max-w-md text-sm md:text-base leading-relaxed">
            Objektifimizden yansıyan doğal anlar. Tüm fotoğraflar kendi çekimlerimiz ve gerçek
            ürünlerimizdir; üzerine geldiğinizde gerçek renkleriyle canlanır.
          </p>
        </div>

        {/* Full-Width Seamless Infinite Horizontal Scrolling Marquee */}
        <div className="relative w-full overflow-hidden py-4">
          {/* Left & Right Cinematic Edge Fade Masks */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-32 bg-gradient-to-r from-zinc-950 to-transparent z-20" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-32 bg-gradient-to-l from-zinc-950 to-transparent z-20" />

          <motion.div
            className="flex w-max gap-6 px-3"
            animate={{ x: ["0%", "-50%"] }}
            transition={{
              repeat: Infinity,
              ease: "linear",
              duration: 36,
            }}
          >
            {[...GALLERY_IMAGES, ...GALLERY_IMAGES].map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                className="group relative w-64 sm:w-72 md:w-80 aspect-[3/4] shrink-0 rounded-2xl overflow-hidden bg-zinc-900/60 border border-white/10 p-2 shadow-2xl hover:border-[#D4B8A8]/50 transition-all duration-500"
              >
                <div className="relative w-full h-full overflow-hidden rounded-xl">
                  <img
                    src={item.src}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-full object-cover object-center grayscale hover:grayscale-0 transition-all duration-500 hover:scale-105"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                    <span className="bg-zinc-950/75 backdrop-blur-md border border-white/15 rounded-lg px-3.5 py-1.5 text-[11px] text-[#D4B8A8] font-semibold tracking-wider uppercase">
                      {item.title}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* PROCESS SECTION */}
      <section id="surec" className="px-6 py-24 max-w-7xl mx-auto relative">
        <div className="text-center mb-24 relative z-10">
          <p className="text-[#D4B8A8] text-xs font-bold tracking-[0.25em] uppercase mb-3">Süreç</p>
          <h2 className="font-serif text-4xl md:text-5xl font-medium italic tracking-tight text-white">
            Nasıl Çalışıyoruz
          </h2>
        </div>

        <div className="relative max-w-5xl mx-auto">
          {/* THE SPINE */}
          <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px md:-translate-x-1/2 bg-gradient-to-b from-transparent via-[#D4B8A8]/50 to-transparent shadow-[0_0_15px_rgba(212,184,168,0.4)] z-0" />

          <div className="relative z-10">
            {PROCESS_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isEven = idx % 2 === 0;

              return (
                <div
                  key={idx}
                  className={`relative flex flex-col md:flex-row items-center w-full ${isEven ? "md:justify-start" : "md:justify-end"} ${idx > 0 ? "mt-8 md:-mt-24" : ""}`}
                >
                  {/* The Timeline Dot */}
                  <div className="absolute left-6 md:left-1/2 -translate-x-1/2 w-6 h-6 md:w-8 md:h-8 rounded-full bg-zinc-950 border-2 border-[#D4B8A8] flex items-center justify-center shadow-[0_0_20px_rgba(212,184,168,0.4)] z-20 top-8 md:top-1/2 md:-translate-y-1/2">
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#D4B8A8]" />
                  </div>

                  {/* The Card */}
                  <motion.div
                    initial={{ opacity: 0, x: isEven ? -30 : 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
                    className="w-full ml-16 md:ml-0 md:w-[45%] relative group rounded-3xl overflow-hidden bg-zinc-900/50 border border-white/15 transition-all duration-300 hover:-translate-y-1 hover:border-[#D4B8A8]/50 hover:shadow-2xl hover:shadow-[#D4B8A8]/15"
                  >
                    {/* Background Image + Lighter Readable Gradient Overlay */}
                    {step.bgImage && (
                      <>
                        <div
                          className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-700 z-0"
                          style={{ backgroundImage: `url(${step.bgImage})` }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/50 to-zinc-950/30 group-hover:via-zinc-950/40 group-hover:to-zinc-950/20 transition-all duration-500 z-[1]" />
                      </>
                    )}

                    {/* Giant Number */}
                    <div
                      className={`absolute -top-4 ${isEven ? "-right-4" : "-left-4"} text-9xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white/25 to-transparent pointer-events-none z-10 select-none`}
                    >
                      {idx + 1}
                    </div>

                    {/* Content */}
                    <div className="relative z-20 p-8 sm:p-12 pl-12 md:pl-12">
                      <div className="w-14 h-14 rounded-2xl bg-zinc-950/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-[#D4B8A8] mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <Icon className="w-7 h-7" />
                      </div>
                      <h3 className="text-2xl font-bold mb-4 text-white drop-shadow-md group-hover:text-[#D4B8A8] transition-colors duration-300">
                        {step.title}
                      </h3>
                      <p className="text-zinc-100 drop-shadow-sm leading-relaxed text-sm sm:text-base">
                        {step.desc}
                      </p>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="sss" className="px-6 py-20 max-w-3xl mx-auto relative">
        {/* Dynamic Background Blob */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#D4B8A8] rounded-full blur-[150px] opacity-[0.05] animate-[pulse_6s_ease-in-out_infinite] pointer-events-none z-0" />

        <div className="relative z-10">
          <div className="text-center mb-12">
            <p className="text-[#D4B8A8] text-xs font-bold tracking-[0.25em] uppercase mb-3">
              Merak Edilenler
            </p>
            <h2 className="font-serif text-4xl md:text-5xl font-medium italic tracking-tight text-white">
              Sıkça Sorulan Sorular
            </h2>
          </div>
          <div className="space-y-4">
            {FAQS.map((faq, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className={`rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-[#D4B8A8]/50 hover:shadow-2xl hover:shadow-[#D4B8A8]/10 ${activeFaq === idx ? "bg-white/[0.08] border-[#D4B8A8]/40" : ""}`}
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between py-5 px-6 text-left focus:outline-none bg-transparent group"
                >
                  <span
                    className={`font-medium transition-all duration-300 group-hover:translate-x-1 group-hover:text-[#D4B8A8] ${activeFaq === idx ? "text-[#D4B8A8]" : "text-white"}`}
                  >
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform duration-300 ease-in-out group-hover:text-[#D4B8A8] ${activeFaq === idx ? "rotate-180 text-[#D4B8A8]" : "text-zinc-400"}`}
                  />
                </button>
                <AnimatePresence>
                  {activeFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{
                        height: "auto",
                        opacity: 1,
                        transition: {
                          height: { duration: 0.3 },
                          opacity: { duration: 0.3, delay: 0.1 },
                        },
                      }}
                      exit={{
                        height: 0,
                        opacity: 0,
                        transition: { height: { duration: 0.3 }, opacity: { duration: 0.2 } },
                      }}
                    >
                      <div className="px-6 pb-6 text-zinc-400 text-sm leading-relaxed">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY US SECTION (High-End Editorial Redesign) */}
      <motion.section
        id="hakkimizda"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative px-6 py-28 max-w-7xl mx-auto bg-zinc-950 overflow-visible"
      >
        {/* Subtle Champagne Ambient Glow */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[520px] h-[520px] bg-[#D4B8A8]/10 blur-[160px] rounded-full pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-20 items-center">
          {/* Left: Prominent Portrait Image + Below Testimonial Card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="lg:col-span-6 flex flex-col gap-6"
          >
            <div className="group relative w-full rounded-3xl overflow-hidden bg-zinc-900/40 border border-white/15 p-2.5 shadow-2xl shadow-[#D4B8A8]/10 hover:border-[#D4B8A8]/40 transition-all duration-500">
              <div className="relative w-full overflow-hidden rounded-2xl">
                <img
                  src="/urun4.jpg"
                  alt="Albümevi Özel Tasarım Okul Hatıraları"
                  className="w-full h-auto block object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>
            </div>

            {/* Cleanly Positioned Glassmorphism Testimonial Card Below Image */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
              className="w-full backdrop-blur-xl bg-zinc-900/40 border border-white/15 p-6 rounded-2xl shadow-xl hover:-translate-y-1 hover:border-[#D4B8A8]/50 transition-all duration-300"
            >
              <div className="flex items-center justify-between gap-4 mb-2.5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D4B8A8]">
                  Okul Müdürü, Batman
                </p>
                <div className="flex text-[#D4B8A8] text-xs tracking-wider">★★★★★</div>
              </div>
              <p className="font-serif italic text-white/95 text-base leading-relaxed">
                “{t("whyus.testimonial.text")}”
              </p>
            </motion.div>
          </motion.div>

          {/* Right: Editorial Typography & Staggered Features List */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="lg:col-span-6 space-y-8"
          >
            <div className="space-y-4">
              <p className="text-[#D4B8A8] text-xs font-bold tracking-[0.25em] uppercase">
                {t("whyus.badge")}
              </p>
              <h2 className="font-serif text-4xl sm:text-5xl font-medium italic leading-[1.15] tracking-tight text-white">
                {t("whyus.title")}
              </h2>
              <p className="text-zinc-400 text-base sm:text-lg leading-relaxed font-light">
                {t("whyus.desc")}
              </p>
            </div>

            {/* Clean Staggered Editorial Features List */}
            <div className="divide-y divide-white/10 border-y border-white/10 py-1">
              {[
                t("whyus.feature1"),
                t("whyus.feature2"),
                t("whyus.feature3"),
                t("whyus.feature4"),
                t("whyus.feature5"),
                t("whyus.feature6"),
              ].map((feature, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: 16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: idx * 0.08, ease: "easeOut" }}
                  className="group flex items-center justify-between py-4 px-2 hover:px-4 transition-all duration-300"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-[#D4B8A8]/15 border border-[#D4B8A8]/35 flex items-center justify-center shrink-0 group-hover:bg-[#D4B8A8]/25 group-hover:scale-110 transition-all duration-300 shadow-[0_0_15px_rgba(212,184,168,0.15)]">
                      <CheckCircle2 className="w-4 h-4 text-[#D4B8A8]" />
                    </div>
                    <span className="text-base sm:text-lg font-medium text-zinc-200 group-hover:text-white tracking-wide transition-colors duration-300">
                      {feature}
                    </span>
                  </div>
                  <span className="font-serif italic text-xs text-zinc-600 group-hover:text-[#D4B8A8] transition-colors duration-300">
                    0{idx + 1}
                  </span>
                </motion.div>
              ))}
            </div>

            <div className="pt-2">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setIsContactModalOpen(true)}
                className="inline-flex items-center gap-3 bg-gradient-to-r from-[#D4B8A8] to-[#b39575] text-zinc-950 font-semibold px-9 py-4 rounded-full text-sm sm:text-base tracking-wide transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_35px_rgba(212,184,168,0.35)] shadow-[0_8px_24px_rgba(212,184,168,0.2)] cursor-pointer"
              >
                {t("whyus.cta")} <ChevronRight className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* PRODUCTS GALLERY SECTION (Özel Tasarım Ahşap Ürünlerimiz) */}
      <section id="urunler" className="relative px-6 py-24 max-w-7xl mx-auto border-t border-white/5 bg-zinc-950">
        <div className="text-center mb-14">
          <p className="text-[#D4B8A8] text-xs font-bold tracking-[0.25em] uppercase mb-3">
            Özel Koleksiyon • 3mm Ahşap Tasarımlar
          </p>
          <h2 className="font-serif text-4xl md:text-5xl font-medium italic tracking-tight text-white">
            Okul Hatırası Ürünlerimiz
          </h2>
          <p className="text-zinc-400 mt-4 max-w-2xl mx-auto text-sm sm:text-base">
            Çocukların en değerli okul anılarını ölümsüzleştiren, el işçiliği özel tasarım ahşap hatıra ürünlerimiz.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PRODUCTS.map((product) => (
            <div
              key={product.id}
              className="group rounded-xl overflow-hidden bg-zinc-900 border border-white/10 p-3 hover:scale-105 hover:border-[#D4B8A8]/50 hover:shadow-2xl hover:shadow-[#D4B8A8]/15 transition-all duration-300 flex flex-col"
            >
              <div className="relative overflow-hidden rounded-lg aspect-[4/3] bg-zinc-950">
                <img
                  src={product.image}
                  alt={product.title}
                  loading="lazy"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider bg-zinc-950/80 backdrop-blur-md text-[#D4B8A8] border border-white/15">
                  {product.id}
                </span>
              </div>

              <div className="pt-4 pb-2 px-2 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-serif text-lg sm:text-xl font-medium italic text-white group-hover:text-[#D4B8A8] transition-colors">
                    {product.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">{product.subtitle}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#D4B8A8] shrink-0 group-hover:bg-[#D4B8A8] group-hover:text-zinc-950 transition-colors duration-300">
                  <Package className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER & CONTACT (Standard Scroll) */}
      <footer id="iletisim" className="relative border-t border-white/10 bg-zinc-950 pt-24 pb-8 overflow-hidden">
        {/* Ambient Champagne Glow */}
        <div className="absolute top-1/3 left-1/4 w-[480px] h-[480px] bg-[#D4B8A8]/8 blur-[160px] rounded-full pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 mb-24 items-stretch"
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-7"
          >
            <div className="space-y-3">
              <p className="text-[#D4B8A8] text-xs font-bold tracking-[0.25em] uppercase">
                {t("contact.badge")}
              </p>
              <h2 className="font-serif text-4xl md:text-5xl font-medium italic tracking-tight text-white">
                {t("contact.title")}
              </h2>
              <p className="text-zinc-400 leading-relaxed">{t("contact.desc")}</p>
            </div>

            <div className="space-y-4 pt-2">
              <a
                href="tel:05362100021"
                className="group flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/40 backdrop-blur-md border border-white/10 hover:scale-105 hover:border-[#D4B8A8]/50 hover:shadow-2xl hover:shadow-[#D4B8A8]/10 transition-all duration-300"
              >
                <div className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br from-[#D4B8A8]/25 via-[#D4B8A8]/10 to-transparent border border-[#D4B8A8]/35 flex items-center justify-center text-[#D4B8A8] shadow-[0_0_15px_rgba(212,184,168,0.18)] group-hover:scale-110 transition-transform duration-300">
                  <Phone className="w-5 h-5 text-[#D4B8A8]" />
                </div>
                <div>
                  <p className="text-xs text-zinc-400 uppercase tracking-wider">{t("contact.phone")}</p>
                  <p className="font-bold text-white group-hover:text-[#D4B8A8] transition-colors">05362100021</p>
                </div>
              </a>

              <a
                href="mailto:okulcekimleri@gmail.com"
                className="group flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/40 backdrop-blur-md border border-white/10 hover:scale-105 hover:border-[#D4B8A8]/50 hover:shadow-2xl hover:shadow-[#D4B8A8]/10 transition-all duration-300"
              >
                <div className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br from-[#D4B8A8]/25 via-[#D4B8A8]/10 to-transparent border border-[#D4B8A8]/35 flex items-center justify-center text-[#D4B8A8] shadow-[0_0_15px_rgba(212,184,168,0.18)] group-hover:scale-110 transition-transform duration-300">
                  <Mail className="w-5 h-5 text-[#D4B8A8]" />
                </div>
                <div>
                  <p className="text-xs text-zinc-400 uppercase tracking-wider">{t("contact.email")}</p>
                  <p className="font-bold text-white group-hover:text-[#D4B8A8] transition-colors">okulcekimleri@gmail.com</p>
                </div>
              </a>

              <div className="group flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/40 backdrop-blur-md border border-white/10 hover:scale-105 hover:border-[#D4B8A8]/50 hover:shadow-2xl hover:shadow-[#D4B8A8]/10 transition-all duration-300">
                <div className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br from-[#D4B8A8]/25 via-[#D4B8A8]/10 to-transparent border border-[#D4B8A8]/35 flex items-center justify-center text-[#D4B8A8] shadow-[0_0_15px_rgba(212,184,168,0.18)] group-hover:scale-110 transition-transform duration-300">
                  <MapPin className="w-5 h-5 text-[#D4B8A8]" />
                </div>
                <div>
                  <p className="text-xs text-zinc-400 uppercase tracking-wider">{t("contact.address")}</p>
                  <p className="font-bold text-sm text-white leading-snug">
                    TİLMERÇ MH İBRAHİM HAKKI CD TOKİ KAZIM KARABEKİR ORTAOKUL KARŞISI / BATMAN
                  </p>
                </div>
              </div>
            </div>

            {/* Prominent WhatsApp CTA + Social Button */}
            <div className="flex flex-wrap items-center gap-4 pt-3">
              <a
                href="https://wa.me/905362100021"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-3 px-7 py-4 rounded-full bg-gradient-to-r from-emerald-950/90 via-emerald-900/75 to-zinc-900/90 hover:from-emerald-800/90 hover:to-emerald-700/80 border border-[#D4B8A8]/50 hover:border-[#D4B8A8] text-white font-semibold text-sm tracking-wide shadow-[0_10px_30px_rgba(16,185,129,0.2)] hover:shadow-[0_12px_35px_rgba(212,184,168,0.28)] hover:scale-105 transition-all duration-300"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5 text-emerald-400 shrink-0"
                  aria-hidden="true"
                >
                  <path d="M20.52 3.48A11.82 11.82 0 0 0 12.06 0C5.5 0 .16 5.34.16 11.9c0 2.1.55 4.15 1.6 5.95L0 24l6.33-1.66a11.87 11.87 0 0 0 5.73 1.46h.01c6.55 0 11.89-5.34 11.89-11.9 0-3.18-1.24-6.17-3.44-8.42ZM12.07 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.75.98 1-3.66-.24-.37a9.85 9.85 0 0 1-1.52-5.26c0-5.45 4.44-9.89 9.9-9.89 2.64 0 5.13 1.03 7 2.9a9.83 9.83 0 0 1 2.9 7c0 5.45-4.44 9.89-9.89 9.89Zm5.43-7.41c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.21-.24-.58-.48-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z" />
                </svg>
                <span>WhatsApp ile İletişime Geçin</span>
              </a>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-12 h-12 rounded-full bg-zinc-900/40 backdrop-blur-md border border-white/10 flex items-center justify-center transition-all duration-300 hover:scale-105 hover:border-[#D4B8A8]/50 hover:text-[#D4B8A8] hover:shadow-2xl hover:shadow-[#D4B8A8]/10 cursor-pointer"
              >
                <Instagram className="w-4 h-4 text-[#D4B8A8]" />
              </motion.button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="bg-zinc-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-3 relative min-h-[420px] flex items-end overflow-hidden transition-all duration-300 hover:border-[#D4B8A8]/50 hover:shadow-2xl hover:shadow-[#D4B8A8]/10"
          >
            <iframe
              src="https://maps.google.com/maps?q=Tilmer%C3%A7%20Mh%20%C4%B0brahim%20Hakk%C4%B1%20Cd%20Batman%20Kaz%C4%B1m%20Karabekir%20Ortaokulu&t=&z=15&ie=UTF8&iwloc=&output=embed"
              className="absolute inset-0 w-full h-full rounded-2xl border-0 filter invert hue-rotate-180 brightness-75 contrast-85 opacity-85 hover:opacity-100 transition-opacity duration-300"
              style={{ filter: "invert(90%) hue-rotate(180deg) brightness(78%) contrast(88%)" }}
              allowFullScreen
              loading="lazy"
              title="Albumevi Batman Studio Location"
            />

            <div className="relative z-10 bg-zinc-950/90 backdrop-blur-xl border border-white/15 p-4 rounded-xl w-full flex items-center justify-between shadow-2xl">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#D4B8A8]/15 border border-[#D4B8A8]/30 rounded-full flex items-center justify-center text-[#D4B8A8]">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-white">{t("contact.map.title")}</p>
                  <p className="text-xs text-zinc-400">{t("contact.map.subtitle")}</p>
                </div>
              </div>
              <a
                href="https://maps.google.com/?q=Tilmer%C3%A7%20Mh%20%C4%B0brahim%20Hakk%C4%B1%20Cd%20Batman%20Kaz%C4%B1m%20Karabekir%20Ortaokulu"
                target="_blank"
                rel="noreferrer"
                className="text-[#D4B8A8] text-sm font-medium flex items-center gap-1 hover:text-white transition-colors duration-300 cursor-pointer"
              >
                {t("contact.map.cta")} <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </motion.div>
        </motion.div>

        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between border-t border-white/5 pt-8 text-sm text-gray-500">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <img src="/logo-light.png" alt="Albumevi Logo" className="h-12 md:h-16 w-auto object-contain" />
          </div>
          <p>© 2024 Albumevi Fotoğrafçılık A.Ş. Tüm hakları saklıdır.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-[#D4B8A8] transition-colors">
              Gizlilik
            </a>
            <a href="#" className="hover:text-[#D4B8A8] transition-colors">
              Şartlar
            </a>
            <a href="#" className="hover:text-[#D4B8A8] transition-colors">
              KVKK
            </a>
          </div>
        </div>
      </footer>
      <AnimatePresence>
        {isContactModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
            onClick={() => setIsContactModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-950/90 backdrop-blur-xl border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden relative shadow-2xl"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
                <h3 className="font-serif text-xl font-medium italic text-[#D4B8A8]">
                  İletişim Bilgileri
                </h3>
                <button
                  onClick={() => setIsContactModalOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors p-1"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-8">
                {/* CEO Section */}
                <div className="flex flex-col items-center justify-center text-center bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10 relative overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:border-[#D4B8A8]/50 hover:shadow-2xl hover:shadow-[#D4B8A8]/10">
                  <div className="absolute inset-0 bg-gradient-to-b from-[#D4B8A8]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="w-28 h-28 rounded-full p-1 border-2 border-[#D4B8A8]/60 mb-5 relative z-10 shadow-lg shadow-[#D4B8A8]/10 group-hover:border-[#D4B8A8] transition-colors duration-300">
                    <img
                      src="/pic4.jpg"
                      alt="Amine Himmich"
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>

                  <div className="relative z-10 space-y-2 flex flex-col items-center">
                    <h4 className="font-serif text-2xl font-medium italic text-white">
                      Amine Himmich
                    </h4>
                    <p className="text-[#D4B8A8] text-xs font-bold tracking-widest uppercase">
                      Kurucu & Baş Fotoğrafçı
                    </p>

                    <div className="pt-3 w-full">
                      <a
                        href="https://wa.me/905551234567"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#D4B8A8] to-[#b39575] text-zinc-950 font-medium px-6 py-3 rounded-full text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#D4B8A8]/25 w-full sm:w-auto"
                      >
                        <Phone className="w-4 h-4" />
                        +90 555 123 4567
                      </a>
                    </div>
                  </div>
                </div>

                {/* Photographers Section */}
                <div>
                  <h4 className="text-sm font-bold tracking-widest uppercase text-zinc-400 mb-4 border-b border-white/10 pb-2">
                    Çekimciler Ekibimiz
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {dynamicPhotographers.map((photographer: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 flex items-center gap-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#D4B8A8]/50 hover:shadow-2xl hover:shadow-[#D4B8A8]/10"
                      >
                        <div className="w-12 h-12 rounded-full overflow-hidden shrink-0">
                          <img
                            src={photographer.img ? getR2PublicUrl(photographer.img) : photographer.image_url ? getR2PublicUrl(photographer.image_url) : ""}
                            alt={photographer.full_name || photographer.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-white">{photographer.full_name || photographer.name}</p>
                          <a
                            href={`https://wa.me/${(photographer.phone || "").replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-[#D4B8A8] transition-colors mt-1"
                          >
                            <Phone className="w-3 h-3" />
                            {photographer.phone || "Telefon Yok"}
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
