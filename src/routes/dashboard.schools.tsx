import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import {
  Plus,
  Link2,
  Copy,
  Loader2,
  School as SchoolIcon,
  Package,
  FileWarning,
  Info,
  X,
  UploadCloud,
  Trash2,
  FolderDown,
  Folder,
  Download,
} from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { uploadFileToR2, getR2FileUrl } from "../lib/r2";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { OrderActions } from "@/components/order-actions";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard/schools")({
  component: ManageSchools,
});

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "school";

interface Student {
  id: string;
  name: string;
  packageSelection: string | null;
  image_url: string;
}

interface SchoolClass {
  id: string;
  className: string;
  studentCount: number;
  students: Student[];
}

function ManageClassesModal({ schoolSlug }: { schoolSlug: string }) {
  const [open, setOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: classes = [], refetch } = useQuery({
    queryKey: ["classes", schoolSlug],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("classes")
        .select("id, name, students(count)")
        .eq("school_id", schoolSlug)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data.map((c: any) => ({
        id: c.id,
        className: c.name,
        studentCount: c.students?.[0]?.count ?? 0,
      }));
    },
    enabled: open,
  });

  const handleAddClass = async () => {
    if (!newClassName || selectedFiles.length === 0) return;

    setIsProcessing(true);

    try {
      const { data: newClass, error: classError } = await (supabase as any)
        .from("classes")
        .insert({ school_id: schoolSlug, name: newClassName })
        .select()
        .single();

      if (classError) throw classError;

      const newClassId = newClass.id;
      const studentInserts = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

        let originalName = file.name;
        const lastDotIdx = originalName.lastIndexOf(".");
        const fileExt = lastDotIdx !== -1 ? originalName.substring(lastDotIdx + 1) : "jpg";
        if (lastDotIdx !== -1) {
          originalName = originalName.substring(0, lastDotIdx);
        }
        // Replace underscores and hyphens with spaces
        originalName = originalName.replace(/[_-]/g, " ").trim();
        if (!originalName) {
          originalName = `Öğrenci ${i + 1}`;
        }

        const fileName = `${Math.random().toString(36).substring(2, 10)}-${Date.now()}.${fileExt}`;
        const filePath = `${schoolSlug}/${newClassId}/${fileName}`;

        await uploadFileToR2(file, filePath);

        studentInserts.push({
          class_id: newClassId,
          name: originalName,
          image_url: filePath,
        });
      }

      const { error: studentsError } = await (supabase as any)
        .from("students")
        .insert(studentInserts);
      if (studentsError) throw studentsError;

      setNewClassName("");
      setSelectedFiles([]);
      refetch();
      toast.success(`${newClassName} sınıfı ve ${studentInserts.length} öğrenci oluşturuldu.`);
    } catch (error: any) {
      toast.error(error.message || "Fotoğraflar işlenirken bir hata oluştu.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (!confirm("Bu sınıfı silmek istediğinize emin misiniz?")) return;
    try {
      const { error } = await (supabase as any).from("classes").delete().eq("id", id);
      if (error) throw error;
      refetch();
      toast.success("Sınıf silindi.");
    } catch (err: any) {
      toast.error("Sınıf silinemedi.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 bg-transparent border-white/10 text-white hover:bg-white/5 hover:text-white"
        >
          Şubeleri Yönet
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-[#131316] border border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Şubeleri Yönet</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-white/70">Şube Adı</Label>
              <Input
                placeholder="Örn: 1/A"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                className="bg-white/5 border-white/10 text-white rounded-xl focus-visible:ring-[#A67C52]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-white/70">Öğrenci Fotoğrafları (VSK)</Label>
              <div className="relative group border-2 border-dashed border-white/20 hover:border-[#A67C52] rounded-xl p-6 text-center transition-colors bg-white/5">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files) {
                      setSelectedFiles(Array.from(e.target.files));
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="pointer-events-none flex flex-col items-center gap-2">
                  <UploadCloud className="w-8 h-8 text-[#A67C52]" />
                  {selectedFiles.length > 0 ? (
                    <p className="text-white font-medium">
                      {selectedFiles.length} fotoğraf seçildi
                    </p>
                  ) : (
                    <>
                      <p className="text-white font-medium">Fotoğrafları sürükleyin veya seçin</p>
                      <p className="text-white/50 text-xs">
                        Aynı anda birden fazla fotoğraf seçebilirsiniz.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
            <Button
              onClick={handleAddClass}
              disabled={isProcessing || !newClassName || selectedFiles.length === 0}
              className="w-full h-10 px-0 bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-bold rounded-xl"
            >
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sınıfı Ekle"}
            </Button>
          </div>

          <div className="border border-white/10 rounded-xl mt-4 max-h-[300px] overflow-y-auto">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/70">Şube</TableHead>
                  <TableHead className="text-right text-white/70">Öğr. Sayısı</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.length === 0 ? (
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableCell colSpan={3} className="text-center text-white/40 py-8">
                      Kayıtlı sınıf yok.
                    </TableCell>
                  </TableRow>
                ) : (
                  classes.map((c: any) => (
                    <TableRow
                      key={c.id}
                      className="border-white/10 hover:bg-white/5 transition-colors"
                    >
                      <TableCell className="font-medium text-white">{c.className}</TableCell>
                      <TableCell className="text-right text-white/70">{c.studentCount}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded-lg"
                          onClick={() => handleDeleteClass(c.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ManageSchools() {
  const { t, lang } = useI18n();
  const { teamId } = useAuth();
  const qc = useQueryClient();

  const [downloadingPackageKey, setDownloadingPackageKey] = useState<string | null>(null);

  const handleDownloadZip = async (
    schoolName: string,
    packageName: string,
    students: any[],
    packageKey: string,
  ) => {
    setDownloadingPackageKey(packageKey);
    try {
      const zip = new JSZip();

      const promises = students.map(async (student) => {
        if (!student.image_url) return;
        try {
          let urlToFetch = student.image_url;
          if (!urlToFetch.startsWith("http")) {
            urlToFetch = await getR2FileUrl(student.image_url);
          }
          const response = await fetch(urlToFetch);
          const blob = await response.blob();

          const ext = student.image_url.split(".").pop() || "jpg";
          // Make sure safeExt is used correctly, fallback to jpg just in case
          const safeExt = ext.split("?")[0] || "jpg";
          
          const safePackageName = packageName.replace(/[/\\]/g, "-").trim();
          const safeClassName = (student.class_name || "Bilinmeyen Şube").replace(/[/\\]/g, "-").trim();
          const safeStudentName = student.name.replace(/[/\\]/g, "-").trim();
          
          const fileName = `${safePackageName}/${safeClassName}/${safeStudentName}.${safeExt}`;
          zip.file(fileName, blob);
        } catch (err) {
          console.error("Error fetching image for", student.name, err);
        }
      });

      await Promise.all(promises);

      const classNotesMap = new Map<string, string[]>();
      students.forEach((student) => {
        if (student.note && student.note.trim() !== "") {
          const safeClassName = (student.class_name || "Bilinmeyen Şube").replace(/[/\\]/g, "-").trim();
          if (!classNotesMap.has(safeClassName)) {
            classNotesMap.set(safeClassName, []);
          }
          classNotesMap.get(safeClassName)?.push(`${student.name} (${packageName}): ${student.note.trim()}`);
        }
      });
      
      const safePackageName = packageName.replace(/[/\\]/g, "-").trim();
      classNotesMap.forEach((notesList, safeClassName) => {
        if (notesList.length > 0) {
          const fileName = `${safePackageName}/${safeClassName}/notlar.txt`;
          const contentStr = notesList.join("\n\n");
          zip.file(fileName, contentStr);
        }
      });

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${slugify(schoolName)}_${slugify(packageName)}.zip`);
      toast.success("Baskı dosyaları başarıyla indirildi.");
    } catch (error) {
      console.error("ZIP Error", error);
      toast.error("İndirme sırasında bir hata oluştu.");
    } finally {
      setDownloadingPackageKey(null);
    }
  };

  const { data: schools = [], isLoading } = useQuery({
    queryKey: ["schools"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("schools")
        .select("*, status")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      // 1. Fetch required data independently
      const [
        { data: students, error: stdErr },
        { data: classes, error: clsErr },
        { data: schools, error: schErr },
        { data: schoolProducts, error: spErr },
        { data: products, error: pErr },
      ] = await Promise.all([
        (supabase as any)
          .from("students")
          .select("id, name, image_url, class_id, selection, note, created_at")
          .not("selection", "is", null),
        (supabase as any).from("classes").select("id, school_id, name"),
        (supabase as any).from("schools").select("id, name, package_statuses"),
        (supabase as any).from("school_products").select("school_id, product_id, custom_price"),
        (supabase as any).from("products").select("id, name"),
      ]);

      if (stdErr) throw new Error(stdErr.message);
      if (clsErr) throw new Error(clsErr.message);
      if (schErr) throw new Error(schErr.message);
      if (spErr) throw new Error(spErr.message);

      // Map classes and schools for quick lookup
      const classMap = new Map();
      (classes || []).forEach((c: any) => classMap.set(c.id, { school_id: c.school_id, name: c.name }));

      const schoolMap = new Map();
      const schoolStatusMap = new Map();
      (schools || []).forEach((s: any) => {
        schoolMap.set(s.id, s.name);
        schoolStatusMap.set(s.id, s.package_statuses || {});
      });

      const productMap = new Map();
      (products || []).forEach((p: any) => productMap.set(p.id, p.name));

      const schoolProductsMap = new Map();
      (schoolProducts || []).forEach((sp: any) => {
        if (!schoolProductsMap.has(sp.school_id)) {
          schoolProductsMap.set(sp.school_id, new Map());
        }
        schoolProductsMap.get(sp.school_id).set(sp.product_id, {
          id: sp.product_id,
          price: sp.custom_price,
          name: productMap.get(sp.product_id) || "Bilinmeyen Paket",
        });
      });

      // 2. Aggregate data in JavaScript
      const grouped = (students || []).reduce((acc: any, s: any) => {
        const classInfo = classMap.get(s.class_id);
        if (!classInfo) return acc;
        const schoolId = classInfo.school_id;

        const spMapping = schoolProductsMap.get(schoolId);
        if (!spMapping) return acc;

        let parsedSelection: string[] = [];
        try {
          parsedSelection = s.selection ? JSON.parse(s.selection) : [];
        } catch {
          parsedSelection = s.selection ? s.selection.split(",").filter(Boolean) : [];
        }

        parsedSelection.forEach((selectedProductId: string) => {
          let selectedProduct = spMapping.get(selectedProductId);

          // Backwards compatibility for old records that have "paket1" or "paket2"
          if (
            !selectedProduct &&
            (selectedProductId === "paket1" || selectedProductId === "paket2")
          ) {
            const oldMapList = Array.from(spMapping.values()) as any[];
            if (selectedProductId === "paket1" && oldMapList[0]) selectedProduct = oldMapList[0];
            if (selectedProductId === "paket2" && oldMapList[1]) selectedProduct = oldMapList[1];
          }

          if (!selectedProduct) return;

          const groupingKey = `${schoolId}_${selectedProduct.id}`;

          if (!acc[groupingKey]) {
            acc[groupingKey] = {
              id: groupingKey,
              school_name: schoolMap.get(schoolId) || "Bilinmeyen Okul",
              package_name: selectedProduct.name,
              quantity: 0,
              total_price: 0,
              order_status:
                (schoolStatusMap.get(schoolId) || {})[selectedProduct.name] || "Hazırlanıyor",
              created_at: s.created_at,
              school_id: schoolId,
              selection_key: selectedProduct.id,
              students: [],
            };
          }

          acc[groupingKey].quantity += 1;
          acc[groupingKey].total_price += selectedProduct.price || 0;
          if (s.image_url) {
            acc[groupingKey].students.push({
              id: s.id,
              name: s.name || `Öğrenci`,
              image_url: s.image_url,
              class_name: classInfo.name || "Bilinmeyen Şube",
              note: s.note,
            });
          }
        });

        return acc;
      }, {});

      return Object.values(grouped) as any[];
    },
  });


  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("products")
        .select("id, name, base_price");
      if (error) throw error;
      return data;
    },
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    city: "",
    login_username: "",
    password: "",
    package1_id: "",
    package1_price: "",
    package2_id: "",
    package2_price: "",
    status: "Aktif",
  });

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("albumevi:add-school", handler);
    return () => window.removeEventListener("albumevi:add-school", handler);
  }, []);

  const m = useMutation({
    mutationFn: async ({ data }: { data: any }) => {
      // Ensure the session is fresh before inserting to avoid RLS anonymous insert issues
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session) {
        throw new Error("Oturum bulunamadı. Lütfen sayfayı yenileyip tekrar giriş yapın.");
      }

      const { data: row, error } = await supabase
        .from("schools")
        .insert({
          name: data.name,
          city: data.city || null,
          login_username: data.login_username,
          login_password: data.password,
          team_id: teamId,
          status: data.status || "Aktif",
          is_active: true,
        } as any)
        .select("id, name, city, login_username, created_at")
        .single();
      if (error) throw new Error(error.message);

      const newSchoolId = row.id;

      const schoolProducts: any[] = [];
      if (data.package1_id && data.package1_price) {
        schoolProducts.push({
          school_id: newSchoolId,
          product_id: data.package1_id,
          custom_price: Number(data.package1_price),
          team_id: teamId,
        });
      }
      if (data.package2_id && data.package2_price) {
        // Prevent unique constraint error if the user accidentally selects the same product for both packages
        const exists = schoolProducts.some((p) => p.product_id === data.package2_id);
        if (!exists) {
          schoolProducts.push({
            school_id: newSchoolId,
            product_id: data.package2_id,
            custom_price: Number(data.package2_price),
            team_id: teamId,
          });
        }
      }

      if (schoolProducts.length > 0) {
        const { error: spError } = await (supabase as any)
          .from("school_products")
          .insert(schoolProducts);
        if (spError) throw new Error(spError.message);
      }

      // Save mock details to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(
          `mock_school_details_${newSchoolId}`,
          JSON.stringify({
            package1_name: products.find((p: any) => p.id === data.package1_id)?.name,
            package1_price: Number(data.package1_price),
            package2_name: products.find((p: any) => p.id === data.package2_id)?.name,
            package2_price: Number(data.package2_price),
            login_username: data.login_username,
            password: data.password, // Storing for mock portal login
          }),
        );
      }

      return row;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schools"] });
      qc.invalidateQueries({ queryKey: ["finance"] });
      setOpen(false);
      setForm({
        name: "",
        city: "",
        login_username: "",
        password: "",
        package1_id: "",
        package1_price: "",
        package2_id: "",
        package2_price: "",
        status: "Aktif",
      });
      toast.success(lang === "TR" ? "Okul başarıyla eklendi" : "School added successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActiveStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any).from("schools").update({ status }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schools"] });
      toast.success("Okul durumu güncellendi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updatePackageStatus = useMutation({
    mutationFn: async ({
      schoolId,
      packageName,
      newStatus,
    }: {
      schoolId: string;
      packageName: string;
      newStatus: string;
    }) => {
      const { data: school, error: fetchErr } = await (supabase as any)
        .from("schools")
        .select("package_statuses")
        .eq("id", schoolId)
        .single();
      if (fetchErr) throw new Error(fetchErr.message);

      const currentStatuses = school.package_statuses || {};
      const updatedStatuses = { 
        ...currentStatuses, 
        [packageName]: newStatus,
        global_status: newStatus 
      };

      const { error } = await (supabase as any)
        .from("schools")
        .update({ package_statuses: updatedStatuses })
        .eq("id", schoolId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Paket durumu güncellendi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteSchool = useMutation({
    mutationFn: async (schoolId: string) => {
      const { error } = await supabase.from("schools").delete().eq("id", schoolId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schools"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["finance"] });
      toast.success("Okul başarıyla silindi!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clearOrder = useMutation({
    mutationFn: async ({ schoolId, selectionKey }: { schoolId: string; selectionKey: string }) => {
      const { data: classes, error: classesErr } = await (supabase as any)
        .from("classes")
        .select("id")
        .eq("school_id", schoolId);
      if (classesErr) throw new Error(classesErr.message);

      const classIds = classes.map((c: any) => c.id);
      if (classIds.length === 0) return;

      const { error } = await (supabase as any)
        .from("students")
        .update({ selection: null })
        .in("class_id", classIds)
        .eq("selection", selectionKey);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["finance"] });
      toast.success("Sipariş temizlendi!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const origin =
    typeof window !== "undefined"
      ? window.location.hostname === "localhost"
        ? "https://albumevi.com.tr"
        : window.location.origin
      : "https://albumevi.com.tr";
  const activeOrders = orders.filter((o: any) => o.order_status !== "Completed").length;
  const pendingInvoices = 0; // Removed finance dependency

  const stats = [
    {
      label: "Toplam Okul",
      value: schools.length,
      icon: SchoolIcon,
      hint: "Sistemdeki aktif okul sayısı",
    },
    {
      label: "Aktif Siparişler",
      value: activeOrders,
      icon: Package,
      hint: "Devam eden siparişler",
    },
    {
      label: "Bekleyen Faturalar",
      value: pendingInvoices,
      icon: FileWarning,
      hint: "Ödemesi yapılmamış faturalar",
    },
  ];

  const modalInputClasses =
    "bg-white/5 border-white/10 text-white rounded-xl focus-visible:ring-1 focus-visible:ring-[#A67C52] focus-visible:border-[#A67C52] transition-all placeholder:text-white/30";
  const groupedBySchool = useMemo(() => {
    return orders.reduce((acc: any, order: any) => {
      if (!acc[order.school_id]) {
        acc[order.school_id] = { school_name: order.school_name, packages: [] };
      }
      acc[order.school_id].packages.push(order);
      return acc;
    }, {});
  }, [orders]);

  const hierarchicalOrders = useMemo(() => {
    const schoolGroups = new Map();
    orders.forEach((order: any) => {
      if (!schoolGroups.has(order.school_id)) {
        schoolGroups.set(order.school_id, {
          school_id: order.school_id,
          school_name: order.school_name,
          latest_date: order.created_at,
          packages: [],
        });
      }

      const school = schoolGroups.get(order.school_id);
      if (new Date(order.created_at) > new Date(school.latest_date)) {
        school.latest_date = order.created_at;
      }

      const classCounts = new Map();
      (order.students || []).forEach((student: any) => {
        const cName = student.class_name || "Bilinmeyen Şube";
        classCounts.set(cName, (classCounts.get(cName) || 0) + 1);
      });

      school.packages.push({
        ...order,
        class_breakdown: Array.from(classCounts.entries()).map(([cName, count]) => ({
          class_name: cName,
          count,
        })).sort((a, b) => a.class_name.localeCompare(b.class_name)),
      });
    });

    return Array.from(schoolGroups.values()).sort(
      (a, b) => new Date(b.latest_date).getTime() - new Date(a.latest_date).getTime()
    );
  }, [orders]);

  return (
    <div className="space-y-6 text-white selection:bg-[#A67C52] selection:text-white pb-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Okul Yönetimi</h1>
          <p className="text-sm text-white/50">Sistemdeki tüm okulları ve siparişlerini yönetin.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-semibold rounded-xl px-4 py-2 cursor-pointer shadow-lg shadow-[#A67C52]/20">
              <Plus className="mr-2 h-4 w-4" /> Yeni Okul Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#131316] border border-white/10 text-white max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">Okul Ekle</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white/70">Okul Adı</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Greenfield Elementary"
                  className={modalInputClasses}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Şehir</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Batman"
                  className={modalInputClasses}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/70">Paket 1 Adı</Label>
                  <Select
                    value={form.package1_id}
                    onValueChange={(v) => {
                      const product = products.find((p: any) => p.id === v);
                      setForm({
                        ...form,
                        package1_id: v,
                        package1_price: product ? String(product.base_price) : form.package1_price,
                      });
                    }}
                  >
                    <SelectTrigger className={modalInputClasses}>
                      <SelectValue placeholder="Paket Seçin" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#131316] border-white/10 text-white">
                      {products.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Paket 1 Fiyatı (₺)</Label>
                  <Input
                    type="number"
                    value={form.package1_price}
                    onChange={(e) => setForm({ ...form, package1_price: e.target.value })}
                    placeholder="Örn. 150"
                    className={modalInputClasses}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/70">Paket 2 Adı</Label>
                  <Select
                    value={form.package2_id}
                    onValueChange={(v) => {
                      const product = products.find((p: any) => p.id === v);
                      setForm({
                        ...form,
                        package2_id: v,
                        package2_price: product ? String(product.base_price) : form.package2_price,
                      });
                    }}
                  >
                    <SelectTrigger className={modalInputClasses}>
                      <SelectValue placeholder="Paket Seçin" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#131316] border-white/10 text-white">
                      {products.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Paket 2 Fiyatı (₺)</Label>
                  <Input
                    type="number"
                    step="any"
                    value={form.package2_price}
                    onChange={(e) => setForm({ ...form, package2_price: e.target.value })}
                    placeholder="Örn. 250"
                    className={modalInputClasses}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/70">Kullanıcı Adı</Label>
                  <Input
                    value={form.login_username}
                    onChange={(e) => setForm({ ...form, login_username: e.target.value })}
                    placeholder="greenfield"
                    className={modalInputClasses}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Şifre</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Öğretmen girişi için şifre"
                    className={modalInputClasses}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Durum</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className={modalInputClasses}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#131316] border-white/10 text-white">
                    <SelectItem value="Aktif" className="text-emerald-500">
                      Aktif
                    </SelectItem>
                    <SelectItem value="Pasif" className="text-red-500">
                      Pasif
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => m.mutate({ data: form })}
                disabled={
                  m.isPending ||
                  !form.name ||
                  !form.login_username ||
                  form.password.length < 6 ||
                  !form.package1_id ||
                  !form.package1_price
                }
                className="bg-[#A67C52] text-white hover:bg-[#A67C52]/90 cursor-pointer rounded-xl font-bold"
              >
                {m.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Kaydet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s, i) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={s.label}
            className="rounded-2xl border border-white/5 bg-[#131316] p-5 shadow-xl relative overflow-hidden"
          >
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#A67C52]/5 rounded-full blur-2xl" />
            <div className="flex items-center justify-between relative z-10">
              <span className="text-xs uppercase tracking-wider text-white/50">{s.label}</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#A67C52]/20 text-[#A67C52]">
                <s.icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-bold text-white relative z-10">{s.value}</div>
            <div className="mt-1 text-xs text-white/40 relative z-10">{s.hint}</div>
          </motion.div>
        ))}
      </div>

      {/* Recent orders */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="overflow-hidden rounded-2xl border border-white/10 bg-[#131316] shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-5 bg-white/5">
          <div>
            <h2 className="font-semibold text-lg text-white">Son Siparişler</h2>
            <p className="text-xs text-white/50">Son gelen paket siparişleri.</p>
          </div>
          <Badge className="border-transparent bg-[#A67C52]/20 text-[#A67C52] hover:bg-[#A67C52]/30 px-3 py-1">
            {orders.filter((o: any) => o.order_status === "Hazırlanıyor").length} Hazırlanıyor
          </Badge>
        </div>
        <div className="p-2 md:p-4">
          {hierarchicalOrders.length === 0 ? (
            <div className="text-center text-white/40 py-8">
              Sipariş bulunamadı.
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-4">
              {hierarchicalOrders.map((school: any, idx: number) => (
                <AccordionItem
                  key={school.school_id}
                  value={school.school_id}
                  className="border border-white/10 bg-black/40 rounded-xl overflow-hidden"
                >
                  <AccordionTrigger className="px-6 py-4 hover:bg-white/5 transition-colors [&[data-state=open]]:bg-white/5 hover:no-underline">
                    <div className="flex items-center gap-4 text-left">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 font-bold text-white/70 shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-white">{school.school_name}</h3>
                        <p className="text-xs text-white/50">
                          Son Sipariş: {new Date(school.latest_date).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6 pt-2">
                    <Accordion type="multiple" className="space-y-3">
                      {school.packages.map((pkg: any) => (
                        <AccordionItem
                          key={pkg.id}
                          value={pkg.id}
                          className="border border-white/5 bg-white/5 rounded-lg overflow-hidden"
                        >
                          <AccordionTrigger className="px-4 py-3 hover:bg-white/5 transition-colors [&[data-state=open]]:bg-white/5 hover:no-underline group">
                            <div className="flex items-center justify-between w-full pr-4 text-left">
                              <div>
                                <h4 className="font-medium text-white">{pkg.package_name}</h4>
                                <div className="text-xs text-white/50 flex items-center gap-2 mt-1">
                                  <span>{pkg.quantity} adet</span>
                                  <span>•</span>
                                  <span className="text-[#A67C52]">{Number(pkg.total_price).toLocaleString()} ₺</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge
                                  className={
                                    pkg.order_status === "Hazırlandı"
                                      ? "border-transparent bg-emerald-500/15 text-emerald-400"
                                      : "border-transparent bg-[#A67C52]/20 text-[#A67C52]"
                                  }
                                >
                                  {pkg.order_status}
                                </Badge>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4 pt-2">
                            <div className="flex justify-end gap-2 mb-4">
                              <div className="flex bg-black/40 border border-white/10 p-1 rounded-xl">
                                {["Bekliyor", "Üretimde", "Kargoya Hazır", "Teslim Edildi"].map(
                                  (status) => (
                                    <button
                                      key={status}
                                      disabled={updatePackageStatus.isPending}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        updatePackageStatus.mutate({
                                          schoolId: pkg.school_id,
                                          packageName: pkg.package_name,
                                          newStatus: status,
                                        });
                                      }}
                                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                                        pkg.order_status === status
                                          ? "bg-[#A67C52] text-black shadow-md"
                                          : "text-white/50 hover:text-white hover:bg-white/10"
                                      }`}
                                    >
                                      {status}
                                    </button>
                                  ),
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={clearOrder.isPending}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (
                                    window.confirm(
                                      "Bu pakete ait tüm öğrenci seçimlerini iptal etmek (sıfırlamak) istediğinize emin misiniz?",
                                    )
                                  ) {
                                    clearOrder.mutate({
                                      schoolId: pkg.school_id,
                                      selectionKey: pkg.selection_key,
                                    });
                                  }
                                }}
                                className="h-8 rounded-md transition-colors text-red-400 hover:bg-red-500/15 hover:text-red-300"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Sıfırla
                              </Button>
                            </div>
                            
                            <div className="space-y-2">
                              <h5 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Şube Dağılımı</h5>
                              {pkg.class_breakdown.length === 0 ? (
                                <div className="text-sm text-white/40 italic">Veri bulunamadı</div>
                              ) : (
                                pkg.class_breakdown.map((cb: any, i: number) => (
                                  <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                    <span className="text-sm font-medium text-white">{cb.class_name}</span>
                                    <span className="text-sm text-[#A67C52] bg-[#A67C52]/10 px-2 py-0.5 rounded">
                                      {cb.count} sipariş
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </motion.div>

      {/* Baskı Dosyaları */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="overflow-hidden rounded-2xl border border-white/10 bg-[#131316] shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-5 bg-white/5">
          <div>
            <h2 className="font-semibold text-lg text-white">Baskı Dosyaları</h2>
            <p className="text-xs text-white/50">
              Okulların paket seçimlerine göre gruplandırılmış öğrenci fotoğrafları.
            </p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A67C52]/20 text-[#A67C52]">
            <FolderDown className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4">
          {Object.keys(groupedBySchool).length === 0 ? (
            <div className="text-center text-white/40 py-8">
              Henüz indirilebilir baskı dosyası bulunmuyor.
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-4">
              {Object.values(groupedBySchool).map((school: any) => (
                <AccordionItem
                  key={school.packages[0].school_id}
                  value={school.packages[0].school_id}
                  className="border border-white/10 rounded-xl bg-white/5 overflow-hidden"
                >
                  <AccordionTrigger className="px-6 py-4 hover:bg-white/5 transition-colors [&[data-state=open]]:bg-white/5 hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      <SchoolIcon className="w-5 h-5 text-[#A67C52]" />
                      <div>
                        <div className="font-semibold text-white">{school.school_name}</div>
                        <div className="text-xs text-white/50 font-normal">
                          {school.packages.length} farklı paket siparişi
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6 pt-2">
                    <div className="grid gap-3 mt-4">
                      {school.packages.map((pkg: any) => {
                        const isZipping = downloadingPackageKey === pkg.id;
                        return (
                          <div
                            key={pkg.id}
                            className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-black/20"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-[#A67C52]/10 flex items-center justify-center">
                                <Package className="w-5 h-5 text-[#A67C52]" />
                              </div>
                              <div>
                                <div className="font-medium text-white">{pkg.package_name}</div>
                                <div className="text-xs text-white/50">{pkg.quantity} Öğrenci</div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              disabled={isZipping || pkg.students.length === 0}
                              onClick={() =>
                                handleDownloadZip(
                                  school.school_name,
                                  pkg.package_name,
                                  pkg.students,
                                  pkg.id,
                                )
                              }
                              className="bg-white/10 hover:bg-white/20 text-white border-none"
                            >
                              {isZipping ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4 mr-2" />
                              )}
                              Toplu İndir
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </motion.div>

      {/* Schools table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="overflow-hidden rounded-2xl border border-white/10 bg-[#131316] shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-5 bg-white/5">
          <div>
            <h2 className="font-semibold text-lg text-white">Tüm Okullar</h2>
            <p className="text-xs text-white/50">Sisteme kayıtlı okulların portal linkleri.</p>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="text-white/50">Okul</TableHead>
              <TableHead className="text-white/50">Şehir</TableHead>
              <TableHead className="text-white/50">Kullanıcı Adı</TableHead>
              <TableHead className="text-white/50">Link Oluştur</TableHead>
              <TableHead className="text-white/50">Durum</TableHead>
              <TableHead className="text-right text-white/50">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableCell colSpan={6} className="text-center text-white/40 py-8">
                  Yükleniyor...
                </TableCell>
              </TableRow>
            ) : schools.length === 0 ? (
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableCell colSpan={6} className="text-center text-white/40 py-8">
                  Kayıtlı okul bulunamadı.
                </TableCell>
              </TableRow>
            ) : (
              schools.map((s: any) => {
                const link = `${origin}/portal/${s.id}`;
                return (
                  <TableRow
                    key={s.id}
                    className="border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <TableCell className="font-medium text-white">{s.name}</TableCell>
                    <TableCell className="text-white/70">{s.city || "—"}</TableCell>
                    <TableCell className="font-mono text-xs text-[#A67C52] bg-[#A67C52]/10 px-2 py-1 rounded inline-block mt-2">
                      {s.login_username}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(link);
                          toast.success("Bağlantı kopyalandı");
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:border-[#A67C52]/60 hover:text-[#A67C52] transition-colors cursor-pointer text-white/70"
                      >
                        <Link2 className="h-3 w-3" />
                        /portal/{s.id}
                        <Copy className="h-3 w-3 text-white/40" />
                      </button>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={String(s.status).toLowerCase() === "aktif" ? "Aktif" : "Pasif"}
                        onValueChange={(val) => {
                          toggleActiveStatus.mutate({ id: s.id, status: val });
                        }}
                      >
                        <SelectTrigger
                          className={`w-[100px] h-8 text-xs border-transparent focus:ring-0 ${
                            String(s.status).toLowerCase() === "aktif"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-red-500/15 text-red-400"
                          }`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Aktif" className="text-emerald-500">
                            Aktif
                          </SelectItem>
                          <SelectItem value="Pasif" className="text-red-500">
                            Pasif
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-2">
                      <ManageClassesModal schoolSlug={s.id} />
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={deleteSchool.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Bu okulu ve tüm verilerini silmek istediğinize emin misiniz?",
                            )
                          ) {
                            deleteSchool.mutate(s.id);
                          }
                        }}
                        className="h-9 w-9 rounded-md transition-colors text-red-400 hover:bg-red-500/15 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </motion.div>

      {/* Info / how-it-works footer card 
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-2xl border border-[#A67C52]/20 bg-[#A67C52]/5 p-6 shadow-xl"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A67C52]/20 text-[#A67C52]">
            <Info className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-white">Nasıl Çalışır?</h3>
            <p className="text-sm text-white/60 leading-relaxed max-w-3xl">
              Okul portalına erişim için bir okul eklediğinizde sistem özel ve güvenli bir link oluşturur. 
              Oluşturulan linki ve belirlediğiniz öğretmen şifresini okulla paylaşabilirsiniz. Okul yönetimi bu portaldan 
              öğrenci paket seçimlerini ve detayları görüntüleyebilir.
            </p>
          </div>
        </div>
      </motion.div>
      */}
    </div>
  );
}
