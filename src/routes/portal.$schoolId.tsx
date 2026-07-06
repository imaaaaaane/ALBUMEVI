import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Lock, ArrowRight, ArrowLeft, CheckCircle2, FileSpreadsheet, LogOut, ChevronRight, FileWarning } from "lucide-react";
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
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [schoolDetails, setSchoolDetails] = useState<SchoolDetails | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);

  // Auth State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Selection State
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});

  const [isExpired, setIsExpired] = useState(false);
  const [isCheckingExpiration, setIsCheckingExpiration] = useState(true);

  useEffect(() => {
    const checkExpiration = async () => {
      try {
        const { data: school, error } = await (supabase as any)
          .from("schools")
          .select("is_active")
          .eq("id", schoolId)
          .single();
          
        if (error || !school) {
          setIsExpired(true);
          return;
        }

        if (!school.is_active) {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            setIsExpired(true);
          }
        }
      } catch (err) {
        setIsExpired(true);
      } finally {
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
        // Fallback for missing details
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
    
    // Fetch classes and students from Supabase
    const fetchClasses = async () => {
      try {
        const { data: dbClasses, error } = await (supabase as any)
          .from("classes")
          .select("id, name, students(id, name, image_url, selection)")
          .eq("school_id", schoolId)
          .order("created_at", { ascending: true });
          
        if (error) throw error;
        
        let hasSelections = false;
        const initialSelections: Record<string, string> = {};
        
        if (dbClasses) {
          const mappedClasses = dbClasses.map((c: any) => ({
            id: c.id,
            className: c.name,
            studentCount: c.students?.length || 0,
            students: (c.students || []).map((s: any) => {
              if (s.selection) {
                hasSelections = true;
                initialSelections[s.id] = s.selection;
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
          setSelections(initialSelections);
          if (hasSelections) {
            setStep(2); // Skip Step 1
          }
        }
      } catch (error: any) {
        toast.error("Sınıflar yüklenirken hata oluştu.");
      }
    };
    
    if (schoolId) {
      fetchClasses();
    }
  }, [schoolId]);

  // Persist classes to local storage on change
  const persistClasses = (updatedClasses: SchoolClass[]) => {
    setClasses(updatedClasses);
    if (typeof window !== "undefined") {
      localStorage.setItem(`mock_school_classes_${schoolId}`, JSON.stringify(updatedClasses));
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (schoolDetails && username === schoolDetails.login_username && password === schoolDetails.password) {
      setStep(3);
    } else {
      toast.error("Hatalı kullanıcı adı veya şifre.");
      setPassword("");
    }
  };

  const handleStudentSelectionChange = (studentId: string, selection: string) => {
    setSelections(prev => ({
      ...prev,
      [studentId]: selection
    }));
  };

  const saveClassSelections = async () => {
    if (!selectedClass) return;
    
    // Update Supabase
    try {
       const updates = selectedClass.students
         .filter(s => selections[s.id])
         .map(async s => {
            const { error } = await (supabase as any)
              .from("students")
              .update({ selection: selections[s.id] })
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
        const selection = selections[s.id];
        if (selection === "paket1") p1++;
        if (selection === "paket2") p2++;
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
      
      const row = parseInt(cell.replace(/\D/g, '')) - 1;
      
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
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
    else if (step === 4) setStep(3);
    else if (step === 5) setStep(3);
  };

  if (isCheckingExpiration) {
    return <div className="min-h-screen bg-[#131316] flex items-center justify-center text-white/50">Kontrol ediliyor...</div>;
  }

  if (isExpired) {
    return (
      <div className="min-h-screen bg-[#131316] flex items-center justify-center flex-col">
        <FileWarning className="w-16 h-16 text-red-500 mb-4 opacity-80" />
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Erişim Engellendi</h1>
        <p className="text-white/50 text-lg">Bu portalın süresi dolmuştur.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#131316] text-white selection:bg-[#A67C52] selection:text-white font-sans overflow-x-hidden pb-32">
      <AnimatePresence mode="wait">
        
        {/* STEP 1: Guide */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex items-center justify-center min-h-screen p-4"
          >
            <div className="max-w-lg w-full bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#A67C52]/20 blur-[100px] rounded-full" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#A67C52]/20 blur-[100px] rounded-full" />
              
              <div className="relative z-10 text-center">
                <div className="mx-auto w-16 h-16 bg-[#A67C52]/20 rounded-full flex items-center justify-center mb-6">
                  <InfoIcon className="w-8 h-8 text-[#A67C52]" />
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
                  onClick={() => setStep(2)}
                  className="w-full h-12 bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-semibold rounded-xl text-lg"
                >
                  Anladım, Devam Et <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 2: Login */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex items-center justify-center min-h-screen p-4"
          >
            <div className="max-w-sm w-full bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl relative">
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
                      className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus-visible:ring-[#A67C52]" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">Şifre</Label>
                    <Input 
                      type="password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
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
                    onClick={() => setStep(1)}
                    className="w-full text-white/50 hover:text-white mt-2"
                  >
                    Geri Dön
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
            <div className="flex items-center justify-between bg-white/5 border border-white/10 p-4 rounded-2xl mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#A67C52] rounded-lg flex items-center justify-center font-bold text-white shadow-lg">
                  A
                </div>
                <div>
                  <h2 className="font-bold tracking-tight">ALBÜMEVİ</h2>
                  <p className="text-xs text-white/50">Fotoğrafçılık Portalı</p>
                </div>
              </div>
              <h1 className="text-xl font-bold hidden md:block">Hoş Geldiniz</h1>
              <Button variant="ghost" size="icon" onClick={() => setStep(2)} className="text-white/50 hover:text-white">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>

            {/* Packages */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
              <div className="bg-[#A67C52]/10 border border-[#A67C52]/20 p-6 rounded-2xl flex justify-between items-center relative overflow-hidden">
                <div className="absolute right-0 top-0 w-32 h-32 bg-[#A67C52]/10 blur-[50px]" />
                <div>
                  <p className="text-[#A67C52] font-semibold text-sm mb-1">PAKET 1</p>
                  <h3 className="text-2xl font-bold">{schoolDetails?.package1_name}</h3>
                </div>
                <div className="text-3xl font-bold">{schoolDetails?.package1_price} ₺</div>
              </div>
              <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex justify-between items-center relative overflow-hidden">
                <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 blur-[50px]" />
                <div>
                  <p className="text-white/50 font-semibold text-sm mb-1">PAKET 2</p>
                  <h3 className="text-2xl font-bold">{schoolDetails?.package2_name}</h3>
                </div>
                <div className="text-3xl font-bold">{schoolDetails?.package2_price} ₺</div>
              </div>
            </div>

            {/* Classes Grid */}
            <h3 className="text-xl font-bold mb-6">Sınıflar / Şubeler</h3>
            {classes.length === 0 ? (
              <div className="text-center py-20 text-white/40 border border-white/5 rounded-2xl border-dashed">
                Sınıf bulunamadı. Lütfen yönetici ile iletişime geçin.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {classes.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedClass(c);
                      setStep(4);
                    }}
                    className="group bg-white/5 hover:bg-[#A67C52]/10 border border-white/10 hover:border-[#A67C52]/30 p-6 rounded-2xl text-left transition-all duration-300 relative overflow-hidden cursor-pointer"
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
                <div key={s.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-lg flex flex-col">
                  <div className="flex flex-col items-center mb-5 border-b border-white/5 pb-4">
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
                    <label className={`flex items-center p-3 rounded-xl cursor-pointer border transition-colors ${selections[s.id] === 'paket1' ? 'bg-[#A67C52]/20 border-[#A67C52] text-white' : 'bg-transparent border-white/10 text-white/70 hover:border-white/30'}`}>
                      <input 
                        type="radio" 
                        name={`package_${s.id}`} 
                        value="paket1"
                        className="hidden" 
                        checked={selections[s.id] === 'paket1'}
                        onChange={() => handleStudentSelectionChange(s.id, 'paket1')}
                      />
                      <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${selections[s.id] === 'paket1' ? 'border-[#A67C52]' : 'border-white/30'}`}>
                        {selections[s.id] === 'paket1' && <div className="w-2 h-2 rounded-full bg-[#A67C52]" />}
                      </div>
                      <span className="font-medium text-sm flex-1">{schoolDetails?.package1_name || 'Paket 1'}</span>
                    </label>

                    <label className={`flex items-center p-3 rounded-xl cursor-pointer border transition-colors ${selections[s.id] === 'paket2' ? 'bg-white/10 border-white text-white' : 'bg-transparent border-white/10 text-white/70 hover:border-white/30'}`}>
                      <input 
                        type="radio" 
                        name={`package_${s.id}`} 
                        value="paket2"
                        className="hidden" 
                        checked={selections[s.id] === 'paket2'}
                        onChange={() => handleStudentSelectionChange(s.id, 'paket2')}
                      />
                      <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${selections[s.id] === 'paket2' ? 'border-white' : 'border-white/30'}`}>
                        {selections[s.id] === 'paket2' && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <span className="font-medium text-sm flex-1">{schoolDetails?.package2_name || 'Paket 2'}</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            {/* Sticky Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-[#131316]/80 backdrop-blur-xl border-t border-white/10 p-4 z-50">
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

            <div className="bg-[#131316] border border-white/10 rounded-xl shadow-xl overflow-hidden text-white mb-8">
              <div className="bg-[#A67C52]/10 border-b border-[#A67C52]/30 text-white p-4 flex items-center justify-between">
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
              <div className="bg-[#131316] p-6 flex justify-end">
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
