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

const PROCESS_STEPS = [
  {
    icon: Calendar,
    title: "Planlama",
    desc: "Okul yönetimiyle görüşüp, öğrencilere sunulacak ürün paketlerini ve çekim gününü netleştiriyoruz.",
  },
  {
    icon: Camera,
    title: "Çekim Günü",
    desc: "Profesyonel ekipmanlarımızla, çocukları yormadan eğlenceli bir çekim gerçekleştiriyoruz.",
  },
  {
    icon: Users,
    title: "Sipariş ve Öğrenci Seçimi",
    desc: "Öğretmenlerimiz, sistemimiz üzerinden hangi öğrencilerin ürün/paket alacağını seçerek sipariş listelerini oluşturur.",
  },
  {
    icon: Package,
    title: "Teslimat",
    desc: "Yüksek kaliteli ürünler özenle hazırlanıyor ve zamanında okula teslim ediliyor.",
  },
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
  const [displayedText1, setDisplayedText1] = useState("");
  const [displayedText2, setDisplayedText2] = useState("");
  const [isTyping1, setIsTyping1] = useState(true);

  useEffect(() => {
    let i = 0;
    setDisplayedText1("");
    setIsTyping1(true);
    const intervalId = setInterval(() => {
      setDisplayedText1(text1.slice(0, i + 1));
      i++;
      if (i >= text1.length) {
        clearInterval(intervalId);
        setIsTyping1(false);
      }
    }, 110); // Typing speed
    return () => clearInterval(intervalId);
  }, [text1]);

  useEffect(() => {
    if (isTyping1) return;
    let i = 0;
    setDisplayedText2("");
    const intervalId = setInterval(() => {
      setDisplayedText2(text2.slice(0, i + 1));
      i++;
      if (i >= text2.length) {
        clearInterval(intervalId);
      }
    }, 110);
    return () => clearInterval(intervalId);
  }, [text2, isTyping1]);

  return (
    <motion.h1
      variants={heroItemVariants}
      className="font-serif text-4xl sm:text-5xl lg:text-[3.35rem] font-semibold italic leading-[1.12] tracking-tight text-white max-w-md"
    >
      {displayedText1}
      {isTyping1 && <span className="animate-pulse">|</span>}
      <br />
      <span className="text-[#D4B8A8] font-normal">
        {displayedText2}
        {!isTyping1 && displayedText2.length < text2.length && (
          <span className="animate-pulse text-white">|</span>
        )}
      </span>
    </motion.h1>
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

        <motion.main
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 mx-auto max-w-[1440px] px-6 lg:px-12 w-full"
        >
          <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8">
            {/* Editorial Typography Column */}
            <motion.div
              variants={heroContainerVariants}
              initial="hidden"
              animate="visible"
              className="w-full max-w-md space-y-6 text-left shrink-0"
            >
              <TypewriterHeadline text1={t("hero.title1")} text2={t("hero.title2")} />

              <motion.p
                variants={heroItemVariants}
                className="text-base md:text-lg text-zinc-300/90 max-w-md leading-relaxed font-light"
              >
                {t("hero.subtitle")}
              </motion.p>

              <motion.div variants={heroItemVariants} className="pt-2">
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
              </motion.div>
            </motion.div>

            {/* Right Side Floating Editorial Glass Showcase */}
            <motion.div
              variants={heroImageVariants}
              initial="hidden"
              animate="visible"
              className="ml-auto flex items-end justify-end gap-3.5 lg:translate-x-4 shrink-0"
            >
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
            </motion.div>
          </div>
        </motion.main>
      </div>

      {/* SERVICES GRID SECTION - Editorial & Glassmorphism */}
      <section id="hizmetler" className="relative bg-zinc-950 py-24 md:py-32 overflow-visible">
        {/* Ambient Luxury Glow */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[480px] h-[480px] bg-[#D4B8A8]/10 blur-[150px] rounded-full pointer-events-none" />

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
                <p className="text-[#D4B8A8] text-xs font-bold tracking-[0.25em] uppercase">
                  {t("services.badge")}
                </p>
                <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-medium italic leading-[1.18] tracking-tight text-white">
                  Premium Fotoğraf Deneyimi
                </h2>
                <p className="text-zinc-400 leading-relaxed text-sm sm:text-base">
                  {t("services.subtitle")}
                </p>
              </div>

              {/* Large Left Vertical Editorial Image */}
              <div className="group relative rounded-2xl w-full overflow-hidden bg-zinc-900/40 backdrop-blur-xl border border-white/10 p-2.5 shadow-2xl shadow-[#D4B8A8]/20 hover:border-[#D4B8A8]/40 transition-all duration-300">
                <div className="overflow-hidden rounded-2xl relative aspect-[4/5] w-full">
                  <img
                    src="/hizmet.jpg"
                    alt="Premium Fotoğraf Deneyimi"
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/85 via-zinc-950/15 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-zinc-200 bg-zinc-900/60 backdrop-blur-xl border border-white/10 px-4 py-3 rounded-xl shadow-lg">
                    <span className="font-medium tracking-wide">Gerçek Stüdyo & Okul Çekimlerimiz</span>
                    <span className="text-[#D4B8A8] font-semibold tracking-wider uppercase text-[11px]">
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
                },
                {
                  icon: Users,
                  title: t("services.card2.title"),
                  desc: t("services.card2.desc"),
                },
                {
                  icon: Clock,
                  title: t("services.card3.title"),
                  desc: t("services.card3.desc"),
                },
                {
                  icon: Award,
                  title: t("services.card4.title"),
                  desc: t("services.card4.desc"),
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
                    className="group relative bg-zinc-900/40 backdrop-blur-xl p-8 rounded-2xl border border-white/10 hover:border-[#D4B8A8]/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#D4B8A8]/10 flex flex-col justify-between min-h-[260px] overflow-visible"
                  >
                    <div>
                      <div className="w-12 h-12 shrink-0 bg-[#D4B8A8]/10 border border-[#D4B8A8]/30 rounded-xl flex items-center justify-center text-[#D4B8A8] mb-6 group-hover:scale-110 group-hover:bg-[#D4B8A8]/20 transition-all duration-300 shadow-lg shadow-[#D4B8A8]/10">
                        <ServiceIcon className="w-5 h-5 text-[#D4B8A8]" />
                      </div>
                      <h3 className="font-serif text-xl sm:text-2xl font-medium italic leading-snug mb-3 text-white group-hover:text-[#D4B8A8] transition-colors duration-300">
                        {service.title}
                      </h3>
                    </div>
                    <p className="text-zinc-400 text-sm leading-relaxed">{service.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </section>

      {/* PHOTOGRAPHERS SECTION */}
      <section id="cekimciler" className="px-6 py-24 max-w-7xl mx-auto bg-zinc-950">
        <div className="text-center mb-16">
          <p className="text-[#D4B8A8] text-xs font-bold tracking-[0.25em] uppercase mb-3">
            Ekibimiz
          </p>
          <h2 className="font-serif text-4xl md:text-5xl font-medium italic tracking-tight text-white">
            Çekimcilerimiz
          </h2>
          <p className="text-zinc-400 mt-4 max-w-2xl mx-auto">
            Anılarınızı ölümsüzleştiren yetenekli profesyonel fotoğrafçılarımız.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 justify-center items-stretch max-w-7xl mx-auto">
          {dynamicPhotographers.map((photographer: any, idx: number) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              className="flex flex-col items-center text-center group bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#D4B8A8]/50 hover:shadow-2xl hover:shadow-[#D4B8A8]/10"
            >
              <div className="w-44 h-44 rounded-full border-2 border-[#D4B8A8]/60 overflow-hidden mb-5 relative shadow-lg shadow-[#D4B8A8]/10 group-hover:shadow-[#D4B8A8]/30 transition-shadow duration-300 p-1">
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

              <h3 className="text-xl font-bold text-white mt-1">
                {photographer.full_name || photographer.name}
              </h3>
              <p className="text-[#D4B8A8] text-xs font-bold tracking-widest uppercase mt-2 mb-5">
                {photographer.role || photographer.title}
              </p>

              <a
                href={`https://wa.me/${(photographer.phone || "").replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="mt-auto flex items-center justify-center gap-2 bg-white/5 backdrop-blur-md hover:bg-gradient-to-r hover:from-[#D4B8A8] hover:to-[#b39575] text-white hover:text-zinc-950 py-2.5 px-6 rounded-full border border-white/10 hover:border-transparent transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#D4B8A8]/20 w-full font-medium"
              >
                <Phone className="w-4 h-4" />
                <span className="font-medium text-sm">{photographer.phone}</span>
              </a>
            </motion.div>
          ))}
        </div>
      </section>

      {/* EDITORIAL MASONRY GALLERY SECTION */}
      <section id="galeri" className="px-6 py-24 max-w-7xl mx-auto bg-zinc-950">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
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
            ürünlerimizdir; doğal kadrajlarıyla sergilenmektedir.
          </p>
        </div>

        {/* True Masonry Layout preserving natural vertical & horizontal aspect ratios */}
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6 w-full max-w-7xl mx-auto">
          {dynamicPortfolio.map((item: any) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6 }}
              className="break-inside-avoid relative rounded-3xl overflow-hidden cursor-pointer group bg-white/5 backdrop-blur-md border border-white/10 p-2 transition-all duration-300 hover:-translate-y-1 hover:border-[#D4B8A8]/50 hover:shadow-2xl hover:shadow-[#D4B8A8]/10"
            >
              <div className="relative overflow-hidden rounded-2xl">
                <img
                  src={item.image_url ? getR2PublicUrl(item.image_url) : ""}
                  alt={item.alt || item.title || "Portfolyo Görseli"}
                  loading="lazy"
                  className="w-full h-auto block object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none flex items-end p-5">
                  <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl px-4 py-2 text-xs text-white font-medium tracking-wider uppercase">
                    {item.title || "Albümevi Koleksiyonu"}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
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
                    className="w-full ml-16 md:ml-0 md:w-[45%] relative group rounded-3xl overflow-hidden bg-white/5 backdrop-blur-md border border-white/10 transition-all duration-300 hover:-translate-y-1 hover:border-[#D4B8A8]/50 hover:shadow-2xl hover:shadow-[#D4B8A8]/10"
                  >
                    {/* Giant Number */}
                    <div
                      className={`absolute -top-4 ${isEven ? "-right-4" : "-left-4"} text-9xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white/10 to-transparent pointer-events-none z-10 select-none`}
                    >
                      {idx + 1}
                    </div>

                    {/* Content */}
                    <div className="relative z-20 p-8 sm:p-12 pl-12 md:pl-12">
                      <div className="w-14 h-14 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-[#D4B8A8] mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <Icon className="w-7 h-7" />
                      </div>
                      <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-[#D4B8A8] transition-colors duration-300">
                        {step.title}
                      </h3>
                      <p className="text-zinc-400 leading-relaxed text-sm sm:text-base">
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

      {/* WHY US SECTION (Editorial Frame + Glassmorphism) */}
      <motion.section
        id="hakkimizda"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="px-6 py-24 max-w-7xl mx-auto bg-zinc-950"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative group"
          >
            <div className="rounded-3xl w-full overflow-hidden bg-white/5 backdrop-blur-md border border-white/10 p-2.5 transition-all duration-300 hover:-translate-y-1 hover:border-[#D4B8A8]/50 hover:shadow-2xl hover:shadow-[#D4B8A8]/10">
              <div className="overflow-hidden rounded-2xl relative">
                <img
                  src="/pic5.jpg"
                  alt="Happy student"
                  className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/20 to-transparent" />
              </div>
            </div>
            <div className="absolute bottom-6 left-6 right-6 bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 transition-all duration-300 hover:-translate-y-1 hover:border-[#D4B8A8]/50 hover:shadow-2xl hover:shadow-[#D4B8A8]/10">
              <p className="text-xs uppercase tracking-widest text-[#D4B8A8] mb-1.5">
                Okul Müdürü, Batman
              </p>
              <p className="text-white font-medium mb-3">{t("whyus.testimonial.text")}</p>
              <div className="flex text-[#D4B8A8] text-xs">★★★★★</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-8"
          >
            <p className="text-[#D4B8A8] text-xs font-bold tracking-[0.25em] uppercase">
              {t("whyus.badge")}
            </p>
            <h2 className="font-serif text-4xl md:text-5xl font-medium italic leading-tight tracking-tight text-white">
              {t("whyus.title")}
            </h2>
            <p className="text-zinc-400 leading-relaxed">{t("whyus.desc")}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                t("whyus.feature1"),
                t("whyus.feature2"),
                t("whyus.feature3"),
                t("whyus.feature4"),
                t("whyus.feature5"),
                t("whyus.feature6"),
              ].map((feature, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 transition-all duration-300 hover:-translate-y-1 hover:border-[#D4B8A8]/50 hover:shadow-2xl hover:shadow-[#D4B8A8]/10"
                >
                  <CheckCircle2 className="w-5 h-5 text-[#D4B8A8] shrink-0" />
                  <span className="text-sm font-medium">{feature}</span>
                </div>
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsContactModalOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-[#D4B8A8] to-[#b39575] text-zinc-950 font-medium px-8 py-3.5 rounded-full transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#D4B8A8]/30 shadow-[0_8px_24px_rgba(212,184,168,0.2)] mt-4 cursor-pointer"
            >
              {t("whyus.cta")} <ChevronRight className="w-4 h-4" />
            </motion.button>
          </motion.div>
        </div>
      </motion.section>

      {/* SEO SECTION */}
      <section className="px-6 py-12 max-w-7xl mx-auto border-t border-white/5 bg-zinc-950">
        <div className="text-sm text-zinc-500 leading-relaxed max-w-5xl mx-auto text-center">
          <h2 className="font-serif text-lg text-[#D4B8A8] font-medium italic mb-3">
            Profesyonel Okul Fotoğrafçılığı ve Mezuniyet Albümleri
          </h2>
          <p className="mb-4">
            ALBÜMEVİ olarak <strong>Batman, Diyarbakır, Mardin, Siirt</strong> ve <strong>Şırnak</strong> genelinde anaokulu, anasınıfı ve ilkokul öğrencileri için profesyonel <strong>mezuniyet ve hatıra fotoğraf çekimi</strong> hizmetleri sunmaktayız. Stüdyo kalitesindeki ekipmanlarımızla okul ortamında gerçekleştirdiğimiz çekimlerde, çocukların en doğal anlarını ölümsüzleştiriyoruz.
          </p>
          <p className="mb-4">
            Geniş ürün yelpazemiz; yüksek kaliteli <strong>Panoramik Albüm</strong>, el işçiliği <strong>Ahşap Albüm</strong>, özel tasarım <strong>Kumbara</strong> ve <strong>Çerçeve</strong> ile <strong>Kep ve Cübbe çekimleri</strong> gibi kalıcı hatıra seçeneklerini içermektedir. Velilere teslim edilecek tüm ürünler, laboratuvarımızda en ince detayına kadar düzenlenip basılır.
          </p>
          <p>
            <strong>Öğretmenlere Özel Online Portal:</strong> Geliştirdiğimiz yenilikçi Öğretmen Portalı sayesinde fotoğraf seçim süreci tamamen dijitalleşmiştir. Öğretmenler; öğrencilerin çekilen fotoğraflarını online sistem üzerinden kolayca seçebilir, her bir öğrenci veya sınıf için özel notlar ekleyebilir ve toplam sipariş adetlerini anlık olarak kolayca takip edebilirler. Bu sistem, okul idaresinin ve öğretmenlerin iş yükünü tamamen ortadan kaldırır.
          </p>
        </div>
      </section>

      {/* FOOTER & CONTACT (Standard Scroll) */}
      <footer id="iletisim" className="border-t border-white/10 bg-zinc-950 pt-24 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 mb-24"
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-8"
          >
            <p className="text-[#D4B8A8] text-xs font-bold tracking-[0.25em] uppercase">
              {t("contact.badge")}
            </p>
            <h2 className="font-serif text-4xl md:text-5xl font-medium italic tracking-tight text-white">
              {t("contact.title")}
            </h2>
            <p className="text-zinc-400">{t("contact.desc")}</p>

            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 transition-all duration-300 hover:-translate-y-1 hover:border-[#D4B8A8]/50 hover:shadow-2xl hover:shadow-[#D4B8A8]/10">
                <div className="w-12 h-12 shrink-0 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-[#D4B8A8]">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-zinc-400">{t("contact.phone")}</p>
                  <p className="font-bold">05362100021</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 transition-all duration-300 hover:-translate-y-1 hover:border-[#D4B8A8]/50 hover:shadow-2xl hover:shadow-[#D4B8A8]/10">
                <div className="w-12 h-12 shrink-0 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-[#D4B8A8]">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-zinc-400">{t("contact.email")}</p>
                  <p className="font-bold">okulcekimleri@gmail.com</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 transition-all duration-300 hover:-translate-y-1 hover:border-[#D4B8A8]/50 hover:shadow-2xl hover:shadow-[#D4B8A8]/10">
                <div className="w-12 h-12 shrink-0 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-[#D4B8A8]">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-zinc-400">{t("contact.address")}</p>
                  <p className="font-bold text-sm">
                    TİLMERÇ MH İBRAHİM HAKKI CD TOKİ KAZIM KARABEKİR ORTAOKUL KARŞISI / BATMAN
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-11 h-11 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center transition-all duration-300 hover:-translate-y-1 hover:border-[#D4B8A8]/50 hover:text-[#D4B8A8] hover:shadow-2xl hover:shadow-[#D4B8A8]/10 cursor-pointer"
              >
                <Instagram className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-4 relative min-h-[400px] flex items-end overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-[#D4B8A8]/50 hover:shadow-2xl hover:shadow-[#D4B8A8]/10"
          >
            <iframe
              src="https://maps.google.com/maps?q=Tilmer%C3%A7%20Mh%20%C4%B0brahim%20Hakk%C4%B1%20Cd%20Batman%20Kaz%C4%B1m%20Karabekir%20Ortaokulu&t=&z=15&ie=UTF8&iwloc=&output=embed"
              className="absolute inset-0 w-full h-full rounded-3xl border-0 opacity-80 hover:opacity-100 transition-opacity"
              allowFullScreen
              loading="lazy"
              title="Albumevi Batman Studio Location"
            />

            <div className="relative z-10 bg-zinc-950/85 backdrop-blur-md border border-white/10 p-4 rounded-2xl w-full flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#D4B8A8]/15 rounded-full flex items-center justify-center text-[#D4B8A8]">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">{t("contact.map.title")}</p>
                  <p className="text-xs text-zinc-400">{t("contact.map.subtitle")}</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="text-[#D4B8A8] text-sm font-medium flex items-center gap-1 hover:text-white transition-colors duration-300 cursor-pointer"
              >
                {t("contact.map.cta")} <ChevronRight className="w-4 h-4" />
              </motion.button>
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
