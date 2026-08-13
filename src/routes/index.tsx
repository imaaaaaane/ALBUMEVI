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

const PHOTOGRAPHERS = [
  {
    name: "Ahmet Yılmaz",
    role: "Fotoğrafçı",
    phone: "+90 555 123 4567",
    img: "https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?q=80&w=600&auto=format&fit=crop",
  },
  {
    name: "Elif Demir",
    role: "Fotoğrafçı",
    phone: "+90 555 987 6543",
    img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=600&auto=format&fit=crop",
  },
  {
    name: "Can Kaya",
    role: "Fotoğrafçı",
    phone: "+90 555 456 7890",
    img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=600&auto=format&fit=crop",
  },
  {
    name: "Ayşe Yılmaz",
    role: "Fotoğrafçı",
    phone: "+90 555 222 3344",
    img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop",
  },
];

const GALLERY_ITEMS = [
  { id: 1, src: "/portfolyo/portfolya1.jpg", alt: "Albumevi Portfolyo 1" },
  { id: 2, src: "/portfolyo/portfolya2.jpg", alt: "Albumevi Portfolyo 2" },
  { id: 3, src: "/portfolyo/portfolya3.jpg", alt: "Albumevi Portfolyo 3" },
  { id: 4, src: "/portfolyo/portfolya4.jpg", alt: "Albumevi Portfolyo 4" },
  { id: 5, src: "/portfolyo/portfolya5.jpg", alt: "Albumevi Portfolyo 5" }
];

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
    a: "Evet, tüm mezuniyet kıyafetleri ve konsept aksesuarları ekibimiz tarafından okunuza getirilir."
  },
  {
    q: "Çekimler okulu aksatır mı?",
    a: "Kesinlikle hayır. Programı ders saatlerine en uygun şekilde yapıyor ve hızlı, organize bir çekim sağlıyoruz."
  },
  {
    q: "Veliler fotoğraf seçimi yapıyor mu?",
    a: "Hayır, süreç okulu yormamak adına çok pratik ilerler. Fotoğraf seçimi karmaşası yaşanmaz; öğretmenlerimiz sistem üzerinden sadece ürün alacak öğrencileri belirler ve sipariş listesini onaylar."
  },
  {
    q: "Ürünler ne kadar sürede teslim ediliyor?",
    a: "Çekimler ve siparişler tamamlandıktan sonra, premium ürünlerimiz 2-3 hafta içerisinde özenle hazırlanıp okula teslim edilir."
  }
];

const MotionLink = motion(Link);

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
      className="min-h-screen bg-[#0A0A0A] text-white selection:bg-[#D0A36D]/30 font-sans"
    >
      {/* HEADER: Floating transparent minimalist header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0A0A0A]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.jpg" alt="Albumevi Logo" className="h-8 md:h-12 w-auto object-contain" />
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm text-gray-300 font-medium">
            <a href="#hizmetler" className="hover:text-white transition-colors">
              {t("nav.services")}
            </a>
            <a href="#surec" className="hover:text-white transition-colors">
              {t("nav.process")}
            </a>
            <a href="#cekimciler" className="hover:text-white transition-colors">
              Çekimciler
            </a>
            <a href="#galeri" className="hover:text-white transition-colors">
              {t("nav.gallery")}
            </a>
            <a href="#sss" className="hover:text-white transition-colors">
              SSS
            </a>
            <a href="#hakkimizda" className="hover:text-white transition-colors">
              {t("nav.about")}
            </a>
            <a href="#iletisim" className="hover:text-white transition-colors">
              {t("nav.contact")}
            </a>
          </div>

          <div className="flex items-center gap-3">
            <MotionLink
              to="/admin-login"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 text-sm font-medium border border-white/10 rounded-full hover:border-[#D0A36D] hover:text-[#D0A36D] transition-all text-white"
            >
              {t("cta.adminLogin")}
            </MotionLink>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <div className="relative pt-24 min-h-screen flex items-center justify-center overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#D0A36D]/10 blur-[120px] rounded-full pointer-events-none" />
        
        <motion.main
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mx-auto max-w-7xl px-6 py-20 w-full"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left side text */}
            <motion.div
              variants={heroContainerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-8"
            >
              <motion.h1
                variants={heroItemVariants}
                className="text-5xl md:text-7xl font-extrabold leading-[1.1] tracking-tight"
              >
                {t("hero.title1")} <br />
                <span className="text-[#D0A36D]">{t("hero.title2")}</span>
              </motion.h1>
              <motion.p
                variants={heroItemVariants}
                className="text-lg text-gray-400 max-w-lg leading-relaxed"
              >
                {t("hero.subtitle")}
              </motion.p>

              <motion.div
                variants={heroItemVariants}
                className="flex items-center gap-3 pt-4 border-t border-white/5 w-max pr-8"
              >
                <div className="flex gap-1 text-yellow-500">
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                </div>
                <p className="text-sm text-gray-400">
                  500+ okul memnuniyetle hizmet aldı
                </p>
              </motion.div>

              <motion.div
                variants={heroItemVariants}
                className="pt-6"
              >
                <a
                  href="#galeri"
                  className="inline-flex items-center gap-2 bg-[#D0A36D] hover:bg-[#E2B67C] text-black px-8 py-3 rounded-full font-semibold transition-all hover:scale-105"
                >
                  Portfolyoyu İncele <ArrowRight className="w-5 h-5" />
                </a>
              </motion.div>
            </motion.div>

            {/* Right side Images Layout */}
            <motion.div
              variants={heroImageVariants}
              initial="hidden"
              animate="visible"
              className="relative"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-gray-900 border border-white/5 h-[450px] w-full overflow-hidden">
                  <img
                    src="/pic1.jpg"
                    alt="Portrait"
                    className="object-cover h-full w-full opacity-80"
                  />
                </div>
                <div className="space-y-4">
                  <div className="bg-[#111111] border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="flex text-[#D0A36D] text-sm">★★★★★</div>
                      <p className="text-xl font-bold mt-1">4.9</p>
                      <p className="text-xs text-gray-400">{t("hero.ratingAvg")}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-gray-900 border border-white/5 h-[200px] w-full overflow-hidden">
                    <img
                      src="/pic2.jpg"
                      alt="Kids"
                      className="object-cover h-full w-full opacity-80"
                    />
                  </div>
                  <div className="rounded-2xl bg-gray-900 border border-white/5 h-[180px] w-full overflow-hidden">
                    <img
                      src="/pic3.jpg"
                      alt="Boy"
                      className="object-cover h-full w-full opacity-80"
                    />
                  </div>
                </div>
              </div>

            </motion.div>
          </div>
        </motion.main>
      </div>

      {/* FOUNDER / PROFILE SECTION */}
      <section className="px-6 py-24 max-w-7xl mx-auto bg-[#0A0A0A] flex flex-col items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative group max-w-md mx-auto"
        >
          <div className="w-48 h-48 md:w-56 md:h-56 rounded-full p-1.5 border border-white/10 group-hover:border-[#D0A36D]/50 transition-colors duration-500 mx-auto overflow-hidden">
            <img 
              src="/pic4.jpg" 
              alt="Amine Himmich"
              className="w-full h-full object-cover rounded-full filter grayscale group-hover:grayscale-0 transition-all duration-700"
            />
          </div>
          
          <div className="mt-8 space-y-3">
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl md:text-4xl font-extrabold text-white"
            >
              Amine Himmich
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-[#D0A36D] text-sm md:text-base font-bold tracking-widest uppercase"
            >
              Kurucu & Baş Fotoğrafçı
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-center pt-4"
            >
              <a href="tel:+905551234567" className="flex items-center justify-center gap-2 bg-white/5 hover:bg-[#D0A36D] text-gray-300 hover:text-black transition-colors px-6 py-3 rounded-full border border-white/10 w-full sm:w-auto">
                <Phone className="w-5 h-5" />
                <span className="font-semibold">+90 555 123 4567</span>
              </a>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* SERVICES GRID SECTION - Katana Animation */}
      <div
        id="hizmetler"
        ref={servicesContainerRef}
        className="katana-container katana-container-services"
      >
        <div className="katana-sticky">
          <div className="katana-mask flex items-center justify-center bg-[#0D0D0D]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="mx-auto max-w-7xl px-6 py-24 w-full"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="lg:col-span-5 space-y-6"
                >
                  <p className="text-[#D0A36D] text-sm font-bold tracking-widest uppercase">
                    {t("services.badge")}
                  </p>
                  <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                    {t("services.title")}
                  </h2>
                  <p className="text-gray-400 leading-relaxed">{t("services.subtitle")}</p>
                  <div className="rounded-3xl mt-8 w-full h-[400px] overflow-hidden border border-white/5">
                    <img
                      src="/pic6.jpg"
                      alt="Photographer"
                      className="object-cover w-full h-full opacity-80"
                    />
                  </div>
                </motion.div>

                <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4 pt-12">
                  {[
                    {
                      icon: <Camera />,
                      title: t("services.card1.title"),
                      desc: t("services.card1.desc"),
                    },
                    {
                      icon: <Users />,
                      title: t("services.card2.title"),
                      desc: t("services.card2.desc"),
                    },
                    {
                      icon: <Clock />,
                      title: t("services.card3.title"),
                      desc: t("services.card3.desc"),
                    },
                    {
                      icon: <Award />,
                      title: t("services.card4.title"),
                      desc: t("services.card4.desc"),
                    },
                  ].map((service, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 30, scale: 0.95 }}
                      whileInView={{ opacity: 1, y: 0, scale: 1 }}
                      viewport={{ once: true, margin: "-100px" }}
                      transition={{ duration: 0.6, ease: "easeOut", delay: idx * 0.1 }}
                      className="bg-[#111111] p-8 rounded-3xl border border-white/5 hover:border-[#D0A36D]/30 transition-colors"
                    >
                      <div className="w-12 h-12 bg-[#D0A36D]/10 rounded-xl flex items-center justify-center text-[#D0A36D] mb-6">
                        {service.icon}
                      </div>
                      <h3 className="text-xl font-bold mb-3">{service.title}</h3>
                      <p className="text-gray-400 text-sm leading-relaxed">{service.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>


      {/* PHOTOGRAPHERS SECTION */}
      <section id="cekimciler" className="px-6 py-24 max-w-7xl mx-auto bg-[#0A0A0A]">
        <div className="text-center mb-16">
          <p className="text-[#D0A36D] text-sm font-bold tracking-widest uppercase mb-3">
            Ekibimiz
          </p>
          <h2 className="text-4xl md:text-5xl font-bold">Çekimcilerimiz</h2>
          <p className="text-gray-400 mt-4 max-w-2xl mx-auto">
            Anılarınızı ölümsüzleştiren yetenekli profesyonel fotoğrafçılarımız.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {(dynamicPhotographers.length > 0 ? dynamicPhotographers : PHOTOGRAPHERS).map((photographer: any, idx: number) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              className="bg-[#111111] rounded-3xl overflow-hidden border border-white/5 hover:border-[#D0A36D]/30 transition-all group"
            >
              <div className="aspect-[4/5] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-[#111111] to-transparent z-10" />
                <img
                  src={photographer.img}
                  alt={photographer.name}
                  className="object-cover w-full h-full opacity-80 group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute bottom-6 left-6 right-6 z-20">
                  <h3 className="text-2xl font-bold text-white mb-1">{photographer.name}</h3>
                  <p className="text-[#D0A36D] text-sm font-medium mb-4">{photographer.role}</p>
                  <a
                    href={`https://wa.me/${photographer.phone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-white/10 hover:bg-[#D0A36D] text-white py-3 rounded-xl backdrop-blur-md transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    <span className="font-medium text-sm">{photographer.phone}</span>
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* GALLERY SECTION */}
      <section id="galeri" className="px-6 py-24 max-w-7xl mx-auto bg-[#0A0A0A]">
        <div className="text-center mb-12">
          <p className="text-[#D0A36D] text-sm font-bold tracking-widest uppercase mb-3">
            Portfolyo
          </p>
          <h2 className="text-4xl md:text-5xl font-bold">Unutulmaz Anılar</h2>
          <p className="text-gray-400 mt-4 max-w-2xl mx-auto">
            Objektifimizden yansıyan en özel anlar. Çocukların doğal gülümsemeleri ve profesyonel stüdyo kalitemiz.
          </p>
        </div>

        {/* Image Grid */}
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4">
          {(dynamicPortfolio.length > 0 ? dynamicPortfolio : GALLERY_ITEMS).map((item: any, i: number) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5 }}
              className="group relative rounded-xl overflow-hidden bg-gray-900 border border-white/5 break-inside-avoid mb-4"
            >
              <img
                src={item.image_url || item.src}
                alt={item.alt || "Portfolyo Görseli"}
                className="w-full h-auto object-cover rounded-lg group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-lg" />
            </motion.div>
          ))}
        </div>
      </section>

      {/* PROCESS SECTION */}
      <section id="surec" className="px-6 py-24 max-w-7xl mx-auto relative">
        <div className="text-center mb-24 relative z-10">
          <p className="text-[#D0A36D] text-sm font-bold tracking-widest uppercase mb-3">
            Süreç
          </p>
          <h2 className="text-4xl md:text-5xl font-bold">Nasıl Çalışıyoruz</h2>
        </div>

        <div className="relative max-w-5xl mx-auto">
          {/* THE SPINE */}
          <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px md:-translate-x-1/2 bg-gradient-to-b from-transparent via-[#D0A36D]/50 to-transparent shadow-[0_0_15px_rgba(208,163,109,0.5)] z-0" />

          <div className="relative z-10">
            {PROCESS_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isEven = idx % 2 === 0;

              return (
                <div key={idx} className={`relative flex flex-col md:flex-row items-center w-full ${isEven ? 'md:justify-start' : 'md:justify-end'} ${idx > 0 ? 'mt-8 md:-mt-24' : ''}`}>
                  
                  {/* The Timeline Dot */}
                  <div className="absolute left-6 md:left-1/2 -translate-x-1/2 w-6 h-6 md:w-8 md:h-8 rounded-full bg-[#0A0A0A] border-2 border-[#D0A36D] flex items-center justify-center shadow-[0_0_20px_rgba(208,163,109,0.4)] z-20 top-8 md:top-1/2 md:-translate-y-1/2">
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#D0A36D]" />
                  </div>

                  {/* The Card */}
                  <motion.div
                    initial={{ opacity: 0, x: isEven ? -30 : 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
                    className={`w-full ml-16 md:ml-0 md:w-[45%] relative group rounded-3xl overflow-hidden border border-white/5 hover:border-[#D0A36D]/40 transition-all duration-500 bg-black/60 backdrop-blur-md`}
                  >
                    {/* Giant Number */}
                    <div className={`absolute -top-4 ${isEven ? '-right-4' : '-left-4'} text-9xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white/10 to-transparent pointer-events-none z-10 select-none`}>
                      {idx + 1}
                    </div>

                    {/* Content */}
                    <div className="relative z-20 p-8 sm:p-12 pl-12 md:pl-12">
                      <div className="w-14 h-14 rounded-2xl bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-[#D0A36D] mb-6 shadow-lg group-hover:scale-110 transition-transform duration-500">
                        <Icon className="w-7 h-7" />
                      </div>
                      <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-[#D0A36D] transition-colors duration-300">{step.title}</h3>
                      <p className="text-gray-400 leading-relaxed text-sm sm:text-base">
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
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#8B5A2B] rounded-full blur-[150px] opacity-[0.05] animate-[pulse_6s_ease-in-out_infinite] pointer-events-none z-0" />
        
        <div className="relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-serif tracking-widest font-light">Sıkça Sorulan Sorular</h2>
          </div>
          <div className="space-y-4">
            {FAQS.map((faq, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className={`border-b border-white/10 overflow-hidden transition-colors duration-300 ${activeFaq === idx ? "bg-white/[0.02]" : "bg-transparent hover:bg-white/[0.01]"}`}
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between py-6 px-4 text-left focus:outline-none bg-transparent group"
                >
                  <span className={`font-medium transition-all duration-300 group-hover:translate-x-2 group-hover:text-[#8B5A2B] ${activeFaq === idx ? "text-[#8B5A2B] translate-x-2" : "text-white"}`}>
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform duration-300 ease-in-out group-hover:text-[#8B5A2B] ${activeFaq === idx ? "rotate-180 text-[#8B5A2B]" : "text-gray-400"}`}
                  />
                </button>
                <AnimatePresence>
                  {activeFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ 
                        height: "auto", 
                        opacity: 1, 
                        transition: { height: { duration: 0.3 }, opacity: { duration: 0.3, delay: 0.1 } } 
                      }}
                      exit={{ 
                        height: 0, 
                        opacity: 0, 
                        transition: { height: { duration: 0.3 }, opacity: { duration: 0.2 } } 
                      }}
                    >
                      <div className="px-4 pb-6 text-gray-400 text-sm leading-relaxed mt-2 bg-transparent">
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

      {/* WHY US SECTION (Standard Scroll) */}
      <motion.section
        id="hakkimizda"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="px-6 py-24 max-w-7xl mx-auto bg-[#0A0A0A]"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative"
          >
            <div className="rounded-3xl w-full h-[500px] overflow-hidden border border-white/5">
              <img
                src="/pic5.jpg"
                alt="Happy student"
                className="object-cover w-full h-full opacity-80"
              />
            </div>
            <div className="absolute bottom-6 left-6 right-6 bg-[#151515] p-6 rounded-2xl border border-white/10 backdrop-blur-md">
              <p className="text-sm text-gray-400 mb-2">Okul Müdürü, Batman</p>
              <p className="text-white font-medium mb-3">{t("whyus.testimonial.text")}</p>
              <div className="flex text-[#D0A36D] text-xs">★★★★★</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-8"
          >
            <p className="text-[#D0A36D] text-sm font-bold tracking-widest uppercase">
              {t("whyus.badge")}
            </p>
            <h2 className="text-4xl md:text-5xl font-bold leading-tight">{t("whyus.title")}</h2>
            <p className="text-gray-400 leading-relaxed">{t("whyus.desc")}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                t("whyus.feature1"),
                t("whyus.feature2"),
                t("whyus.feature3"),
                t("whyus.feature4"),
                t("whyus.feature5"),
                t("whyus.feature6"),
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#D0A36D]" />
                  <span className="text-sm font-medium">{feature}</span>
                </div>
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsContactModalOpen(true)}
              className="flex items-center gap-2 bg-[#D0A36D] hover:bg-[#B88B56] text-white px-6 py-3 rounded-full font-bold transition-colors mt-4 cursor-pointer"
            >
              {t("whyus.cta")} <ChevronRight className="w-4 h-4" />
            </motion.button>
          </motion.div>
        </div>
      </motion.section>

      {/* FOOTER & CONTACT (Standard Scroll) */}
      <footer id="iletisim" className="border-t border-white/5 bg-[#0D0D0D] pt-24 pb-8">
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
            <p className="text-[#D0A36D] text-sm font-bold tracking-widest uppercase">
              {t("contact.badge")}
            </p>
            <h2 className="text-4xl font-bold">{t("contact.title")}</h2>
            <p className="text-gray-400">{t("contact.desc")}</p>

            <div className="space-y-6 pt-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-[#D0A36D]">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{t("contact.phone")}</p>
                  <p className="font-bold">05362100021</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-[#D0A36D]">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{t("contact.email")}</p>
                  <p className="font-bold">okulcekimleri@gmail.com</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-[#D0A36D]">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{t("contact.address")}</p>
                  <p className="font-bold">
                    TİLMERÇ MH İBRAHİM HAKKI CD TOKİ KAZIM KARABEKİR ORTAOKUL KARŞISI / BATMAN
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors cursor-pointer"
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
            className="bg-[#111111] border border-white/5 rounded-3xl p-4 relative min-h-[400px] flex items-end overflow-hidden"
          >
            <iframe
              src="https://maps.google.com/maps?q=Tilmer%C3%A7%20Mh%20%C4%B0brahim%20Hakk%C4%B1%20Cd%20Batman%20Kaz%C4%B1m%20Karabekir%20Ortaokulu&t=&z=15&ie=UTF8&iwloc=&output=embed"
              className="absolute inset-0 w-full h-full rounded-3xl border-0 opacity-80 hover:opacity-100 transition-opacity"
              allowFullScreen
              loading="lazy"
              title="Albumevi Batman Studio Location"
            />

            <div className="relative z-10 bg-[#151515]/90 border border-white/10 p-4 rounded-2xl w-full flex items-center justify-between backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#D0A36D]/10 rounded-full flex items-center justify-center text-[#D0A36D]">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">{t("contact.map.title")}</p>
                  <p className="text-xs text-gray-400">{t("contact.map.subtitle")}</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="text-[#D0A36D] text-sm font-medium flex items-center gap-1 hover:text-[#E2B67C] transition-colors cursor-pointer"
              >
                {t("contact.map.cta")} <ChevronRight className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        </motion.div>

        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between border-t border-white/5 pt-8 text-sm text-gray-500">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <img src="/logo.jpg" alt="Albumevi Logo" className="h-6 md:h-8 w-auto object-contain" />
          </div>
          <p>© 2024 Albumevi Fotoğrafçılık A.Ş. Tüm hakları saklıdır.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-white transition-colors">
              Gizlilik
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Şartlar
            </a>
            <a href="#" className="hover:text-white transition-colors">
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
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
            onClick={() => setIsContactModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0D0D0D] border border-[#D0A36D]/30 rounded-3xl w-full max-w-2xl overflow-hidden relative shadow-2xl"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xl font-bold text-[#D0A36D]">İletişim Bilgileri</h3>
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
                <div className="flex flex-col items-center justify-center text-center bg-[#151515] rounded-3xl p-8 border border-[#D0A36D]/30 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-b from-[#D0A36D]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="w-28 h-28 rounded-full p-1 border-2 border-[#D0A36D]/60 mb-5 relative z-10 shadow-lg shadow-[#D0A36D]/10 group-hover:border-[#D0A36D] transition-colors duration-500">
                    <img 
                      src="/pic4.jpg" 
                      alt="Amine Himmich" 
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                  
                  <div className="relative z-10 space-y-2 flex flex-col items-center">
                    <h4 className="text-2xl font-bold text-white">Amine Himmich</h4>
                    <p className="text-[#D0A36D] text-xs font-bold tracking-widest uppercase">Kurucu & Baş Fotoğrafçı</p>
                    
                    <div className="pt-3 w-full">
                      <a
                        href="https://wa.me/905551234567"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 text-gray-300 hover:text-[#0A0A0A] transition-all duration-300 bg-white/5 hover:bg-[#D0A36D] px-6 py-3 rounded-full text-sm font-semibold border border-[#D0A36D]/30 hover:border-transparent w-full sm:w-auto"
                      >
                        <Phone className="w-4 h-4" />
                        +90 555 123 4567
                      </a>
                    </div>
                  </div>
                </div>

                {/* Photographers Section */}
                <div>
                  <h4 className="text-sm font-bold tracking-widest uppercase text-gray-400 mb-4 border-b border-white/5 pb-2">
                    Çekimciler Ekibimiz
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {PHOTOGRAPHERS.map((photographer, idx) => (
                      <div key={idx} className="bg-[#111111] rounded-xl p-4 border border-white/5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full overflow-hidden shrink-0">
                          <img 
                            src={photographer.img} 
                            alt={photographer.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-white">{photographer.name}</p>
                          <a
                            href={`https://wa.me/${photographer.phone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#D0A36D] transition-colors mt-1"
                          >
                            <Phone className="w-3 h-3" />
                            {photographer.phone}
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
