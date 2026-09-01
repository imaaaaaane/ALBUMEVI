import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Lock, ArrowRight, ArrowLeft, CheckCircle2, FileSpreadsheet, LogOut, ChevronRight, FileWarning, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from 'xlsx-js-style';

export const Route = createFileRoute("/portal/$schoolId")({
  component: SchoolPortal,
});

// Interfaces for mock data
interface Student {
  id: string;
  name: string;
  packageSelection: string | null;
  image_url?: string;
}

interface SchoolClass {
  id: string;
  className: string;
  studentCount: number;
  students: Student[];
}

interface SchoolDetails {
  package1_name: string;
  package1_price: number;
  package2_name: string;
  package2_price: number;
  login_username: string;
  password?: string; // used for checking
}

function SchoolPortal() {
  const { schoolId } = Route.useParams();

  const [showGuide, setShowGuide] = useState(() => {
    if (typeof window !== "undefined") {
      const hasSeenGuide = localStorage.getItem(`portal_has_seen_guide_${schoolId}`);
      return !hasSeenGuide;
    }
    return true;
  });

  const [step, setStep] = useState<2 | 3 | 4 | 5>(() => {
    if (typeof window !== "undefined") {
      const savedStep = sessionStorage.getItem(`portal_step_${schoolId}`);
      if (savedStep && parseFloat(savedStep) > 1) return parseFloat(savedStep) as any;
    }
    return 2;
  });

  useEffect(() => {
    sessionStorage.setItem(`portal_step_${schoolId}`, step.toString());
  }, [step, schoolId]);

  const [schoolDetails, setSchoolDetails] = useState<SchoolDetails | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [actualSchoolId, setActualSchoolId] = useState<string | null>(null);

  // Auth State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Selection State
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null);
  const [selections, setSelections] = useState<Record<string, string[]>>(() => {
    if (typeof window !== "undefined") {
      const savedSelections = sessionStorage.getItem(`portal_selections_${schoolId}`);
      if (savedSelections) return JSON.parse(savedSelections);
    }
    return {};
  });

  useEffect(() => {
    sessionStorage.setItem(`portal_selections_${schoolId}`, JSON.stringify(selections));
  }, [selections, schoolId]);

  useEffect(() => {
    if (classes.length > 0 && typeof window !== "undefined") {
      const savedClassId = sessionStorage.getItem(`portal_class_${schoolId}`);
      if (savedClassId) {
        const found = classes.find(c => c.id === savedClassId);
        if (found) setSelectedClass(found);
      }
    }
  }, [classes, schoolId]);

  useEffect(() => {
    if (selectedClass) {
      sessionStorage.setItem(`portal_class_${schoolId}`, selectedClass.id);
    } else {
      sessionStorage.removeItem(`portal_class_${schoolId}`);
    }
  }, [selectedClass, schoolId]);

  const [authError, setAuthError] = useState<{message: string, details?: string} | null>(null);
  const [isCheckingExpiration, setIsCheckingExpiration] = useState(true);
  const [schoolName, setSchoolName] = useState("");
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    if (step === 3 && schoolName) {
      const textToType = `Hoş Geldiniz ${schoolName}`;
      let i = 0;
      setDisplayedText("");
      const intervalId = setInterval(() => {
        setDisplayedText(textToType.slice(0, i + 1));
        i++;
        if (i >= textToType.length) {
          clearInterval(intervalId);
        }
      }, 120);
      return () => clearInterval(intervalId);
    }
  }, [step, schoolName]);

  useEffect(() => {
    const checkExpiration = async () => {
      try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(schoolId || '');
        const queryColumn = isUUID ? 'id' : 'unique_link_slug';

        const { data: school, error } = await (supabase as any)
          .from("schools")
          .select("id, name")
          .eq(queryColumn, schoolId)
          .maybeSingle();

        if (error) {
          console.error("LOGIN_DB_ERROR (Initial Fetch):", error);
          setAuthError({ message: error.message, details: error.details });
          setIsCheckingExpiration(false);
          return;
        }

        if (!school) {
          console.warn("[Portal] HATA: Supabase döndü ancak school verisi 'null'. RLS okuma izni vermiyor olabilir veya kayıt bulunamadı.");
          setAuthError({ message: "Portal not found or invalid credentials." });
          setIsCheckingExpiration(false);
          return;
        }

        setActualSchoolId(school.id);
        setSchoolName(school.name);
        
        setIsCheckingExpiration(false);
      } catch (err: any) {
        console.error("Unexpected error:", err);
        setAuthError({ message: err.message || "Bilinmeyen hata", details: err.toString() });
        setIsCheckingExpiration(false);
      }
    };
    checkExpiration();
  }, [schoolId]);

  // Load from Local Storage on Mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedDetails = localStorage.getItem(`mock_school_details_${schoolId}`);
      if (storedDetails) {
        setSchoolDetails(JSON.parse(storedDetails));
      } else {
        setSchoolDetails({
          package1_name: "Paket 1",
          package1_price: 150,
          package2_name: "Paket 2",
          package2_price: 250,
          login_username: "admin",
          password: "password123"
        });
      }
    }

    const fetchClasses = async () => {
      try {
        const { data: dbClasses, error } = await (supabase as any)
          .from("classes")
          .select("id, name, students(id, name, image_url, selection)")
          .eq("school_id", actualSchoolId)
          .order("created_at", { ascending: true });

        if (error) throw error;

        let hasSelections = false;
        const initialSelections: Record<string, string[]> = {};

        if (dbClasses) {
          const mappedClasses = dbClasses.map((c: any) => ({
            id: c.id,
            className: c.name,
            studentCount: c.students?.length || 0,
            students: (c.students || []).map((s: any) => {
              if (s.selection) {
                hasSelections = true;
                let parsedSelection: string[] = [];
                try {
                  parsedSelection = JSON.parse(s.selection);
                } catch {
                  parsedSelection = s.selection.split(',').filter(Boolean);
                }
                initialSelections[s.id] = parsedSelection;
              }
              return {
                id: s.id,
                name: s.name,
                image_url: s.image_url,
                packageSelection: s.selection || null // Kept for backwards compatibility but we use selections state
              };
            })
          }));
          setClasses(mappedClasses);
          setSelections(prev => ({ ...initialSelections, ...prev }));
        }
      } catch (error: any) {
        toast.error("Sınıflar yüklenirken hata oluştu.");
      }
    };

    if (actualSchoolId) {
      fetchClasses();
    }
  }, [actualSchoolId]);

  // Persist classes to local storage on change
  const persistClasses = (updatedClasses: SchoolClass[]) => {
    setClasses(updatedClasses);
    if (typeof window !== "undefined") {
      localStorage.setItem(`mock_school_classes_${schoolId}`, JSON.stringify(updatedClasses));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(schoolId || '');
      const queryColumn = isUUID ? 'id' : 'unique_link_slug';

      console.log('Login Payload:', { portalId: schoolId, username: trimmedUsername, password: trimmedPassword });

      // Pure unauthenticated DB query filtering by credentials in SQL
      const { data, error } = await (supabase as any)
        .from("schools")
        .select("*")
        .eq(queryColumn, schoolId)
        .ilike("login_username", trimmedUsername)
        .eq("login_password", trimmedPassword)
        .maybeSingle();

      if (error) {
        console.error("LOGIN_DB_ERROR:", error);
      }

      if (data) {
        setStep(3);
      } else {
        toast.error("Hatalı kullanıcı adı veya şifre");
      }
    } catch (err) {
      console.error("LOGIN_EXCEPTION:", err);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    setUsername("");
    setPassword("");
    setStep(2);
  };

  const handleStudentSelectionChange = (studentId: string, selection: string) => {
    setSelections(prev => {
      const current = prev[studentId] || [];
      if (current.includes(selection)) {
        const updated = current.filter(id => id !== selection);
        if (updated.length === 0) {
          const copy = { ...prev };
          delete copy[studentId];
          return copy;
        }
        return { ...prev, [studentId]: updated };
      } else {
        return { ...prev, [studentId]: [...current, selection] };
      }
    });
  };

  const saveClassSelections = async () => {
    if (!selectedClass) return;

    // Update Supabase
    try {
      const updates = selectedClass.students
        .map(async s => {
          const selectionArr = selections[s.id] || [];
          const { error } = await (supabase as any)
            .from("students")
            .update({ selection: selectionArr.join(',') })
            .eq("id", s.id);
          if (error) throw error;
        });
      await Promise.all(updates);
      toast.success(`${selectedClass.className} sınıfı seçimleri kaydedildi.`);
      setStep(5);
    } catch (e) {
      toast.error("Seçimler kaydedilirken bir hata oluştu.");
    }
  };

  // Helper calculation for Step 5
  const getSummary = () => {
    let totalP1 = 0;
    let totalP2 = 0;

    const p1Price = schoolDetails?.package1_price || 0;
    const p2Price = schoolDetails?.package2_price || 0;

    const rowData = classes.map(c => {
      let p1 = 0;
      let p2 = 0;
      c.students.forEach(s => {
        const studentSelections = selections[s.id] || [];
        if (studentSelections.includes("paket1")) p1++;
        if (studentSelections.includes("paket2")) p2++;
      });
      totalP1 += p1;
      totalP2 += p2;
      const classTotal = (p1 * p1Price) + (p2 * p2Price);
      return { className: c.className, p1, p2, classTotal };
    });

    const totalTRY = (totalP1 * p1Price) + (totalP2 * p2Price);

    return { rowData, totalP1, totalP2, totalTRY };
  };

  const downloadExcel = () => {
    const summary = getSummary();
    const p1Name = schoolDetails?.package1_name || 'Paket 1';
    const p2Name = schoolDetails?.package2_name || 'Paket 2';
    const p1Price = schoolDetails?.package1_price || 0;
    const p2Price = schoolDetails?.package2_price || 0;

    const dataMatrix = [];

    // ROW 1: Prices
    dataMatrix.push(['', '', `${p1Price} ₺`, `${p2Price} ₺`, '', '']);

    // ROW 2: Headers
    dataMatrix.push(['SIRA NO', 'SINIF/ŞUBE', p1Name, p2Name, 'TOPLAM SATIŞ', 'TOPLAM TUTAR']);

    // DATA ROWS
    let totalQtyP1 = 0;
    let totalQtyP2 = 0;

    summary.rowData.forEach((row, index) => {
      const totalQty = row.p1 + row.p2;
      totalQtyP1 += row.p1;
      totalQtyP2 += row.p2;

      dataMatrix.push([
        index + 1,
        row.className,
        row.p1,
        row.p2,
        totalQty,
        `${row.classTotal} ₺`
      ]);
    });

    // BOTTOM ROW
    const grandTotalQty = totalQtyP1 + totalQtyP2;
    dataMatrix.push([
      '',
      'GENEL TOPLAM',
      totalQtyP1,
      totalQtyP2,
      grandTotalQty,
      `${summary.totalTRY} ₺`
    ]);

    const ws = XLSX.utils.aoa_to_sheet(dataMatrix);

    // Set Column Widths
    ws['!cols'] = [
      { wpx: 60 },
      { wpx: 150 },
      { wpx: 200 },
      { wpx: 200 },
      { wpx: 120 },
      { wpx: 120 }
    ];

    // Apply Styles
    for (const cell in ws) {
      if (cell[0] === '!') continue;

      const row = parseFloat(cell.replace(/\D/g, '')) - 1;

      if (!ws[cell].s) ws[cell].s = {};

      if (row === 0) {
        // Price Row (Row 1)
        ws[cell].s = { font: { bold: true }, alignment: { horizontal: "center" } };
      } else if (row === 1) {
        // Header Row (Row 2)
        ws[cell].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "4F4F4F" } },
          alignment: { horizontal: "center" }
        };
      } else if (row === dataMatrix.length - 1) {
        // Grand Total Row (Bottom Row)
        ws[cell].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "E5E7EB" } }
        };
      } else {
        // Normal Data Rows
        ws[cell].s = { alignment: { horizontal: "center" } };
        // Left align Class names
        if (cell.startsWith('B')) {
          ws[cell].s = { alignment: { horizontal: "left" } };
        }
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Okul Siparişleri");
    XLSX.writeFile(wb, "Okul_Siparis_Ozeti.xlsx");

    toast.success("Özet dosyası (.xlsx) başarıyla indirildi.");
  };

  const goBack = () => {
    if (step === 3) setStep(2);
    else if (step === 4) setStep(3);
    else if (step === 5) setStep(3);
  };

  if (isCheckingExpiration) {
    return <div className="min-h-screen bg-[#131316] flex items-center justify-center text-white/50">Kontrol ediliyor...</div>;
  }

  if (authError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="rounded-lg bg-red-50 p-6 text-center text-red-600 shadow-sm border border-red-100">
          <FileWarning className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h2 className="mb-2 text-xl font-bold">Portal not found or invalid credentials.</h2>
          {authError.details && <p className="text-sm opacity-80 mt-2">{authError.details}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#1a1714] to-black text-white selection:bg-[#A67C52] selection:text-white font-sans overflow-x-hidden pb-32">
      {/* Guide Modal Overlay */}
      <AnimatePresence>
        {showGuide && (
          <motion.div
            key="guide-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md border border-white/10"
          >
            <div className="max-w-lg w-full bg-black/40 backdrop-blur-lg border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#A67C52]/20 blur-[100px] rounded-full" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#A67C52]/20 blur-[100px] rounded-full" />

              <div className="relative z-10 text-center">
                <div className="mx-auto w-16 h-16 bg-[#A67C52]/20 rounded-full flex items-center justify-center mb-6">
                  <Info className="w-8 h-8 text-[#A67C52]" />
                </div>
                <h1 className="text-3xl font-bold mb-4 tracking-tight">Hoş Geldiniz</h1>
                <p className="text-white/60 mb-8 leading-relaxed">
                  ALBÜMEVİ okul fotoğrafçılığı portalına hoş geldiniz. Bu portal üzerinden, öğrencilerinizin paket seçimlerini hızlı ve kolay bir şekilde yönetebilirsiniz. Lütfen size verilen kullanıcı adı ve şifre ile giriş yapın.
                </p>

                <div className="space-y-4 mb-8 text-left">
                  <div className="flex gap-3 text-sm text-white/80">
                    <CheckCircle2 className="w-5 h-5 text-[#A67C52] shrink-0" />
                    <p>Size atanan kullanıcı adı ve şifre ile giriş yapın.</p>
                  </div>
                  <div className="flex gap-3 text-sm text-white/80">
                    <CheckCircle2 className="w-5 h-5 text-[#A67C52] shrink-0" />
                    <p>Sınıfınızı seçin ve listedeki öğrenciler için paketleri belirleyin.</p>
                  </div>
                  <div className="flex gap-3 text-sm text-white/80">
                    <CheckCircle2 className="w-5 h-5 text-[#A67C52] shrink-0" />
                    <p>Seçimlerinizi onaylayın ve genel özeti görüntüleyin.</p>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    setShowGuide(false);
                    localStorage.setItem(`portal_has_seen_guide_${schoolId}`, "true");
                  }}
                  className="w-full h-12 bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-semibold rounded-xl text-lg"
                >
                  Anladım, Devam Et <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* STEP 2: Login */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex items-center justify-center min-h-screen p-4"
          >
            <div className="max-w-sm w-full bg-black/40 backdrop-blur-lg border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl relative">
              <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-[#A67C52]/20 flex items-center justify-center mb-4">
                  <Lock className="w-8 h-8 text-[#A67C52]" />
                </div>
                <h2 className="text-xl font-bold text-white">Öğretmen Girişi</h2>
                <p className="text-white/50 text-sm mt-2 text-center">Size verilen bilgileri girin.</p>
              </div>

              <form onSubmit={handleLogin}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-white/70">Kullanıcı Adı</Label>
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoFocus
                      autoComplete="off"
                      className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus-visible:ring-[#A67C52]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">Şifre</Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      name="new-password"
                      autoComplete="new-password"
                      className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus-visible:ring-[#A67C52]"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-bold h-12 rounded-xl w-full mt-2"
                  >
                    Giriş Yap
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowGuide(true)}
                    className="w-full text-white/50 hover:text-white mt-2"
                  >
                    Kılavuzu Göster
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {/* STEP 3: Dashboard */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-6xl mx-auto px-4 pt-8"
          >
            {/* Header */}
            <div className="flex flex-col md:relative md:flex-row items-center justify-between bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-2xl mb-8 gap-4 md:gap-0">
              <div className="flex w-full md:w-auto justify-between items-center">
                <img src="/logo.jpg" alt="ALBÜMEVİ" className="h-10 rounded-md object-contain" />
                <div className="flex items-center gap-2 md:hidden">
                  <Button variant="ghost" size="sm" onClick={() => setShowGuide(true)} className="text-white/50 hover:text-white">
                    <Info className="w-4 h-4 mr-1" />
                    Kılavuz
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleLogout} className="text-white/50 hover:text-white">
                    <LogOut className="w-5 h-5" />
                  </Button>
                </div>
              </div>
              <h1 className="text-base md:text-xl font-bold font-serif tracking-widest italic text-white md:absolute md:left-1/2 md:-translate-x-1/2 text-center whitespace-nowrap overflow-hidden text-ellipsis w-full md:w-auto">
                {displayedText}
              </h1>
              <div className="hidden md:flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowGuide(true)} className="text-white/50 hover:text-white">
                  <Info className="w-4 h-4 mr-2" />
                  Kılavuz
                </Button>
                <Button variant="ghost" size="icon" onClick={handleLogout} className="text-white/50 hover:text-white">
                  <LogOut className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Packages */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
              <div className="bg-black/40 backdrop-blur-md border border-white/10 p-4 md:p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden gap-2 md:gap-0">
                <div>
                  <p className="text-white/50 font-semibold text-sm mb-1">PAKET 1</p>
                  <h3 className="text-xl md:text-2xl font-bold">{schoolDetails?.package1_name}</h3>
                </div>
                <div className="text-2xl md:text-3xl font-bold">{schoolDetails?.package1_price} ₺</div>
              </div>
              <div className="bg-black/40 backdrop-blur-md border border-white/10 p-4 md:p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden gap-2 md:gap-0">
                <div>
                  <p className="text-white/50 font-semibold text-sm mb-1">PAKET 2</p>
                  <h3 className="text-xl md:text-2xl font-bold">{schoolDetails?.package2_name}</h3>
                </div>
                <div className="text-2xl md:text-3xl font-bold">{schoolDetails?.package2_price} ₺</div>
              </div>
            </div>

            {/* Classes Grid */}
            <h3 className="text-xl font-bold mb-6">Sınıflar / Şubeler</h3>
            {classes.length === 0 ? (
              <div className="text-center py-20 text-white/40 border border-white/5 rounded-2xl border-dashed">
                Sınıf bulunamadı. Lütfen yönetici ile iletişime geçin.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {classes.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedClass(c);
                      setStep(4);
                    }}
                    className="group bg-black/40 backdrop-blur-md hover:bg-[#A67C52]/10 border border-white/10 hover:border-[#A67C52]/30 p-4 md:p-6 rounded-2xl text-left transition-all duration-300 relative overflow-hidden cursor-pointer min-h-[44px]"
                  >
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                      <ChevronRight className="w-6 h-6 text-[#A67C52]" />
                    </div>
                    <div className="text-4xl font-black mb-2 text-white/80 group-hover:text-white">{c.className}</div>
                    <div className="text-sm text-white/50">{c.studentCount} Öğrenci</div>
                  </button>
                ))}
              </div>
            )}

            {/* View Summary Button */}
            <div className="mt-12 text-center">
              <Button onClick={() => setStep(5)} variant="outline" className="border-white/10 hover:bg-white/5 hover:text-white bg-transparent h-12 px-8 rounded-xl">
                <FileSpreadsheet className="w-5 h-5 mr-2" /> Genel Özeti Görüntüle
              </Button>
            </div>
          </motion.div>
        )}

        {/* STEP 4: Selection View */}
        {step === 4 && selectedClass && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-6xl mx-auto px-4 pt-8"
          >
            <div className="flex items-center gap-4 mb-8">
              <Button variant="ghost" size="icon" onClick={() => setStep(3)} className="text-white/50 hover:text-white shrink-0">
                <ArrowLeft className="w-6 h-6" />
              </Button>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">{selectedClass.className} Sınıfı Seçimleri</h2>
                <p className="text-white/50">Öğrencilerin paket seçimlerini belirleyin.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-24">
              {selectedClass.students.map(s => (
                <div key={s.id} className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 md:p-5 shadow-lg flex flex-col">
                  <div className="flex flex-col items-center mb-5 border-b border-white/10 pb-4">
                    <h4 className="font-bold text-lg mb-3">{s.name}</h4>
                    <div className="w-full aspect-[3/4] bg-white/5 rounded-xl overflow-hidden flex items-center justify-center border border-white/10">
                      {s.image_url ? (
                        <img src={s.image_url} alt={s.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-12 h-12 text-white/20" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className={`flex items-center min-h-[44px] p-3 rounded-xl cursor-pointer border transition-colors ${selections[s.id]?.includes('paket1') ? 'bg-[#A67C52]/20 border-[#A67C52] text-white' : 'bg-transparent border-white/10 text-white/70 hover:border-white/30'}`}>
                      <input
                        type="checkbox"
                        name={`package_${s.id}_paket1`}
                        value="paket1"
                        className="hidden"
                        checked={selections[s.id]?.includes('paket1') || false}
                        onChange={() => handleStudentSelectionChange(s.id, 'paket1')}
                      />
                      <div className={`w-5 h-5 rounded-md border-2 mr-3 flex items-center justify-center ${selections[s.id]?.includes('paket1') ? 'bg-[#A67C52] border-[#A67C52]' : 'border-white/30'}`}>
                        {selections[s.id]?.includes('paket1') && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </div>
                      <span className="font-medium text-sm flex-1">{schoolDetails?.package1_name || 'Paket 1'}</span>
                    </label>

                    <label className={`flex items-center min-h-[44px] p-3 rounded-xl cursor-pointer border transition-colors ${selections[s.id]?.includes('paket2') ? 'bg-white/10 border-white text-white' : 'bg-transparent border-white/10 text-white/70 hover:border-white/30'}`}>
                      <input
                        type="checkbox"
                        name={`package_${s.id}_paket2`}
                        value="paket2"
                        className="hidden"
                        checked={selections[s.id]?.includes('paket2') || false}
                        onChange={() => handleStudentSelectionChange(s.id, 'paket2')}
                      />
                      <div className={`w-5 h-5 rounded-md border-2 mr-3 flex items-center justify-center ${selections[s.id]?.includes('paket2') ? 'bg-white border-white' : 'border-white/30'}`}>
                        {selections[s.id]?.includes('paket2') && <CheckCircle2 className="w-4 h-4 text-black" />}
                      </div>
                      <span className="font-medium text-sm flex-1">{schoolDetails?.package2_name || 'Paket 2'}</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            {/* Sticky Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-black/40 backdrop-blur-xl border-t border-white/10 p-4 z-50">
              <div className="max-w-6xl mx-auto flex justify-between items-center gap-4">
                <div className="text-white/60 text-sm hidden sm:block">
                  Seçilmeyen öğrenciler <strong className="text-white">boş</strong> kabul edilecektir.
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Button variant="ghost" onClick={() => setStep(3)} className="text-white hover:bg-white/10 h-12 px-6 rounded-xl w-full sm:w-auto">
                    Vazgeç
                  </Button>
                  <Button onClick={saveClassSelections} className="bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-bold h-12 px-10 rounded-xl shadow-xl shadow-[#A67C52]/20 w-full sm:w-auto">
                    Onayla ve Kaydet <CheckCircle2 className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 5: Excel Summary */}
        {step === 5 && (
          <motion.div
            key="step5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-5xl mx-auto px-4 pt-8"
          >
            <div className="flex items-center gap-4 mb-8">
              <Button variant="ghost" size="icon" onClick={() => setStep(3)} className="text-white/50 hover:text-white shrink-0">
                <ArrowLeft className="w-6 h-6" />
              </Button>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Genel Özet Listesi</h2>
                <p className="text-white/50">Tüm sınıfların derlenmiş paket seçim tablosu.</p>
              </div>
            </div>

            <div className="bg-black/40 backdrop-blur-lg border border-white/10 rounded-xl shadow-xl overflow-hidden text-white mb-8">
              <div className="bg-black/20 border-b border-white/10 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-[#A67C52]" />
                  <span className="font-semibold text-sm">Okul_Siparis_Ozeti.xlsx</span>
                </div>
                <Button
                  size="sm"
                  onClick={downloadExcel}
                  className="bg-[#A67C52] hover:bg-[#A67C52]/90 text-white border-none h-8"
                >
                  Excel'e Aktar
                </Button>
              </div>
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="font-bold text-white/70">Şube</TableHead>
                    <TableHead className="text-right font-bold text-white/70">{schoolDetails?.package1_name || 'Paket 1'}</TableHead>
                    <TableHead className="text-right font-bold text-white/70">{schoolDetails?.package2_name || 'Paket 2'}</TableHead>
                    <TableHead className="text-right font-bold text-[#A67C52]">Sınıf Toplamı</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getSummary().rowData.map((row, i) => (
                    <TableRow key={i} className="border-white/10 hover:bg-white/5 transition-colors">
                      <TableCell className="font-medium">{row.className}</TableCell>
                      <TableCell className="text-right text-white/80">{row.p1}</TableCell>
                      <TableCell className="text-right text-white/80">{row.p2}</TableCell>
                      <TableCell className="text-right font-bold text-[#A67C52]">{Number(row.classTotal).toLocaleString()} ₺</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-none bg-[#A67C52]/5 hover:bg-[#A67C52]/5">
                    <TableCell className="font-bold text-[#A67C52]">GENEL TOPLAM</TableCell>
                    <TableCell className="text-right font-bold text-[#A67C52]">{getSummary().totalP1}</TableCell>
                    <TableCell className="text-right font-bold text-[#A67C52]">{getSummary().totalP2}</TableCell>
                    <TableCell className="text-right font-black text-[#A67C52] text-lg">{Number(getSummary().totalTRY).toLocaleString()} ₺</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="bg-black/20 p-6 flex justify-end">
                <div className="text-right">
                  <div className="text-sm text-white/50 mb-1">Hesaplanan Toplam Tutar</div>
                  <div className="text-4xl font-black text-[#A67C52]">{getSummary().totalTRY.toLocaleString()} ₺</div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <Button onClick={() => setStep(3)} variant="ghost" className="text-white/50 hover:text-white">
                Sınıflara Dön
              </Button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

// Just an info icon for Step 1
function InfoIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}
