import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import {
  Plus,
  Link2,
  Copy,
  Check,
  Loader2,
  School as SchoolIcon,
  Package,
  FileWarning,
  Info,
  X,
  UploadCloud,
  FileText,
  ChevronRight,
  ChevronDown,
  Search,
  MapPin,
  ArrowUpDown,
  StickyNote,
  Pencil,
} from "lucide-react";
import { uploadFileToR2, getR2FileUrl, getR2PublicUrl } from "../lib/r2";
import { fetchAllRows, fetchAllRowsSafe, parseSelectionTokens } from "@/lib/supabase-fetch-all";
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

interface ClassOrderItem {
  id: string;
  name: string;
  image_code: string;
  image_url: string;
  class_name: string;
  note: string | null;
  is_selected?: boolean;
}

interface ClassBreakdownItem {
  class_name: string;
  count: number;
  notes_count: number;
  orders: ClassOrderItem[];
}

interface ClassOrdersModalState {
  schoolName: string;
  packageName: string;
  className: string;
  orders: ClassOrderItem[];
}

type SectionSortOption = "orders_desc" | "orders_asc" | "alpha_asc" | "alpha_desc";

interface SectionHeaderToolbarProps {
  search: string;
  onSearchChange: (val: string) => void;
  cityFilter: string;
  onCityFilterChange: (val: string) => void;
  cities: string[];
  sort: SectionSortOption;
  onSortChange: (val: SectionSortOption) => void;
  statusFilter?: string;
  onStatusFilterChange?: (val: string) => void;
}

function SectionHeaderToolbar({
  search,
  onSearchChange,
  cityFilter,
  onCityFilterChange,
  cities,
  sort,
  onSortChange,
  statusFilter,
  onStatusFilterChange,
}: SectionHeaderToolbarProps) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-white/10"
    >
      <div className="relative flex-1 min-w-[200px]">
        <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Okul ara..."
          className="h-9 pl-9 pr-8 bg-[#131316] border-white/10 text-white text-xs rounded-xl focus-visible:ring-1 focus-visible:ring-[#A67C52] focus-visible:border-[#A67C52] placeholder:text-white/40"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <Select value={cityFilter} onValueChange={onCityFilterChange}>
        <SelectTrigger className="w-[160px] h-9 bg-[#131316] border-white/10 text-white text-xs rounded-xl focus:ring-1 focus:ring-[#A67C52]">
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 text-[#A67C52] shrink-0" />
            <SelectValue placeholder="Tüm Şehirler" />
          </div>
        </SelectTrigger>
        <SelectContent className="bg-[#131316] border-white/10 text-white">
          <SelectItem value="all">Tüm Şehirler</SelectItem>
          {cities.map((city) => (
            <SelectItem key={city} value={city}>
              {city}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {statusFilter !== undefined && onStatusFilterChange && (
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-[130px] h-9 bg-[#131316] border-white/10 text-white text-xs rounded-xl focus:ring-1 focus:ring-[#A67C52]">
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent className="bg-[#131316] border-white/10 text-white">
            <SelectItem value="all">Tümü</SelectItem>
            <SelectItem value="Aktif" className="text-emerald-400">
              Aktif
            </SelectItem>
            <SelectItem value="Pasif" className="text-red-400">
              Pasif
            </SelectItem>
          </SelectContent>
        </Select>
      )}

      <Select value={sort} onValueChange={(v) => onSortChange(v as SectionSortOption)}>
        <SelectTrigger className="w-[225px] h-9 bg-[#131316] border-white/10 text-white text-xs rounded-xl focus:ring-1 focus:ring-[#A67C52]">
          <div className="flex items-center gap-1.5 truncate">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#A67C52] shrink-0" />
            <SelectValue placeholder="Sıralama" />
          </div>
        </SelectTrigger>
        <SelectContent className="bg-[#131316] border-white/10 text-white">
          <SelectItem value="orders_desc">Sipariş Sayısı (Çoktan Aza)</SelectItem>
          <SelectItem value="orders_asc">Sipariş Sayısı (Azdan Çoğa)</SelectItem>
          <SelectItem value="alpha_asc">Alfabetik (A-Z)</SelectItem>
          <SelectItem value="alpha_desc">Alfabetik (Z-A)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function usePersistedSectionOpen(sectionKey: string, defaultOpen = false) {
  const storageKey = `albumevi_schools_section_collapsed_${sectionKey}`;
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return defaultOpen;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === "true") return false;
      if (stored === "false") return true;
    } catch {
      // Ignore localStorage access errors
    }
    return defaultOpen;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey, String(!isOpen));
    } catch {
      // Ignore localStorage write errors
    }
  }, [storageKey, isOpen]);

  return [isOpen, setIsOpen] as const;
}

function formatStudentImageCode(student: {
  image_code?: string | null;
  name?: string | null;
  image_url?: string | null;
}): string {
  if (student.image_code && String(student.image_code).trim()) {
    return String(student.image_code).trim();
  }

  const rawName = (student.name || "").trim();
  const urlWithoutQuery = (student.image_url || "").split("?")[0];
  const urlFileName = urlWithoutQuery.split("/").pop() || "";
  const dotIdx = urlFileName.lastIndexOf(".");
  const rawExt = dotIdx !== -1 ? urlFileName.substring(dotIdx + 1).trim() : "";
  const ext = rawExt && /^[a-zA-Z0-9]{2,5}$/.test(rawExt) ? rawExt : "JPG";

  if (!rawName) {
    return urlFileName || `IMG.${ext}`;
  }

  const hasExtension = /\.[a-zA-Z0-9]{2,5}$/.test(rawName);
  const baseName = hasExtension ? rawName.replace(/\.[a-zA-Z0-9]{2,5}$/, "") : rawName;
  const finalExt = hasExtension ? rawName.substring(rawName.lastIndexOf(".") + 1) : ext;

  // Restore camera filename underscore if parseStudentName replaced "_" with " " (e.g. "SER 7010" -> "SER_7010")
  const normalizedBase = /^_*[A-Za-z]{1,6}\s+\d+/.test(baseName)
    ? baseName.replace(/\s+/g, "_")
    : baseName;

  return `${normalizedBase}.${finalExt}`;
}

function buildClassBreakdown(students: ClassOrderItem[] = []): ClassBreakdownItem[] {
  const classGroups = new Map<string, ClassOrderItem[]>();

  students.forEach((student) => {
    const cName = student.class_name || "Bilinmeyen Şube";
    if (!classGroups.has(cName)) {
      classGroups.set(cName, []);
    }
    classGroups.get(cName)!.push(student);
  });

  return Array.from(classGroups.entries())
    .map(([className, classOrders]) => {
      const sortedOrders = [...classOrders].sort((a, b) =>
        a.image_code.localeCompare(b.image_code, undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );
      const selectedCount = sortedOrders.filter((o) => o.is_selected !== false).length;
      const notesCount = sortedOrders.filter((o) => o.note && o.note.trim() !== "").length;
      return {
        class_name: className,
        count: selectedCount,
        notes_count: notesCount,
        orders: sortedOrders,
      };
    })
    .sort((a, b) =>
      a.class_name.localeCompare(b.class_name, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );
}

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

function ClassPhotoPreview({ src, alt }: { src: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!src) return;
    if (src.startsWith("http") || src.startsWith("blob:") || src.startsWith("data:")) {
      setUrl(src);
    } else {
      getR2FileUrl(src)
        .then((signedUrl) => {
          if (active) setUrl(signedUrl);
        })
        .catch(() => {
          if (active) setUrl(getR2PublicUrl(src));
        });
    }
    return () => {
      active = false;
    };
  }, [src]);

  if (!url) {
    return <div className="w-full h-full animate-pulse bg-white/10 rounded-lg" />;
  }
  return <img src={url} alt={alt} className="w-full h-full object-cover rounded-lg" />;
}

function LocalFilePreview({ file }: { file: File }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!previewUrl) {
    return <div className="w-full h-full animate-pulse bg-white/10 rounded-lg" />;
  }
  return <img src={previewUrl} alt={file.name} className="w-full h-full object-cover rounded-lg" />;
}

function ManageClassesModal({ schoolSlug }: { schoolSlug: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [existingStudents, setExistingStudents] = useState<
    Array<{ id: string; name: string; image_url: string }>
  >([]);
  const [removedStudents, setRemovedStudents] = useState<
    Array<{ id: string; name: string; image_url: string }>
  >([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);

  const resetForm = () => {
    setIsEditing(false);
    setEditingClassId(null);
    setNewClassName("");
    setSelectedFiles([]);
    setExistingStudents([]);
    setRemovedStudents([]);
  };

  const { data: classes = [], refetch } = useQuery({
    queryKey: ["classes", schoolSlug],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("classes")
        .select("id, name, students(id, name, image_url)")
        .eq("school_id", schoolSlug)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data.map((c: any) => ({
        id: c.id,
        className: c.name,
        studentCount: c.students?.length ?? 0,
        students: c.students ?? [],
      }));
    },
    enabled: open,
  });

  const handleEditClass = async (classItem: any) => {
    setIsEditing(true);
    setEditingClassId(classItem.id);
    setNewClassName(classItem.className);
    setSelectedFiles([]);
    setRemovedStudents([]);
    setExistingStudents(classItem.students || []);

    setIsLoadingPhotos(true);
    try {
      const { data, error } = await (supabase as any)
        .from("students")
        .select("id, name, image_url")
        .eq("class_id", classItem.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setExistingStudents(data || []);
    } catch (err: any) {
      toast.error("Sınıf fotoğrafları yüklenirken bir hata oluştu.");
    } finally {
      setIsLoadingPhotos(false);
    }
  };

  const handleRemoveExistingPhoto = (student: { id: string; name: string; image_url: string }) => {
    setExistingStudents((prev) => prev.filter((s) => s.id !== student.id));
    setRemovedStudents((prev) => [...prev, student]);
  };

  const handleRemoveSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const parseStudentName = (fileName: string, fallbackIndex: number) => {
    let originalName = fileName;
    const lastDotIdx = originalName.lastIndexOf(".");
    const fileExt = lastDotIdx !== -1 ? originalName.substring(lastDotIdx + 1) : "jpg";
    if (lastDotIdx !== -1) {
      originalName = originalName.substring(0, lastDotIdx);
    }
    originalName = originalName.replace(/[_-]/g, " ").trim();
    if (!originalName) {
      originalName = `Öğrenci ${fallbackIndex}`;
    }
    return { originalName, fileExt };
  };

  const updateClassMutation = useMutation({
    mutationFn: async () => {
      if (!editingClassId || !newClassName.trim()) return;

      // 1. Update class name in DB without duplicating
      const { error: classError } = await (supabase as any)
        .from("classes")
        .update({ name: newClassName.trim() })
        .eq("id", editingClassId);
      if (classError) throw classError;

      // 2. Hard-deletion of existing student records is disabled to protect order selections and notes

      // 3. Upload newly added photos and insert student records
      if (selectedFiles.length > 0) {
        const studentInserts = [];
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          const { originalName, fileExt } = parseStudentName(
            file.name,
            existingStudents.length + i + 1,
          );

          const fileName = `${Math.random().toString(36).substring(2, 10)}-${Date.now()}.${fileExt}`;
          const filePath = `${schoolSlug}/${editingClassId}/${fileName}`;

          await uploadFileToR2(file, filePath);

          studentInserts.push({
            class_id: editingClassId,
            name: originalName,
            image_url: filePath,
          });
        }

        const { error: insertStudentsErr } = await (supabase as any)
          .from("students")
          .insert(studentInserts);
        if (insertStudentsErr) throw insertStudentsErr;
      }
    },
    onSuccess: () => {
      const updatedName = newClassName.trim();
      resetForm();
      refetch();
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success(`${updatedName} sınıfı başarıyla güncellendi.`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Sınıf güncellenirken bir hata oluştu.");
    },
  });

  const handleAddClass = async () => {
    if (!newClassName.trim() || selectedFiles.length === 0) return;

    setIsProcessing(true);

    try {
      const { data: newClass, error: classError } = await (supabase as any)
        .from("classes")
        .insert({ school_id: schoolSlug, name: newClassName.trim() })
        .select()
        .single();

      if (classError) throw classError;

      const newClassId = newClass.id;
      const studentInserts = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const { originalName, fileExt } = parseStudentName(file.name, i + 1);

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

      const createdName = newClassName.trim();
      resetForm();
      refetch();
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success(`${createdName} sınıfı ve ${studentInserts.length} öğrenci oluşturuldu.`);
    } catch (error: any) {
      toast.error(error.message || "Fotoğraflar işlenirken bir hata oluştu.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = () => {
    if (isEditing) {
      updateClassMutation.mutate();
    } else {
      handleAddClass();
    }
  };

  const handleDeleteClass = async (_id: string) => {
    // Hard-deleting classes is disabled to protect all class and student order data
    toast.info("Veri koruma aktif: Şube silme işlemi devre dışı bırakıldı.");
  };

  const isBusy = isProcessing || updateClassMutation.isPending;
  const totalPhotosCount = existingStudents.length + selectedFiles.length;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          resetForm();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 bg-transparent border-white/10 text-white hover:bg-white/5 hover:text-white"
        >
          Şubeleri Yönet
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-[#131316] border border-white/10 text-white">
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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-white/70">Öğrenci Fotoğrafları (VSK)</Label>
                {totalPhotosCount > 0 && (
                  <span className="text-xs text-[#A67C52] font-medium">
                    Toplam {totalPhotosCount} fotoğraf
                  </span>
                )}
              </div>
              <div className="relative group border-2 border-dashed border-white/20 hover:border-[#A67C52] rounded-xl p-5 text-center transition-colors bg-white/5">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      const filesArray = Array.from(e.target.files);
                      setSelectedFiles((prev) => [...prev, ...filesArray]);
                      e.target.value = "";
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="pointer-events-none flex flex-col items-center gap-1.5">
                  <UploadCloud className="w-7 h-7 text-[#A67C52]" />
                  <p className="text-white font-medium text-sm">
                    {isEditing
                      ? "Yeni fotoğraf eklemek için sürükleyin veya seçin"
                      : "Fotoğrafları sürükleyin veya seçin"}
                  </p>
                  <p className="text-white/50 text-xs">
                    Aynı anda birden fazla fotoğraf seçebilirsiniz.
                  </p>
                </div>
              </div>

              {/* Photo Preview Area */}
              {(isLoadingPhotos || existingStudents.length > 0 || selectedFiles.length > 0) && (
                <div className="border border-white/10 rounded-xl p-3 bg-black/30 max-h-[220px] overflow-y-auto">
                  {isLoadingPhotos ? (
                    <div className="flex items-center justify-center py-6 text-white/50 text-xs gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-[#A67C52]" />
                      Fotoğraflar yükleniyor...
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                      {existingStudents.map((student) => (
                        <div
                          key={student.id}
                          className="relative group rounded-lg border border-white/10 bg-white/5 p-1.5 flex flex-col items-center"
                        >
                          <div className="w-full aspect-square overflow-hidden rounded-md bg-black/40">
                            <ClassPhotoPreview src={student.image_url} alt={student.name} />
                          </div>
                          <span
                            className="mt-1 text-[11px] text-white/80 truncate w-full text-center"
                            title={student.name}
                          >
                            {student.name}
                          </span>
                        </div>
                      ))}

                      {selectedFiles.map((file, idx) => {
                        const { originalName } = parseStudentName(file.name, idx + 1);
                        return (
                          <div
                            key={`${file.name}-${idx}`}
                            className="relative group rounded-lg border border-[#A67C52]/40 bg-[#A67C52]/10 p-1.5 flex flex-col items-center"
                          >
                            <div className="w-full aspect-square overflow-hidden rounded-md bg-black/40">
                              <LocalFilePreview file={file} />
                            </div>
                            <span
                              className="mt-1 text-[11px] text-white truncate w-full text-center"
                              title={originalName}
                            >
                              {originalName}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSelectedFile(idx)}
                              title="Fotoğrafı Kaldır"
                              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-colors cursor-pointer"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  disabled={isBusy}
                  className="h-10 px-4 bg-transparent border-white/10 text-white/70 hover:bg-white/5 hover:text-white rounded-xl"
                >
                  İptal
                </Button>
              )}
              <Button
                onClick={handleSubmit}
                disabled={
                  isBusy || !newClassName.trim() || (!isEditing && selectedFiles.length === 0)
                }
                className="flex-1 h-10 px-0 bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-bold rounded-xl"
              >
                {isBusy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : isEditing ? (
                  "Güncelle"
                ) : (
                  "Sınıfı Ekle"
                )}
              </Button>
            </div>
          </div>

          <div className="border border-white/10 rounded-xl mt-4 max-h-[260px] overflow-y-auto">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/70">Şube</TableHead>
                  <TableHead className="text-right text-white/70">Öğr. Sayısı</TableHead>
                  <TableHead className="w-[90px] text-right text-white/70">İşlem</TableHead>
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
                      className={`border-white/10 hover:bg-white/5 transition-colors ${
                        isEditing && editingClassId === c.id ? "bg-[#A67C52]/10" : ""
                      }`}
                    >
                      <TableCell className="font-medium text-white">{c.className}</TableCell>
                      <TableCell className="text-right text-white/70">{c.studentCount}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Düzenle"
                            className="h-8 w-8 text-white/40 hover:text-[#A67C52] hover:bg-[#A67C52]/10 rounded-lg"
                            onClick={() => handleEditClass(c)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
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

  const [selectedClassModal, setSelectedClassModal] = useState<ClassOrdersModalState | null>(null);
  const [copiedAllCodes, setCopiedAllCodes] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  const openClassOrdersModal = (modalState: ClassOrdersModalState) => {
    setCopiedAllCodes(false);
    setCopiedOrderId(null);
    setSelectedClassModal(modalState);
  };

  const handleCopyAllCodes = async () => {
    if (!selectedClassModal || selectedClassModal.orders.length === 0) return;

    const uniqueCodes = Array.from(
      new Set(selectedClassModal.orders.map((o) => o.image_code).filter(Boolean)),
    );
    const clipboardText = uniqueCodes.join(" OR ");

    try {
      await navigator.clipboard.writeText(clipboardText);
      setCopiedAllCodes(true);
      toast.success(`${uniqueCodes.length} dosya kodu Finder araması (OR) formatında kopyalandı`);
      window.setTimeout(() => {
        setCopiedAllCodes(false);
      }, 2000);
    } catch {
      toast.error("Kodlar kopyalanamadı.");
    }
  };

  const handleCopySingleCode = async (orderId: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedOrderId(orderId);
      toast.success(`${code} kopyalandı`);
      window.setTimeout(() => {
        setCopiedOrderId((prev) => (prev === orderId ? null : prev));
      }, 1500);
    } catch {
      toast.error("Kod kopyalanamadı.");
    }
  };

  const { data: schools = [], isLoading } = useQuery({
    queryKey: ["schools"],
    queryFn: async () => {
      return await fetchAllRows<any>(supabase, "schools", "*", "created_at", false);
    },
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      // 1. Fetch 100% of records across all related tables without any filters or row caps
      const [students, classes, schools, schoolProducts, products, directOrders] =
        await Promise.all([
          fetchAllRowsSafe<any>(supabase, "students", "*"),
          fetchAllRowsSafe<any>(supabase, "classes", "*"),
          fetchAllRowsSafe<any>(supabase, "schools", "*"),
          fetchAllRowsSafe<any>(supabase, "school_products", "*"),
          fetchAllRowsSafe<any>(supabase, "products", "*"),
          fetchAllRowsSafe<any>(supabase, "orders", "*", "created_at", false),
        ]);

      // Map classes and schools for quick lookup (preserving fallbacks if related records are missing)
      const classMap = new Map<string, { school_id: string | null; name: string }>();
      (classes || []).forEach((c: any) => {
        if (c?.id != null) {
          classMap.set(String(c.id), {
            school_id: c.school_id ? String(c.school_id) : null,
            name: c.name || "Bilinmeyen Şube",
          });
        }
      });

      const schoolMap = new Map<string, string>();
      const schoolStatusMap = new Map<string, Record<string, any>>();
      (schools || []).forEach((s: any) => {
        if (s?.id != null) {
          schoolMap.set(String(s.id), s.name || "İsimsiz Okul");
          schoolStatusMap.set(String(s.id), s.package_statuses || {});
        }
      });

      const productMap = new Map<string, { name: string; base_price: number }>();
      (products || []).forEach((p: any) => {
        if (p?.id != null) {
          productMap.set(String(p.id), {
            name: p.name || "Bilinmeyen Paket",
            base_price: Number(p.base_price) || 0,
          });
        }
      });

      const schoolProductsMap = new Map<
        string,
        Map<string, { id: string; price: number; name: string }>
      >();
      (schoolProducts || []).forEach((sp: any) => {
        const sid = sp?.school_id ? String(sp.school_id) : "";
        const pid = sp?.product_id ? String(sp.product_id) : "";
        if (!sid || !pid) return;
        if (!schoolProductsMap.has(sid)) {
          schoolProductsMap.set(sid, new Map());
        }
        const catalogProd = productMap.get(pid);
        schoolProductsMap.get(sid)!.set(pid, {
          id: pid,
          price: Number(sp.custom_price ?? catalogProd?.base_price ?? 0),
          name: catalogProd?.name || "Bilinmeyen Paket",
        });
      });

      // 2. Aggregate data in JavaScript without dropping orphaned classes, schools, or products
      const grouped: Record<string, any> = {};
      const notedStudentsBySchool = new Map<
        string,
        Array<{ item: ClassOrderItem; created_at: string }>
      >();

      const resolveSchoolDisplayName = (schoolId: string) => {
        if (schoolMap.has(schoolId)) return schoolMap.get(schoolId)!;
        if (schoolId === "__orphan_school__") return "Eşleşmeyen / Silinmiş Okul";
        return `Eşleşmeyen Okul (${schoolId.slice(0, 8)})`;
      };

      const ensureGroup = (
        schoolId: string,
        product: { id: string; name: string; price?: number },
        createdAt: string,
        extra?: { directOrderId?: string; statusOverride?: string },
      ) => {
        const groupingKey = extra?.directOrderId
          ? `direct_order_${extra.directOrderId}`
          : `${schoolId}_${product.id}`;
        if (!grouped[groupingKey]) {
          grouped[groupingKey] = {
            id: groupingKey,
            school_name: resolveSchoolDisplayName(schoolId),
            package_name: product.name,
            quantity: 0,
            total_price: 0,
            order_status:
              extra?.statusOverride ||
              (schoolStatusMap.get(schoolId) || {})[product.name] ||
              (schoolStatusMap.get(schoolId) || {}).global_status ||
              "Hazırlanıyor",
            created_at: createdAt || new Date().toISOString(),
            school_id: schoolId,
            selection_key: product.id,
            direct_order_id: extra?.directOrderId,
            studentMap: new Map<string, ClassOrderItem>(),
          };
        }
        return grouped[groupingKey];
      };

      (students || []).forEach((s: any) => {
        // Never drop a student order if its class record is missing
        const classInfo = (s?.class_id ? classMap.get(String(s.class_id)) : null) || {
          school_id: s?.school_id ? String(s.school_id) : "__orphan_school__",
          name: "Bilinmeyen Şube",
        };
        const schoolId =
          classInfo.school_id || (s?.school_id ? String(s.school_id) : "__orphan_school__");

        const rawNote =
          typeof s.note === "string" && s.note.trim() !== ""
            ? s.note.trim()
            : typeof s.notes === "string" && s.notes.trim() !== ""
              ? s.notes.trim()
              : null;

        const parsedSelection = parseSelectionTokens(s?.selection);
        const spMapping = schoolProductsMap.get(schoolId);
        const matchedProducts: Array<{ id: string; name: string; price: number }> = [];

        if (parsedSelection.length > 0) {
          parsedSelection.forEach((selectedProductId: string) => {
            let selectedProduct = spMapping?.get(selectedProductId);

            // Backwards compatibility for old records that have "paket1" or "paket2"
            if (
              !selectedProduct &&
              spMapping &&
              (selectedProductId === "paket1" || selectedProductId === "paket2")
            ) {
              const oldMapList = Array.from(spMapping.values());
              if (selectedProductId === "paket1" && oldMapList[0]) selectedProduct = oldMapList[0];
              if (selectedProductId === "paket2" && oldMapList[1]) selectedProduct = oldMapList[1];
            }

            // Fallback to catalog product or synthetic package so no selection is ever dropped
            if (!selectedProduct) {
              const catalogProd = productMap.get(selectedProductId);
              selectedProduct = {
                id: selectedProductId,
                name:
                  catalogProd?.name ||
                  (selectedProductId === "paket1"
                    ? "Paket 1"
                    : selectedProductId === "paket2"
                      ? "Paket 2"
                      : `Paket (${selectedProductId.slice(0, 8)})`),
                price: catalogProd?.base_price ?? 0,
              };
            }

            matchedProducts.push(selectedProduct);
          });
        }

        // Skip students who have neither a selected product nor a note
        if (matchedProducts.length === 0 && !rawNote) {
          return;
        }

        const baseItem: ClassOrderItem = {
          id: String(s.id),
          name: s.name || "Öğrenci",
          image_code: formatStudentImageCode(s),
          image_url: s.image_url || "",
          class_name: classInfo.name || "Bilinmeyen Şube",
          note: rawNote,
          is_selected: true,
        };

        matchedProducts.forEach((selectedProduct) => {
          const grp = ensureGroup(schoolId, selectedProduct, s.created_at);
          if (!grp.studentMap.has(String(s.id))) {
            grp.quantity += 1;
            grp.total_price += selectedProduct.price || 0;
            grp.studentMap.set(String(s.id), { ...baseItem, is_selected: true });
          }
        });

        if (rawNote) {
          if (!notedStudentsBySchool.has(schoolId)) {
            notedStudentsBySchool.set(schoolId, []);
          }
          notedStudentsBySchool.get(schoolId)!.push({
            item: { ...baseItem, is_selected: false },
            created_at: s.created_at,
          });
        }
      });

      // Attach any student with a note (including students with NO selected product) to the school's modal lists
      notedStudentsBySchool.forEach((notedEntries, schoolId) => {
        let schoolGroups = Object.values(grouped).filter((g: any) => g.school_id === schoolId);

        if (schoolGroups.length === 0) {
          const spMapping = schoolProductsMap.get(schoolId);
          const firstProduct = spMapping ? Array.from(spMapping.values())[0] : null;
          const fallbackProduct = firstProduct || {
            id: "notes_only",
            name: "Öğrenci Notları",
            price: 0,
          };
          const grp = ensureGroup(schoolId, fallbackProduct, notedEntries[0].created_at);
          schoolGroups = [grp];
        }

        schoolGroups.forEach((grp: any) => {
          notedEntries.forEach(({ item }) => {
            if (!grp.studentMap.has(item.id)) {
              grp.studentMap.set(item.id, item);
            }
          });
        });
      });

      // 3. Also include 100% of direct rows from public.orders (even if school_id is missing/null)
      (directOrders || []).forEach((ord: any) => {
        const schoolId = ord?.school_id ? String(ord.school_id) : "__orphan_school__";
        const pkgName = ord?.package_name || "Sipariş Paketi";
        const grp = ensureGroup(
          schoolId,
          { id: String(ord.id), name: pkgName, price: Number(ord.total_price) || 0 },
          ord?.created_at || new Date().toISOString(),
          {
            directOrderId: String(ord.id),
            statusOverride: ord?.order_status || "Bekliyor",
          },
        );
        grp.quantity = Number(ord?.quantity) || 0;
        grp.total_price = Number(ord?.total_price) || 0;
        if (ord?.school_name && !schoolMap.has(schoolId)) {
          grp.school_name = ord.school_name;
        }
        if (typeof ord?.note === "string" && ord.note.trim() !== "") {
          grp.studentMap.set(`order_note_${ord.id}`, {
            id: `order_note_${ord.id}`,
            name: pkgName,
            image_code: `SIPARIS_${String(ord.id).slice(0, 8).toUpperCase()}`,
            image_url: "",
            class_name: "Genel Sipariş",
            note: ord.note.trim(),
            is_selected: true,
          });
        }
      });

      return Object.values(grouped).map((grp: any) => {
        const { studentMap, ...rest } = grp;
        return {
          ...rest,
          students: Array.from(studentMap.values()),
        };
      });
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products", "schools"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("products")
        .select("*")
        .order("sira", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const schoolCategoryProducts = useMemo(() => {
    return products.filter((p: any) => {
      const rawCategory = String(p?.category ?? "").trim();
      const normalizedCategory = rawCategory.toLocaleLowerCase("tr-TR");
      const normalizedName = String(p?.name ?? "")
        .trim()
        .toLocaleLowerCase("tr-TR");

      if (!normalizedName || normalizedName.includes("kargo")) {
        return false;
      }

      if (rawCategory) {
        return (
          normalizedCategory === "okul işleri" ||
          normalizedCategory === "okul isleri" ||
          normalizedCategory === "okullar" ||
          normalizedCategory === "okul"
        );
      }

      if (
        normalizedName.includes("panoramik") ||
        normalizedName.includes("baskı") ||
        normalizedName.includes("baski") ||
        normalizedName.includes("canvas") ||
        normalizedName.includes("kanvas")
      ) {
        return false;
      }

      return true;
    });
  }, [products]);

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
      directOrderId,
    }: {
      schoolId: string;
      packageName: string;
      newStatus: string;
      directOrderId?: string;
    }) => {
      if (directOrderId) {
        const { error: directErr } = await (supabase as any)
          .from("orders")
          .update({ order_status: newStatus })
          .eq("id", directOrderId);
        if (directErr) throw new Error(directErr.message);
      }

      if (schoolId && schoolId !== "__orphan_school__") {
        const { data: school, error: fetchErr } = await (supabase as any)
          .from("schools")
          .select("package_statuses")
          .eq("id", schoolId)
          .maybeSingle();
        if (fetchErr) throw new Error(fetchErr.message);

        if (school) {
          const currentStatuses = school.package_statuses || {};
          const updatedStatuses = {
            ...currentStatuses,
            [packageName]: newStatus,
            global_status: newStatus,
          };

          const { error } = await (supabase as any)
            .from("schools")
            .update({ package_statuses: updatedStatuses })
            .eq("id", schoolId);
          if (error) throw new Error(error.message);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["aggregated_orders"] });
      toast.success("Paket durumu güncellendi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Hard deletes and destructive order wipes are disabled to protect all historical data
  const deleteSchool = useMutation({
    mutationFn: async (_schoolId: string) => {
      return { disabled: true };
    },
    onSuccess: () => {
      toast.info("Veri koruma aktif: Okul silme işlemi devre dışı bırakıldı.");
    },
  });

  const clearOrder = useMutation({
    mutationFn: async (_vars: { schoolId: string; selectionKey: string }) => {
      return { disabled: true };
    },
    onSuccess: () => {
      toast.info("Veri koruma aktif: Sipariş sıfırlama işlemi devre dışı bırakıldı.");
    },
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

  // Independent state per section (collapsed by default, persisted in localStorage)
  const [isRecentOrdersOpen, setIsRecentOrdersOpen] = usePersistedSectionOpen("recent_orders");
  const [recentSearch, setRecentSearch] = useState("");
  const [recentCityFilter, setRecentCityFilter] = useState("all");
  const [recentSort, setRecentSort] = useState<SectionSortOption>("orders_desc");

  const [isPrintCodesOpen, setIsPrintCodesOpen] = usePersistedSectionOpen("print_codes");
  const [printSearch, setPrintSearch] = useState("");
  const [printCityFilter, setPrintCityFilter] = useState("all");
  const [printSort, setPrintSort] = useState<SectionSortOption>("orders_desc");

  const [isAllSchoolsOpen, setIsAllSchoolsOpen] = usePersistedSectionOpen("all_schools");
  const [schoolsSearch, setSchoolsSearch] = useState("");
  const [schoolsCityFilter, setSchoolsCityFilter] = useState("all");
  const [schoolsStatusFilter, setSchoolsStatusFilter] = useState("all");
  const [schoolsSort, setSchoolsSort] = useState<SectionSortOption>("alpha_asc");

  const schoolCityMap = useMemo(() => {
    const map = new Map<string, string>();
    schools.forEach((s: any) => {
      if (s?.id != null) {
        map.set(String(s.id), String(s.city || "").trim());
      }
    });
    return map;
  }, [schools]);

  const uniqueCities = useMemo(() => {
    const seen = new Map<string, string>();
    schools.forEach((s: any) => {
      const rawCity = String(s?.city || "").trim();
      if (!rawCity) return;
      const key = rawCity.toLocaleLowerCase("tr");
      if (!seen.has(key)) {
        seen.set(key, rawCity);
      }
    });
    return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, "tr"));
  }, [schools]);

  const orderCountBySchoolId = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach((order: any) => {
      const sid = String(order?.school_id || "");
      if (!sid) return;
      const qty = Number(order?.quantity) || 0;
      map.set(sid, (map.get(sid) || 0) + qty);
    });
    return map;
  }, [orders]);

  const groupedBySchool = useMemo(() => {
    return orders.reduce((acc: any, order: any) => {
      if (!acc[order.school_id]) {
        acc[order.school_id] = {
          school_id: order.school_id,
          school_name: order.school_name,
          city: schoolCityMap.get(String(order.school_id)) || "",
          total_orders: 0,
          packages: [],
        };
      }
      acc[order.school_id].total_orders += Number(order.quantity) || 0;
      acc[order.school_id].packages.push({
        ...order,
        class_breakdown: buildClassBreakdown(order.students || []),
      });
      return acc;
    }, {});
  }, [orders, schoolCityMap]);

  const hierarchicalOrders = useMemo(() => {
    const schoolGroups = new Map();
    orders.forEach((order: any) => {
      if (!schoolGroups.has(order.school_id)) {
        schoolGroups.set(order.school_id, {
          school_id: order.school_id,
          school_name: order.school_name,
          city: schoolCityMap.get(String(order.school_id)) || "",
          total_orders: 0,
          latest_date: order.created_at,
          packages: [],
        });
      }

      const school = schoolGroups.get(order.school_id);
      school.total_orders += Number(order.quantity) || 0;
      const orderTs = new Date(order.created_at || 0).getTime() || 0;
      const latestTs = new Date(school.latest_date || 0).getTime() || 0;
      if (orderTs > latestTs) {
        school.latest_date = order.created_at;
      }

      school.packages.push({
        ...order,
        class_breakdown: buildClassBreakdown(order.students || []),
      });
    });

    return Array.from(schoolGroups.values());
  }, [orders, schoolCityMap]);

  const sortSchoolEntries = <T,>(
    list: T[],
    sortOption: SectionSortOption,
    getName: (item: T) => string,
    getOrderCount: (item: T) => number,
  ): T[] => {
    return [...list].sort((a, b) => {
      const nameA = getName(a) || "";
      const nameB = getName(b) || "";
      const countA = getOrderCount(a);
      const countB = getOrderCount(b);

      if (sortOption === "orders_desc") {
        return countB - countA || nameA.localeCompare(nameB, "tr");
      }
      if (sortOption === "orders_asc") {
        return countA - countB || nameA.localeCompare(nameB, "tr");
      }
      if (sortOption === "alpha_desc") {
        return nameB.localeCompare(nameA, "tr");
      }
      return nameA.localeCompare(nameB, "tr");
    });
  };

  const filteredRecentOrders = useMemo(() => {
    const q = recentSearch.trim().toLocaleLowerCase("tr");
    const filtered = hierarchicalOrders.filter((school: any) => {
      const nameMatch =
        !q ||
        String(school.school_name || "")
          .toLocaleLowerCase("tr")
          .includes(q);
      const cityMatch =
        recentCityFilter === "all" ||
        String(school.city || "").toLocaleLowerCase("tr") ===
          recentCityFilter.toLocaleLowerCase("tr");
      return nameMatch && cityMatch;
    });

    return sortSchoolEntries(
      filtered,
      recentSort,
      (s: any) => String(s.school_name || ""),
      (s: any) => Number(s.total_orders) || 0,
    );
  }, [hierarchicalOrders, recentSearch, recentCityFilter, recentSort]);

  const filteredPrintCodeSchools = useMemo(() => {
    const q = printSearch.trim().toLocaleLowerCase("tr");
    const allPrintSchools = Object.values(groupedBySchool) as any[];
    const filtered = allPrintSchools.filter((school: any) => {
      const nameMatch =
        !q ||
        String(school.school_name || "")
          .toLocaleLowerCase("tr")
          .includes(q);
      const cityMatch =
        printCityFilter === "all" ||
        String(school.city || "").toLocaleLowerCase("tr") ===
          printCityFilter.toLocaleLowerCase("tr");
      return nameMatch && cityMatch;
    });

    return sortSchoolEntries(
      filtered,
      printSort,
      (s: any) => String(s.school_name || ""),
      (s: any) => Number(s.total_orders) || 0,
    );
  }, [groupedBySchool, printSearch, printCityFilter, printSort]);

  const filteredAllSchools = useMemo(() => {
    const q = schoolsSearch.trim().toLocaleLowerCase("tr");
    const filtered = schools.filter((s: any) => {
      const nameMatch =
        !q ||
        String(s?.name || "")
          .toLocaleLowerCase("tr")
          .includes(q);
      const cityMatch =
        schoolsCityFilter === "all" ||
        String(s?.city || "")
          .trim()
          .toLocaleLowerCase("tr") === schoolsCityFilter.toLocaleLowerCase("tr");
      const normalizedStatus =
        String(s?.status || "Aktif").toLowerCase() === "aktif" ? "Aktif" : "Pasif";
      const statusMatch = schoolsStatusFilter === "all" || normalizedStatus === schoolsStatusFilter;
      return nameMatch && cityMatch && statusMatch;
    });

    return sortSchoolEntries(
      filtered,
      schoolsSort,
      (s: any) => String(s?.name || ""),
      (s: any) => orderCountBySchoolId.get(String(s?.id || "")) || 0,
    );
  }, [
    schools,
    schoolsSearch,
    schoolsCityFilter,
    schoolsStatusFilter,
    schoolsSort,
    orderCountBySchoolId,
  ]);

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
                      const product = schoolCategoryProducts.find((p: any) => p.id === v);
                      setForm({
                        ...form,
                        package1_id: v,
                        package1_price:
                          product && product.base_price != null
                            ? String(product.base_price)
                            : form.package1_price,
                      });
                    }}
                  >
                    <SelectTrigger className={modalInputClasses}>
                      <SelectValue placeholder="Paket Seçin" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#131316] border-white/10 text-white">
                      {schoolCategoryProducts.map((p: any) => (
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
                      const product = schoolCategoryProducts.find((p: any) => p.id === v);
                      setForm({
                        ...form,
                        package2_id: v,
                        package2_price:
                          product && product.base_price != null
                            ? String(product.base_price)
                            : form.package2_price,
                      });
                    }}
                  >
                    <SelectTrigger className={modalInputClasses}>
                      <SelectValue placeholder="Paket Seçin" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#131316] border-white/10 text-white">
                      {schoolCategoryProducts.map((p: any) => (
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
        <div
          onClick={() => setIsRecentOrdersOpen((prev) => !prev)}
          className={`px-6 py-5 bg-white/5 cursor-pointer select-none hover:bg-white/[0.07] transition-colors space-y-3 ${
            isRecentOrdersOpen ? "border-b border-white/5" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-semibold text-lg text-white">Son Siparişler</h2>
                <Badge className="border-white/10 bg-black/40 text-white/70 hover:bg-black/40 text-xs">
                  {filteredRecentOrders.length} okul
                </Badge>
              </div>
              <p className="text-xs text-white/50">Son gelen paket siparişleri.</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="border-transparent bg-[#A67C52]/20 text-[#A67C52] hover:bg-[#A67C52]/30 px-3 py-1">
                {orders.filter((o: any) => o.order_status === "Hazırlanıyor").length} Hazırlanıyor
              </Badge>
              <button
                type="button"
                aria-label={isRecentOrdersOpen ? "Bölümü daralt" : "Bölümü genişlet"}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRecentOrdersOpen((prev) => !prev);
                }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#131316] text-[#A67C52] hover:bg-[#A67C52]/15 hover:border-[#A67C52]/40 transition-colors cursor-pointer"
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${
                    isRecentOrdersOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>
          </div>

          {isRecentOrdersOpen && (
            <SectionHeaderToolbar
              search={recentSearch}
              onSearchChange={setRecentSearch}
              cityFilter={recentCityFilter}
              onCityFilterChange={setRecentCityFilter}
              cities={uniqueCities}
              sort={recentSort}
              onSortChange={setRecentSort}
            />
          )}
        </div>

        {isRecentOrdersOpen && (
          <div className="p-2 md:p-4">
            {hierarchicalOrders.length === 0 ? (
              <div className="text-center text-white/40 py-8">Sipariş bulunamadı.</div>
            ) : filteredRecentOrders.length === 0 ? (
              <div className="text-center text-white/40 py-8">
                Filtrelere uygun okul siparişi bulunamadı.
              </div>
            ) : (
              <Accordion type="multiple" className="space-y-4">
                {filteredRecentOrders.map((school: any, idx: number) => (
                  <AccordionItem
                    key={school.school_id}
                    value={school.school_id}
                    className="border border-white/10 bg-black/40 rounded-xl overflow-hidden"
                  >
                    <AccordionTrigger className="px-6 py-4 hover:bg-white/5 transition-colors [&[data-state=open]]:bg-white/5 hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-3 gap-4 text-left">
                        <div className="flex items-center gap-4">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 font-bold text-white/70 shrink-0">
                            {idx + 1}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-lg text-white">
                                {school.school_name}
                              </h3>
                              {school.city && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white/60 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
                                  <MapPin className="w-3 h-3 text-[#A67C52]" />
                                  {school.city}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-white/50">
                              Son Sipariş: {new Date(school.latest_date).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-[#A67C52] bg-[#A67C52]/10 px-2.5 py-1 rounded-md shrink-0">
                          {school.total_orders} sipariş
                        </span>
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
                                    <span className="text-[#A67C52]">
                                      {Number(pkg.total_price).toLocaleString()} ₺
                                    </span>
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
                                            directOrderId: pkg.direct_order_id,
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
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                                    Şube Dağılımı
                                  </h5>
                                  <span className="text-[11px] text-white/40">
                                    Kod ve notları görmek için şubeye tıklayın
                                  </span>
                                </div>
                                {pkg.class_breakdown.length === 0 ? (
                                  <div className="text-sm text-white/40 italic">
                                    Veri bulunamadı
                                  </div>
                                ) : (
                                  pkg.class_breakdown.map((cb: ClassBreakdownItem, i: number) => (
                                    <button
                                      key={i}
                                      type="button"
                                      onClick={() =>
                                        openClassOrdersModal({
                                          schoolName: school.school_name,
                                          packageName: pkg.package_name,
                                          className: cb.class_name,
                                          orders: cb.orders,
                                        })
                                      }
                                      className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-black/30 hover:bg-white/10 border border-white/5 hover:border-[#A67C52]/40 transition-all cursor-pointer group text-left"
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <span className="text-sm font-semibold text-white group-hover:text-[#A67C52] transition-colors">
                                          {cb.class_name}
                                        </span>
                                        {cb.notes_count > 0 && (
                                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-300 bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 rounded-md">
                                            <StickyNote className="w-3 h-3" />
                                            {cb.notes_count} not
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-[#A67C52] bg-[#A67C52]/10 px-2.5 py-1 rounded-md">
                                          {cb.count} sipariş
                                        </span>
                                        <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-[#A67C52] group-hover:translate-x-0.5 transition-all" />
                                      </div>
                                    </button>
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
        )}
      </motion.div>

      {/* Baskı Dosyaları (Kod ve Not Referansı) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="overflow-hidden rounded-2xl border border-white/10 bg-[#131316] shadow-xl"
      >
        <div
          onClick={() => setIsPrintCodesOpen((prev) => !prev)}
          className={`px-6 py-5 bg-white/5 cursor-pointer select-none hover:bg-white/[0.07] transition-colors space-y-3 ${
            isPrintCodesOpen ? "border-b border-white/5" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-semibold text-lg text-white">Baskı Dosya Kodları</h2>
                <Badge className="border-white/10 bg-black/40 text-white/70 hover:bg-black/40 text-xs">
                  {filteredPrintCodeSchools.length} okul
                </Badge>
              </div>
              <p className="text-xs text-white/50">
                Şube satırlarına tıklayarak ham dosya kodlarını (RAW/JPG) ve sipariş notlarını
                görüntüleyin.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#A67C52]/20 text-[#A67C52]">
                <FileText className="h-4 w-4" />
              </div>
              <button
                type="button"
                aria-label={isPrintCodesOpen ? "Bölümü daralt" : "Bölümü genişlet"}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPrintCodesOpen((prev) => !prev);
                }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#131316] text-[#A67C52] hover:bg-[#A67C52]/15 hover:border-[#A67C52]/40 transition-colors cursor-pointer"
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${
                    isPrintCodesOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>
          </div>

          {isPrintCodesOpen && (
            <SectionHeaderToolbar
              search={printSearch}
              onSearchChange={setPrintSearch}
              cityFilter={printCityFilter}
              onCityFilterChange={setPrintCityFilter}
              cities={uniqueCities}
              sort={printSort}
              onSortChange={setPrintSort}
            />
          )}
        </div>

        {isPrintCodesOpen && (
          <div className="p-4">
            {Object.keys(groupedBySchool).length === 0 ? (
              <div className="text-center text-white/40 py-8">Henüz sipariş kodu bulunmuyor.</div>
            ) : filteredPrintCodeSchools.length === 0 ? (
              <div className="text-center text-white/40 py-8">
                Filtrelere uygun okul bulunamadı.
              </div>
            ) : (
              <Accordion type="multiple" className="space-y-4">
                {filteredPrintCodeSchools.map((school: any) => (
                  <AccordionItem
                    key={school.packages[0].school_id}
                    value={school.packages[0].school_id}
                    className="border border-white/10 rounded-xl bg-white/5 overflow-hidden"
                  >
                    <AccordionTrigger className="px-6 py-4 hover:bg-white/5 transition-colors [&[data-state=open]]:bg-white/5 hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-3 gap-3 text-left">
                        <div className="flex items-center gap-3">
                          <SchoolIcon className="w-5 h-5 text-[#A67C52] shrink-0" />
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-white">{school.school_name}</span>
                              {school.city && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white/60 bg-black/30 border border-white/10 px-2 py-0.5 rounded-md">
                                  <MapPin className="w-3 h-3 text-[#A67C52]" />
                                  {school.city}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-white/50 font-normal">
                              {school.packages.length} farklı paket siparişi
                            </div>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-[#A67C52] bg-[#A67C52]/10 px-2.5 py-1 rounded-md shrink-0">
                          {school.total_orders} sipariş
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6 pt-2">
                      <div className="grid gap-4 mt-3">
                        {school.packages.map((pkg: any) => (
                          <div
                            key={pkg.id}
                            className="p-4 rounded-xl border border-white/5 bg-black/25 space-y-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-[#A67C52]/10 flex items-center justify-center shrink-0">
                                  <Package className="w-5 h-5 text-[#A67C52]" />
                                </div>
                                <div>
                                  <div className="font-medium text-white">{pkg.package_name}</div>
                                  <div className="text-xs text-white/50">
                                    {pkg.quantity} sipariş
                                  </div>
                                </div>
                              </div>
                              {pkg.students.length > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    openClassOrdersModal({
                                      schoolName: school.school_name,
                                      packageName: pkg.package_name,
                                      className: "Tüm Şubeler",
                                      orders: [...pkg.students].sort(
                                        (a: ClassOrderItem, b: ClassOrderItem) =>
                                          a.image_code.localeCompare(b.image_code, undefined, {
                                            numeric: true,
                                            sensitivity: "base",
                                          }),
                                      ),
                                    })
                                  }
                                  className="h-8 bg-white/5 hover:bg-white/10 border-white/10 text-white text-xs cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5 mr-1.5 text-[#A67C52]" />
                                  Tüm Paket Kodları
                                </Button>
                              )}
                            </div>

                            {pkg.class_breakdown && pkg.class_breakdown.length > 0 && (
                              <div className="grid gap-1.5 pt-1">
                                {pkg.class_breakdown.map((cb: ClassBreakdownItem, idx: number) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() =>
                                      openClassOrdersModal({
                                        schoolName: school.school_name,
                                        packageName: pkg.package_name,
                                        className: cb.class_name,
                                        orders: cb.orders,
                                      })
                                    }
                                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-white/[0.03] hover:bg-white/10 border border-white/5 hover:border-[#A67C52]/40 transition-all cursor-pointer group text-left"
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <span className="text-sm font-medium text-white group-hover:text-[#A67C52] transition-colors">
                                        {cb.class_name}
                                      </span>
                                      {cb.notes_count > 0 && (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-300 bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 rounded-md">
                                          <StickyNote className="w-3 h-3" />
                                          {cb.notes_count} not
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-medium text-[#A67C52] bg-[#A67C52]/10 px-2.5 py-0.5 rounded">
                                        {cb.count} sipariş
                                      </span>
                                      <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-[#A67C52] group-hover:translate-x-0.5 transition-all" />
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        )}
      </motion.div>

      {/* Schools table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="overflow-hidden rounded-2xl border border-white/10 bg-[#131316] shadow-xl"
      >
        <div
          onClick={() => setIsAllSchoolsOpen((prev) => !prev)}
          className={`px-6 py-5 bg-white/5 cursor-pointer select-none hover:bg-white/[0.07] transition-colors space-y-3 ${
            isAllSchoolsOpen ? "border-b border-white/5" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-semibold text-lg text-white">Tüm Okullar</h2>
                <Badge className="border-white/10 bg-black/40 text-white/70 hover:bg-black/40 text-xs">
                  {filteredAllSchools.length} okul
                </Badge>
              </div>
              <p className="text-xs text-white/50">Sisteme kayıtlı okulların portal linkleri.</p>
            </div>
            <button
              type="button"
              aria-label={isAllSchoolsOpen ? "Bölümü daralt" : "Bölümü genişlet"}
              onClick={(e) => {
                e.stopPropagation();
                setIsAllSchoolsOpen((prev) => !prev);
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#131316] text-[#A67C52] hover:bg-[#A67C52]/15 hover:border-[#A67C52]/40 transition-colors cursor-pointer"
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  isAllSchoolsOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>

          {isAllSchoolsOpen && (
            <SectionHeaderToolbar
              search={schoolsSearch}
              onSearchChange={setSchoolsSearch}
              cityFilter={schoolsCityFilter}
              onCityFilterChange={setSchoolsCityFilter}
              cities={uniqueCities}
              sort={schoolsSort}
              onSortChange={setSchoolsSort}
              statusFilter={schoolsStatusFilter}
              onStatusFilterChange={setSchoolsStatusFilter}
            />
          )}
        </div>

        {isAllSchoolsOpen && (
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
              ) : filteredAllSchools.length === 0 ? (
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableCell colSpan={6} className="text-center text-white/40 py-8">
                    Filtrelere uygun okul bulunamadı.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAllSchools.map((s: any) => {
                  const link = `${origin}/portal/${s.id}`;
                  const schoolOrderCount = orderCountBySchoolId.get(String(s.id)) || 0;
                  return (
                    <TableRow
                      key={s.id}
                      className="border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <TableCell className="font-medium text-white">
                        <div className="flex items-center gap-2">
                          <span>{s.name}</span>
                          {schoolOrderCount > 0 && (
                            <span className="text-[11px] font-semibold text-[#A67C52] bg-[#A67C52]/10 px-2 py-0.5 rounded">
                              {schoolOrderCount} sipariş
                            </span>
                          )}
                        </div>
                      </TableCell>
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
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </motion.div>

      {/* Class Orders Codes & Notes Modal */}
      <Dialog
        open={!!selectedClassModal}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSelectedClassModal(null);
            setCopiedAllCodes(false);
            setCopiedOrderId(null);
          }
        }}
      >
        <DialogContent className="bg-[#131316] border border-white/10 text-white max-w-2xl shadow-2xl p-0 overflow-hidden">
          {selectedClassModal &&
            (() => {
              const notesCount = selectedClassModal.orders.filter((o) =>
                Boolean(o.note && o.note.trim() !== ""),
              ).length;
              const selectedOrdersCount = selectedClassModal.orders.filter(
                (o) => o.is_selected !== false,
              ).length;

              return (
                <>
                  <div className="px-6 pt-6 pb-4 border-b border-white/10 bg-white/[0.03] space-y-4">
                    <DialogHeader className="space-y-1 text-left">
                      <div className="text-xs font-medium text-[#A67C52] uppercase tracking-wider">
                        {selectedClassModal.schoolName} • {selectedClassModal.packageName}
                      </div>
                      <div className="flex items-center justify-between gap-3 pr-6">
                        <DialogTitle className="text-xl font-bold text-white">
                          {selectedClassModal.className} — Sipariş Kodları ve Notlar
                        </DialogTitle>
                        <Badge className="border-transparent bg-[#A67C52]/20 text-[#A67C52] hover:bg-[#A67C52]/20 shrink-0">
                          {selectedOrdersCount} sipariş
                        </Badge>
                      </div>
                    </DialogHeader>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Button
                        type="button"
                        disabled={selectedClassModal.orders.length === 0}
                        onClick={handleCopyAllCodes}
                        className="bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-semibold rounded-xl px-4 h-10 cursor-pointer shadow-lg shadow-[#A67C52]/20"
                      >
                        {copiedAllCodes ? (
                          <Check className="w-4 h-4 mr-2" />
                        ) : (
                          <Copy className="w-4 h-4 mr-2" />
                        )}
                        {copiedAllCodes
                          ? lang === "TR"
                            ? "Tüm Kodlar Kopyalandı!"
                            : "Copied All Codes!"
                          : lang === "TR"
                            ? "Tüm Kodları Kopyala"
                            : "Copy All Codes"}
                      </Button>

                      {notesCount > 0 && (
                        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-3 py-1.5 rounded-lg">
                          <StickyNote className="w-3.5 h-3.5 text-amber-400" />
                          <span>{notesCount} notlu fotoğraf</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {selectedClassModal.orders.length === 0 ? (
                      <div className="text-center text-white/40 py-10 text-sm">
                        Bu şube için sipariş kaydı bulunamadı.
                      </div>
                    ) : (
                      <div className="rounded-xl border border-white/10 bg-black/35 overflow-hidden">
                        <Table>
                          <TableHeader className="bg-white/[0.05]">
                            <TableRow className="border-white/10 hover:bg-transparent">
                              <TableHead className="w-12 text-white/50 text-xs font-semibold uppercase tracking-wider">
                                #
                              </TableHead>
                              <TableHead className="w-[220px] text-white/50 text-xs font-semibold uppercase tracking-wider">
                                Fotoğraf Kodu
                              </TableHead>
                              <TableHead className="text-white/50 text-xs font-semibold uppercase tracking-wider">
                                Sipariş Notu
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedClassModal.orders.map((orderItem, idx) => {
                              const hasNote = Boolean(
                                orderItem.note && orderItem.note.trim() !== "",
                              );
                              const rowKey = `${orderItem.id}-${idx}`;
                              return (
                                <TableRow
                                  key={rowKey}
                                  className={
                                    hasNote
                                      ? "border-amber-500/20 bg-amber-500/[0.10] hover:bg-amber-500/[0.16] shadow-[inset_3px_0_0_0_#EAB308] transition-colors"
                                      : "border-white/5 hover:bg-white/[0.04] transition-colors"
                                  }
                                >
                                  <TableCell className="py-3 font-mono text-xs text-white/35 align-top">
                                    {String(idx + 1).padStart(2, "0")}
                                  </TableCell>

                                  <TableCell className="py-3 align-top">
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-2">
                                        <span
                                          className={`font-mono text-sm select-all ${
                                            hasNote
                                              ? "font-bold text-amber-100"
                                              : "font-semibold text-white/90"
                                          }`}
                                        >
                                          {orderItem.image_code}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleCopySingleCode(rowKey, orderItem.image_code)
                                          }
                                          title="Kodu Kopyala"
                                          className="p-1 rounded-md text-white/35 hover:text-[#A67C52] hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                                        >
                                          {copiedOrderId === rowKey ? (
                                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                                          ) : (
                                            <Copy className="w-3.5 h-3.5" />
                                          )}
                                        </button>
                                      </div>
                                      {orderItem.is_selected === false && (
                                        <span className="inline-block w-fit text-[10px] font-medium text-amber-200/80 bg-amber-500/15 border border-amber-500/25 px-1.5 py-0.5 rounded">
                                          Ürün seçilmedi • Not var
                                        </span>
                                      )}
                                    </div>
                                  </TableCell>

                                  <TableCell className="py-3 whitespace-normal align-top">
                                    {hasNote ? (
                                      <div className="flex items-start gap-2 text-sm font-medium text-amber-300 leading-relaxed break-words">
                                        <StickyNote className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                        <span>{orderItem.note!.trim()}</span>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-white/25 italic">Not yok</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
        </DialogContent>
      </Dialog>

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
