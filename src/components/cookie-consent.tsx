import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("albumevi_cookie_consent");
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("albumevi_cookie_consent", "accepted");
    setIsVisible(false);
  };

  const handleOnlyRequired = () => {
    localStorage.setItem("albumevi_cookie_consent", "required_only");
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:w-[400px] z-[9999] bg-zinc-900/95 backdrop-blur-md border border-[#D4B8A8]/30 rounded-2xl p-5 shadow-2xl flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <h3 className="text-[#D4B8A8] font-semibold text-sm">Çerez Politikası ve Gizlilik</h3>
            <p className="text-gray-300 text-xs leading-relaxed">
              Deneyiminizi geliştirmek, güvenliği sağlamak ve sipariş süreçlerini yönetmek için zorunlu çerezler (cookies) kullanıyoruz. Sitemizi kullanarak çerez politikamızı kabul etmiş olursunuz.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleAccept}
              className="flex-1 bg-gradient-to-r from-[#C19B76] to-[#A67C52] hover:from-[#A67C52] hover:to-[#8B5A2B] text-black font-semibold py-2 px-4 rounded-xl text-xs transition-all shadow-md hover:shadow-lg"
            >
              Kabul Et
            </button>
            <button
              onClick={handleOnlyRequired}
              className="flex-1 bg-transparent border border-white/10 hover:bg-white/5 text-gray-300 font-medium py-2 px-4 rounded-xl text-xs transition-colors"
            >
              Sadece Zorunlular
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
