import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageTransition } from "@/components/page-transition";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseClient } from "@/lib/supabaseClient";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeft,
  Search,
  Users,
  X,
  PlusCircle,
  Trash2,
  GraduationCap,
  Edit2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/dashboard/finance")({
  component: AccountingDashboard,
});

interface CategoryItem {
  id: string;
  title: string;
  amount: number;
  change: string;
  isPositive: boolean;
}

interface TransactionItem {
  id: string;
  desc: string;
  date: string;
  amount: number;
  category: string;
  createdAt: string;
}

interface BreakdownItem {
  name: string;
  percentage: number;
  color: string;
}

// Firms / Cari Hesap types
interface FirmTransaction {
  id: string;
  date: string;
  type: "debt" | "payment"; 
  amount: number;
  desc: string;
  exchangeRate?: number;
  createdAt: string;
  currency?: string;
}
interface Firm {
  id: string;
  name: string;
  currency?: "TRY" | "EUR" | "USD";
  transactions: FirmTransaction[];
}

interface EmployeeTransaction {
  id: string;
  date: string;
  type: "advance" | "salary_payment" | "debt_addition";
  amount: number;
  desc: string;
  createdAt: string;
}
interface Employee {
  id: string;
  name: string;
  currency?: "TRY";
  transactions: EmployeeTransaction[];
}

interface ExpenseTransaction {
  id: string;
  date: string;
  type: "debt_addition" | "payment";
  amount: number;
  desc: string;
  createdAt: string;
}
interface Expense {
  id: string;
  name: string;
  currency?: "TRY";
  total_debt: number;
  total_paid: number;
}

interface SchoolTransaction {
  id: string;
  date: string;
  type: "debt" | "payment";
  amount: number;
  desc: string;
  createdAt: string;
  currency?: string;
}
interface School {
  id: string;
  name: string;
  currency?: "TRY" | "EUR" | "USD";
  transactions: SchoolTransaction[];
}
// --- Helper Functions for Calculations ---
const getConvertedAmount = (amount: number, currency?: string, rates?: Record<string, number>) => {
  const val = Number(amount) || 0;
  if (!currency || currency === "TRY") return val;
  const rate = rates?.[currency] || (currency === "EUR" ? 37.0 : 33.3);
  return val * rate;
};

const getFirmPaid = (f: Firm, rates?: Record<string, number>) => f.transactions.filter((tx) => tx.type === "payment").reduce((sum, tx) => sum + getConvertedAmount(tx.amount, tx.currency || f.currency, rates), 0);
const getFirmDebt = (f: Firm, rates?: Record<string, number>) => f.transactions.filter((tx) => tx.type === "debt").reduce((sum, tx) => sum + getConvertedAmount(tx.amount, tx.currency || f.currency, rates), 0);
const getFirmRemaining = (f: Firm, rates?: Record<string, number>) => Math.max(0, getFirmDebt(f, rates) - getFirmPaid(f, rates));

const getEmployeePaid = (f: Employee) => f.transactions.filter((tx) => tx.type === "salary_payment" || tx.type === "advance").reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
const getEmployeeDebt = (f: Employee) => f.transactions.filter((tx) => tx.type === "debt_addition").reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
const getEmployeeRemaining = (f: Employee) => Math.max(0, getEmployeeDebt(f) - getEmployeePaid(f));

const getExpensePaid = (f: Expense, rates?: Record<string, number>) => getConvertedAmount(f.total_paid, f.currency, rates);
const getExpenseDebt = (f: Expense, rates?: Record<string, number>) => getConvertedAmount(f.total_debt, f.currency, rates);
const getExpenseRemaining = (f: Expense, rates?: Record<string, number>) => Math.max(0, getExpenseDebt(f, rates) - getExpensePaid(f, rates));

const getSchoolPaid = (f: School, rates?: Record<string, number>) => f.transactions.filter((tx) => tx.type === "payment").reduce((sum, tx) => sum + getConvertedAmount(tx.amount, tx.currency || f.currency, rates), 0);
const getSchoolDebt = (f: School, rates?: Record<string, number>) => f.transactions.filter((tx) => tx.type === "debt").reduce((sum, tx) => sum + getConvertedAmount(tx.amount, tx.currency || f.currency, rates), 0);
const getSchoolRemaining = (f: School, rates?: Record<string, number>) => Math.max(0, getSchoolDebt(f, rates) - getSchoolPaid(f, rates));

function AccountingDashboard() {
  const [view, setView] = useState<"overview" | "firmalar" | "maaslar" | "ortak_giderler" | "okullar">("overview");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const [isAddCategoryModalOpen, setAddCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const queryClient = useQueryClient();

  const addExpenseMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabaseClient
        .from("common_expenses")
        .insert([{ name, currency: "TRY" }])
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses_ledger"] });
      toast.success("Yeni bölüm başarıyla eklendi.");
      setAddCategoryModalOpen(false);
      setNewCategoryName("");
    },
    onError: (error) => {
      toast.error("Bölüm eklenirken hata oluştu: " + error.message);
    }
  });

  // 0. Fetch Live Exchange Rates from ExchangeRate-API
  const { data: exchangeRates, isError: isRatesError } = useQuery<Record<string, number>>({
    queryKey: ["exchange_rates"],
    queryFn: async () => {
      const apiKeyRaw = import.meta.env.VITE_EXCHANGE_RATE_API_KEY || "";
      const apiKey = apiKeyRaw.replace(/['"]/g, "");
      if (!apiKey) throw new Error("API Key is missing in .env");

      const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/EUR`;
      let data;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        data = await res.json();
        if (data.result !== "success") throw new Error(data["error-type"] || "API returned error");
      } catch (err: any) {
        throw new Error("Failed to fetch exchange rates");
      }

      const eurToTry = data.conversion_rates.TRY;
      const usdToTry = eurToTry / data.conversion_rates.USD;

      return { EUR: eurToTry, USD: usdToTry, TRY: 1.0 };
    },
    staleTime: 1000 * 60 * 60, // 1 hour caching
  });

  const convertToTry = (amount: number, fromCurrency?: string) => {
    if (!fromCurrency || fromCurrency === "TRY") return amount;
    const staticRates: Record<string, number> = { USD: 33.3, EUR: 37.0 };
    const rate = exchangeRates?.[fromCurrency] ?? staticRates[fromCurrency] ?? 1.0;
    return amount * rate;
  };

  // 1. Fetch Firms & Transactions from new English DB Schema
  const { data: firmsData = [] } = useQuery<Firm[]>({
    queryKey: ["firms_ledger"],
    queryFn: async () => {
      const { data: firms, error: sErr } = await supabaseClient
        .from("firms")
        .select("id, name, currency, created_at")
        .order("created_at", { ascending: false });
      
      if (sErr) return [];

      const { data: transactions, error: tErr } = await supabaseClient
        .from("firm_transactions")
        .select("id, firm_id, transaction_type, amount, description, created_at, currency")
        .order("created_at", { ascending: true });

      if (tErr) return firms.map(s => ({ id: s.id, name: s.name, currency: s.currency as any, transactions: [] }));

      console.log("Firms Raw:", firms);
      console.log("Firm Transactions Raw:", transactions);

      return firms.map((s) => ({
        id: s.id,
        name: s.name,
        currency: s.currency as any,
        transactions: transactions
          .filter((t) => String(t.firm_id) === String(s.id))
          .map((t) => ({
            id: t.id,
            date: new Date(t.created_at).toISOString().split("T")[0],
            type: t.transaction_type as "debt" | "payment",
            amount: Number(t.amount),
            desc: t.description ?? "",
            exchangeRate: undefined,
            createdAt: t.created_at,
            currency: t.currency,
          })),
      }));
    }
  });

  // Calculate dynamic outstanding firms balance to show in card
  const totalRemainingFirms = firmsData.reduce((sum, f) => sum + getFirmRemaining(f, exchangeRates), 0);
  const totalPaidFirms = firmsData.reduce((sum, f) => sum + getFirmPaid(f, exchangeRates), 0);

  // Fetch Employees & Transactions
  const { data: employeesData = [] } = useQuery<Employee[]>({
    queryKey: ["employees_ledger"],
    queryFn: async () => {
      const { data: employees, error: sErr } = await supabaseClient
        .from("employees")
        .select("id, name, currency, created_at")
        .order("created_at", { ascending: false });
      if (sErr) return [];

      const { data: transactions, error: tErr } = await supabaseClient
        .from("salary_transactions")
        .select("id, employee_id, transaction_type, amount, description, created_at")
        .order("created_at", { ascending: true });
      if (tErr) return employees.map(s => ({ id: s.id, name: s.name, currency: s.currency as any, transactions: [] }));

      console.log("Employees Raw:", employees);
      console.log("Employee Transactions Raw:", transactions);

      return employees.map((s) => ({
        id: s.id,
        name: s.name,
        currency: s.currency as any,
        transactions: transactions
          .filter((t) => String(t.employee_id) === String(s.id))
          .map((t) => ({
            id: t.id,
            date: new Date(t.created_at).toISOString().split("T")[0],
            type: t.transaction_type as EmployeeTransaction["type"],
            amount: Number(t.amount),
            desc: t.description ?? "",
            createdAt: t.created_at,
          })),
      }));
    }
  });

  const totalPaidEmployees = employeesData.reduce((sum, f) => sum + getEmployeePaid(f), 0);
  const totalRemainingEmployees = employeesData.reduce((sum, f) => sum + getEmployeeRemaining(f), 0);

  // Fetch Common Expenses
  const { data: expensesData = [] } = useQuery<Expense[]>({
    queryKey: ["expenses_ledger"],
    queryFn: async () => {
      const { data: expenses, error: sErr } = await supabaseClient
        .from("common_expenses")
        .select("id, name, currency, total_debt, total_paid, created_at")
        .order("created_at", { ascending: false });
      if (sErr) return [];

      return expenses.map((s) => ({
        id: s.id,
        name: s.name,
        currency: s.currency as any,
        total_debt: Number(s.total_debt) || 0,
        total_paid: Number(s.total_paid) || 0,
      }));
    }
  });

  const { data: schoolsData = [] } = useQuery<School[]>({
    queryKey: ["schools_ledger"],
    queryFn: async () => {
      const { data: schools, error: sErr } = await supabaseClient
        .from("schools")
        .select("id, name, currency, created_at")
        .order("created_at", { ascending: false });
      if (sErr) return [];

      const { data: transactions, error: tErr } = await supabaseClient
        .from("school_transactions")
        .select("id, school_id, transaction_type, amount, description, created_at, currency")
        .order("created_at", { ascending: true });
      if (tErr) return schools.map(s => ({ id: s.id, name: s.name, currency: s.currency as any, transactions: [] }));

      console.log("Schools Raw:", schools);
      console.log("School Transactions Raw:", transactions);

      return schools.map((s) => ({
        id: s.id,
        name: s.name,
        currency: s.currency as any,
        transactions: transactions
          .filter((t) => String(t.school_id) === String(s.id))
          .map((t) => ({
            id: t.id,
            date: new Date(t.created_at).toISOString().split("T")[0],
            type: t.transaction_type as "debt" | "payment",
            amount: Number(t.amount),
            desc: t.description ?? "",
            createdAt: t.created_at,
          })),
      }));
    }
  });

  const totalPaidExpenses = expensesData.reduce((sum, f) => sum + getExpensePaid(f, exchangeRates), 0);
  const totalRemainingExpenses = expensesData.reduce((sum, f) => sum + getExpenseRemaining(f, exchangeRates), 0);

  const totalPaidSchools = schoolsData.reduce((sum, f) => sum + getSchoolPaid(f, exchangeRates), 0);
  const totalRemainingSchools = schoolsData.reduce((sum, f) => sum + getSchoolRemaining(f, exchangeRates), 0);

  // Categories list dynamically calculated from database aggregates
  const categories: CategoryItem[] = [
    { id: "cat-1", title: "FİRMALAR", amount: totalPaidFirms, change: "+8%", isPositive: true },
    { id: "cat-2", title: "ORTAK GİDERLER", amount: totalPaidExpenses, change: "-3%", isPositive: false },
    { id: "cat-3", title: "MAAŞLAR", amount: totalPaidEmployees, change: "-2%", isPositive: false },
    { id: "cat-5", title: "OKULLAR", amount: totalPaidSchools, change: "+15%", isPositive: true },
  ];

  // Dynamic Recent Transactions combining all database tables
  const combinedTx: TransactionItem[] = [];

  firmsData.forEach((f) => {
    f.transactions.forEach((tx) => {
      combinedTx.push({
        id: tx.id,
        desc: `${f.name} - ${tx.desc}`,
        date: tx.date,
        amount: -convertToTry(tx.amount, f.currency), // Negative representing outflow
        category: "cat-1",
        createdAt: tx.createdAt,
      });
    });
  });

  employeesData.forEach((emp) => {
    emp.transactions.forEach((tx) => {
      combinedTx.push({
        id: tx.id,
        desc: `${emp.name} - ${tx.desc}`,
        date: tx.date,
        amount: -tx.amount, // Always TRY
        category: "cat-3",
        createdAt: tx.createdAt,
      });
    });
  });

  // Expenses no longer use transactions, so they are omitted from the Recent Transactions timeline.

  schoolsData.forEach((sch) => {
    sch.transactions.forEach((tx) => {
      combinedTx.push({
        id: tx.id,
        desc: `${sch.name} - ${tx.desc}`,
        date: tx.date,
        amount: -convertToTry(tx.amount, sch.currency),
        category: "cat-5",
        createdAt: tx.createdAt,
      });
    });
  });

  // Sort by database createdAt (newest first)
  const sortedCombinedTx = [...combinedTx].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Filter transactions for recent transactions section
  const filteredTransactions = activeCategory
    ? sortedCombinedTx.filter((t) => t.category === activeCategory)
    : sortedCombinedTx.slice(0, 5);

  // Dynamic Budget Breakdown based strictly on real-time database totals (Firms, Common Expenses, Employees, Schools)
  const dbCategories = categories.filter((c) => c.id === "cat-1" || c.id === "cat-2" || c.id === "cat-3" || c.id === "cat-5");
  const breakdownItems: BreakdownItem[] = dbCategories.map((c, i) => {
    const colors = ["#A67C52", "#C01C1C", "#9E9696", "#E57373"];
    const totalAmount = dbCategories.reduce((sum, item) => sum + item.amount, 0);
    const percentage = totalAmount ? Math.round((c.amount / totalAmount) * 100) : 0;
    return {
      name: c.title,
      percentage,
      color: colors[i % colors.length],
    };
  });

  return (
    <PageTransition className="pb-12">
      <AnimatePresence mode="wait">
        {view === "overview" ? (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            {/* Page Header */}
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">
                Muhasebe
              </h1>
              <p className="text-sm text-[#9E9696] mt-1 font-medium">
                Finansal genel bakış ve son işlemler.
              </p>
            </div>

            {isRatesError && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Döviz kurları alınamadı. Dövizli firmaların Kalan Borç hesaplamaları geçici olarak 0 görünecektir.
              </div>
            )}

            {/* Top Row: Category Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {categories.map((c) => {
                const isActive = activeCategory === c.id;
                const handleClick = () => {
                  if (c.id === "cat-1") setView("firmalar");
                  else if (c.id === "cat-3") setView("maaslar");
                  else if (c.id === "cat-2") setView("ortak_giderler");
                  else if (c.id === "cat-5") setView("okullar");
                  else setActiveCategory(isActive ? null : c.id);
                };

                return (
                  <CategoryCard
                    key={c.id}
                    title={c.title}
                    amount={c.amount}
                    change={c.change}
                    isPositive={c.isPositive}
                    isActive={isActive || c.id === "cat-1" || c.id === "cat-2" || c.id === "cat-3" || c.id === "cat-5"}
                    isPortal={c.id === "cat-1" || c.id === "cat-2" || c.id === "cat-3" || c.id === "cat-5"}
                    onClick={handleClick}
                  />
                );
              })}


            </div>

            {/* Lower Columns */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
              <div className="xl:col-span-8">
                <TransactionList
                  transactions={filteredTransactions}
                  activeCategoryName={categories.find((c) => c.id === activeCategory)?.title}
                  onClearFilter={() => setActiveCategory(null)}
                />
              </div>
              <div className="xl:col-span-4">
                <MonthlyBreakdown items={breakdownItems} />
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            {view === "firmalar" && <FirmsListView firms={firmsData} exchangeRates={exchangeRates} isRatesError={isRatesError} onBack={() => setView("overview")} />}
            {view === "maaslar" && <EmployeesListView employees={employeesData} onBack={() => setView("overview")} />}
            {view === "ortak_giderler" && <ExpensesListView expenses={expensesData} exchangeRates={exchangeRates} onBack={() => setView("overview")} />}
            {view === "okullar" && <OkullarListView schools={schoolsData} exchangeRates={exchangeRates} isRatesError={isRatesError} onBack={() => setView("overview")} />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Category Dialog */}
      <Dialog open={isAddCategoryModalOpen} onOpenChange={setAddCategoryModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#111111] text-white border-white/10">
          <DialogHeader>
            <DialogTitle>Yeni Bölüm Ekle</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category-name">Bölüm Adı</Label>
              <Input
                id="category-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Örn: Pazarlama Giderleri"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                autoComplete="off"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddCategoryModalOpen(false)}
              className="bg-transparent border-white/10 text-white hover:bg-white/5 hover:text-white"
            >
              İptal
            </Button>
            <Button
              onClick={() => {
                if (newCategoryName.trim()) {
                  addExpenseMutation.mutate(newCategoryName.trim());
                }
              }}
              disabled={!newCategoryName.trim() || addExpenseMutation.isPending}
              className="bg-white text-black hover:bg-white/90"
            >
              {addExpenseMutation.isPending ? "Ekleniyor..." : "Ekle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}

// ───────── Sub Components ─────────

interface CategoryCardProps {
  title: string;
  amount: number;
  change: string;
  isPositive: boolean;
  isActive: boolean;
  isPortal?: boolean;
  onClick: () => void;
}

function CategoryCard({ title, amount, change, isPositive, isActive, isPortal, onClick }: CategoryCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl p-5 border transition-all cursor-pointer ${
        isActive
          ? "bg-[#131316] border-[#A67C52] shadow-[0_0_15px_rgba(166,124,82,0.15)]"
          : "bg-[#131316] border-white/5 hover:border-white/10"
      }`}
    >
      <div className="flex flex-col justify-between h-full gap-4">
        <div>
          <span className="text-xs font-semibold text-[#9E9696] uppercase tracking-wider block truncate">
            {title}
          </span>
          <h3 className="text-2xl font-extrabold text-white mt-1">
            {Math.round(amount).toLocaleString()} ₺
          </h3>
        </div>
        <div className="flex justify-between items-end">
          <div className={`flex items-center gap-1 text-xs font-semibold ${isPositive ? "text-[#12B76A]" : "text-[#A67C52]"}`}>
            {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span>{change}</span>
          </div>
          {isPortal && (
            <span className="text-[10px] text-[#A67C52] font-extrabold uppercase tracking-widest bg-[#A67C52]/10 px-2 py-0.5 rounded border border-[#A67C52]/20">
              Aç
            </span>
          )}
        </div>
      </div>
      {isActive && <span className="absolute top-0 right-0 w-3 h-3 bg-[#A67C52] rounded-bl-lg" />}
    </motion.div>
  );
}

interface TransactionListProps {
  transactions: TransactionItem[];
  activeCategoryName: string | null | undefined;
  onClearFilter: () => void;
}

function TransactionList({ transactions, activeCategoryName, onClearFilter }: TransactionListProps) {
  return (
    <div className="bg-[#131316] border border-white/5 rounded-3xl p-6 shadow-xl space-y-6">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h3 className="text-lg font-bold text-white">Son İşlemler</h3>
          <p className="text-xs text-[#9E9696] font-medium mt-0.5">Bölüm ve firma kayıtlarının canlı akışı</p>
        </div>
        {activeCategoryName && (
          <Badge
            variant="outline"
            onClick={onClearFilter}
            className="h-6 cursor-pointer border-[#A67C52]/40 text-[#A67C52] bg-[#A67C52]/5 hover:bg-[#A67C52]/10 flex items-center gap-1 text-[10px] uppercase font-bold rounded-lg"
          >
            <span>{activeCategoryName}</span>
            <span className="font-extrabold ml-1">×</span>
          </Badge>
        )}
      </div>

      <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
        {transactions.length === 0 ? (
          <div className="text-center py-12 text-sm text-[#9E9696] font-medium border border-dashed border-white/5 rounded-2xl">
            Bu bölümde işlem bulunamadı.
          </div>
        ) : (
          transactions.map((tx) => {
            const isIncome = tx.amount > 0;
            return (
              <motion.div
                key={tx.id}
                whileHover={{ scale: 1.01, x: 2 }}
                className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">{tx.desc}</p>
                  <p className="text-xs text-[#9E9696] font-medium">{tx.date}</p>
                </div>
                <span className={`text-sm font-bold ${isIncome ? "text-[#12B76A]" : "text-[#A67C52]"}`}>
                  {isIncome ? "+" : "-"}{Math.abs(tx.amount).toLocaleString()} ₺
                </span>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

function MonthlyBreakdown({ items }: { items: BreakdownItem[] }) {
  return (
    <div className="bg-[#131316] border border-white/5 rounded-3xl p-6 shadow-xl space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white">Bütçe Dağılımı</h3>
        <p className="text-xs text-[#9E9696] font-medium mt-0.5">Departmanlara göre genel harcama oranı</p>
      </div>

      <div className="space-y-5">
        {items.map((item) => (
          <div key={item.name} className="space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-[#9E9696] truncate max-w-[200px]">{item.name}</span>
              <span className="text-white">{item.percentage}%</span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────── Firmalar (Cari Hesap) ListView Component ─────────

interface FirmsListViewProps {
  firms: Firm[];
  exchangeRates?: Record<string, number>;
  isRatesError?: boolean;
  onBack: () => void;
}

function FirmsListView({ firms, exchangeRates, isRatesError, onBack }: FirmsListViewProps) {
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFirmId, setSelectedFirmId] = useState<string | null>(null);
  const [isAddFirmOpen, setIsAddFirmOpen] = useState(false);
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [breakdownType, setBreakdownType] = useState<"paid" | "remaining" | null>(null);

  const [newFirmName, setNewFirmName] = useState("");
  const [newFirmTaken, setNewFirmTaken] = useState(""); 
  const [newFirmRest, setNewFirmRest] = useState(""); 
  const [newFirmCurrency, setNewFirmCurrency] = useState<"TRY" | "EUR" | "USD">("TRY");

  const [editFirmId, setEditFirmId] = useState<string | null>(null);
  const [editFirmName, setEditFirmName] = useState("");
  const [editFirmTaken, setEditFirmTaken] = useState(""); 
  const [editFirmRest, setEditFirmRest] = useState(""); 
  const [editFirmCurrency, setEditFirmCurrency] = useState<"TRY" | "EUR" | "USD">("TRY");

  const [newTxType, setNewTxType] = useState<"debt" | "payment">("debt");
  const [newTxAmount, setNewTxAmount] = useState("");
  const [newTxDate, setNewTxDate] = useState(new Date().toISOString().split("T")[0]);
  const [newTxDesc, setNewTxDesc] = useState("");
  const [newTxCurrency, setNewTxCurrency] = useState<"TRY" | "EUR">("TRY");

  const getCurrencySymbol = (currency?: string) => {
    switch (currency) {
      case "USD": return "$";
      case "EUR": return "€";
      case "TRY": default: return "₺";
    }
  };

  const convertToTry = (amount: number, fromCurrency?: string) => {
    if (!fromCurrency || fromCurrency === "TRY") return amount;
    if (!exchangeRates) {
      const staticRates: Record<string, number> = { USD: 33.3, EUR: 37.0 };
      return amount * (staticRates[fromCurrency] ?? 1);
    }
    const rateInTry = exchangeRates[fromCurrency];
    if (rateInTry && rateInTry > 0) return amount * rateInTry;
    return amount;
  };



  const totalPaid = firms.reduce((sum, f) => sum + getFirmPaid(f, exchangeRates), 0);

  const totalRemaining = firms.reduce((sum, f) => sum + getFirmRemaining(f, exchangeRates), 0);

  const addFirmMutation = useMutation({
    mutationFn: async (input: { name: string; currency: string; taken: number; rest: number }) => {
      const { data: supplier, error: sErr } = await supabaseClient
        .from("firms")
        .insert({ name: input.name, currency: input.currency })
        .select("id, name, currency")
        .single();
      if (sErr) throw sErr;

      if (input.taken > 0) {
        await supabaseClient.from("firm_transactions").insert({
          firm_id: supplier.id, transaction_type: "debt", amount: input.taken, description: "İlk Borç Kaydı", currency: input.currency
        });
      }
      if (input.rest > 0) {
        await supabaseClient.from("firm_transactions").insert({
          firm_id: supplier.id, transaction_type: "payment", amount: input.rest, description: "İlk Ödeme Kaydı", currency: input.currency
        });
      }
      return supplier;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["firms_ledger"] });
      toast.success("Firma eklendi");
      setIsAddFirmOpen(false);
      setNewFirmName(""); setNewFirmTaken(""); setNewFirmRest(""); setNewFirmCurrency("TRY");
    },
  });

  const editFirmMutation = useMutation({
    mutationFn: async (input: { id: string; name: string; currency: string; takenDiff: number; restDiff: number }) => {
      await supabaseClient.from("firms").update({ name: input.name, currency: input.currency }).eq("id", input.id);
      if (input.takenDiff !== 0) {
        await supabaseClient.from("firm_transactions").insert({
          firm_id: input.id, transaction_type: "debt", amount: input.takenDiff, description: "Bakiye Düzenlemesi (Borç)", currency: input.currency
        });
      }
      if (input.restDiff !== 0) {
        await supabaseClient.from("firm_transactions").insert({
          firm_id: input.id, transaction_type: "payment", amount: input.restDiff, description: "Bakiye Düzenlemesi (Ödenen)", currency: input.currency
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["firms_ledger"] });
      toast.success("Firma güncellendi");
      setEditFirmId(null);
    },
  });

  const deleteFirmMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabaseClient.from("firm_transactions").delete().eq("firm_id", id);
      await supabaseClient.from("firms").delete().eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["firms_ledger"] }); toast.success("Firma silindi"); },
  });

  const addTxMutation = useMutation({
    mutationFn: async (input: { firm_id: string; type: "debt" | "payment"; amount: number; desc: string; date: string; currency?: string }) => {
      await supabaseClient.from("firm_transactions").insert({
        firm_id: input.firm_id, transaction_type: input.type, amount: input.amount, description: input.desc, currency: input.currency, created_at: new Date(input.date).toISOString()
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["firms_ledger"] });
      toast.success("İşlem kaydedildi");
      setIsAddTxOpen(false); setNewTxAmount(""); setNewTxDesc("");
    },
  });

  const handleAddFirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirmName.trim()) return;
    addFirmMutation.mutate({ name: newFirmName.trim(), currency: newFirmCurrency, taken: parseFloat(newFirmTaken) || 0, rest: parseFloat(newFirmRest) || 0 });
  };

  const handleEditFirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFirmId || !editFirmName.trim()) return;
    const firm = firms.find(f => f.id === editFirmId);
    if (!firm) return;
    const currentTaken = firm.transactions.filter((tx) => tx.type === "debt").reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const currentRest = firm.transactions.filter((tx) => tx.type === "payment").reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const newTaken = parseFloat(editFirmTaken) || 0;
    const newRest = parseFloat(editFirmRest) || 0;
    editFirmMutation.mutate({
      id: editFirmId, name: editFirmName.trim(), currency: editFirmCurrency,
      takenDiff: newTaken - currentTaken, restDiff: newRest - currentRest
    });
  };

  const handleAddTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFirmId || !newTxAmount || !newTxDesc.trim()) return;
    const firm = firms.find((f) => f.id === selectedFirmId);
    addTxMutation.mutate({ firm_id: selectedFirmId, type: newTxType, amount: parseFloat(newTxAmount), desc: newTxDesc.trim(), date: newTxDate, currency: newTxCurrency });
  };

  const selectedFirm = firms.find((f) => f.id === selectedFirmId);
  const filteredFirms = firms.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <motion.button whileHover={{ scale: 1.05, x: -2 }} whileTap={{ scale: 0.95 }} onClick={onBack} className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">Firmalar (Cari Hesap)</h1>
            <p className="text-sm text-[#9E9696] mt-0.5 font-medium">Firma cari hesap borç ve ödeme bakiye takipleri.</p>
          </div>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button onClick={() => setIsAddFirmOpen(true)} className="bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-bold cursor-pointer rounded-xl h-11 px-5 shadow-[0_0_12px_rgba(166,124,82,0.3)]">
            <Plus className="mr-2 h-4 w-4" /> Firma Ekle
          </Button>
        </motion.div>
      </div>

      {isRatesError && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-semibold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Döviz kurları alınamadı.
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#9E9696]" />
        <Input type="text" placeholder="Firma ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-11 bg-[#131316] border-white/5 text-white placeholder:text-gray-500 rounded-xl focus-visible:ring-[#A67C52]" />
      </div>

      <div className="bg-[#131316] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-bold text-white text-lg">Cari Firma Listesi</h3>
          <Badge className="bg-[#A67C52]/15 text-[#A67C52] border-transparent font-bold">{firms.length} Firma</Badge>
        </div>

        <div className="divide-y divide-white/5">
          {filteredFirms.length === 0 ? (
            <div className="text-center py-16 text-sm text-[#9E9696] font-medium">Hiçbir kayıtlı firma bulunamadı.</div>
          ) : (
            filteredFirms.map((f) => {
              const paid = getFirmPaid(f, exchangeRates);
              const remaining = getFirmRemaining(f, exchangeRates);
              return (
                <motion.div key={f.id} whileHover={{ scale: 1.005, x: 2, backgroundColor: "rgba(255,255,255,0.02)" }} whileTap={{ scale: 0.995 }} onClick={() => setSelectedFirmId(f.id)} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 cursor-pointer gap-4 transition-colors">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white"><Users className="w-5 h-5 text-[#9E9696]" /></div>
                    <div>
                      <h4 className="font-bold text-white leading-snug">{f.name}</h4>
                      <span className="text-xs font-semibold text-[#9E9696] uppercase tracking-wider mt-0.5 block">ID: {f.id.substring(0,8).toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-8 justify-between sm:justify-end flex-1 sm:flex-none">
                    <div className="grid grid-cols-2 gap-6 sm:gap-12 text-right min-w-[200px]">
                      <div>
                        <span className="text-[10px] font-bold text-[#9E9696] uppercase tracking-wider block">Ödenen</span>
                        <span className="font-mono text-sm font-bold text-[#12B76A] block mt-0.5">{paid.toLocaleString()} ₺</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-[#9E9696] uppercase tracking-wider block">Kalan Borç</span>
                        <span className={`font-mono text-sm font-bold block mt-0.5 ${remaining > 0 ? "text-[#A67C52]" : "text-[#9E9696]"}`}>{remaining.toLocaleString()} ₺</span>
                      </div>
                    </div>
                    <div className="flex">
                      <button onClick={(e) => { 
                        e.stopPropagation(); 
                        setEditFirmId(f.id); 
                        setEditFirmName(f.name); 
                        setEditFirmCurrency(f.currency as any || "TRY");
                        setEditFirmRest(f.transactions.filter((tx) => tx.type === "payment").reduce((sum, tx) => sum + Number(tx.amount || 0), 0).toString());
                        setEditFirmTaken(f.transactions.filter((tx) => tx.type === "debt").reduce((sum, tx) => sum + Number(tx.amount || 0), 0).toString());
                      }} className="p-2 rounded-lg hover:bg-white/5 text-[#9E9696] hover:text-[#12B76A] transition-colors cursor-pointer ml-4">
                        <Edit2 className="w-4.5 h-4.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); if (confirm("Bu firmayı silmek istediğinizden emin misiniz?")) deleteFirmMutation.mutate(f.id); }} className="p-2 rounded-lg hover:bg-white/5 text-[#9E9696] hover:text-[#A67C52] transition-colors cursor-pointer ml-1">
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        <div className="p-6 bg-white/[0.02] border-t border-white/5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center max-w-4xl mx-auto">
            <div onClick={() => setBreakdownType("paid")} className="p-4 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/[0.08] transition-all">
              <span className="text-xs font-semibold text-[#9E9696] uppercase tracking-wider block">TOPLAM ÖDENEN</span>
              <h4 className="font-mono text-2xl font-black text-[#12B76A] mt-1.5">{Math.round(totalPaid).toLocaleString()} ₺</h4>
            </div>
            <div onClick={() => setBreakdownType("remaining")} className="p-4 rounded-2xl bg-[#A67C52]/10 border border-[#A67C52]/20 cursor-pointer hover:bg-[#A67C52]/15 transition-all">
              <span className="text-xs font-semibold text-[#A67C52] uppercase tracking-wider block">TOPLAM KALAN BORÇ</span>
              <h4 className="font-mono text-2xl font-black text-[#A67C52] mt-1.5">{Math.round(totalRemaining).toLocaleString()} ₺</h4>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!breakdownType} onOpenChange={(open) => !open && setBreakdownType(null)}>
        <DialogContent className="border-border bg-[#131316] text-white rounded-2xl max-w-md">
          <DialogHeader><DialogTitle className="text-xl font-bold">{breakdownType === "paid" ? "Ödenen Tutar Detayları" : "Kalan Borç Detayları"}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-4">
            {firms.map((f) => {
              const amount = breakdownType === "paid" ? getFirmPaid(f, exchangeRates) : getFirmRemaining(f, exchangeRates);
              if(amount === 0) return null;
              return (
                <div key={f.id} className="flex items-center justify-between p-3.5 bg-white/5 border border-white/5 rounded-xl">
                  <span className="font-bold text-white text-sm">{f.name}</span>
                  <div className="text-right">
                    <span className={`font-mono font-bold text-sm block ${breakdownType === "paid" ? "text-[#12B76A]" : "text-[#A67C52]"}`}>{amount.toLocaleString()} ₺</span>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddFirmOpen} onOpenChange={setIsAddFirmOpen}>
        <DialogContent className="border-border bg-[#131316] text-white rounded-2xl max-w-md">
          <DialogHeader><DialogTitle className="text-xl font-bold">Firma Ekle</DialogTitle></DialogHeader>
          <form onSubmit={handleAddFirm} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-300">Firma Adı</Label>
              <Input required placeholder="Örn. Batman Albüm" value={newFirmName} onChange={(e) => setNewFirmName(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white placeholder:text-gray-500 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-300">Para Birimi</Label>
              <Select value={newFirmCurrency} onValueChange={(v: any) => setNewFirmCurrency(v)}>
                <SelectTrigger className="h-11 border-white/10 bg-white/5 text-white rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#131316] border-white/10 text-white">
                  <SelectItem value="TRY">TRY (₺)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Ödenen (İlk) {getCurrencySymbol(newFirmCurrency)}</Label>
                <Input type="number" min="0" placeholder="0" value={newFirmRest} onChange={(e) => setNewFirmRest(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Borçlanma (İlk) {getCurrencySymbol(newFirmCurrency)}</Label>
                <Input type="number" min="0" placeholder="0" value={newFirmTaken} onChange={(e) => setNewFirmTaken(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddFirmOpen(false)} className="h-11 border-white/10 bg-transparent text-white hover:bg-white/5 rounded-xl">Vazgeç</Button>
              <Button type="submit" disabled={addFirmMutation.isPending} className="h-11 bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-bold rounded-xl px-6">Kaydet</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editFirmId} onOpenChange={(open) => !open && setEditFirmId(null)}>
        <DialogContent className="border-border bg-[#131316] text-white rounded-2xl max-w-md">
          <DialogHeader><DialogTitle className="text-xl font-bold">Firmayı Düzenle</DialogTitle></DialogHeader>
          <form onSubmit={handleEditFirm} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-300">Firma Adı</Label>
              <Input required value={editFirmName} onChange={(e) => setEditFirmName(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-300">Para Birimi</Label>
              <Select value={editFirmCurrency} onValueChange={(v: any) => setEditFirmCurrency(v)}>
                <SelectTrigger className="h-11 border-white/10 bg-white/5 text-white rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#131316] border-white/10 text-white">
                  <SelectItem value="TRY">TRY (₺)</SelectItem><SelectItem value="USD">USD ($)</SelectItem><SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Ödenen (Toplam) {getCurrencySymbol(editFirmCurrency)}</Label>
                <Input type="number" min="0" value={editFirmRest} onChange={(e) => setEditFirmRest(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Borçlanma (Toplam) {getCurrencySymbol(editFirmCurrency)}</Label>
                <Input type="number" min="0" value={editFirmTaken} onChange={(e) => setEditFirmTaken(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setEditFirmId(null)} className="h-11 border-white/10 bg-transparent text-white hover:bg-white/5 rounded-xl">Vazgeç</Button>
              <Button type="submit" disabled={editFirmMutation.isPending} className="h-11 bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-bold rounded-xl px-6">Güncelle</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedFirmId} onOpenChange={(open) => !open && setSelectedFirmId(null)}>
        <DialogContent className="border-border bg-[#131316] text-white rounded-3xl max-w-lg p-0 overflow-hidden">
          {selectedFirm && (
            <div className="flex flex-col h-full max-h-[85vh]">
              <div className="p-6 bg-white/[0.02] border-b border-white/5 flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#A67C52] uppercase tracking-widest">FİRMA DETAY PANELİ</span>
                  <h3 className="text-xl font-extrabold text-white leading-tight">{selectedFirm.name}</h3>
                </div>
                <button onClick={() => setSelectedFirmId(null)} className="p-1.5 rounded-lg hover:bg-white/5 text-[#9E9696] hover:text-white transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-3 gap-3 px-6 py-4 bg-white/[0.01] border-b border-white/5">
                <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-center">
                  <span className="text-[9px] font-bold text-[#9E9696] uppercase tracking-wider block">Ödenen</span>
                  <span className="font-mono text-sm font-bold text-[#12B76A] block mt-0.5">{getFirmPaid(selectedFirm, exchangeRates).toLocaleString()} ₺</span>
                </div>
                <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-center">
                  <span className="text-[9px] font-bold text-[#9E9696] uppercase tracking-wider block">Toplam Borç</span>
                  <span className="font-mono text-sm font-bold text-white block mt-0.5">{getFirmDebt(selectedFirm, exchangeRates).toLocaleString()} ₺</span>
                </div>
                <div className="p-3 bg-[#A67C52]/10 border border-[#A67C52]/20 rounded-xl text-center">
                  <span className="text-[9px] font-bold text-[#A67C52] uppercase tracking-wider block">Kalan Borç</span>
                  <span className="font-mono text-sm font-bold text-[#A67C52] block mt-0.5">{getFirmRemaining(selectedFirm, exchangeRates).toLocaleString()} ₺</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-white text-sm">İşlem Geçmişi</h4>
                  <Button size="sm" onClick={() => { setNewTxType("debt"); setIsAddTxOpen(true); }} className="bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white font-bold text-xs h-8 rounded-lg px-3">
                    <PlusCircle className="w-3.5 h-3.5 mr-1 text-[#A67C52]" /> İşlem Ekle
                  </Button>
                </div>
                <div className="space-y-2.5">
                  {selectedFirm.transactions.map((tx) => {
                    const isTaken = tx.type === "debt";
                    return (
                      <div key={tx.id} className="flex items-center justify-between p-3.5 bg-white/5 border border-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isTaken ? "bg-[#A67C52]/10 text-[#A67C52]" : "bg-[#12B76A]/10 text-[#12B76A]"}`}>
                            {isTaken ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block">{tx.desc}</span>
                            <span className="text-[10px] text-[#9E9696] font-medium mt-0.5">{tx.date}</span>
                          </div>
                        </div>
                        <span className={`font-mono text-sm font-bold ${isTaken ? "text-[#A67C52]" : "text-[#12B76A]"}`}>{isTaken ? "+" : "-"}{getConvertedAmount(tx.amount, tx.currency || selectedFirm.currency, exchangeRates).toLocaleString()} ₺</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isAddTxOpen} onOpenChange={setIsAddTxOpen}>
        <DialogContent className="border-border bg-[#131316] text-white rounded-2xl max-w-sm">
          <DialogHeader><DialogTitle className="text-lg font-bold">Yeni İşlem Ekle</DialogTitle></DialogHeader>
          <form onSubmit={handleAddTx} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-300">İşlem Tipi</Label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setNewTxType("debt")} className={`h-11 rounded-xl font-bold text-xs border ${newTxType === "debt" ? "bg-[#A67C52]/10 border-[#A67C52] text-[#A67C52]" : "bg-white/5 border-white/5 text-[#9E9696]"}`}>Mal Alımı (Borç)</button>
                <button type="button" onClick={() => setNewTxType("payment")} className={`h-11 rounded-xl font-bold text-xs border ${newTxType === "payment" ? "bg-[#12B76A]/10 border-[#12B76A] text-[#12B76A]" : "bg-white/5 border-white/5 text-[#9E9696]"}`}>Ödeme Yapıldı</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Tutar</Label>
                <div className="flex gap-2">
                  <Input required type="number" min="1" value={newTxAmount} onChange={(e) => setNewTxAmount(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl flex-1" />
                  <Select value={newTxCurrency} onValueChange={(v: "TRY"|"EUR") => setNewTxCurrency(v)}>
                    <SelectTrigger className="w-20 h-11 bg-white/5 border-white/10 text-white rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111111] border-white/10 text-white">
                      <SelectItem value="TRY">TRY</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label className="text-sm font-semibold text-gray-300">Tarih</Label><Input type="date" required value={newTxDate} onChange={(e) => setNewTxDate(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" /></div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-300">Açıklama</Label>
              <Input required placeholder="Ödeme veya borç açıklaması..." value={newTxDesc} onChange={(e) => setNewTxDesc(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddTxOpen(false)} className="h-11 border-white/10 bg-transparent text-white hover:bg-white/5 rounded-xl">İptal</Button>
              <Button type="submit" disabled={addTxMutation.isPending} className="h-11 bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-bold rounded-xl px-6">Ekle</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}


// ───────── Personel (Maaşlar) ListView Component ─────────

interface EmployeesListViewProps {
  employees: Employee[];
  onBack: () => void;
}

function EmployeesListView({ employees, onBack }: EmployeesListViewProps) {
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [breakdownType, setBreakdownType] = useState<"paid" | "remaining" | null>(null);

  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newEmployeeTaken, setNewEmployeeTaken] = useState(""); 
  const [newEmployeeRest, setNewEmployeeRest] = useState(""); 

  const [editEmployeeId, setEditEmployeeId] = useState<string | null>(null);
  const [editEmployeeName, setEditEmployeeName] = useState("");
  const [editEmployeeTaken, setEditEmployeeTaken] = useState(""); 
  const [editEmployeeRest, setEditEmployeeRest] = useState(""); 

  const [newTxType, setNewTxType] = useState<"debt_addition" | "salary_payment" | "advance">("debt_addition");
  const [newTxAmount, setNewTxAmount] = useState("");
  const [newTxDate, setNewTxDate] = useState(new Date().toISOString().split("T")[0]);
  const [newTxDesc, setNewTxDesc] = useState(""); 



  const totalPaid = employees.reduce((sum, f) => sum + getEmployeePaid(f), 0);
  const totalRemaining = employees.reduce((sum, f) => sum + getEmployeeRemaining(f), 0);

  const addEmployeeMutation = useMutation({
    mutationFn: async (input: { name: string; taken: number; rest: number }) => {
      const { data: employee, error: sErr } = await supabaseClient
        .from("employees")
        .insert({ name: input.name, currency: "TRY" })
        .select("id, name, currency")
        .single();
      if (sErr) throw sErr;

      if (input.taken > 0) {
        await supabaseClient.from("salary_transactions").insert({
          employee_id: employee.id, transaction_type: "debt_addition", amount: input.taken, description: "İlk Maaş Tahakkuku"
        });
      }
      if (input.rest > 0) {
        await supabaseClient.from("salary_transactions").insert({
          employee_id: employee.id, transaction_type: "salary_payment", amount: input.rest, description: "İlk Maaş Ödemesi"
        });
      }
      return employee;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees_ledger"] });
      toast.success("Personel eklendi");
      setIsAddEmployeeOpen(false);
      setNewEmployeeName(""); setNewEmployeeTaken(""); setNewEmployeeRest("");
    },
  });

  const editEmployeeMutation = useMutation({
    mutationFn: async (input: { id: string; name: string; takenDiff: number; restDiff: number }) => {
      await supabaseClient.from("employees").update({ name: input.name }).eq("id", input.id);
      if (input.takenDiff !== 0) {
        await supabaseClient.from("salary_transactions").insert({
          employee_id: input.id, transaction_type: "debt_addition", amount: input.takenDiff, description: "Bakiye Düzenlemesi (Borç)"
        });
      }
      if (input.restDiff !== 0) {
        await supabaseClient.from("salary_transactions").insert({
          employee_id: input.id, transaction_type: "salary_payment", amount: input.restDiff, description: "Bakiye Düzenlemesi (Ödenen)"
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees_ledger"] });
      toast.success("Personel güncellendi");
      setEditEmployeeId(null);
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabaseClient.from("salary_transactions").delete().eq("employee_id", id);
      await supabaseClient.from("employees").delete().eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employees_ledger"] }); toast.success("Personel silindi"); },
  });

  const addTxMutation = useMutation({
    mutationFn: async (input: { employee_id: string; type: string; amount: number; desc: string; date: string }) => {
      await supabaseClient.from("salary_transactions").insert({
        employee_id: input.employee_id, transaction_type: input.type, amount: input.amount, description: input.desc, created_at: new Date(input.date).toISOString()
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees_ledger"] });
      toast.success("İşlem kaydedildi");
      setIsAddTxOpen(false); setNewTxAmount(""); setNewTxDesc("");
    },
  });

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployeeName.trim()) return;
    addEmployeeMutation.mutate({ name: newEmployeeName.trim(), taken: parseFloat(newEmployeeTaken) || 0, rest: parseFloat(newEmployeeRest) || 0 });
  };

  const handleEditEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEmployeeId || !editEmployeeName.trim()) return;
    const employee = employees.find(f => f.id === editEmployeeId);
    if (!employee) return;
    const currentTaken = employee.transactions.filter((tx) => tx.type === "debt_addition").reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const currentRest = employee.transactions.filter((tx) => tx.type === "salary_payment" || tx.type === "advance").reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const newTaken = parseFloat(editEmployeeTaken) || 0;
    const newRest = parseFloat(editEmployeeRest) || 0;
    editEmployeeMutation.mutate({
      id: editEmployeeId, name: editEmployeeName.trim(),
      takenDiff: newTaken - currentTaken, restDiff: newRest - currentRest
    });
  };

  const handleAddTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId || !newTxAmount || !newTxDesc.trim()) return;
    addTxMutation.mutate({ employee_id: selectedEmployeeId, type: newTxType, amount: parseFloat(newTxAmount), desc: newTxDesc.trim(), date: newTxDate });
  };

  const selectedEmployee = employees.find((f) => f.id === selectedEmployeeId);
  const filteredEmployees = employees.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <motion.button whileHover={{ scale: 1.05, x: -2 }} whileTap={{ scale: 0.95 }} onClick={onBack} className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">Personel Maaşları</h1>
            <p className="text-sm text-[#9E9696] mt-0.5 font-medium">Çalışan maaşları, avans ve ödeme takipleri.</p>
          </div>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button onClick={() => setIsAddEmployeeOpen(true)} className="bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-bold cursor-pointer rounded-xl h-11 px-5 shadow-[0_0_12px_rgba(166,124,82,0.3)]">
            <Plus className="mr-2 h-4 w-4" /> Personel Ekle
          </Button>
        </motion.div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#9E9696]" />
        <Input type="text" placeholder="Personel ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-11 bg-[#131316] border-white/5 text-white placeholder:text-gray-500 rounded-xl focus-visible:ring-[#A67C52]" />
      </div>

      <div className="bg-[#131316] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-bold text-white text-lg">Aktif Personel Listesi</h3>
          <Badge className="bg-[#A67C52]/15 text-[#A67C52] border-transparent font-bold">{employees.length} Personel</Badge>
        </div>

        <div className="divide-y divide-white/5">
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-16 text-sm text-[#9E9696] font-medium">Kayıtlı personel bulunamadı.</div>
          ) : (
            filteredEmployees.map((f) => {
              const paid = getEmployeePaid(f);
              const remaining = getEmployeeRemaining(f);
              return (
                <motion.div key={f.id} whileHover={{ scale: 1.005, x: 2, backgroundColor: "rgba(255,255,255,0.02)" }} whileTap={{ scale: 0.995 }} onClick={() => setSelectedEmployeeId(f.id)} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 cursor-pointer gap-4 transition-colors">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white"><Users className="w-5 h-5 text-[#9E9696]" /></div>
                    <div>
                      <h4 className="font-bold text-white leading-snug">{f.name}</h4>
                      <span className="text-xs font-semibold text-[#9E9696] uppercase tracking-wider mt-0.5 block">Maaş Hesabı</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-8 justify-between sm:justify-end flex-1 sm:flex-none">
                    <div className="grid grid-cols-2 gap-6 sm:gap-12 text-right min-w-[200px]">
                      <div>
                        <span className="text-[10px] font-bold text-[#9E9696] uppercase tracking-wider block">Ödenen</span>
                        <span className="font-mono text-sm font-bold text-[#12B76A] block mt-0.5">{paid.toLocaleString()} ₺</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-[#9E9696] uppercase tracking-wider block">Kalan Maaş (Borç)</span>
                        <span className={`font-mono text-sm font-bold block mt-0.5 ${remaining > 0 ? "text-[#A67C52]" : "text-[#9E9696]"}`}>{remaining.toLocaleString()} ₺</span>
                      </div>
                    </div>
                    <div className="flex">
                      <button onClick={(e) => { 
                        e.stopPropagation(); 
                        setEditEmployeeId(f.id); 
                        setEditEmployeeName(f.name); 
                        setEditEmployeeRest(f.transactions.filter((tx) => tx.type === "salary_payment" || tx.type === "advance").reduce((sum, tx) => sum + Number(tx.amount || 0), 0).toString());
                        setEditEmployeeTaken(f.transactions.filter((tx) => tx.type === "debt_addition").reduce((sum, tx) => sum + Number(tx.amount || 0), 0).toString());
                      }} className="p-2 rounded-lg hover:bg-white/5 text-[#9E9696] hover:text-[#12B76A] transition-colors cursor-pointer ml-4">
                        <Edit2 className="w-4.5 h-4.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); if (confirm("Bu personeli silmek istediğinizden emin misiniz?")) deleteEmployeeMutation.mutate(f.id); }} className="p-2 rounded-lg hover:bg-white/5 text-[#9E9696] hover:text-[#A67C52] transition-colors cursor-pointer ml-1">
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        <div className="p-6 bg-white/[0.02] border-t border-white/5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center max-w-4xl mx-auto">
            <div onClick={() => setBreakdownType("paid")} className="p-4 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/[0.08] transition-all">
              <span className="text-xs font-semibold text-[#9E9696] uppercase tracking-wider block">TOPLAM ÖDENEN MAAŞ</span>
              <h4 className="font-mono text-2xl font-black text-[#12B76A] mt-1.5">{totalPaid.toLocaleString()} ₺</h4>
            </div>
            <div onClick={() => setBreakdownType("remaining")} className="p-4 rounded-2xl bg-[#A67C52]/10 border border-[#A67C52]/20 cursor-pointer hover:bg-[#A67C52]/15 transition-all">
              <span className="text-xs font-semibold text-[#A67C52] uppercase tracking-wider block">TOPLAM KALAN MAAŞ</span>
              <h4 className="font-mono text-2xl font-black text-[#A67C52] mt-1.5">{totalRemaining.toLocaleString()} ₺</h4>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!breakdownType} onOpenChange={(open) => !open && setBreakdownType(null)}>
        <DialogContent className="border-border bg-[#131316] text-white rounded-2xl max-w-md">
          <DialogHeader><DialogTitle className="text-xl font-bold">{breakdownType === "paid" ? "Ödenen Maaş Detayları" : "Kalan Maaş Detayları"}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-4">
            {employees.map((f) => {
              const amount = breakdownType === "paid" ? getEmployeePaid(f) : getEmployeeRemaining(f);
              if(amount === 0) return null;
              return (
                <div key={f.id} className="flex items-center justify-between p-3.5 bg-white/5 border border-white/5 rounded-xl">
                  <span className="font-bold text-white text-sm">{f.name}</span>
                  <span className={`font-mono font-bold text-sm block ${breakdownType === "paid" ? "text-[#12B76A]" : "text-[#A67C52]"}`}>{amount.toLocaleString()} ₺</span>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
        <DialogContent className="border-border bg-[#131316] text-white rounded-2xl max-w-md">
          <DialogHeader><DialogTitle className="text-xl font-bold">Personel Ekle</DialogTitle></DialogHeader>
          <form onSubmit={handleAddEmployee} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-300">Personel Adı</Label>
              <Input required placeholder="Örn. İmane Himmich" value={newEmployeeName} onChange={(e) => setNewEmployeeName(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Ödenen (İlk) ₺</Label>
                <Input type="number" min="0" placeholder="0" value={newEmployeeRest} onChange={(e) => setNewEmployeeRest(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Maaş Tanımlama (İlk) ₺</Label>
                <Input type="number" min="0" placeholder="0" value={newEmployeeTaken} onChange={(e) => setNewEmployeeTaken(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddEmployeeOpen(false)} className="h-11 border-white/10 bg-transparent text-white hover:bg-white/5 rounded-xl">Vazgeç</Button>
              <Button type="submit" disabled={addEmployeeMutation.isPending} className="h-11 bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-bold rounded-xl px-6">Kaydet</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editEmployeeId} onOpenChange={(open) => !open && setEditEmployeeId(null)}>
        <DialogContent className="border-border bg-[#131316] text-white rounded-2xl max-w-md">
          <DialogHeader><DialogTitle className="text-xl font-bold">Personeli Düzenle</DialogTitle></DialogHeader>
          <form onSubmit={handleEditEmployee} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-300">Personel Adı</Label>
              <Input required value={editEmployeeName} onChange={(e) => setEditEmployeeName(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Ödenen (Toplam) ₺</Label>
                <Input type="number" min="0" value={editEmployeeRest} onChange={(e) => setEditEmployeeRest(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Maaş Tanımlama (Toplam) ₺</Label>
                <Input type="number" min="0" value={editEmployeeTaken} onChange={(e) => setEditEmployeeTaken(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setEditEmployeeId(null)} className="h-11 border-white/10 bg-transparent text-white hover:bg-white/5 rounded-xl">Vazgeç</Button>
              <Button type="submit" disabled={editEmployeeMutation.isPending} className="h-11 bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-bold rounded-xl px-6">Güncelle</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedEmployeeId} onOpenChange={(open) => !open && setSelectedEmployeeId(null)}>
        <DialogContent className="border-border bg-[#131316] text-white rounded-3xl max-w-lg p-0 overflow-hidden">
          {selectedEmployee && (
            <div className="flex flex-col h-full max-h-[85vh]">
              <div className="p-6 bg-white/[0.02] border-b border-white/5 flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#A67C52] uppercase tracking-widest">PERSONEL DETAY PANELİ</span>
                  <h3 className="text-xl font-extrabold text-white leading-tight">{selectedEmployee.name}</h3>
                </div>
                <button onClick={() => setSelectedEmployeeId(null)} className="p-1.5 rounded-lg hover:bg-white/5 text-[#9E9696] hover:text-white transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-3 gap-3 px-6 py-4 bg-white/[0.01] border-b border-white/5">
                <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-center">
                  <span className="text-[9px] font-bold text-[#9E9696] uppercase tracking-wider block">Ödenen</span>
                  <span className="font-mono text-sm font-bold text-[#12B76A] block mt-0.5">{getEmployeePaid(selectedEmployee).toLocaleString()} ₺</span>
                </div>
                <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-center">
                  <span className="text-[9px] font-bold text-[#9E9696] uppercase tracking-wider block">Toplam Maaş</span>
                  <span className="font-mono text-sm font-bold text-white block mt-0.5">{getEmployeeDebt(selectedEmployee).toLocaleString()} ₺</span>
                </div>
                <div className="p-3 bg-[#A67C52]/10 border border-[#A67C52]/20 rounded-xl text-center">
                  <span className="text-[9px] font-bold text-[#A67C52] uppercase tracking-wider block">Kalan Alacak</span>
                  <span className="font-mono text-sm font-bold text-[#A67C52] block mt-0.5">{getEmployeeRemaining(selectedEmployee).toLocaleString()} ₺</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-white text-sm">İşlem Geçmişi</h4>
                  <Button size="sm" onClick={() => { setNewTxType("debt_addition"); setIsAddTxOpen(true); }} className="bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white font-bold text-xs h-8 rounded-lg px-3">
                    <PlusCircle className="w-3.5 h-3.5 mr-1 text-[#A67C52]" /> İşlem Ekle
                  </Button>
                </div>
                <div className="space-y-2.5">
                  {selectedEmployee.transactions.map((tx) => {
                    const isTaken = tx.type === "debt_addition";
                    const isAdvance = tx.type === "advance";
                    return (
                      <div key={tx.id} className="flex items-center justify-between p-3.5 bg-white/5 border border-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isTaken ? "bg-[#A67C52]/10 text-[#A67C52]" : isAdvance ? "bg-[#F79009]/10 text-[#F79009]" : "bg-[#12B76A]/10 text-[#12B76A]"}`}>
                            {isTaken ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block">{tx.desc}</span>
                            <span className="text-[10px] text-[#9E9696] font-medium mt-0.5">{tx.date}</span>
                          </div>
                        </div>
                        <span className={`font-mono text-sm font-bold ${isTaken ? "text-[#A67C52]" : isAdvance ? "text-[#F79009]" : "text-[#12B76A]"}`}>{isTaken ? "+" : "-"}{tx.amount.toLocaleString()} ₺</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isAddTxOpen} onOpenChange={setIsAddTxOpen}>
        <DialogContent className="border-border bg-[#131316] text-white rounded-2xl max-w-sm">
          <DialogHeader><DialogTitle className="text-lg font-bold">Yeni İşlem Ekle</DialogTitle></DialogHeader>
          <form onSubmit={handleAddTx} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-300">İşlem Tipi</Label>
              <div className="grid grid-cols-1 gap-2">
                <button type="button" onClick={() => setNewTxType("debt_addition")} className={`h-11 rounded-xl font-bold text-xs border ${newTxType === "debt_addition" ? "bg-[#A67C52]/10 border-[#A67C52] text-[#A67C52]" : "bg-white/5 border-white/5 text-[#9E9696]"}`}>Maaş Tahakkuku (Yeni Borç)</button>
                <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setNewTxType("salary_payment")} className={`h-11 rounded-xl font-bold text-xs border ${newTxType === "salary_payment" ? "bg-[#12B76A]/10 border-[#12B76A] text-[#12B76A]" : "bg-white/5 border-white/5 text-[#9E9696]"}`}>Maaş Ödemesi</button>
                    <button type="button" onClick={() => setNewTxType("advance")} className={`h-11 rounded-xl font-bold text-xs border ${newTxType === "advance" ? "bg-[#F79009]/10 border-[#F79009] text-[#F79009]" : "bg-white/5 border-white/5 text-[#9E9696]"}`}>Avans</button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label className="text-sm font-semibold text-gray-300">Tutar (₺)</Label><Input required type="number" min="1" value={newTxAmount} onChange={(e) => setNewTxAmount(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" /></div>
              <div className="space-y-2"><Label className="text-sm font-semibold text-gray-300">Tarih</Label><Input type="date" required value={newTxDate} onChange={(e) => setNewTxDate(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" /></div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-300">Açıklama</Label>
              <Input required placeholder="Açıklama..." value={newTxDesc} onChange={(e) => setNewTxDesc(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddTxOpen(false)} className="h-11 border-white/10 bg-transparent text-white hover:bg-white/5 rounded-xl">İptal</Button>
              <Button type="submit" disabled={addTxMutation.isPending} className="h-11 bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-bold rounded-xl px-6">Ekle</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}


// ───────── Ortak Giderler ListView Component ─────────

interface ExpensesListViewProps {
  expenses: Expense[];
  exchangeRates?: Record<string, number>;
  onBack: () => void;
}

function ExpensesListView({ expenses, exchangeRates, onBack }: ExpensesListViewProps) {
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [breakdownType, setBreakdownType] = useState<"paid" | "remaining" | null>(null);

  const [newExpenseName, setNewExpenseName] = useState("");
  const [newExpenseTaken, setNewExpenseTaken] = useState(""); 
  const [newExpenseRest, setNewExpenseRest] = useState(""); 

  const [editExpenseName, setEditExpenseName] = useState("");
  const [editExpenseTaken, setEditExpenseTaken] = useState("");
  const [editExpenseRest, setEditExpenseRest] = useState("");

  const selectedExpense = expenses.find((f) => f.id === selectedExpenseId);

  useEffect(() => {
    if (selectedExpenseId && selectedExpense) {
      setEditExpenseName(selectedExpense.name);
      setEditExpenseTaken(String(selectedExpense.total_debt || ""));
      setEditExpenseRest(String(selectedExpense.total_paid || ""));
    }
  }, [selectedExpenseId, selectedExpense]);

  const totalPaid = expenses.reduce((sum, f) => sum + getExpensePaid(f, exchangeRates), 0);
  const totalRemaining = expenses.reduce((sum, f) => sum + getExpenseRemaining(f, exchangeRates), 0);

  const addExpenseMutation = useMutation({
    mutationFn: async (input: { name: string; taken: number; rest: number }) => {
      const { data: expense, error: sErr } = await supabaseClient
        .from("common_expenses")
        .insert({ name: input.name, currency: "TRY", total_debt: input.taken, total_paid: input.rest })
        .select("id, name, currency")
        .single();
      if (sErr) throw sErr;
      return expense;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses_ledger"] });
      toast.success("Gider merkezi eklendi");
      setIsAddExpenseOpen(false);
      setNewExpenseName(""); setNewExpenseTaken(""); setNewExpenseRest("");
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabaseClient.from("common_expenses").delete().eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses_ledger"] }); toast.success("Gider merkezi silindi"); },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: async (input: { id: string; name: string; taken: number; rest: number }) => {
      const { error } = await supabaseClient
        .from("common_expenses")
        .update({ name: input.name, total_debt: input.taken, total_paid: input.rest })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses_ledger"] });
      toast.success("Gider merkezi güncellendi");
      setSelectedExpenseId(null);
    },
  });

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpenseName.trim()) return;
    addExpenseMutation.mutate({ name: newExpenseName.trim(), taken: parseFloat(newExpenseTaken) || 0, rest: parseFloat(newExpenseRest) || 0 });
  };

  const handleUpdateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpenseId || !editExpenseName.trim()) return;
    updateExpenseMutation.mutate({
      id: selectedExpenseId,
      name: editExpenseName.trim(),
      taken: parseFloat(editExpenseTaken) || 0,
      rest: parseFloat(editExpenseRest) || 0,
    });
  };

  const filteredExpenses = expenses.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <motion.button whileHover={{ scale: 1.05, x: -2 }} whileTap={{ scale: 0.95 }} onClick={onBack} className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">Ortak Giderler</h1>
            <p className="text-sm text-[#9E9696] mt-0.5 font-medium">Stüdyo ve operasyonel harcamaların takibi.</p>
          </div>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button onClick={() => setIsAddExpenseOpen(true)} className="bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-bold cursor-pointer rounded-xl h-11 px-5 shadow-[0_0_12px_rgba(166,124,82,0.3)]">
            <Plus className="mr-2 h-4 w-4" /> Gider Merkezi Ekle
          </Button>
        </motion.div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#9E9696]" />
        <Input type="text" placeholder="Gider ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-11 bg-[#131316] border-white/5 text-white placeholder:text-gray-500 rounded-xl focus-visible:ring-[#A67C52]" />
      </div>

      <div className="bg-[#131316] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-bold text-white text-lg">Gider Merkezleri Listesi</h3>
          <Badge className="bg-[#A67C52]/15 text-[#A67C52] border-transparent font-bold">{expenses.length} Gider</Badge>
        </div>

        <div className="divide-y divide-white/5">
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-16 text-sm text-[#9E9696] font-medium">Kayıtlı gider merkezi bulunamadı.</div>
          ) : (
            filteredExpenses.map((f) => {
              const paid = getExpensePaid(f, exchangeRates);
              const remaining = getExpenseRemaining(f, exchangeRates);
              return (
                <motion.div key={f.id} whileHover={{ scale: 1.005, x: 2, backgroundColor: "rgba(255,255,255,0.02)" }} whileTap={{ scale: 0.995 }} onClick={() => setSelectedExpenseId(f.id)} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 cursor-pointer gap-4 transition-colors">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white"><Users className="w-5 h-5 text-[#9E9696]" /></div>
                    <div>
                      <h4 className="font-bold text-white leading-snug">{f.name}</h4>
                      <span className="text-xs font-semibold text-[#9E9696] uppercase tracking-wider mt-0.5 block">Sabit / Değişken Gider</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-8 justify-between sm:justify-end flex-1 sm:flex-none">
                    <div className="grid grid-cols-2 gap-6 sm:gap-12 text-right min-w-[200px]">
                      <div>
                        <span className="text-[10px] font-bold text-[#9E9696] uppercase tracking-wider block">Ödenen</span>
                        <span className="font-mono text-sm font-bold text-[#12B76A] block mt-0.5">{paid.toLocaleString()} ₺</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-[#9E9696] uppercase tracking-wider block">Kalan Borç</span>
                        <span className={`font-mono text-sm font-bold block mt-0.5 ${remaining > 0 ? "text-[#A67C52]" : "text-[#9E9696]"}`}>{remaining.toLocaleString()} ₺</span>
                      </div>
                    </div>
                    <div className="flex">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedExpenseId(f.id); }} className="p-2 rounded-lg hover:bg-white/5 text-[#9E9696] hover:text-[#12B76A] transition-colors cursor-pointer ml-4">
                        <Edit2 className="w-4.5 h-4.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); if (confirm("Bu gider merkezini silmek istediğinizden emin misiniz?")) deleteExpenseMutation.mutate(f.id); }} className="p-2 rounded-lg hover:bg-white/5 text-[#9E9696] hover:text-[#A67C52] transition-colors cursor-pointer ml-1">
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        <div className="p-6 bg-white/[0.02] border-t border-white/5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center max-w-4xl mx-auto">
            <div onClick={() => setBreakdownType("paid")} className="p-4 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/[0.08] transition-all">
              <span className="text-xs font-semibold text-[#9E9696] uppercase tracking-wider block">TOPLAM ÖDENEN</span>
              <h4 className="font-mono text-2xl font-black text-[#12B76A] mt-1.5">{totalPaid.toLocaleString()} ₺</h4>
            </div>
            <div onClick={() => setBreakdownType("remaining")} className="p-4 rounded-2xl bg-[#A67C52]/10 border border-[#A67C52]/20 cursor-pointer hover:bg-[#A67C52]/15 transition-all">
              <span className="text-xs font-semibold text-[#A67C52] uppercase tracking-wider block">TOPLAM KALAN BORÇ</span>
              <h4 className="font-mono text-2xl font-black text-[#A67C52] mt-1.5">{totalRemaining.toLocaleString()} ₺</h4>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!breakdownType} onOpenChange={(open) => !open && setBreakdownType(null)}>
        <DialogContent className="border-border bg-[#131316] text-white rounded-2xl max-w-md">
          <DialogHeader><DialogTitle className="text-xl font-bold">{breakdownType === "paid" ? "Ödenen Gider Detayları" : "Kalan Gider Borçları"}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-4">
            {expenses.map((f) => {
              const amount = breakdownType === "paid" ? getExpensePaid(f, exchangeRates) : getExpenseRemaining(f, exchangeRates);
              if(amount === 0) return null;
              return (
                <div key={f.id} className="flex items-center justify-between p-3.5 bg-white/5 border border-white/5 rounded-xl">
                  <span className="font-bold text-white text-sm">{f.name}</span>
                  <span className={`font-mono font-bold text-sm block ${breakdownType === "paid" ? "text-[#12B76A]" : "text-[#A67C52]"}`}>{amount.toLocaleString()} ₺</span>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
        <DialogContent className="border-border bg-[#131316] text-white rounded-2xl max-w-md">
          <DialogHeader><DialogTitle className="text-xl font-bold">Gider Merkezi Ekle</DialogTitle></DialogHeader>
          <form onSubmit={handleAddExpense} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-300">Gider Adı (Örn: Elektrik Faturası)</Label>
              <Input required placeholder="Örn. Kira" value={newExpenseName} onChange={(e) => setNewExpenseName(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Ödenen (İlk) ₺</Label>
                <Input type="number" min="0" placeholder="0" value={newExpenseRest} onChange={(e) => setNewExpenseRest(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Borç Kaydı (İlk) ₺</Label>
                <Input type="number" min="0" placeholder="0" value={newExpenseTaken} onChange={(e) => setNewExpenseTaken(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddExpenseOpen(false)} className="h-11 border-white/10 bg-transparent text-white hover:bg-white/5 rounded-xl">Vazgeç</Button>
              <Button type="submit" disabled={addExpenseMutation.isPending} className="h-11 bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-bold rounded-xl px-6">Kaydet</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedExpenseId} onOpenChange={(open) => !open && setSelectedExpenseId(null)}>
        <DialogContent className="border-border bg-[#131316] text-white rounded-2xl max-w-md">
          <DialogHeader><DialogTitle className="text-xl font-bold">Gider Merkezi Güncelle</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdateExpense} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-300">Gider Adı</Label>
              <Input required value={editExpenseName} onChange={(e) => setEditExpenseName(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Ödenen ₺</Label>
                <Input type="number" min="0" value={editExpenseRest} onChange={(e) => setEditExpenseRest(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Toplam Gider (Borç) ₺</Label>
                <Input type="number" min="0" value={editExpenseTaken} onChange={(e) => setEditExpenseTaken(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setSelectedExpenseId(null)} className="h-11 border-white/10 bg-transparent text-white hover:bg-white/5 rounded-xl">Vazgeç</Button>
              <Button type="submit" disabled={updateExpenseMutation.isPending} className="h-11 bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-bold rounded-xl px-6">Güncelle</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ───────── Okullar ListView Component ─────────
interface OkullarListViewProps {
  schools: School[];
  exchangeRates?: Record<string, number>;
  isRatesError?: boolean;
  onBack: () => void;
}

function OkullarListView({ schools, exchangeRates, isRatesError, onBack }: OkullarListViewProps) {
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [isAddSchoolOpen, setIsAddSchoolOpen] = useState(false);
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [breakdownType, setBreakdownType] = useState<"paid" | "remaining" | null>(null);

  const [newSchoolName, setNewSchoolName] = useState("");
  const [newSchoolTaken, setNewSchoolTaken] = useState("");
  const [newSchoolRest, setNewSchoolRest] = useState("");
  const [newSchoolCurrency, setNewSchoolCurrency] = useState<"TRY" | "EUR" | "USD">("TRY");

  const [editSchoolId, setEditSchoolId] = useState<string | null>(null);
  const [editSchoolName, setEditSchoolName] = useState("");
  const [editSchoolTaken, setEditSchoolTaken] = useState("");
  const [editSchoolRest, setEditSchoolRest] = useState("");
  const [editSchoolCurrency, setEditSchoolCurrency] = useState<"TRY" | "EUR" | "USD">("TRY");

  const [newTxType, setNewTxType] = useState<"debt" | "payment">("debt");
  const [newTxAmount, setNewTxAmount] = useState("");
  const [newTxDate, setNewTxDate] = useState(new Date().toISOString().split("T")[0]);
  const [newTxDesc, setNewTxDesc] = useState("");

  const getCurrencySymbol = (currency?: string) => {
    switch (currency) {
      case "USD": return "$";
      case "EUR": return "€";
      case "TRY": default: return "₺";
    }
  };

  const convertToTry = (amount: number, fromCurrency?: string) => {
    if (!fromCurrency || fromCurrency === "TRY") return amount;
    if (!exchangeRates) {
      const staticRates: Record<string, number> = { USD: 33.3, EUR: 37.0 };
      return amount * (staticRates[fromCurrency] ?? 1);
    }
    const rateInTry = exchangeRates[fromCurrency];
    if (rateInTry && rateInTry > 0) return amount * rateInTry;
    return amount;
  };

  const getTransactionTryAmount = (tx: SchoolTransaction, schoolCurrency?: string) => convertToTry(tx.amount, schoolCurrency);

  const totalPaid = schools.reduce((sum, f) => {
    const paidTry = f.transactions.filter((tx) => tx.type === "payment").reduce((s, tx) => s + getTransactionTryAmount(tx, f.currency), 0);
    return sum + paidTry;
  }, 0);

  const totalRemaining = schools.reduce((sum, f) => sum + getSchoolRemaining(f, exchangeRates), 0);

  const addSchoolMutation = useMutation({
    mutationFn: async (input: { name: string; currency: string; taken: number; rest: number }) => {
      const { data: school, error: sErr } = await supabaseClient
        .from("schools")
        .insert({ name: input.name, currency: input.currency })
        .select("id, name, currency")
        .single();
      if (sErr) throw sErr;

      if (input.taken > 0) {
        await supabaseClient.from("school_transactions").insert({
          school_id: school.id, transaction_type: "debt", amount: input.taken, description: "İlk Borç Kaydı", currency: input.currency
        });
      }
      if (input.rest > 0) {
        await supabaseClient.from("school_transactions").insert({
          school_id: school.id, transaction_type: "payment", amount: input.rest, description: "İlk Ödeme Kaydı", currency: input.currency
        });
      }
      return school;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schools_ledger"] });
      toast.success("Okul eklendi");
      setIsAddSchoolOpen(false);
      setNewSchoolName(""); setNewSchoolTaken(""); setNewSchoolRest(""); setNewSchoolCurrency("TRY");
    },
  });

  const editSchoolMutation = useMutation({
    mutationFn: async (input: { id: string; name: string; currency: string; takenDiff: number; restDiff: number }) => {
      await supabaseClient.from("schools").update({ name: input.name, currency: input.currency }).eq("id", input.id);
      if (input.takenDiff !== 0) {
        await supabaseClient.from("school_transactions").insert({
          school_id: input.id, transaction_type: "debt", amount: input.takenDiff, description: "Bakiye Düzenlemesi (Borç)", currency: input.currency
        });
      }
      if (input.restDiff !== 0) {
        await supabaseClient.from("school_transactions").insert({
          school_id: input.id, transaction_type: "payment", amount: input.restDiff, description: "Bakiye Düzenlemesi (Ödenen)", currency: input.currency
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schools_ledger"] });
      toast.success("Okul güncellendi");
      setEditSchoolId(null);
    },
  });

  const deleteSchoolMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabaseClient.from("school_transactions").delete().eq("school_id", id);
      await supabaseClient.from("schools").delete().eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["schools_ledger"] }); toast.success("Okul silindi"); },
  });

  const addTxMutation = useMutation({
    mutationFn: async (input: { school_id: string; type: "debt" | "payment"; amount: number; desc: string; date: string; currency?: string }) => {
      await supabaseClient.from("school_transactions").insert({
        school_id: input.school_id, transaction_type: input.type, amount: input.amount, description: input.desc, currency: input.currency, created_at: new Date(input.date).toISOString()
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schools_ledger"] });
      toast.success("İşlem kaydedildi");
      setIsAddTxOpen(false); setNewTxAmount(""); setNewTxDesc("");
    },
  });

  const handleAddSchool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolName.trim()) return;
    addSchoolMutation.mutate({ name: newSchoolName.trim(), currency: newSchoolCurrency, taken: parseFloat(newSchoolTaken) || 0, rest: parseFloat(newSchoolRest) || 0 });
  };

  const handleEditSchool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSchoolId || !editSchoolName.trim()) return;
    const school = schools.find(f => f.id === editSchoolId);
    if (!school) return;
    const currentTaken = school.transactions.filter((tx) => tx.type === "debt").reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const currentRest = school.transactions.filter((tx) => tx.type === "payment").reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const newTaken = parseFloat(editSchoolTaken) || 0;
    const newRest = parseFloat(editSchoolRest) || 0;
    editSchoolMutation.mutate({
      id: editSchoolId, name: editSchoolName.trim(), currency: editSchoolCurrency,
      takenDiff: newTaken - currentTaken, restDiff: newRest - currentRest
    });
  };

  const handleAddTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchoolId || !newTxAmount || !newTxDesc.trim()) return;
    const school = schools.find((f) => f.id === selectedSchoolId);
    addTxMutation.mutate({ school_id: selectedSchoolId, type: newTxType, amount: parseFloat(newTxAmount), desc: newTxDesc.trim(), date: newTxDate, currency: school?.currency });
  };

  const selectedSchool = schools.find((f) => f.id === selectedSchoolId);
  const filteredSchools = schools.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <motion.button whileHover={{ scale: 1.05, x: -2 }} whileTap={{ scale: 0.95 }} onClick={onBack} className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">Okullar</h1>
            <p className="text-sm text-[#9E9696] mt-0.5 font-medium">Okul ödemeleri ve bakiye takipleri.</p>
          </div>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button onClick={() => setIsAddSchoolOpen(true)} className="bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-bold cursor-pointer rounded-xl h-11 px-5 shadow-[0_0_12px_rgba(166,124,82,0.3)]">
            <Plus className="mr-2 h-4 w-4" /> Okul Ekle
          </Button>
        </motion.div>
      </div>

      {isRatesError && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-semibold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Döviz kurları alınamadı.
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#9E9696]" />
        <Input type="text" placeholder="Okul ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-11 bg-[#131316] border-white/5 text-white placeholder:text-gray-500 rounded-xl focus-visible:ring-[#A67C52]" />
      </div>

      <div className="bg-[#131316] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-bold text-white text-lg">Okul Listesi</h3>
          <Badge className="bg-[#A67C52]/15 text-[#A67C52] border-transparent font-bold">{schools.length} Okul</Badge>
        </div>

        <div className="divide-y divide-white/5">
          {filteredSchools.length === 0 ? (
            <div className="text-center py-16 text-sm text-[#9E9696] font-medium">Hiçbir okul bulunamadı.</div>
          ) : (
            filteredSchools.map((f) => {
              const paid = getSchoolPaid(f, exchangeRates);
              const remaining = getSchoolRemaining(f, exchangeRates);
              return (
                <motion.div key={f.id} whileHover={{ scale: 1.005, x: 2, backgroundColor: "rgba(255,255,255,0.02)" }} whileTap={{ scale: 0.995 }} onClick={() => setSelectedSchoolId(f.id)} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 cursor-pointer gap-4 transition-colors">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white"><GraduationCap className="w-5 h-5 text-[#9E9696]" /></div>
                    <div>
                      <h4 className="font-bold text-white leading-snug">{f.name}</h4>
                      <span className="text-xs font-semibold text-[#9E9696] uppercase tracking-wider mt-0.5 block">ID: {f.id.substring(0,8).toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-8 justify-between sm:justify-end flex-1 sm:flex-none">
                    <div className="grid grid-cols-2 gap-6 sm:gap-12 text-right min-w-[200px]">
                      <div>
                        <span className="text-[10px] font-bold text-[#9E9696] uppercase tracking-wider block">Ödenen</span>
                        <span className="font-mono text-sm font-bold text-[#12B76A] block mt-0.5">{paid.toLocaleString()} ₺</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-[#9E9696] uppercase tracking-wider block">Kalan Borç</span>
                        <span className={`font-mono text-sm font-bold block mt-0.5 ${remaining > 0 ? "text-[#A67C52]" : "text-[#9E9696]"}`}>{remaining.toLocaleString()} ₺</span>
                      </div>
                    </div>
                    <div className="flex">
                      <button onClick={(e) => { 
                        e.stopPropagation(); 
                        setEditSchoolId(f.id); 
                        setEditSchoolName(f.name); 
                        setEditSchoolCurrency(f.currency as any || "TRY");
                        setEditSchoolRest(f.transactions.filter((tx) => tx.type === "payment").reduce((sum, tx) => sum + Number(tx.amount || 0), 0).toString());
                        setEditSchoolTaken(f.transactions.filter((tx) => tx.type === "debt").reduce((sum, tx) => sum + Number(tx.amount || 0), 0).toString());
                      }} className="p-2 rounded-lg hover:bg-white/5 text-[#9E9696] hover:text-[#12B76A] transition-colors cursor-pointer ml-4">
                        <Edit2 className="w-4.5 h-4.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); if (confirm("Bu okulu silmek istediğinizden emin misiniz?")) deleteSchoolMutation.mutate(f.id); }} className="p-2 rounded-lg hover:bg-white/5 text-[#9E9696] hover:text-[#A67C52] transition-colors cursor-pointer ml-1">
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        <div className="p-6 bg-white/[0.02] border-t border-white/5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center max-w-4xl mx-auto">
            <div onClick={() => setBreakdownType("paid")} className="p-4 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/[0.08] transition-all">
              <span className="text-xs font-semibold text-[#9E9696] uppercase tracking-wider block">TOPLAM ÖDENEN</span>
              <h4 className="font-mono text-2xl font-black text-[#12B76A] mt-1.5">{Math.round(totalPaid).toLocaleString()} ₺</h4>
            </div>
            <div onClick={() => setBreakdownType("remaining")} className="p-4 rounded-2xl bg-[#A67C52]/10 border border-[#A67C52]/20 cursor-pointer hover:bg-[#A67C52]/15 transition-all">
              <span className="text-xs font-semibold text-[#A67C52] uppercase tracking-wider block">TOPLAM KALAN BORÇ</span>
              <h4 className="font-mono text-2xl font-black text-[#A67C52] mt-1.5">{Math.round(totalRemaining).toLocaleString()} ₺</h4>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!breakdownType} onOpenChange={(open) => !open && setBreakdownType(null)}>
        <DialogContent className="border-border bg-[#131316] text-white rounded-2xl max-w-md">
          <DialogHeader><DialogTitle className="text-xl font-bold">{breakdownType === "paid" ? "Ödenen Tutar Detayları" : "Kalan Borç Detayları"}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-4">
            {schools.map((f) => {
              const amount = breakdownType === "paid" ? getSchoolPaid(f, exchangeRates) : getSchoolRemaining(f, exchangeRates);
              if(amount === 0) return null;
              const hasForeignCurrency = f.currency && f.currency !== "TRY";
              return (
                <div key={f.id} className="flex items-center justify-between p-3.5 bg-white/5 border border-white/5 rounded-xl">
                  <span className="font-bold text-white text-sm">{f.name}</span>
                  <div className="text-right">
                    <span className={`font-mono font-bold text-sm block ${breakdownType === "paid" ? "text-[#12B76A]" : "text-[#A67C52]"}`}>{amount.toLocaleString()} ₺</span>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddSchoolOpen} onOpenChange={setIsAddSchoolOpen}>
        <DialogContent className="border-border bg-[#131316] text-white rounded-2xl max-w-md">
          <DialogHeader><DialogTitle className="text-xl font-bold">Okul Ekle</DialogTitle></DialogHeader>
          <form onSubmit={handleAddSchool} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-300">Okul Adı</Label>
              <Input required placeholder="Örn. Atatürk İlkokulu" value={newSchoolName} onChange={(e) => setNewSchoolName(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white placeholder:text-gray-500 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-300">Para Birimi</Label>
              <Select value={newSchoolCurrency} onValueChange={(v: any) => setNewSchoolCurrency(v)}>
                <SelectTrigger className="h-11 border-white/10 bg-white/5 text-white rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#131316] border-white/10 text-white">
                  <SelectItem value="TRY">TRY (₺)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Ödenen (İlk) {getCurrencySymbol(newSchoolCurrency)}</Label>
                <Input type="number" min="0" placeholder="0" value={newSchoolRest} onChange={(e) => setNewSchoolRest(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Borçlanma (İlk) {getCurrencySymbol(newSchoolCurrency)}</Label>
                <Input type="number" min="0" placeholder="0" value={newSchoolTaken} onChange={(e) => setNewSchoolTaken(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddSchoolOpen(false)} className="h-11 border-white/10 bg-transparent text-white hover:bg-white/5 rounded-xl">Vazgeç</Button>
              <Button type="submit" disabled={addSchoolMutation.isPending} className="h-11 bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-bold rounded-xl px-6">Kaydet</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editSchoolId} onOpenChange={(open) => !open && setEditSchoolId(null)}>
        <DialogContent className="border-border bg-[#131316] text-white rounded-2xl max-w-md">
          <DialogHeader><DialogTitle className="text-xl font-bold">Okulu Düzenle</DialogTitle></DialogHeader>
          <form onSubmit={handleEditSchool} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-300">Okul Adı</Label>
              <Input required value={editSchoolName} onChange={(e) => setEditSchoolName(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-300">Para Birimi</Label>
              <Select value={editSchoolCurrency} onValueChange={(v: any) => setEditSchoolCurrency(v)}>
                <SelectTrigger className="h-11 border-white/10 bg-white/5 text-white rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#131316] border-white/10 text-white">
                  <SelectItem value="TRY">TRY (₺)</SelectItem><SelectItem value="USD">USD ($)</SelectItem><SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Ödenen (Toplam) {getCurrencySymbol(editSchoolCurrency)}</Label>
                <Input type="number" min="0" value={editSchoolRest} onChange={(e) => setEditSchoolRest(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Borçlanma (Toplam) {getCurrencySymbol(editSchoolCurrency)}</Label>
                <Input type="number" min="0" value={editSchoolTaken} onChange={(e) => setEditSchoolTaken(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setEditSchoolId(null)} className="h-11 border-white/10 bg-transparent text-white hover:bg-white/5 rounded-xl">Vazgeç</Button>
              <Button type="submit" disabled={editSchoolMutation.isPending} className="h-11 bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-bold rounded-xl px-6">Güncelle</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedSchoolId} onOpenChange={(open) => !open && setSelectedSchoolId(null)}>
        <DialogContent className="border-border bg-[#131316] text-white rounded-3xl max-w-lg p-0 overflow-hidden">
          {selectedSchool && (
            <div className="flex flex-col h-full max-h-[85vh]">
              <div className="p-6 bg-white/[0.02] border-b border-white/5 flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#A67C52] uppercase tracking-widest">OKUL DETAY PANELİ</span>
                  <h3 className="text-xl font-extrabold text-white leading-tight">{selectedSchool.name}</h3>
                </div>
                <button onClick={() => setSelectedSchoolId(null)} className="p-1.5 rounded-lg hover:bg-white/5 text-[#9E9696] hover:text-white transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-3 gap-3 px-6 py-4 bg-white/[0.01] border-b border-white/5">
                <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-center">
                  <span className="text-[9px] font-bold text-[#9E9696] uppercase tracking-wider block">Ödenen</span>
                  <span className="font-mono text-sm font-bold text-[#12B76A] block mt-0.5">{getSchoolPaid(selectedSchool, exchangeRates).toLocaleString()} ₺</span>
                </div>
                <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-center">
                  <span className="text-[9px] font-bold text-[#9E9696] uppercase tracking-wider block">Toplam Borç</span>
                  <span className="font-mono text-sm font-bold text-white block mt-0.5">{getSchoolDebt(selectedSchool, exchangeRates).toLocaleString()} ₺</span>
                </div>
                <div className="p-3 bg-[#A67C52]/10 border border-[#A67C52]/20 rounded-xl text-center">
                  <span className="text-[9px] font-bold text-[#A67C52] uppercase tracking-wider block">Kalan Borç</span>
                  <span className="font-mono text-sm font-bold text-[#A67C52] block mt-0.5">{getSchoolRemaining(selectedSchool, exchangeRates).toLocaleString()} ₺</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-white text-sm">İşlem Geçmişi</h4>
                  <Button size="sm" onClick={() => { setNewTxType("debt"); setIsAddTxOpen(true); }} className="bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white font-bold text-xs h-8 rounded-lg px-3">
                    <PlusCircle className="w-3.5 h-3.5 mr-1 text-[#A67C52]" /> İşlem Ekle
                  </Button>
                </div>
                <div className="space-y-2.5">
                  {selectedSchool.transactions.map((tx) => {
                    const isTaken = tx.type === "debt";
                    return (
                      <div key={tx.id} className="flex items-center justify-between p-3.5 bg-white/5 border border-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isTaken ? "bg-[#A67C52]/10 text-[#A67C52]" : "bg-[#12B76A]/10 text-[#12B76A]"}`}>
                            {isTaken ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block">{tx.desc}</span>
                            <span className="text-[10px] text-[#9E9696] font-medium mt-0.5">{tx.date}</span>
                          </div>
                        </div>
                        <span className={`font-mono text-sm font-bold ${isTaken ? "text-[#A67C52]" : "text-[#12B76A]"}`}>{isTaken ? "+" : "-"}{getConvertedAmount(tx.amount, tx.currency || selectedSchool.currency, exchangeRates).toLocaleString()} ₺</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isAddTxOpen} onOpenChange={setIsAddTxOpen}>
        <DialogContent className="border-border bg-[#131316] text-white rounded-2xl max-w-sm">
          <DialogHeader><DialogTitle className="text-lg font-bold">Yeni İşlem Ekle</DialogTitle></DialogHeader>
          <form onSubmit={handleAddTx} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-300">İşlem Tipi</Label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setNewTxType("debt")} className={`h-11 rounded-xl font-bold text-xs border ${newTxType === "debt" ? "bg-[#A67C52]/10 border-[#A67C52] text-[#A67C52]" : "bg-white/5 border-white/5 text-[#9E9696]"}`}>Borç Ekle</button>
                <button type="button" onClick={() => setNewTxType("payment")} className={`h-11 rounded-xl font-bold text-xs border ${newTxType === "payment" ? "bg-[#12B76A]/10 border-[#12B76A] text-[#12B76A]" : "bg-white/5 border-white/5 text-[#9E9696]"}`}>Ödeme Yapıldı</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label className="text-sm font-semibold text-gray-300">Tutar (₺)</Label><Input required type="number" min="1" value={newTxAmount} onChange={(e) => setNewTxAmount(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" /></div>
              <div className="space-y-2"><Label className="text-sm font-semibold text-gray-300">Tarih</Label><Input type="date" required value={newTxDate} onChange={(e) => setNewTxDate(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" /></div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-300">Açıklama</Label>
              <Input required placeholder="Açıklama..." value={newTxDesc} onChange={(e) => setNewTxDesc(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddTxOpen(false)} className="h-11 border-white/10 bg-transparent text-white hover:bg-white/5 rounded-xl">İptal</Button>
              <Button type="submit" disabled={addTxMutation.isPending} className="h-11 bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-bold rounded-xl px-6">Ekle</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}