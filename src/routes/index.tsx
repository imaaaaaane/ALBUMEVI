import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Camera,
  Users,
  Calendar,
  ChevronDown,
  Award,
  GraduationCap,
  Package,
  BookOpen,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  Instagram,
  ChevronRight,
  ArrowRight,
  X,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getR2PublicUrl } from "@/lib/r2";

const SKILLSET_SERVICES = [
  {
    icon: BookOpen,
    title: "Panoramik Albüm",
    desc: "Yüksek gramajlı kuşe ve özel dokulu sayfalarla hazırlanan, yıllarca ilk günkü canlılığını koruyan panoramik mezuniyet albümleri.",
  },
  {
    icon: Award,
    title: "Ahşap Albüm",
    desc: "El işçiliği doğal ahşap kapak ve lazer kazıma detaylarıyla öğrencilere ömür boyu saklayacakları prestijli bir hatıra.",
  },
  {
    icon: GraduationCap,
    title: "Kep ve Cübbe Çekimleri",
    desc: "Tüm mezuniyet kıyafetleri ve konsept aksesuarları ekibimiz tarafından okula getirilerek profesyonel portre çekimleri gerçekleştirilir.",
  },
  {
    icon: Package,
    title: "Özel Tasarım Kumbara & Çerçeve",
    desc: "Öğrencinin kendi fotoğrafıyla kişiselleştirilen özel tasarım kumbara, masaüstü ve duvar çerçevesi koleksiyonları.",
  },
  {
    icon: Camera,
    title: "Stüdyo Kalitesinde Okul Çekimi",
    desc: "Mobil profesyonel ışık ve fon ekipmanlarımızla, ders düzenini aksatmadan okul ortamında stüdyo standardında çekim.",
  },
  {
    icon: Users,
    title: "Dijital Öğretmen Portalı",
    desc: "Fotoğraf seçimi karmaşası olmadan; öğretmenlerin online portal üzerinden saniyeler içinde öğrenci ve paket listesi oluşturduğu pratik sistem.",
  },
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

const FALLBACK_GALLERY = [
  { id: "fallback-1", image_url: "/pic1.jpg", title: "Mezuniyet Portresi" },
  { id: "fallback-2", image_url: "/pic2.jpg", title: "Panoramik Albüm Çekimi" },
  { id: "fallback-3", image_url: "/pic3.jpg", title: "Ahşap Albüm Serisi" },
  { id: "fallback-4", image_url: "/pic5.jpg", title: "Okul Hatırası" },
  { id: "fallback-5", image_url: "/pic6.jpg", title: "Stüdyo Çekimi" },
];

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { t, dir } = useI18n();
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

  const galleryItems = dynamicPortfolio.length > 0 ? dynamicPortfolio : FALLBACK_GALLERY;

  return (
    <div
      dir={dir}
      className="min-h-screen bg-zinc-950 text-white selection:bg-[#D4B8A8]/30 font-sans antialiased"
    >
      {/* MINIMALIST HIGH-END NAVBAR */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-zinc-950/80 border-b border-white/5">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-10 py-3">
          <Link to="/" className="flex items-center shrink-0">
            <img
              src="/logo-light.png"
              alt="Albumevi Logo"
              className="w-36 md:w-44 h-11 object-cover object-center"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs uppercase tracking-[0.2em] text-zinc-400 font-medium">
            <a href="#hizmetler" className="hover:text-white transition-colors">
              {t("nav.services")}
            </a>
            <a href="#galeri" className="hover:text-white transition-colors">
              {t("nav.gallery")}
            </a>
            <a href="#surec" className="hover:text-white transition-colors">
              {t("nav.process")}
            </a>
            <a href="#cekimciler" className="hover:text-white transition-colors">
              Çekimciler
            </a>
            <a href="#hakkimizda" className="hover:text-white transition-colors">
              {t("nav.about")}
            </a>
            <a href="#sss" className="hover:text-white transition-colors">
              SSS
            </a>
            <a href="#iletisim" className="hover:text-white transition-colors">
              {t("nav.contact")}
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/admin-login"
              className="inline-flex items-center justify-center px-4 py-1.5 text-xs uppercase tracking-[0.15em] font-medium border border-white/15 rounded-full hover:border-[#D4B8A8] hover:text-[#D4B8A8] transition-colors text-white"
            >
              {t("cta.adminLogin")}
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* HERO SECTION: Full-screen background with lighter overlay + Sleek Serif Headline + /home1.jpg & /home2.jpg overlapping cards */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
        <div className="absolute inset-0 z-0">
          <img
            src="/pic1.jpg"
            alt="Albumevi Photography Studio"
            className="w-full h-full object-cover object-center"
          />
          {/* Lighter, balanced dark overlay so the background image pops out while text stays readable */}
          <div className="absolute inset-0 bg-zinc-950/45" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-zinc-950/40 to-transparent" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-10 py-24 md:py-32 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-7 space-y-8 text-left"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-[#D4B8A8] font-medium">
                ALBÜMEVİ • OKUL & MEZUNİYET FOTOĞRAFÇILIĞI
              </p>

              <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-normal tracking-tight leading-[1.08] text-white">
                {t("hero.title1")} <br />
                <span className="italic font-light text-[#D4B8A8]">{t("hero.title2")}</span>
              </h1>

              <p className="text-base md:text-lg text-zinc-300 max-w-xl leading-relaxed font-light">
                {t("hero.subtitle")}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-6">
                <a
                  href="#galeri"
                  className="inline-flex items-center gap-3 bg-[#D4B8A8] hover:bg-[#C4A695] text-zinc-950 px-8 py-4 rounded-md text-xs uppercase tracking-[0.2em] font-semibold transition-all duration-300 shadow-lg"
                >
                  Portfolyoyu İncele <ArrowRight className="w-4 h-4" />
                </a>

                <button
                  type="button"
                  onClick={() => setIsContactModalOpen(true)}
                  className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-300 hover:text-white transition-colors py-4 px-2 cursor-pointer"
                >
                  İletişime Geç <ChevronRight className="w-4 h-4 text-[#D4B8A8]" />
                </button>
              </div>

              <div className="pt-10 border-t border-white/15 grid grid-cols-3 gap-8 max-w-lg">
                <div>
                  <p className="font-serif text-3xl md:text-4xl text-white">500+</p>
                  <p className="text-xs uppercase tracking-[0.15em] text-zinc-300 mt-1">
                    Mutlu Okul
                  </p>
                </div>
                <div>
                  <p className="font-serif text-3xl md:text-4xl text-white">100%</p>
                  <p className="text-xs uppercase tracking-[0.15em] text-zinc-300 mt-1">
                    Stüdyo Kalitesi
                  </p>
                </div>
                <div>
                  <p className="font-serif text-3xl md:text-4xl text-white">5 İl</p>
                  <p className="text-xs uppercase tracking-[0.15em] text-zinc-300 mt-1">
                    Bölge Genelinde
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Right Side Two Overlapping Thumbnail Cards (/home1.jpg & /home2.jpg) */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-5 grid grid-cols-2 gap-5 items-center"
            >
              <div className="group relative overflow-hidden rounded-2xl backdrop-blur-md bg-white/5 border border-white/15 p-2.5 shadow-2xl">
                <div className="overflow-hidden rounded-xl aspect-[4/5]">
                  <img
                    src="/home1.jpg"
                    alt="Stüdyo Portre Çekimi"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="mt-2.5 px-2 pb-1 flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-[0.18em] text-[#D4B8A8]">
                    Stüdyo Kalitesi
                  </span>
                  <Camera strokeWidth={1.5} className="w-3.5 h-3.5 text-[#D4B8A8]" />
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-2xl backdrop-blur-md bg-white/5 border border-white/15 p-2.5 shadow-2xl lg:translate-y-8">
                <div className="overflow-hidden rounded-xl aspect-[4/5]">
                  <img
                    src="/home2.jpg"
                    alt="Özel Tasarım Mezuniyet Albümü"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="mt-2.5 px-2 pb-1 flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-[0.18em] text-[#D4B8A8]">
                    Özel Tasarım Albüm
                  </span>
                  <Award strokeWidth={1.5} className="w-3.5 h-3.5 text-[#D4B8A8]" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SKILLSET / SERVICES GRID: 3-column minimal grid on pure bg-zinc-950 */}
      <section id="hizmetler" className="bg-zinc-950 py-28 md:py-36 border-t border-white/5">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
            <div className="lg:col-span-4 space-y-6">
              <p className="text-xs uppercase tracking-[0.3em] text-[#D4B8A8] font-medium">
                {t("services.badge")}
              </p>
              <h2 className="font-serif text-4xl md:text-5xl font-normal tracking-tight leading-tight text-white">
                {t("services.title")}
              </h2>
              <p className="text-zinc-400 text-sm md:text-base leading-relaxed font-light">
                {t("services.subtitle")}
              </p>
              <div className="w-12 h-px bg-[#D4B8A8]/60 pt-2" />
            </div>

            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
              {SKILLSET_SERVICES.map((service, idx) => {
                const Icon = service.icon;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.5, delay: idx * 0.08 }}
                    className="group space-y-4 border-t border-white/10 pt-6 hover:border-[#D4B8A8]/60 transition-colors duration-500"
                  >
                    <Icon
                      strokeWidth={1.25}
                      className="w-7 h-7 text-[#D4B8A8] transition-transform duration-500 group-hover:translate-x-1"
                    />
                    <h3 className="text-lg font-medium tracking-wide text-white">
                      {service.title}
                    </h3>
                    <p className="text-zinc-400 text-xs md:text-sm leading-relaxed font-light">
                      {service.desc}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* GALLERY SECTION: Vertical Portrait Cards (rounded-2xl) with Grayscale-to-Color & Subtle Zoom */}
      <section id="galeri" className="bg-zinc-950 py-28 md:py-36 border-t border-white/5">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-[#D4B8A8] font-medium">
                PORTFOLYO • SEÇKİN ÇALIŞMALAR
              </p>
              <h2 className="font-serif text-4xl md:text-5xl font-normal tracking-tight text-white">
                Galeri & Öne Çıkanlar
              </h2>
            </div>
            <p className="text-zinc-400 text-sm max-w-md leading-relaxed font-light">
              Objektifimizden yansıyan gerçek okul ve stüdyo çekimlerimiz. Doğal gülümsemeler ve
              birinci sınıf baskı kalitemiz.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {galleryItems.map((item: any, idx: number) => {
              const src = item.image_url
                ? item.image_url.startsWith("/")
                  ? item.image_url
                  : getR2PublicUrl(item.image_url)
                : "";
              return (
                <motion.div
                  key={item.id || idx}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.6, delay: (idx % 3) * 0.1 }}
                  className="group relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-zinc-900 border border-white/5 cursor-pointer"
                >
                  <img
                    src={src}
                    alt={item.alt || item.title || "Portfolyo Görseli"}
                    loading="lazy"
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-6">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.25em] text-[#D4B8A8]">
                        ALBÜMEVİ
                      </p>
                      <p className="font-serif text-lg text-white mt-0.5">
                        {item.title || "Mezuniyet Koleksiyonu"}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PROCESS SECTION: Minimal 4-Column Editorial Steps */}
      <section id="surec" className="bg-zinc-950 py-28 md:py-36 border-t border-white/5">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="max-w-2xl mb-20 space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-[#D4B8A8] font-medium">SÜREÇ</p>
            <h2 className="font-serif text-4xl md:text-5xl font-normal tracking-tight text-white">
              Nasıl Çalışıyoruz
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {PROCESS_STEPS.map((step, idx) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="space-y-5 border-t border-white/10 pt-8 group hover:border-[#D4B8A8]/60 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-xs tracking-[0.2em] text-[#D4B8A8]">
                      0{idx + 1}
                    </span>
                    <Icon strokeWidth={1.25} className="w-6 h-6 text-zinc-400 group-hover:text-[#D4B8A8] transition-colors" />
                  </div>
                  <h3 className="text-xl font-medium text-white">{step.title}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed font-light">{step.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PHOTOGRAPHERS SECTION */}
      {dynamicPhotographers.length > 0 && (
        <section id="cekimciler" className="bg-zinc-950 py-28 md:py-36 border-t border-white/5">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-[#D4B8A8] font-medium">
                  EKİBİMİZ
                </p>
                <h2 className="font-serif text-4xl md:text-5xl font-normal tracking-tight text-white">
                  Çekimcilerimiz
                </h2>
              </div>
              <p className="text-zinc-400 text-sm max-w-md font-light">
                Anılarınızı ölümsüzleştiren profesyonel fotoğrafçı kadromuz.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {dynamicPhotographers.map((photographer: any, idx: number) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: idx * 0.1, duration: 0.5 }}
                  className="group space-y-4"
                >
                  <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl bg-zinc-900 border border-white/5">
                    <img
                      src={
                        photographer.img
                          ? getR2PublicUrl(photographer.img)
                          : photographer.image_url
                            ? getR2PublicUrl(photographer.image_url)
                            : ""
                      }
                      alt={photographer.name || photographer.full_name}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700 ease-out"
                    />
                  </div>

                  <div className="pt-1 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-medium text-white">
                        {photographer.full_name || photographer.name}
                      </h3>
                      <p className="text-xs uppercase tracking-[0.2em] text-[#D4B8A8] mt-1">
                        {photographer.role || photographer.title || "Fotoğrafçı"}
                      </p>
                    </div>
                    {photographer.phone && (
                      <a
                        href={`https://wa.me/${(photographer.phone || "").replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-[#D4B8A8] transition-colors pt-1"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{photographer.phone}</span>
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* WHY US / ABOUT SECTION */}
      <section id="hakkimizda" className="bg-zinc-950 py-28 md:py-36 border-t border-white/5">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            <div className="lg:col-span-5 group">
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-white/5">
                <img
                  src="/pic5.jpg"
                  alt="Albumevi Kalitesi"
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/20 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 p-6 bg-zinc-950/85 backdrop-blur-md border border-white/10 rounded-xl">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#D4B8A8] mb-2">
                    Okul Müdürü, Batman
                  </p>
                  <p className="text-white text-sm font-light leading-relaxed mb-3">
                    {t("whyus.testimonial.text")}
                  </p>
                  <div className="text-[#D4B8A8] text-xs tracking-widest">★★★★★</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-8">
              <p className="text-xs uppercase tracking-[0.3em] text-[#D4B8A8] font-medium">
                {t("whyus.badge")}
              </p>
              <h2 className="font-serif text-4xl md:text-5xl font-normal tracking-tight leading-tight text-white">
                {t("whyus.title")}
              </h2>
              <p className="text-zinc-400 text-base leading-relaxed font-light">
                {t("whyus.desc")}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
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
                    className="flex items-center gap-3 py-3 border-b border-white/5 text-sm text-zinc-300 font-light"
                  >
                    <CheckCircle2 strokeWidth={1.5} className="w-4 h-4 text-[#D4B8A8] shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => setIsContactModalOpen(true)}
                  className="inline-flex items-center gap-3 bg-[#D4B8A8] hover:bg-[#C4A695] text-zinc-950 px-8 py-4 rounded-none sm:rounded-md text-xs uppercase tracking-[0.2em] font-semibold transition-colors cursor-pointer"
                >
                  {t("whyus.cta")} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="sss" className="bg-zinc-950 py-28 md:py-36 border-t border-white/5">
        <div className="mx-auto max-w-4xl px-6 lg:px-10">
          <div className="mb-16 space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-[#D4B8A8] font-medium">SSS</p>
            <h2 className="font-serif text-4xl md:text-5xl font-normal tracking-tight text-white">
              Sıkça Sorulan Sorular
            </h2>
          </div>

          <div className="divide-y divide-white/10 border-t border-b border-white/10">
            {FAQS.map((faq, idx) => (
              <div key={idx} className="py-6">
                <button
                  type="button"
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between text-left focus:outline-none group cursor-pointer"
                >
                  <span
                    className={`text-base md:text-lg font-normal transition-colors ${
                      activeFaq === idx ? "text-[#D4B8A8]" : "text-white group-hover:text-[#D4B8A8]"
                    }`}
                  >
                    {faq.q}
                  </span>
                  <ChevronDown
                    strokeWidth={1.25}
                    className={`w-5 h-5 shrink-0 transition-transform duration-300 ${
                      activeFaq === idx ? "rotate-180 text-[#D4B8A8]" : "text-zinc-400"
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {activeFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <p className="pt-4 text-zinc-400 text-sm leading-relaxed font-light">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEO SECTION */}
      <section className="px-6 lg:px-10 py-16 max-w-7xl mx-auto border-t border-white/5 bg-zinc-950">
        <div className="text-xs text-zinc-400/80 leading-relaxed max-w-4xl space-y-3 font-light">
          <h2 className="text-white font-medium uppercase tracking-[0.2em] text-xs">
            Profesyonel Okul Fotoğrafçılığı ve Mezuniyet Albümleri
          </h2>
          <p>
            ALBÜMEVİ olarak <strong>Batman, Diyarbakır, Mardin, Siirt</strong> ve{" "}
            <strong>Şırnak</strong> genelinde anaokulu, anasınıfı ve ilkokul öğrencileri için
            profesyonel <strong>mezuniyet ve hatıra fotoğraf çekimi</strong> hizmetleri
            sunmaktayız. Stüdyo kalitesindeki ekipmanlarımızla okul ortamında gerçekleştirdiğimiz
            çekimlerde, çocukların en doğal anlarını ölümsüzleştiriyoruz.
          </p>
          <p>
            Geniş ürün yelpazemiz; yüksek kaliteli <strong>Panoramik Albüm</strong>, el işçiliği{" "}
            <strong>Ahşap Albüm</strong>, özel tasarım <strong>Kumbara</strong> ve{" "}
            <strong>Çerçeve</strong> ile <strong>Kep ve Cübbe çekimleri</strong> gibi kalıcı hatıra
            seçeneklerini içermektedir.
          </p>
          <p>
            <strong>Öğretmenlere Özel Online Portal:</strong> Geliştirdiğimiz yenilikçi Öğretmen
            Portalı sayesinde fotoğraf seçim süreci tamamen dijitalleşmiştir.
          </p>
        </div>
      </section>

      {/* FOOTER & CONTACT */}
      <footer id="iletisim" className="border-t border-white/10 bg-zinc-950 pt-28 pb-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 grid grid-cols-1 lg:grid-cols-12 gap-16 mb-24">
          <div className="lg:col-span-5 space-y-8">
            <p className="text-[#D4B8A8] text-xs font-medium tracking-[0.3em] uppercase">
              {t("contact.badge")}
            </p>
            <h2 className="font-serif text-4xl md:text-5xl font-normal tracking-tight text-white">
              {t("contact.title")}
            </h2>
            <p className="text-zinc-400 text-sm leading-relaxed font-light">{t("contact.desc")}</p>

            <div className="space-y-6 pt-4">
              <div className="flex items-start gap-4">
                <Phone strokeWidth={1.25} className="w-5 h-5 text-[#D4B8A8] mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-zinc-400">
                    {t("contact.phone")}
                  </p>
                  <p className="text-white font-medium mt-1">05362100021</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Mail strokeWidth={1.25} className="w-5 h-5 text-[#D4B8A8] mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-zinc-400">
                    {t("contact.email")}
                  </p>
                  <p className="text-white font-medium mt-1">okulcekimleri@gmail.com</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <MapPin strokeWidth={1.25} className="w-5 h-5 text-[#D4B8A8] mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-zinc-400">
                    {t("contact.address")}
                  </p>
                  <p className="text-white font-light text-sm mt-1 leading-relaxed">
                    TİLMERÇ MH İBRAHİM HAKKI CD TOKİ KAZIM KARABEKİR ORTAOKUL KARŞISI / BATMAN
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-zinc-400 hover:text-[#D4B8A8] hover:border-[#D4B8A8] transition-colors"
              >
                <Instagram strokeWidth={1.25} className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="lg:col-span-7 rounded-2xl border border-white/10 overflow-hidden relative min-h-[380px] flex items-end bg-zinc-900">
            <iframe
              src="https://maps.google.com/maps?q=Tilmer%C3%A7%20Mh%20%C4%B0brahim%20Hakk%C4%B1%20Cd%20Batman%20Kaz%C4%B1m%20Karabekir%20Ortaokulu&t=&z=15&ie=UTF8&iwloc=&output=embed"
              className="absolute inset-0 w-full h-full border-0 grayscale contrast-125 opacity-75 hover:opacity-100 transition-opacity"
              allowFullScreen
              loading="lazy"
              title="Albumevi Batman Studio Location"
            />
            <div className="relative z-10 m-4 p-4 rounded-xl bg-zinc-950/90 backdrop-blur-md border border-white/10 w-full flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin strokeWidth={1.25} className="w-5 h-5 text-[#D4B8A8]" />
                <div>
                  <p className="text-white text-sm font-medium">{t("contact.map.title")}</p>
                  <p className="text-xs text-zinc-400">{t("contact.map.subtitle")}</p>
                </div>
              </div>
              <span className="text-[#D4B8A8] text-xs uppercase tracking-[0.15em] flex items-center gap-1">
                {t("contact.map.cta")} <ChevronRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-10 flex flex-col md:flex-row items-center justify-between border-t border-white/5 pt-8 text-xs text-zinc-400">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <img
              src="/logo-light.png"
              alt="Albumevi Logo"
              className="w-32 h-9 object-cover object-center"
            />
          </div>
          <p>© 2026 Albumevi Fotoğrafçılık. Tüm hakları saklıdır.</p>
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

      {/* CONTACT MODAL */}
      <AnimatePresence>
        {isContactModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-sm overflow-y-auto"
            onClick={() => setIsContactModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden relative shadow-2xl"
            >
              <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
                <h3 className="font-serif text-xl text-white">İletişim Bilgileri</h3>
                <button
                  type="button"
                  onClick={() => setIsContactModalOpen(false)}
                  className="text-zinc-400 hover:text-white transition-colors p-1 cursor-pointer"
                >
                  <X strokeWidth={1.25} className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-8">
                <div className="flex flex-col items-center justify-center text-center bg-zinc-900/60 rounded-2xl p-8 border border-white/10">
                  <div className="w-24 h-24 rounded-full p-1 border border-[#D4B8A8]/60 mb-4 overflow-hidden">
                    <img
                      src="/pic4.jpg"
                      alt="Amine Himmich"
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                  <h4 className="font-serif text-2xl text-white">Amine Himmich</h4>
                  <p className="text-[#D4B8A8] text-xs tracking-[0.2em] uppercase mt-1">
                    Kurucu & Baş Fotoğrafçı
                  </p>
                  <div className="pt-5">
                    <a
                      href="https://wa.me/905362100021"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 bg-[#D4B8A8] hover:bg-[#C4A695] text-zinc-950 px-6 py-2.5 rounded-md text-xs uppercase tracking-[0.15em] font-semibold transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      0536 210 00 21
                    </a>
                  </div>
                </div>

                {dynamicPhotographers.length > 0 && (
                  <div>
                    <h4 className="text-xs tracking-[0.2em] uppercase text-zinc-400 mb-4 border-b border-white/10 pb-2">
                      Çekimciler Ekibimiz
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {dynamicPhotographers.map((photographer: any, idx: number) => (
                        <div
                          key={idx}
                          className="bg-zinc-900/50 rounded-xl p-4 border border-white/5 flex items-center gap-4"
                        >
                          <div className="w-12 h-12 rounded-full overflow-hidden shrink-0">
                            <img
                              src={
                                photographer.img
                                  ? getR2PublicUrl(photographer.img)
                                  : photographer.image_url
                                    ? getR2PublicUrl(photographer.image_url)
                                    : ""
                              }
                              alt={photographer.full_name || photographer.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="font-medium text-sm text-white">
                              {photographer.full_name || photographer.name}
                            </p>
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
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
