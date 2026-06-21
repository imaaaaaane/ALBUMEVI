import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Camera,
  Users,
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
} from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

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

  // Katana scroll refs
  const servicesContainerRef = useScrollProgress();
  const processContainerRef = useScrollProgress();

  return (
    <div
      dir={dir}
      className="min-h-screen bg-[#0A0A0A] text-white selection:bg-red-500/30 font-sans"
    >
      {/* HEADER: Floating transparent minimalist header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0A0A0A]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]">
              <Camera className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white lowercase">
              album<span className="text-red-500">evi</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-gray-300 font-medium">
            <a href="#hizmetler" className="hover:text-white transition-colors">
              {t("nav.services")}
            </a>
            <a href="#surec" className="hover:text-white transition-colors">
              {t("nav.process")}
            </a>
            <a href="#galeri" className="hover:text-white transition-colors">
              {t("nav.gallery")}
            </a>
            <a href="#hakkimizda" className="hover:text-white transition-colors">
              {t("nav.about")}
            </a>
            <a href="#iletisim" className="hover:text-white transition-colors">
              {t("nav.contact")}
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium border border-white/10 rounded-full hover:bg-white/5 transition-all text-white animate-pulse-slow"
            >
              {t("cta.schoolLogin")}
            </Link>
            <Link
              to="/admin-login"
              className="px-4 py-2 text-sm font-medium border border-white/10 rounded-full hover:bg-white/5 transition-all text-white"
            >
              {t("cta.adminLogin")}
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <div className="relative pt-24 min-h-screen flex items-center justify-center">
        <main className="mx-auto max-w-7xl px-6 py-20 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left side text */}
            <motion.div
              variants={heroContainerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-8"
            >
              <motion.div
                variants={heroItemVariants}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-500/30 bg-red-500/10 text-red-500 text-xs font-bold tracking-wider"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                {t("hero.badge")}
              </motion.div>
              <motion.h1
                variants={heroItemVariants}
                className="text-5xl md:text-7xl font-extrabold leading-[1.1] tracking-tight"
              >
                {t("hero.title1")} <br />
                <span className="text-red-500">{t("hero.title2")}</span>
              </motion.h1>
              <motion.p
                variants={heroItemVariants}
                className="text-lg text-gray-400 max-w-lg leading-relaxed"
              >
                {t("hero.subtitle")}
              </motion.p>

              <motion.div
                variants={heroItemVariants}
                className="flex items-center gap-4 pt-4 border-t border-white/5 w-max pr-8"
              >
                <div className="flex -space-x-3">
                  <div className="w-10 h-10 rounded-full border-2 border-[#0A0A0A] bg-gray-800" />
                  <div className="w-10 h-10 rounded-full border-2 border-[#0A0A0A] bg-gray-700" />
                  <div className="w-10 h-10 rounded-full border-2 border-[#0A0A0A] bg-gray-600" />
                </div>
                <div>
                  <div className="flex text-red-500 text-sm">★★★★★</div>
                  <p className="text-xs text-gray-400">{t("hero.ratingText")}</p>
                </div>
              </motion.div>
            </motion.div>

            {/* Right side Images Layout */}
            <motion.div
              id="galeri"
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
                      <div className="flex text-red-500 text-sm">★★★★★</div>
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

              {/* Floating Badge */}
              <div className="absolute -bottom-6 left-10 bg-[#151515] border border-white/10 p-4 rounded-2xl flex items-center gap-4 shadow-2xl">
                <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
                  <Camera className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{t("hero.monthlyStatsSub")}</p>
                  <p className="text-lg font-bold">{t("hero.monthlyStats")}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </main>
      </div>

      {/* SERVICES GRID SECTION - Katana Animation */}
      <div
        id="hizmetler"
        ref={servicesContainerRef}
        className="katana-container katana-container-services"
      >
        <div className="katana-sticky">
          <div className="katana-mask flex items-center justify-center bg-[#0D0D0D]">
            <div className="mx-auto max-w-7xl px-6 py-24 w-full">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="lg:col-span-5 space-y-6"
                >
                  <p className="text-red-500 text-sm font-bold tracking-widest uppercase">
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
                      className="bg-[#111111] p-8 rounded-3xl border border-white/5 hover:border-red-500/30 transition-colors"
                    >
                      <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500 mb-6">
                        {service.icon}
                      </div>
                      <h3 className="text-xl font-bold mb-3">{service.title}</h3>
                      <p className="text-gray-400 text-sm leading-relaxed">{service.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PROCESS SECTION - Katana Animation */}
      <div
        id="surec"
        ref={processContainerRef}
        className="katana-container katana-container-process"
      >
        <div className="katana-sticky">
          <div className="katana-mask flex items-center justify-center bg-[#0A0A0A]">
            <div className="mx-auto max-w-7xl px-6 py-24 w-full">
              <div className="text-center mb-16">
                <p className="text-red-500 text-sm font-bold tracking-widest uppercase mb-3">
                  {t("process.badge")}
                </p>
                <h2 className="text-4xl font-bold">{t("process.title")}</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { num: "01", title: t("process.step1.title"), desc: t("process.step1.desc") },
                  {
                    num: "02",
                    title: t("process.step2.title"),
                    desc: t("process.step2.desc"),
                    active: true,
                  },
                  { num: "03", title: t("process.step3.title"), desc: t("process.step3.desc") },
                  { num: "04", title: t("process.step4.title"), desc: t("process.step4.desc") },
                ].map((step, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: idx * 0.1 }}
                    className={`p-8 rounded-3xl border transition-all ${step.active ? "border-red-500 bg-[#151515] scale-105" : "border-white/5 bg-[#111111]"}`}
                  >
                    <div className="text-5xl font-extrabold text-white/10 mb-6">{step.num}</div>
                    <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* WHY US SECTION (Standard Scroll) */}
      <section id="hakkimizda" className="px-6 py-24 max-w-7xl mx-auto bg-[#0A0A0A]">
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
              <p className="text-sm text-gray-400 mb-2">{t("whyus.testimonial.author")}</p>
              <p className="text-white font-medium mb-3">{t("whyus.testimonial.text")}</p>
              <div className="flex text-red-500 text-xs">★★★★★</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-8"
          >
            <p className="text-red-500 text-sm font-bold tracking-widest uppercase">
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
                  <CheckCircle2 className="w-5 h-5 text-red-500" />
                  <span className="text-sm font-medium">{feature}</span>
                </div>
              ))}
            </div>

            <button className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full font-bold transition-colors mt-4">
              {t("whyus.cta")} <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* FOOTER & CONTACT (Standard Scroll) */}
      <footer id="iletisim" className="border-t border-white/5 bg-[#0D0D0D] pt-24 pb-8">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 mb-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-8"
          >
            <p className="text-red-500 text-sm font-bold tracking-widest uppercase">
              {t("contact.badge")}
            </p>
            <h2 className="text-4xl font-bold">{t("contact.title")}</h2>
            <p className="text-gray-400">{t("contact.desc")}</p>

            <div className="space-y-6 pt-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-red-500">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{t("contact.phone")}</p>
                  <p className="font-bold">05362100021</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-red-500">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{t("contact.email")}</p>
                  <p className="font-bold">okulcekimleri@gmail.com</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-red-500">
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
              <button className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors">
                <Instagram className="w-4 h-4" />
              </button>
              <button className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors">
                <Facebook className="w-4 h-4" />
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="bg-[#111111] border border-white/5 rounded-3xl p-4 relative min-h-[400px] flex items-end"
          >
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: "radial-gradient(circle at center, white 1px, transparent 1px)",
                backgroundSize: "30px 30px",
              }}
            ></div>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.5)]">
                <MapPin className="w-6 h-6 text-white" />
              </div>
            </div>

            <div className="relative z-10 bg-[#151515] border border-white/10 p-4 rounded-2xl w-full flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">{t("contact.map.title")}</p>
                  <p className="text-xs text-gray-400">{t("contact.map.subtitle")}</p>
                </div>
              </div>
              <button className="text-red-500 text-sm font-medium flex items-center gap-1 hover:text-red-400 transition-colors">
                {t("contact.map.cta")} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>

        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between border-t border-white/5 pt-8 text-sm text-gray-500">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <Camera className="w-4 h-4 text-red-500" />
            <span className="font-bold text-white lowercase">
              album<span className="text-red-500">evi</span>
            </span>
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
    </div>
  );
}
