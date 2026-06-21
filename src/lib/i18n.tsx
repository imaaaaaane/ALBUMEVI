import * as React from "react";

export type Lang = "EN" | "TR" | "AR";

type Dict = Record<string, string>;

const translations: Record<Lang, Dict> = {
  EN: {
    "nav.schoolLogin": "School Login",
    "nav.services": "Services",
    "nav.process": "Process",
    "nav.gallery": "Gallery",
    "nav.about": "About Us",
    "nav.contact": "Contact",
    "hero.badge": "B2B SCHOOL PHOTOGRAPHY",
    "hero.title1": "Redefining",
    "hero.title2": "The Purest Form of School Memories",
    "hero.subtitle":
      "The trusted brand in professional school photography. We capture joy-filled memories and leave a smile on every child's face.",
    "hero.ratingText": "200+ schools served with satisfaction",
    "hero.ratingAvg": "Average rating",
    "hero.monthlyStats": "38 school sessions",
    "hero.monthlyStatsSub": "This month",
    "cta.schoolLogin": "School Login",
    "cta.adminLogin": "Admin Login",
    "services.badge": "Our Services",
    "services.title": "Complete Photography Experience",
    "services.subtitle":
      "Okul fotoğrafçılığını yeniden tanımlıyoruz. Çekimden teslimata tüm süreç, uzman ekibimizin titiz denetimiyle yönetilir.",
    "services.card1.title": "Professional Portraits",
    "services.card1.desc":
      "Studio-quality portraits capturing each child's unique personality. We create unforgettable moments with natural light and backdrops.",
    "services.card2.title": "In-Classroom Group Photos",
    "services.card2.desc":
      "Group photography takes place directly in the classroom, where children are comfortable and pose naturally with friends.",
    "services.card3.title": "Effortless Logistics",
    "services.card3.desc":
      "We manage the entire process from schedule coordination to photo distribution. Zero extra load on school administration, maximum efficiency.",
    "services.card4.title": "Premium Albums & Print Products",
    "services.card4.desc":
      "We design, produce, and deliver custom hardcover albums, framed prints, and personalized photo keepsakes to families.",
    "process.badge": "Process",
    "process.title": "Four Steps to Perfect Portraits",
    "process.step1.title": "Discovery Call",
    "process.step1.desc":
      "We listen to your school's needs and expectations. We determine the date, location, and package preferences together.",
    "process.step2.title": "Professional Session",
    "process.step2.desc":
      "Our experienced team arrives at your school, makes children feel comfortable, and captures the best shot of each portrait.",
    "process.step3.title": "Careful Retouching",
    "process.step3.desc":
      "Each photo is meticulously edited for color balance and light optimization. Perfection without compromising naturalness.",
    "process.step4.title": "Physical Delivery",
    "process.step4.desc":
      "Printed custom albums and product packages are distributed to families via the school. Every package is carefully prepared.",
    "whyus.badge": "Why Us?",
    "whyus.title": "Long-Term Partnership Built on Trust",
    "whyus.desc":
      "With 12 years of experience and knowledge gained across 500+ schools, we remain the choice of returning school administrators. Our child-centric approach sets us apart.",
    "whyus.testimonial.author": "School Principal, Batman",
    "whyus.testimonial.text":
      '"Working with Albumevi has been an unforgettable experience for both our children and parents. Highly recommended."',
    "whyus.feature1": "ISO certified gear",
    "whyus.feature2": "24/7 customer support",
    "whyus.feature3": "Privacy & GDPR compliance",
    "whyus.feature4": "Flexible payment terms",
    "whyus.feature5": "Re-take session guarantee",
    "whyus.feature6": "Multi-lingual communication",
    "whyus.cta": "Contact Us",
    "contact.badge": "Contact",
    "contact.title": "Get a Custom Offer for Your School",
    "contact.desc":
      "Contact us today for custom pricing and packages tailored to your school's needs. Response guaranteed within 24 hours.",
    "contact.phone": "PHONE",
    "contact.email": "EMAIL",
    "contact.address": "ADDRESS",
    "contact.map.title": "Albumevi Batman Studio",
    "contact.map.subtitle": "Tilmerç Mh. İbrahim Hakkı Cd.",
    "contact.map.cta": "Get Directions",
    "lang.label": "Language",
    "school.welcome": "Welcome",
    "school.subtitle": "Browse the catalog and choose your packages.",
    "school.productPhoto": "Product photo",
    "school.choosePackage": "Choose Package",
    "school.selected": "selected",
    "school.orderHistory": "Your order history",
    "school.noOrders": "No orders yet. Pick packages above and submit your selection.",
    "school.pendingInvoice": "Pending invoice",
    "school.balanceDue": "Balance due",
    "school.downloadInvoice": "Download invoice",
    "school.invoicePending": "Invoice pending",
    "school.reviewSelection": "Review Selection",
    "school.itemsSelected": "item(s) selected",
    "school.total": "Total",
    "school.reviewYourSelection": "Review your selection",
    "school.noItemsSelected": "No items selected yet.",
    "school.submitSelection": "Submit Selection",
    "school.selectionSubmitted": "Selection submitted",
    "school.orderSent": "Your order has been sent to Albumevi for review.",
    "school.school": "School",
    "school.packages": "Packages",
    "school.basePriceTotal": "Base price total",
    "school.submitted": "Submitted",
    "school.status": "Status",
    "school.pendingReview": "Pending Review",
    "school.done": "Done",
    "school.signOut": "Sign out",
    "school.notFound": "School not found",
    "school.invalidLink": "This link may be invalid or expired.",
    "school.backHome": "Back to homepage",
    "login.school.title": "School Login",
    "login.school.subtitle": "Sign in to manage your school's photography sessions.",
    "login.username": "Username",
    "login.password": "Password",
    "login.button.signIn": "Sign In",
    "login.button.adminLink": "Admin Login →",
    "login.admin.title": "Admin Login",
    "login.admin.subtitle": "Main system administrator access.",
    "login.email": "Email",
    "login.button.enter": "Enter Dashboard",
    "login.button.schoolLink": "← Back to School Login",
    "login.email.placeholder": "Enter your email",
    "login.password.placeholder": "••••••••",
    "login.username.placeholder": "school-admin",
  },
  TR: {
    "nav.schoolLogin": "Okul Girişi",
    "nav.services": "Hizmetler",
    "nav.process": "Süreç",
    "nav.gallery": "Galeri",
    "nav.about": "Hakkımızda",
    "nav.contact": "İletişim",
    "hero.badge": "B2B OKUL FOTOĞRAFÇILIĞI",
    "hero.title1": "Okul Yıllarının En",
    "hero.title2": "Saf Halini Sanata Dönüştürüyoruz",
    "hero.subtitle":
      "Profesyonel okul fotoğrafçılığında Türkiye'nin güvendiği marka. Neşe dolu anıları yakalamak ve çocukların yüzünde gülümseme bırakmak için varız.",
    "hero.ratingText": "200+ okul memnuniyetle hizmet aldı",
    "hero.ratingAvg": "Ortalama puan",
    "hero.monthlyStats": "38 okul çekimi",
    "hero.monthlyStatsSub": "Bu ay",
    "cta.schoolLogin": "Okul Girişi",
    "cta.adminLogin": "Yönetici Girişi",
    "services.badge": "Hizmetlerimiz",
    "services.title": "Eksiksiz Fotoğrafçılık Deneyimi",
    "services.subtitle":
      "Okul fotoğrafçılığını yeniden tanımlıyoruz. Çekimden teslimata tüm süreç, uzman ekibimizin titiz denetimiyle yönetilir.",
    "services.card1.title": "Profesyonel Okul Portreleri",
    "services.card1.desc":
      "Her çocuğun özgün kişiliğini yansıtan, stüdyo kalitesinde portreler. Doğal ışık ve özenle seçilmiş arka planlarla unutulmaz anlar yaratıyoruz.",
    "services.card2.title": "Sınıf İçi Toplu Çekimler",
    "services.card2.desc":
      "Grup fotoğrafçılığı doğrudan sınıfın içinde gerçekleştirilir. Çocuklar alıştıkları ortamda, sınıf arkadaşlarıyla birlikte doğal ve samimi kareler verir.",
    "services.card3.title": "Zahmetsiz Lojistik",
    "services.card3.desc":
      "Randevu koordinasyonundan fotoğraf dağıtımına kadar tüm süreci biz yönetiyoruz. Okul idarenize sıfır ek yük, maksimum verimlilik.",
    "services.card4.title": "Özel Albümler ve Fiziksel Ürünler",
    "services.card4.desc":
      "Premium ciltli albümler, çerçeveli baskılar ve kişiselleştirilmiş fotoğraf ürünleri tasarlıyor, üretime alıyor ve ailelere teslim ediyoruz.",
    "process.badge": "Süreç",
    "process.title": "Dört Adımda Mükemmel Portreler",
    "process.step1.title": "Keşif Görüşmesi",
    "process.step1.desc":
      "Okulunuzun ihtiyaçlarını ve beklentilerini dinliyoruz. Tarih, lokasyon ve paket tercihlerini birlikte belirliyoruz.",
    "process.step2.title": "Profesyonel Çekim Günü",
    "process.step2.desc":
      "Deneyimli ekibimiz okulunuza gelir, çocukların rahat hissetmesini sağlar ve her portreden en iyi kareyi yakalar.",
    "process.step3.title": "Özenli Rötuş & Düzenleme",
    "process.step3.desc":
      "Her fotoğraf, renk dengesi ve ışık optimizasyonu için titizlikle işlenir. Doğallıktan ödün vermeden mükemmellik.",
    "process.step4.title": "Fiziksel Teslimat",
    "process.step4.desc":
      "Baskı süreçleri tamamlanan albümler ve ürün paketleri okul üzerinden ailelere dağıtılır. Her paket özenle hazırlanır.",
    "whyus.badge": "Neden Albumevi?",
    "whyus.title": "Güvene Dayalı Uzun Vadeli Ortaklık",
    "whyus.desc":
      "12 yıllık deneyimimiz ve 500'den fazla okulda edindiğimiz bilgi birikimi ile her yıl geri dönen okul yöneticilerinin tercihi olmaya devam ediyoruz. Çocukları merkeze alan yaklaşımımız bizi farklı kılıyor.",
    "whyus.testimonial.author": "Okul Müdürü, Batman",
    "whyus.testimonial.text":
      '"Albumevi ile çalışmak hem çocuklarımız hem de velilerimiz için unutulmaz bir deneyim oldu. Kesinlikle tavsiye ediyorum."',
    "whyus.feature1": "ISO sertifikalı ekipman",
    "whyus.feature2": "7/24 müşteri desteği",
    "whyus.feature3": "Gizlilik ve KVKK uyumu",
    "whyus.feature4": "Esnek ödeme seçenekleri",
    "whyus.feature5": "Yeniden çekim garantisi",
    "whyus.feature6": "Çok dilli iletişim desteği",
    "whyus.cta": "Bizimle İletişime Geç",
    "contact.badge": "İletişim",
    "contact.title": "Okulunuza Özel Teklif Alın",
    "contact.desc":
      "Okulunuzun ihtiyaçlarına özel fiyatlandırma ve paket önerileri için bugün bize ulaşın. 24 saat içinde geri dönüş garanti ediyoruz.",
    "contact.phone": "TELEFON",
    "contact.email": "E-POSTA",
    "contact.address": "ADRES",
    "contact.map.title": "Albumevi Batman Stüdyosu",
    "contact.map.subtitle": "Tilmerç Mh. İbrahim Hakkı Cd.",
    "contact.map.cta": "Yol Tarifi",
    "lang.label": "Dil",
    "school.welcome": "Hoş geldiniz",
    "school.subtitle": "Kataloğu inceleyin ve paketlerinizi seçin.",
    "school.productPhoto": "Ürün fotoğrafı",
    "school.choosePackage": "Paket Seç",
    "school.selected": "seçildi",
    "school.orderHistory": "Sipariş geçmişiniz",
    "school.noOrders": "Henüz sipariş yok. Yukarıdan paket seçip gönderin.",
    "school.pendingInvoice": "Bekleyen fatura",
    "school.balanceDue": "Ödenecek bakiye",
    "school.downloadInvoice": "Faturayı indir",
    "school.invoicePending": "Fatura bekleniyor",
    "school.reviewSelection": "Seçimi İncele",
    "school.itemsSelected": "ürün seçildi",
    "school.total": "Toplam",
    "school.reviewYourSelection": "Seçiminizi inceleyin",
    "school.noItemsSelected": "Henüz ürün seçilmedi.",
    "school.submitSelection": "Seçimi Gönder",
    "school.selectionSubmitted": "Seçim gönderildi",
    "school.orderSent": "Siparişiniz Albumevi'ne inceleme için gönderildi.",
    "school.school": "Okul",
    "school.packages": "Paketler",
    "school.basePriceTotal": "Temel fiyat toplamı",
    "school.submitted": "Gönderildi",
    "school.status": "Durum",
    "school.pendingReview": "İnceleme Bekliyor",
    "school.done": "Tamam",
    "school.signOut": "Çıkış yap",
    "school.notFound": "Okul bulunamadı",
    "school.invalidLink": "Bu bağlantı geçersiz veya süresi dolmuş olabilir.",
    "school.backHome": "Ana sayfaya dön",
    "login.school.title": "Okul Girişi",
    "login.school.subtitle": "Okulunuzun fotoğraf çekim seanslarını yönetmek için giriş yapın.",
    "login.username": "Kullanıcı Adı",
    "login.password": "Şifre",
    "login.button.signIn": "Giriş Yap",
    "login.button.adminLink": "Yönetici Girişi →",
    "login.admin.title": "Yönetici Girişi",
    "login.admin.subtitle": "Ana sistem yöneticisi erişimi.",
    "login.email": "E-posta",
    "login.button.enter": "Panele Gir",
    "login.button.schoolLink": "← Okul Girişine Dön",
    "login.email.placeholder": "E-postanızı girin",
    "login.password.placeholder": "••••••••",
    "login.username.placeholder": "okul-yoneticisi",
  },
  AR: {
    "nav.schoolLogin": "دخول المدرسة",
    "nav.services": "الخدمات",
    "nav.process": "العملية",
    "nav.gallery": "المعرض",
    "nav.about": "من نحن",
    "nav.contact": "اتصل بنا",
    "hero.badge": "تصوير المدارس B2B",
    "hero.title1": "تحويل السنوات المدرسية",
    "hero.title2": "إلى فن خالص",
    "hero.subtitle":
      "العلامة التجارية الموثوقة في تصوير المدارس الاحترافي. نحن نلتقط ذكريات مليئة بالفرح ونرسم ابتسامة على وجه كل طفل.",
    "hero.ratingText": "أكثر من 200 مدرسة تم تقديم الخدمة لها برضا تام",
    "hero.ratingAvg": "متوسط التقييم",
    "hero.monthlyStats": "38 جلسة تصوير",
    "hero.monthlyStatsSub": "هذا الشهر",
    "cta.schoolLogin": "دخول المدرسة",
    "cta.adminLogin": "دخول المسؤول",
    "services.badge": "خدماتنا",
    "services.title": "تجربة تصوير متكاملة",
    "services.subtitle":
      "نعيد تعريف تصوير المدارس. تتم إدارة العملية بأكملها من الجلسة إلى التسليم بدقة.",
    "services.card1.title": "صور شخصية احترافية",
    "services.card1.desc":
      "صور شخصية بجودة الاستوديو تلتقط شخصية كل طفل الفريدة. نخلق لحظات لا تنسى بالضوء الطبيعي والخلفيات.",
    "services.card2.title": "الصور الجماعية داخل الصف",
    "services.card2.desc":
      "يتم التصوير الجماعي مباشرة داخل الفصل، حيث يشعر الأطفال بالراحة ويلتقطون صوراً طبيعية مع أصدقائهم.",
    "services.card3.title": "خدمات لوجستية سهلة",
    "services.card3.desc":
      "ندير العملية برمتها من تنسيق المواعيد إلى توزيع الصور. عبء صفر على إدارة المدرسة، وكفاءة قصوى.",
    "services.card4.title": "ألبومات ومنتجات مطبوعة مميزة",
    "services.card4.desc":
      "نصمم وننتج ونسلم ألبومات ذات غلاف فني ممتاز، ومطبوعات مؤطرة، ومنتجات صور مخصصة للعائلات.",
    "process.badge": "العملية",
    "process.title": "أربع خطوات لصور مثالية",
    "process.step1.title": "جلسة الاستكشاف",
    "process.step1.desc":
      "نستمع إلى احتياجات وتوقعات مدرستك. نحدد التاريخ والموقع وتفضيلات الباقة معاً.",
    "process.step2.title": "جلسة تصوير احترافية",
    "process.step2.desc":
      "يصل فريقنا ذو الخبرة إلى مدرستك، ويجعل الأطفال يشعرون بالراحة، ويلتقط أفضل لقطة لكل صورة شخصية.",
    "process.step3.title": "تعديل ورتوش دقيقة",
    "process.step3.desc":
      "يتم تعديل كل صورة بدقة لتحقيق توازن الألوان وتحسين الإضاءة. الكمال دون المساس بالطبيعة.",
    "process.step4.title": "التسليم الفعلي",
    "process.step4.desc":
      "يتم توزيع ألبومات مخصصة ومجموعات منتجات مطبوعة للعائلات من خلال المدرسة. يتم تحضير كل عبوة بعناية.",
    "whyus.badge": "لماذا نحن؟",
    "whyus.title": "شراكة طويلة الأمد مبنية على الثقة",
    "whyus.desc":
      "مع 12 عاماً من الخبرة والمعرفة المكتسبة في أكثر من 500 مدرسة، نواصل كونا خيار مديري المدارس. نهجنا المرتكز على الطفل يميزنا.",
    "whyus.testimonial.author": "مدير المدرسة، باتمان",
    "whyus.testimonial.text":
      '"لقد كانت تجربة العمل مع Albumevi تجربة لا تنسى لأطفالنا وأولياء أمورهم. نوصي بها بشدة."',
    "whyus.feature1": "معدات معتمدة من ISO",
    "whyus.feature2": "دعم العملاء على مدار الساعة",
    "whyus.feature3": "الخصوصية والامتثال لـ GDPR",
    "whyus.feature4": "شروط دفع مرنة",
    "whyus.feature5": "ضمان إعادة التصوير",
    "whyus.feature6": "تواصل متعدد اللغات",
    "whyus.cta": "اتصل بنا",
    "contact.badge": "اتصال",
    "contact.title": "احصل على عرض مخصص لمدرستك",
    "contact.desc":
      "اتصل بنا اليوم للحصول على أسعار وباقات مخصصة تناسب احتياجات مدرستك. الرد مضمون خلال 24 ساعة.",
    "contact.phone": "هاتف",
    "contact.email": "بريد إلكتروني",
    "contact.address": "عنوان",
    "contact.map.title": "استوديو Albumevi باتمان",
    "contact.map.subtitle": "Tilmerç Mh. İbrahim Hakkı Cd.",
    "contact.map.cta": "احصل على الاتجاهات",
    "lang.label": "اللغة",
    "school.welcome": "أهلاً بك",
    "school.subtitle": "تصفح الكتالوج واختر باقاتك.",
    "school.productPhoto": "صورة المنتج",
    "school.choosePackage": "اختر الباقة",
    "school.selected": "مُختار",
    "school.orderHistory": "سجل الطلبات",
    "school.noOrders": "لا توجد طلبات بعد. اختر الباقات أعلاه وأرسل اختيارك.",
    "school.pendingInvoice": "فاتورة معلقة",
    "school.balanceDue": "الرصيد المستحق",
    "school.downloadInvoice": "تحميل الفاتورة",
    "school.invoicePending": "الفاتورة معلقة",
    "school.reviewSelection": "مراجعة الاختيار",
    "school.itemsSelected": "عنصر مختار",
    "school.total": "الإجمالي",
    "school.reviewYourSelection": "راجع اختيارك",
    "school.noItemsSelected": "لم يُختر أي عنصر بعد.",
    "school.submitSelection": "إرسال الاختيار",
    "school.selectionSubmitted": "تم إرسال الاختيار",
    "school.orderSent": "تم إرسال طلبك إلى Albumevi للمراجعة.",
    "school.school": "المدرسة",
    "school.packages": "الباقات",
    "school.basePriceTotal": "إجمالي السعر الأساسي",
    "school.submitted": "تم الإرسال",
    "school.status": "الحالة",
    "school.pendingReview": "قيد المراجعة",
    "school.done": "تم",
    "school.signOut": "تسجيل الخروج",
    "school.notFound": "المدرسة غير موجودة",
    "school.invalidLink": "قد يكون هذا الرابط غير صالح أو منتهي الصلاحية.",
    "school.backHome": "العودة إلى الصفحة الرئيسية",
    "login.school.title": "دخول المدرسة",
    "login.school.subtitle": "سجل الدخول لإدارة جلسات التصوير الخاصة بمدرستك.",
    "login.username": "اسم المستخدم",
    "login.password": "كلمة المرور",
    "login.button.signIn": "تسجيل الدخول",
    "login.button.adminLink": "دخول المسؤول ←",
    "login.admin.title": "دخول المسؤول",
    "login.admin.subtitle": "وصول مسؤول النظام الرئيسي.",
    "login.email": "البريد الإلكتروني",
    "login.button.enter": "دخول لوحة التحكم",
    "login.button.schoolLink": "← العودة إلى دخول المدرسة",
    "login.email.placeholder": "أدخل بريدك الإلكتروني",
    "login.password.placeholder": "••••••••",
    "login.username.placeholder": "مسؤول-المدرسة",
  },
};

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
}

const I18nContext = React.createContext<Ctx | null>(null);

const STORAGE_KEY = "albumevi.lang";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Lang>("TR");

  React.useEffect(() => {
    const stored = (typeof window !== "undefined" &&
      localStorage.getItem(STORAGE_KEY)) as Lang | null;
    if (stored && translations[stored]) setLangState(stored);
  }, []);

  const dir: "ltr" | "rtl" = lang === "AR" ? "rtl" : "ltr";

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang.toLowerCase();
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = React.useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {}
  }, []);

  const t = React.useCallback(
    (key: string) => translations[lang][key] ?? translations.EN[key] ?? key,
    [lang],
  );

  return <I18nContext.Provider value={{ lang, setLang, t, dir }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = React.useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
