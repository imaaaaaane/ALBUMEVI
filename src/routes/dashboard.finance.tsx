import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageTransition } from "@/components/page-transition";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseClient } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useAuth } from "@/lib/auth-context";
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
  Lock,
  Wallet,
  GripVertical,
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
  total_debt?: number;
  total_paid?: number;
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
  sira?: number;
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
  paid_amount: number;
  remaining_amount: number;
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

const getEmployeeSalary = (f: Employee) => Number(f.total_debt || 0);
const getEmployeePaid = (f: Employee) => Number(f.total_paid || 0);
const getEmployeeRemaining = (f: Employee) => getEmployeeSalary(f) - getEmployeePaid(f);

const getExpensePaid = (f: Expense, rates?: Record<string, number>) => getConvertedAmount(f.total_paid, f.currency, rates);
const getExpenseDebt = (f: Expense, rates?: Record<string, number>) => getConvertedAmount(f.total_debt, f.currency, rates);
const getExpenseRemaining = (f: Expense, rates?: Record<string, number>) => Math.max(0, getExpenseDebt(f, rates) - getExpensePaid(f, rates));

const getSchoolPaid = (f: School, rates?: Record<string, number>) => getConvertedAmount(f.paid_amount || 0, f.currency, rates);
const getSchoolDebt = (f: School, rates?: Record<string, number>) => f.transactions.filter((tx) => tx.type === "debt").reduce((sum, tx) => sum + getConvertedAmount(tx.amount, tx.currency || f.currency, rates), 0);
const getSchoolRemaining = (f: School, rates?: Record<string, number>) => getConvertedAmount(f.remaining_amount || 0, f.currency, rates);

function AccountingDashboard() {
  const navigate = useNavigate();
  const { teamId, role } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState("");

  useEffect(() => {
    if (role === "photographer") {
      navigate({ to: "/dashboard" });
    }
  }, [role, navigate]);

  const [view, setView] = useState<"overview" | "firmalar" | "maaslar" | "ortak_giderler" | "okullar" | "baski" | "sarf">("overview");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const [isAddCategoryModalOpen, setAddCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");



  const queryClient = useQueryClient();

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



  const { data: products = [] } = useQuery<any[]>({
    queryKey: ["finance_products"],
    queryFn: async () => {
      const { data, error } = await supabaseClient.from("products").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: suppliersData = [] } = useQuery<Firm[]>({
    queryKey: ["suppliers_ledger"],
    queryFn: async () => {
      const { data: suppliers, error: sErr } = await supabaseClient
        .from("suppliers")
        .select("id, name, currency, created_at")
        .order("created_at", { ascending: false });

      if (sErr) return [];

      const { data: transactions, error: tErr } = await supabaseClient
        .from("supplier_transactions")
        .select("id, supplier_id, transaction_type, amount, description, created_at, currency")
        .order("created_at", { ascending: true });

      if (tErr) return suppliers.map(s => ({ id: s.id, name: s.name, currency: s.currency as any, transactions: [] }));

      return suppliers.map((s) => ({
        id: s.id,
        name: s.name,
        currency: s.currency as any,
        transactions: transactions
          .filter((t) => String(t.supplier_id) === String(s.id))
          .map((t) => ({
            id: t.id,
            date: new Date(t.created_at).toISOString().split("T")[0],
            type: t.transaction_type as "debt" | "payment",
            amount: Number(t.amount),
            desc: t.description ?? "",
            createdAt: t.created_at,
            currency: t.currency,
          })),
      }));
    }
  });

  const totalSarfPaid = suppliersData.reduce((sum, s) => sum + getFirmPaid(s, exchangeRates), 0);

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
        .select("id, name, currency, total_debt, total_paid, created_at")
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
        total_debt: Number(s.total_debt || 0),
        total_paid: Number(s.total_paid || 0),
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
        .select("id, name, currency, total_debt, total_paid, created_at, sira")
        .order("sira", { ascending: true });
      if (sErr) return [];

      return expenses.map((s) => ({
        id: s.id,
        name: s.name,
        currency: s.currency as any,
        total_debt: Number(s.total_debt) || 0,
        total_paid: Number(s.total_paid) || 0,
        sira: s.sira,
      }));
    }
  });

  const { data: schoolsData = [] } = useQuery<School[]>({
    queryKey: ["schools_ledger"],
    queryFn: async () => {
      const { data: schools, error: sErr } = await supabaseClient
        .from("schools")
        .select("id, name, currency, created_at, paid_amount, remaining_amount")
        .order("created_at", { ascending: false });
      if (sErr) return [];

      const { data: transactions, error: tErr } = await supabaseClient
        .from("school_transactions")
        .select("id, school_id, transaction_type, amount, description, created_at, currency")
        .order("created_at", { ascending: true });
      if (tErr) return schools.map(s => ({ id: s.id, name: s.name, currency: s.currency as any, paid_amount: Number(s.paid_amount) || 0, remaining_amount: Number(s.remaining_amount) || 0, transactions: [] }));

      return schools.map((s) => ({
        id: s.id,
        name: s.name,
        currency: s.currency as any,
        paid_amount: Number(s.paid_amount) || 0,
        remaining_amount: Number(s.remaining_amount) || 0,
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

  const { data: printExpensesData = [] } = useQuery({
    queryKey: ["print_expenses_overview", teamId],
    enabled: !!teamId,
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("print_expenses")
        .select("amount")
        .eq("team_id", teamId);
      if (error) throw error;
      return data;
    }
  });

  const totalPaidBaski = printExpensesData.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const commonExpensesList = expensesData.filter(e => e.name.toLowerCase() !== "baskı" && e.name.toLowerCase() !== "baski");
  const totalPaidExpenses = commonExpensesList.reduce((sum, f) => sum + getExpensePaid(f, exchangeRates), 0);
  const totalRemainingExpenses = commonExpensesList.reduce((sum, f) => sum + getExpenseRemaining(f, exchangeRates), 0);

  const totalPaidSchools = schoolsData.reduce((sum, f) => sum + getSchoolPaid(f, exchangeRates), 0);
  const totalRemainingSchools = schoolsData.reduce((sum, f) => sum + getSchoolRemaining(f, exchangeRates), 0);

  // Categories list dynamically calculated from database aggregates
  const categories: CategoryItem[] = [
    { id: "cat-1", title: "FİRMALAR", amount: totalPaidFirms, change: "+8%", isPositive: true },
    { id: "sarf-malzemeler", title: "SARF MALZEMELER", amount: totalSarfPaid, change: "+0%", isPositive: false },
    { id: "cat-2", title: "ORTAK GİDERLER", amount: totalPaidExpenses, change: "-3%", isPositive: false },
    { id: "cat-4", title: "BASKI", amount: totalPaidBaski, change: "+5%", isPositive: false },
    { id: "cat-3", title: "MAAŞLAR", amount: totalPaidEmployees, change: "-2%", isPositive: false },
    { id: "cat-5", title: "OKULLAR", amount: totalPaidSchools, change: "+15%", isPositive: true },
  ];

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
  const dbCategories = categories.filter((c) => ["cat-1", "cat-2", "cat-3", "cat-4", "cat-5", "sarf-malzemeler"].includes(c.id));
  const breakdownItems: BreakdownItem[] = dbCategories.map((c, i) => {
    const colors = ["#A67C52", "#C01C1C", "#9E9696", "#E57373", "#D0A36D", "#6D4C41", "#8D6E63"];
    const totalAmount = dbCategories.reduce((sum, item) => sum + item.amount, 0);
    const percentage = totalAmount ? Math.round((c.amount / totalAmount) * 100) : 0;
    return {
      name: c.title,
      percentage,
      color: colors[i % colors.length],
    };
  });

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === "2026") {
      setIsAuthenticated(true);
    } else {
      toast.error("Hatalı şifre!");
      setPasscode("");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-start pt-[20vh] justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#131316] border border-white/5 shadow-2xl rounded-3xl p-8 max-w-sm w-full mx-auto"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[#A67C52]/20 flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-[#A67C52]" />
            </div>
            <h2 className="text-xl font-bold text-white">Muhasebe Girişi</h2>
            <p className="text-white/50 text-sm mt-2 text-center">Lütfen erişim şifresini girin.</p>
          </div>

          <form onSubmit={handlePasscodeSubmit}>
            <div className="space-y-4">
              <Input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                autoFocus
                className="bg-white/5 border-white/10 text-white text-center tracking-[1em] font-mono text-2xl h-14 rounded-xl focus-visible:ring-[#A67C52]"
              />
              <Button
                type="submit"
                className="bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-bold h-12 rounded-xl w-full"
              >
                Giriş Yap
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

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
                  if (c.id === "sarf-malzemeler") setView("sarf");
                  else if (c.id === "cat-1") setView("firmalar");
                  else if (c.id === "cat-3") setView("maaslar");
                  else if (c.id === "cat-2") setView("ortak_giderler");
                  else if (c.id === "cat-5") setView("okullar");
                  else if (c.id === "cat-4") setView("baski");
                  else setActiveCategory(isActive ? null : c.id);
                };

                return (
                  <CategoryCard
                    key={c.id}
                    title={c.title}
                    amount={c.amount}
                    change={c.change}
                    isPositive={c.isPositive}
                    isActive={isActive || ["cat-1", "cat-2", "cat-3", "cat-4", "cat-5", "sarf-malzemeler"].includes(c.id)}
                    isPortal={["cat-1", "cat-2", "cat-3", "cat-4", "cat-5", "sarf-malzemeler"].includes(c.id)}
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
            {view === "sarf" && <SarfListView suppliers={suppliersData} exchangeRates={exchangeRates} isRatesError={isRatesError} onBack={() => setView("overview")} />}
            {view === "firmalar" && <FirmsListView firms={firmsData} products={products} exchangeRates={exchangeRates} isRatesError={isRatesError} onBack={() => setView("overview")} />}
            {view === "maaslar" && <EmployeesListView employees={employeesData} onBack={() => setView("overview")} />}
            {view === "ortak_giderler" && <ExpensesListView expenses={expensesData} exchangeRates={exchangeRates} onBack={() => setView("overview")} />}
            {view === "okullar" && <OkullarListView schools={schoolsData} exchangeRates={exchangeRates} isRatesError={isRatesError} onBack={() => setView("overview")} />}
            {view === "baski" && <BaskiListView exchangeRates={exchangeRates} onBack={() => setView("overview")} />}
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
      className={`relative overflow-hidden rounded-2xl p-5 border transition-all cursor-pointer ${isActive
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
  const [searchQuery, setSearchQuery] = useState("");
  const filteredTransactions = transactions
    .filter((tx) => tx.desc.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => a.desc.localeCompare(b.desc, 'tr'));

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

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#9E9696]" />
        <Input 
          type="text" 
          placeholder="İşlem ara..." 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)} 
          className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 rounded-xl focus-visible:ring-[#A67C52]"
        />
      </div>

      <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-sm text-[#9E9696] font-medium border border-dashed border-white/5 rounded-2xl">
            Bu bölümde işlem bulunamadı.
          </div>
        ) : (
          filteredTransactions.map((tx) => {
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


// ───────── Sarf Malzemeler (Tedarikçi) ListView Component ─────────

interface SarfListViewProps {
  suppliers: Firm[];
  exchangeRates?: Record<string, number>;
  isRatesError?: boolean;
  onBack: () => void;
}

function SarfListView({ suppliers, exchangeRates, isRatesError, onBack }: SarfListViewProps) {
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [breakdownType, setBreakdownType] = useState<"paid" | "remaining" | null>(null);

  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierDesc, setNewSupplierDesc] = useState("");
  const [newSupplierTaken, setNewSupplierTaken] = useState("");
  const [newSupplierRest, setNewSupplierRest] = useState("");
  const [newSupplierCurrency, setNewSupplierCurrency] = useState<"TRY" | "EUR" | "USD">("TRY");

  const [editSupplierId, setEditSupplierId] = useState<string | null>(null);
  const [editSupplierName, setEditSupplierName] = useState("");
  const [editSupplierTaken, setEditSupplierTaken] = useState("");
  const [editSupplierRest, setEditSupplierRest] = useState("");
  const [editSupplierCurrency, setEditSupplierCurrency] = useState<"TRY" | "EUR" | "USD">("TRY");

  const [newTxType, setNewTxType] = useState<"debt" | "payment">("debt");
  const [newTxAmount, setNewTxAmount] = useState("");
  const [newTxDate, setNewTxDate] = useState(new Date().toISOString().split("T")[0]);
  const [newTxDesc, setNewTxDesc] = useState("");
  const [newTxCurrency, setNewTxCurrency] = useState<"TRY" | "EUR">("TRY");
  
  const [editTxId, setEditTxId] = useState<string | null>(null);

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



  
  const getGroupedTotals = (supplier: Firm) => {
    const totals: Record<string, { paid: number; debt: number; remaining: number }> = {};
    supplier.transactions.forEach((tx: any) => {
      const cur = tx.currency || supplier.currency || "TRY";
      if (!totals[cur]) totals[cur] = { paid: 0, debt: 0, remaining: 0 };
      if (tx.type === "payment") totals[cur].paid += Number(tx.amount);
      if (tx.type === "debt") totals[cur].debt += Number(tx.amount);
    });
    Object.keys(totals).forEach(cur => {
      totals[cur].remaining = Math.max(0, totals[cur].debt - totals[cur].paid);
    });
    return totals;
  };

  const renderGroupedAmounts = (supplier: Firm, field: "paid" | "debt" | "remaining", colorClass: string) => {
    const totals = getGroupedTotals(supplier);
    const keys = Object.keys(totals);
    if (keys.length === 0) return <span className={`font-mono text-sm font-bold block mt-0.5 ${colorClass}`}>0 ₺</span>;
    return (
      <div className="mt-0.5 space-y-0.5">
        {keys.map(cur => (
          <span key={cur} className={`font-mono text-sm font-bold block ${colorClass}`}>
            {totals[cur][field].toLocaleString()} {getCurrencySymbol(cur)}
          </span>
        ))}
      </div>
    );
  };

  const totalPaid = suppliers.reduce((sum, f) => sum + getFirmPaid(f, exchangeRates), 0);

  const totalRemaining = suppliers.reduce((sum, f) => sum + getFirmRemaining(f, exchangeRates), 0);

  const addSupplierMutation = useMutation({
    mutationFn: async (input: { name: string; currency: string; taken: number; rest: number; desc: string }) => {
      const { data: supplier, error: sErr } = await supabaseClient
        .from("suppliers")
        .insert({ name: input.name, currency: input.currency, description: input.desc })
        .select("id, name, currency")
        .single();
      if (sErr) throw sErr;

      if (input.taken > 0) {
        await supabaseClient.from("supplier_transactions").insert({
          supplier_id: supplier.id, transaction_type: "debt", amount: input.taken, description: "İlk Borç Kaydı", currency: input.currency
        });
      }
      if (input.rest > 0) {
        await supabaseClient.from("supplier_transactions").insert({
          supplier_id: supplier.id, transaction_type: "payment", amount: input.rest, description: "İlk Ödeme Kaydı", currency: input.currency
        });
      }
      return supplier;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers_ledger"] });
      toast.success("Suppliera eklendi");
      setIsAddSupplierOpen(false);
      setNewSupplierName(""); setNewSupplierDesc(""); setNewSupplierTaken(""); setNewSupplierRest(""); setNewSupplierCurrency("TRY");
    },
  });

  const editSupplierMutation = useMutation({
    mutationFn: async (input: { id: string; name: string; currency: string; takenDiff: number; restDiff: number }) => {
      await supabaseClient.from("suppliers").update({ name: input.name, currency: input.currency }).eq("id", input.id);
      if (input.takenDiff !== 0) {
        await supabaseClient.from("supplier_transactions").insert({
          supplier_id: input.id, transaction_type: "debt", amount: input.takenDiff, description: "Bakiye Düzenlemesi (Borç)", currency: input.currency
        });
      }
      if (input.restDiff !== 0) {
        await supabaseClient.from("supplier_transactions").insert({
          supplier_id: input.id, transaction_type: "payment", amount: input.restDiff, description: "Bakiye Düzenlemesi (Ödenen)", currency: input.currency
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers_ledger"] });
      toast.success("Suppliera güncellendi");
      setEditSupplierId(null);
    },
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabaseClient.from("supplier_transactions").delete().eq("supplier_id", id);
      await supabaseClient.from("suppliers").delete().eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers_ledger"] }); toast.success("Suppliera silindi"); },
  });

  const addTxMutation = useMutation({
    mutationFn: async (input: { supplier_id: string; type: "debt" | "payment"; amount: number; desc: string; date: string; currency?: string }) => {
      await supabaseClient.from("supplier_transactions").insert({
        supplier_id: input.supplier_id, transaction_type: input.type, amount: input.amount, description: input.desc, currency: input.currency, created_at: new Date(input.date).toISOString()
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers_ledger"] });
      toast.success("İşlem kaydedildi");
      setIsAddTxOpen(false); setNewTxAmount(""); setNewTxDesc("");
      
      setEditTxId(null);
    },
  });

  const editTxMutation = useMutation({
    mutationFn: async (input: { id: string; type: "debt" | "payment"; amount: number; desc: string; date: string; currency?: string }) => {
      await supabaseClient.from("supplier_transactions").update({
        transaction_type: input.type, amount: input.amount, description: input.desc, currency: input.currency, created_at: new Date(input.date).toISOString()
      }).eq("id", input.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers_ledger"] });
      toast.success("İşlem güncellendi");
      setIsAddTxOpen(false); setNewTxAmount(""); setNewTxDesc("");
      
      setEditTxId(null);
    },
  });

  const deleteTxMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabaseClient.from("supplier_transactions").delete().eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers_ledger"] });
      toast.success("İşlem silindi");
    },
  });

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName.trim()) return;
    addSupplierMutation.mutate({ name: newSupplierName.trim(), currency: newSupplierCurrency, taken: parseFloat(newSupplierTaken) || 0, rest: parseFloat(newSupplierRest) || 0, desc: newSupplierDesc.trim() });
  };

  const handleEditSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSupplierId || !editSupplierName.trim()) return;
    const supplier = suppliers.find(f => f.id === editSupplierId);
    if (!supplier) return;
    const currentTaken = supplier.transactions.filter((tx) => tx.type === "debt").reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const currentRest = supplier.transactions.filter((tx) => tx.type === "payment").reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const newTaken = parseFloat(editSupplierTaken) || 0;
    const newRest = parseFloat(editSupplierRest) || 0;
    editSupplierMutation.mutate({
      id: editSupplierId, name: editSupplierName.trim(), currency: editSupplierCurrency,
      takenDiff: newTaken - currentTaken, restDiff: newRest - currentRest
    });
  };

  const handleAddTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) return;

    
    let finalAmount = parseFloat(newTxAmount) || 0;
    let finalDesc = newTxDesc.trim();

    if (finalAmount <= 0) return toast.error("Geçerli bir tutar giriniz.");
    if (!finalDesc) return toast.error("Açıklama zorunludur.");

    if (editTxId) {
      editTxMutation.mutate({ id: editTxId, type: newTxType, amount: finalAmount, desc: finalDesc, date: newTxDate, currency: newTxCurrency });
    } else {
      addTxMutation.mutate({ supplier_id: selectedSupplierId, type: newTxType, amount: finalAmount, desc: finalDesc, date: newTxDate, currency: newTxCurrency });
    }



  };

  const handleEditTransaction = (tx: any) => {
    setEditTxId(tx.id);
    setNewTxType(tx.type);
    setNewTxAmount(tx.amount.toString());
    setNewTxDesc(tx.desc);
    setNewTxCurrency(tx.currency || "TRY");
    setNewTxDate(tx.date.split("T")[0] || new Date().toISOString().split("T")[0]);
    setIsAddTxOpen(true);
     
  };

  const handleDeleteTransaction = (id: string) => {
    if (window.confirm("Bu işlemi silmek istediğinize emin misiniz?")) {
      deleteTxMutation.mutate(id);
    }
  };

  const selectedSupplier = suppliers.find((f) => f.id === selectedSupplierId);
  const filteredSuppliers = suppliers
    .filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, 'tr'));

  if (selectedSupplier) {
    return (
      <div className="flex flex-col h-full bg-[#131316] text-white rounded-3xl border border-white/5">
        <div className="p-6 bg-white/[0.02] border-b border-white/5 flex justify-between items-start">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSelectedSupplierId(null)} className="text-[#9E9696] hover:text-white hover:bg-white/5">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#A67C52] uppercase tracking-widest">TEDARİKÇİ DETAY PANELİ</span>
              <h3 className="text-xl font-extrabold text-white leading-tight">{selectedSupplier.name}</h3>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 px-6 py-4 bg-white/[0.01] border-b border-white/5">
          <div className="p-4 bg-white/5 border border-white/5 rounded-xl text-center">
            <span className="text-[10px] font-bold text-[#9E9696] uppercase tracking-wider block">Ödenen Toplam</span>
            {renderGroupedAmounts(selectedSupplier, "paid", "text-[#12B76A] text-lg")}
          </div>
          <div className="p-4 bg-white/5 border border-white/5 rounded-xl text-center">
            <span className="text-[10px] font-bold text-[#9E9696] uppercase tracking-wider block">Toplam Borç</span>
            {renderGroupedAmounts(selectedSupplier, "debt", "text-white text-lg")}
          </div>
          <div className="p-4 bg-[#A67C52]/10 border border-[#A67C52]/20 rounded-xl text-center">
            <span className="text-[10px] font-bold text-[#A67C52] uppercase tracking-wider block">Kalan Borç Bakiye</span>
            {renderGroupedAmounts(selectedSupplier, "remaining", "text-[#A67C52] text-lg")}
          </div>
        </div>
        
        <div className="flex-1 p-6 space-y-4">
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-bold text-white text-lg">İşlem Geçmişi</h4>
            <Button onClick={() => { setNewTxType("debt"); setEditTxId(null); setIsAddTxOpen(true); }} className="bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-bold h-10 rounded-xl px-4">
              <PlusCircle className="w-4 h-4 mr-2" /> İşlem Ekle
            </Button>
          </div>
          
          <div className="space-y-3">
            {selectedSupplier.transactions.length === 0 && (
              <div className="text-center p-8 text-sm text-[#9E9696] bg-white/5 rounded-xl border border-white/5">
                Bu tedarikçiye ait henüz işlem bulunmuyor.
              </div>
            )}
            {selectedSupplier.transactions.map((tx) => {
              const isTaken = tx.type === "debt";
              return (
                <div key={tx.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isTaken ? "bg-[#A67C52]/10 text-[#A67C52]" : "bg-[#12B76A]/10 text-[#12B76A]"}`}>
                      {isTaken ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white block">{tx.desc}</span>
                      <span className="text-xs text-[#9E9696] font-medium mt-1 block">{tx.date}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`font-mono text-lg font-bold ${isTaken ? "text-[#A67C52]" : "text-[#12B76A]"}`}>
                      {isTaken ? "+" : "-"}{getConvertedAmount(tx.amount, tx.currency || selectedSupplier.currency, exchangeRates).toLocaleString()} ₺
                    </span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEditTransaction(tx)} className="h-8 w-8 text-[#9E9696] hover:text-white hover:bg-white/10 rounded-lg">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteTransaction(tx.id)} className="h-8 w-8 text-[#9E9696] hover:text-[#EF4444] hover:bg-[#EF4444]/10 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* İŞLEM EKLE MODAL */}
        <Dialog open={isAddTxOpen} onOpenChange={(open) => {
          setIsAddTxOpen(open);
          if (!open) {
            setEditTxId(null);
            setNewTxAmount("");
            setNewTxDesc("");
            
          }
        }}>
          <DialogContent className="border-border bg-[#131316] text-white rounded-3xl max-w-md p-6 overflow-hidden">
            <form onSubmit={handleAddTx} className="space-y-6">
              <div>
                <DialogTitle className="text-xl font-bold text-white">{editTxId ? "İşlemi Düzenle" : "Yeni İşlem Ekle"}</DialogTitle>
                <p className="text-xs text-[#9E9696] mt-1">{selectedSupplier.name} supplierası için</p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#9E9696]">İşlem Tipi</Label>
                  <div className="grid grid-cols-2 gap-2 bg-white/5 p-1 rounded-xl">
                    <button
                      type="button"
                      className={`py-2 text-sm font-bold rounded-lg transition-all ${newTxType === "debt" ? "bg-[#A67C52] text-white shadow-sm" : "text-[#9E9696] hover:text-white hover:bg-white/5"}`}
                      onClick={() => { setNewTxType("debt");  setNewTxDesc(""); }}
                    >
                      Satış / Borç
                    </button>
                    <button
                      type="button"
                      className={`py-2 text-sm font-bold rounded-lg transition-all ${newTxType === "payment" ? "bg-[#12B76A] text-white shadow-sm" : "text-[#9E9696] hover:text-white hover:bg-white/5"}`}
                      onClick={() => { setNewTxType("payment"); setNewTxAmount(""); setNewTxDesc(""); }}
                    >
                      Ödeme / Tahsilat
                    </button>
                  </div>
                </div>

                

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-[#9E9696]">Tutar</Label>
                    <div className="flex gap-2">
                      <Input required type="number"  min="0" step="0.01" value={newTxAmount} onChange={(e) => setNewTxAmount(e.target.value)}  className="h-11 border-white/10 text-white rounded-xl flex-1 font-mono bg-white/5" />
                      <Select value={newTxCurrency} onValueChange={(v: "TRY" | "EUR" | "USD") => setNewTxCurrency(v as any)}>
                        <SelectTrigger className="w-20 h-11 bg-white/5 border-white/10 text-white rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#111111] border-white/10 text-white">
                          <SelectItem value="TRY">TRY</SelectItem>
                          <SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-[#9E9696]">Tarih</Label>
                    <Input type="date" required value={newTxDate} onChange={(e) => setNewTxDate(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#9E9696]">{newTxType === "debt" ? "Açıklama Notu (Opsiyonel)" : "Açıklama"}</Label>
                  <Input required={newTxType === "payment"} placeholder={newTxType === "debt" ? "İsteğe bağlı ek not..." : "İşlem açıklaması"} value={newTxDesc} onChange={(e) => setNewTxDesc(e.target.value)} className="bg-white/5 border-white/10 rounded-xl h-11 text-white" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsAddTxOpen(false)} className="h-11 border-white/10 bg-transparent text-white hover:bg-white/5 rounded-xl flex-1">İptal</Button>
                <Button type="submit" disabled={addTxMutation.isPending || editTxMutation.isPending || (!newTxAmount && newTxType === "payment")} className="h-11 bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-bold rounded-xl flex-1">
                  {editTxId ? "Güncelle" : "Kaydet"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <motion.button whileHover={{ scale: 1.05, x: -2 }} whileTap={{ scale: 0.95 }} onClick={onBack} className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">Supplieralar (Cari Hesap)</h1>
            <p className="text-sm text-[#9E9696] mt-0.5 font-medium">Suppliera cari hesap borç ve ödeme bakiye takipleri.</p>
          </div>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button onClick={() => setIsAddSupplierOpen(true)} className="bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-bold cursor-pointer rounded-xl h-11 px-5 shadow-[0_0_12px_rgba(166,124,82,0.3)]">
            <Plus className="mr-2 h-4 w-4" /> Suppliera Ekle
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
        <Input type="text" placeholder="Suppliera ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-11 bg-[#131316] border-white/5 text-white placeholder:text-gray-500 rounded-xl focus-visible:ring-[#A67C52]" />
      </div>

      <div className="bg-[#131316] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-bold text-white text-lg">Cari Suppliera Listesi</h3>
          <Badge className="bg-[#A67C52]/15 text-[#A67C52] border-transparent font-bold">{suppliers.length} Suppliera</Badge>
        </div>

        <div className="divide-y divide-white/5">
          {filteredSuppliers.length === 0 ? (
            <div className="text-center py-16 text-sm text-[#9E9696] font-medium">Hiçbir kayıtlı suppliera bulunamadı.</div>
          ) : (
            filteredSuppliers.map((f) => {
              
              return (
                <motion.div key={f.id} whileHover={{ scale: 1.005, x: 2, backgroundColor: "rgba(255,255,255,0.02)" }} whileTap={{ scale: 0.995 }} onClick={() => setSelectedSupplierId(f.id)} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 cursor-pointer gap-4 transition-colors">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white"><Users className="w-5 h-5 text-[#9E9696]" /></div>
                    <div>
                      <h4 className="font-bold text-white leading-snug">{f.name}</h4>
                      <span className="text-xs font-semibold text-[#9E9696] uppercase tracking-wider mt-0.5 block">ID: {f.id.substring(0, 8).toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-8 justify-between sm:justify-end flex-1 sm:flex-none">
                    <div className="grid grid-cols-2 gap-6 sm:gap-12 text-right min-w-[200px]">
                      <div>
                        <span className="text-[10px] font-bold text-[#9E9696] uppercase tracking-wider block">Ödenen</span>
                        {renderGroupedAmounts(f, "paid", "text-[#12B76A]")}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-[#9E9696] uppercase tracking-wider block">Kalan Borç</span>
                        {renderGroupedAmounts(f, "remaining", "text-[#A67C52]")}
                      </div>
                    </div>
                    <div className="flex">
                      <button onClick={(e) => {
                        e.stopPropagation();
                        setEditSupplierId(f.id);
                        setEditSupplierName(f.name);
                        setEditSupplierCurrency(f.currency as any || "TRY");
                        setEditSupplierRest(f.transactions.filter((tx) => tx.type === "payment").reduce((sum, tx) => sum + Number(tx.amount || 0), 0).toString());
                        setEditSupplierTaken(f.transactions.filter((tx) => tx.type === "debt").reduce((sum, tx) => sum + Number(tx.amount || 0), 0).toString());
                      }} className="p-2 rounded-lg hover:bg-white/5 text-[#9E9696] hover:text-[#12B76A] transition-colors cursor-pointer ml-4">
                        <Edit2 className="w-4.5 h-4.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); if (confirm("Bu supplierayı silmek istediğinizden emin misiniz?")) deleteSupplierMutation.mutate(f.id); }} className="p-2 rounded-lg hover:bg-white/5 text-[#9E9696] hover:text-[#A67C52] transition-colors cursor-pointer ml-1">
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
            {suppliers.map((f) => {
              const amount = breakdownType === "paid" ? getFirmPaid(f, exchangeRates) : getFirmRemaining(f, exchangeRates);
              if (amount === 0) return null;
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

      <Dialog open={isAddSupplierOpen} onOpenChange={setIsAddSupplierOpen}>
        <DialogContent className="border-border bg-[#131316] text-white rounded-2xl max-w-md">
          <DialogHeader><DialogTitle className="text-xl font-bold">Suppliera Ekle</DialogTitle></DialogHeader>
          <form onSubmit={handleAddSupplier}>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Suppliera Adı</Label>
                <Input required value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Açıklama (İsteğe bağlı)</Label>
                <Input value={newSupplierDesc} onChange={(e) => setNewSupplierDesc(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Para Birimi</Label>
                <Select value={newSupplierCurrency} onValueChange={(v: any) => setNewSupplierCurrency(v)}>
                  <SelectTrigger className="h-11 border-white/10 bg-white/5 text-white rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#131316] border-white/10 text-white">
                    <SelectItem value="TRY">TRY (₺)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Ödenen (İlk) {getCurrencySymbol(newSupplierCurrency)}</Label>
                <Input type="number"  min="0" placeholder="0" value={newSupplierRest} onChange={(e) => setNewSupplierRest(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Borçlanma (İlk) {getCurrencySymbol(newSupplierCurrency)}</Label>
                <Input type="number"  min="0" placeholder="0" value={newSupplierTaken} onChange={(e) => setNewSupplierTaken(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddSupplierOpen(false)} className="h-11 border-white/10 bg-transparent text-white hover:bg-white/5 rounded-xl">Vazgeç</Button>
              <Button type="submit" disabled={addSupplierMutation.isPending} className="h-11 bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-bold rounded-xl px-6">Kaydet</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editSupplierId} onOpenChange={(open) => !open && setEditSupplierId(null)}>
        <DialogContent className="border-border bg-[#131316] text-white rounded-2xl max-w-md">
          <DialogHeader><DialogTitle className="text-xl font-bold">Supplierayı Düzenle</DialogTitle></DialogHeader>
          <form onSubmit={handleEditSupplier} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-300">Suppliera Adı</Label>
              <Input required value={editSupplierName} onChange={(e) => setEditSupplierName(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-300">Para Birimi</Label>
              <Select value={editSupplierCurrency} onValueChange={(v: any) => setEditSupplierCurrency(v)}>
                <SelectTrigger className="h-11 border-white/10 bg-white/5 text-white rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#131316] border-white/10 text-white">
                  <SelectItem value="TRY">TRY (₺)</SelectItem><SelectItem value="USD">USD ($)</SelectItem><SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Ödenen (Toplam) {getCurrencySymbol(editSupplierCurrency)}</Label>
                <Input type="number"  min="0" value={editSupplierRest} onChange={(e) => setEditSupplierRest(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Borçlanma (Toplam) {getCurrencySymbol(editSupplierCurrency)}</Label>
                <Input type="number" step="any" min="0" value={editSupplierTaken} onChange={(e) => setEditSupplierTaken(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setEditSupplierId(null)} className="h-11 border-white/10 bg-transparent text-white hover:bg-white/5 rounded-xl">Vazgeç</Button>
              <Button type="submit" disabled={editSupplierMutation.isPending} className="h-11 bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-bold rounded-xl px-6">Güncelle</Button>
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



// ───────── Firmalar (Cari Hesap) ListView Component ─────────

interface FirmsListViewProps {
  firms: Firm[];
  products: any[];
  exchangeRates?: Record<string, number>;
  isRatesError?: boolean;
  onBack: () => void;
}

function FirmsListView({ firms, products, exchangeRates, isRatesError, onBack }: FirmsListViewProps) {
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFirmId, setSelectedFirmId] = useState<string | null>(null);
  const [isAddFirmOpen, setIsAddFirmOpen] = useState(false);
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [breakdownType, setBreakdownType] = useState<"paid" | "remaining" | null>(null);

  const [newFirmName, setNewFirmName] = useState("");
  const [newFirmDesc, setNewFirmDesc] = useState("");
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
  const [lineItems, setLineItems] = useState<{ id: string, productId: string, quantity: number, price: number, sayfa_sayisi?: string }[]>([{ id: Math.random().toString(), productId: "", quantity: 1, price: 0, sayfa_sayisi: "1" }]);
  const [editTxId, setEditTxId] = useState<string | null>(null);

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
    mutationFn: async (input: { name: string; currency: string; taken: number; rest: number; desc: string }) => {
      const { data: supplier, error: sErr } = await supabaseClient
        .from("firms")
        .insert({ name: input.name, currency: input.currency, description: input.desc })
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
      setNewFirmName(""); setNewFirmDesc(""); setNewFirmTaken(""); setNewFirmRest(""); setNewFirmCurrency("TRY");
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
      setLineItems([{ id: Math.random().toString(), productId: "", quantity: 1, price: 0 }]);
      setEditTxId(null);
    },
  });

  const editTxMutation = useMutation({
    mutationFn: async (input: { id: string; type: "debt" | "payment"; amount: number; desc: string; date: string; currency?: string }) => {
      await supabaseClient.from("firm_transactions").update({
        transaction_type: input.type, amount: input.amount, description: input.desc, currency: input.currency, created_at: new Date(input.date).toISOString()
      }).eq("id", input.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["firms_ledger"] });
      toast.success("İşlem güncellendi");
      setIsAddTxOpen(false); setNewTxAmount(""); setNewTxDesc("");
      setLineItems([{ id: Math.random().toString(), productId: "", quantity: 1, price: 0 }]);
      setEditTxId(null);
    },
  });

  const deleteTxMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabaseClient.from("firm_transactions").delete().eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["firms_ledger"] });
      toast.success("İşlem silindi");
    },
  });

  const handleAddFirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirmName.trim()) return;
    addFirmMutation.mutate({ name: newFirmName.trim(), currency: newFirmCurrency, taken: parseFloat(newFirmTaken) || 0, rest: parseFloat(newFirmRest) || 0, desc: newFirmDesc.trim() });
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
    if (!selectedFirmId) return;

    let finalAmount = parseFloat(newTxAmount) || 0;
    let finalDesc = newTxDesc.trim();

    if (newTxType === "debt" && lineItems.length > 0) {
      const validItems = lineItems.filter(item => item.productId !== "");
      if (validItems.length > 0) {
        finalAmount = validItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        const productsSummary = validItems.map(item => {
          const pName = products.find((p: any) => p.id === item.productId)?.name || "Bilinmeyen Ürün";
          return `${item.quantity}x ${pName}`;
        }).join(", ");
        
        finalDesc = finalDesc ? `${productsSummary} - ${finalDesc}` : productsSummary;
      }
    }

    if (finalAmount <= 0) return toast.error("Geçerli bir tutar giriniz.");
    if (!finalDesc) return toast.error("Açıklama veya ürün seçimi zorunludur.");

    if (editTxId) {
      editTxMutation.mutate({ id: editTxId, type: newTxType, amount: finalAmount, desc: finalDesc, date: newTxDate, currency: newTxCurrency });
    } else {
      addTxMutation.mutate({ firm_id: selectedFirmId, type: newTxType, amount: finalAmount, desc: finalDesc, date: newTxDate, currency: newTxCurrency });
    }
  };

  const handleEditTransaction = (tx: any) => {
    setEditTxId(tx.id);
    setNewTxType(tx.type);
    setNewTxAmount(tx.amount.toString());
    setNewTxDesc(tx.desc);
    setNewTxCurrency(tx.currency || "TRY");
    setNewTxDate(tx.date.split("T")[0] || new Date().toISOString().split("T")[0]);
    setIsAddTxOpen(true);
    setLineItems([]); 
  };

  const handleDeleteTransaction = (id: string) => {
    if (window.confirm("Bu işlemi silmek istediğinize emin misiniz?")) {
      deleteTxMutation.mutate(id);
    }
  };

  const addLineItem = () => setLineItems([...lineItems, { id: Math.random().toString(), productId: "", quantity: 1, price: 0, sayfa_sayisi: "1" }]);
  const removeLineItem = (id: string) => setLineItems(lineItems.filter(item => item.id !== id));
  
  const updateLineItem = (id: string, field: "productId" | "quantity" | "sayfa_sayisi", value: any) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === "productId" || field === "sayfa_sayisi") {
          const prod = products.find((p: any) => p.id === updated.productId);
          if (prod) {
            const customPrice = prod.sayfa_fiyatlari?.[updated.sayfa_sayisi || "1"];
            const p = customPrice ? parseFloat(customPrice) : prod.base_price;
            updated.price = isNaN(p) || p === 0 ? prod.base_price : p;
          } else {
            updated.price = 0;
          }
        }
        return updated;
      }
      return item;
    }));
  };

  useEffect(() => {
    if (newTxType === "debt") {
      const sum = lineItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      setNewTxAmount(sum.toString());
    }
  }, [lineItems, newTxType]);

  const selectedFirm = firms.find((f) => f.id === selectedFirmId);
  const filteredFirms = firms
    .filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, 'tr'));

  if (selectedFirm) {
    return (
      <div className="flex flex-col h-full bg-[#131316] text-white rounded-3xl border border-white/5">
        <div className="p-6 bg-white/[0.02] border-b border-white/5 flex justify-between items-start">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSelectedFirmId(null)} className="text-[#9E9696] hover:text-white hover:bg-white/5">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#A67C52] uppercase tracking-widest">FİRMA DETAY PANELİ</span>
              <h3 className="text-xl font-extrabold text-white leading-tight">{selectedFirm.name}</h3>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 px-6 py-4 bg-white/[0.01] border-b border-white/5">
          <div className="p-4 bg-white/5 border border-white/5 rounded-xl text-center">
            <span className="text-[10px] font-bold text-[#9E9696] uppercase tracking-wider block">Ödenen Toplam</span>
            <span className="font-mono text-lg font-bold text-[#12B76A] block mt-1">{getFirmPaid(selectedFirm, exchangeRates).toLocaleString()} ₺</span>
          </div>
          <div className="p-4 bg-white/5 border border-white/5 rounded-xl text-center">
            <span className="text-[10px] font-bold text-[#9E9696] uppercase tracking-wider block">Toplam Borç</span>
            <span className="font-mono text-lg font-bold text-white block mt-1">{getFirmDebt(selectedFirm, exchangeRates).toLocaleString()} ₺</span>
          </div>
          <div className="p-4 bg-[#A67C52]/10 border border-[#A67C52]/20 rounded-xl text-center">
            <span className="text-[10px] font-bold text-[#A67C52] uppercase tracking-wider block">Kalan Borç Bakiye</span>
            <span className="font-mono text-lg font-bold text-[#A67C52] block mt-1">{getFirmRemaining(selectedFirm, exchangeRates).toLocaleString()} ₺</span>
          </div>
        </div>
        
        <div className="flex-1 p-6 space-y-4">
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-bold text-white text-lg">İşlem Geçmişi</h4>
            <Button onClick={() => { setNewTxType("debt"); setEditTxId(null); setIsAddTxOpen(true); }} className="bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-bold h-10 rounded-xl px-4">
              <PlusCircle className="w-4 h-4 mr-2" /> İşlem Ekle
            </Button>
          </div>
          
          <div className="space-y-3">
            {selectedFirm.transactions.length === 0 && (
              <div className="text-center p-8 text-sm text-[#9E9696] bg-white/5 rounded-xl border border-white/5">
                Bu firmaya ait henüz işlem bulunmuyor.
              </div>
            )}
            {selectedFirm.transactions.map((tx) => {
              const isTaken = tx.type === "debt";
              return (
                <div key={tx.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isTaken ? "bg-[#A67C52]/10 text-[#A67C52]" : "bg-[#12B76A]/10 text-[#12B76A]"}`}>
                      {isTaken ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white block">{tx.desc}</span>
                      <span className="text-xs text-[#9E9696] font-medium mt-1 block">{tx.date}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`font-mono text-lg font-bold ${isTaken ? "text-[#A67C52]" : "text-[#12B76A]"}`}>
                      {isTaken ? "+" : "-"}{getConvertedAmount(tx.amount, tx.currency || selectedFirm.currency, exchangeRates).toLocaleString()} ₺
                    </span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEditTransaction(tx)} className="h-8 w-8 text-[#9E9696] hover:text-white hover:bg-white/10 rounded-lg">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteTransaction(tx.id)} className="h-8 w-8 text-[#9E9696] hover:text-[#EF4444] hover:bg-[#EF4444]/10 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* İŞLEM EKLE MODAL */}
        <Dialog open={isAddTxOpen} onOpenChange={(open) => {
          setIsAddTxOpen(open);
          if (!open) {
            setEditTxId(null);
            setNewTxAmount("");
            setNewTxDesc("");
            setLineItems([{ id: Math.random().toString(), productId: "", quantity: 1, price: 0 }]);
          }
        }}>
          <DialogContent className="border-border bg-[#131316] text-white rounded-3xl max-w-md p-6 overflow-hidden">
            <form onSubmit={handleAddTx} className="space-y-6">
              <div>
                <DialogTitle className="text-xl font-bold text-white">{editTxId ? "İşlemi Düzenle" : "Yeni İşlem Ekle"}</DialogTitle>
                <p className="text-xs text-[#9E9696] mt-1">{selectedFirm.name} firması için</p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#9E9696]">İşlem Tipi</Label>
                  <div className="grid grid-cols-2 gap-2 bg-white/5 p-1 rounded-xl">
                    <button
                      type="button"
                      className={`py-2 text-sm font-bold rounded-lg transition-all ${newTxType === "debt" ? "bg-[#A67C52] text-white shadow-sm" : "text-[#9E9696] hover:text-white hover:bg-white/5"}`}
                      onClick={() => { setNewTxType("debt"); setLineItems([{ id: Math.random().toString(), productId: "", quantity: 1, price: 0, sayfa_sayisi: "1" }]); setNewTxDesc(""); }}
                    >
                      Satış / Borç
                    </button>
                    <button
                      type="button"
                      className={`py-2 text-sm font-bold rounded-lg transition-all ${newTxType === "payment" ? "bg-[#12B76A] text-white shadow-sm" : "text-[#9E9696] hover:text-white hover:bg-white/5"}`}
                      onClick={() => { setNewTxType("payment"); setNewTxAmount(""); setNewTxDesc(""); }}
                    >
                      Ödeme / Tahsilat
                    </button>
                  </div>
                </div>

                {newTxType === "debt" && (
                  <div className="space-y-3">
                    <Label className="text-xs text-[#9E9696]">Ürünler (Satış)</Label>
                    <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
                      {lineItems.map((item) => (
                        <div key={item.id} className="flex gap-2 items-start">
                          <div className="flex-1">
                            <Select value={item.productId} onValueChange={(v) => updateLineItem(item.id, "productId", v)}>
                              <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl h-11">
                                <SelectValue placeholder="Ürün Seç" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#111111] text-white border-white/10">
                                {products.map((p: any) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name} ({p.base_price} ₺)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-20">
                            <Input
                              type="number"  min="1" value={item.quantity}
                              onChange={(e) => updateLineItem(item.id, "quantity", parseFloat(e.target.value) || 1)}
                              className="bg-white/5 border-white/10 rounded-xl h-11 text-white text-center px-1"
                            />
                          </div>
                          <div className="w-20">
                            <Select value={item.sayfa_sayisi || "1"} onValueChange={(v) => updateLineItem(item.id, "sayfa_sayisi", v)}>
                              <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl h-11 px-2">
                                <SelectValue placeholder="Sayfa" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#111111] text-white border-white/10 min-w-[80px]">
                                {[...Array(10)].map((_, i) => (
                                  <SelectItem key={i + 1} value={String(i + 1)}>
                                    {i + 1}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {lineItems.length > 1 && (
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeLineItem(item.id)} className="h-11 w-11 text-[#EF4444] hover:bg-[#EF4444]/10 hover:text-[#EF4444] rounded-xl shrink-0">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addLineItem} className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl h-9 mt-1 border-dashed">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Yeni Ürün Ekle
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-[#9E9696]">Tutar</Label>
                    <div className="flex gap-2">
                      <Input required type="number"  min="0" step="0.01" value={newTxAmount} onChange={(e) => setNewTxAmount(e.target.value)} readOnly={newTxType === "debt"} className={`h-11 border-white/10 text-white rounded-xl flex-1 font-mono ${newTxType === "debt" ? "bg-white/10 opacity-70 pointer-events-none" : "bg-white/5"}`} />
                      <Select value={newTxCurrency} onValueChange={(v: "TRY" | "EUR") => setNewTxCurrency(v)}>
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
                  <div className="space-y-1.5">
                    <Label className="text-xs text-[#9E9696]">Tarih</Label>
                    <Input type="date" required value={newTxDate} onChange={(e) => setNewTxDate(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#9E9696]">{newTxType === "debt" ? "Açıklama Notu (Opsiyonel)" : "Açıklama"}</Label>
                  <Input required={newTxType === "payment"} placeholder={newTxType === "debt" ? "İsteğe bağlı ek not..." : "İşlem açıklaması"} value={newTxDesc} onChange={(e) => setNewTxDesc(e.target.value)} className="bg-white/5 border-white/10 rounded-xl h-11 text-white" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsAddTxOpen(false)} className="h-11 border-white/10 bg-transparent text-white hover:bg-white/5 rounded-xl flex-1">İptal</Button>
                <Button type="submit" disabled={addTxMutation.isPending || editTxMutation.isPending || (!newTxAmount && newTxType === "payment")} className="h-11 bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-bold rounded-xl flex-1">
                  {editTxId ? "Güncelle" : "Kaydet"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

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
                      <span className="text-xs font-semibold text-[#9E9696] uppercase tracking-wider mt-0.5 block">ID: {f.id.substring(0, 8).toUpperCase()}</span>
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
              if (amount === 0) return null;
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
          <form onSubmit={handleAddFirm}>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Firma Adı</Label>
                <Input required value={newFirmName} onChange={(e) => setNewFirmName(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Açıklama (İsteğe bağlı)</Label>
                <Input value={newFirmDesc} onChange={(e) => setNewFirmDesc(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
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
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Ödenen (İlk) {getCurrencySymbol(newFirmCurrency)}</Label>
                <Input type="number"  min="0" placeholder="0" value={newFirmRest} onChange={(e) => setNewFirmRest(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Borçlanma (İlk) {getCurrencySymbol(newFirmCurrency)}</Label>
                <Input type="number"  min="0" placeholder="0" value={newFirmTaken} onChange={(e) => setNewFirmTaken(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
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
                <Input type="number"  min="0" value={editFirmRest} onChange={(e) => setEditFirmRest(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Borçlanma (Toplam) {getCurrencySymbol(editFirmCurrency)}</Label>
                <Input type="number" step="any" min="0" value={editFirmTaken} onChange={(e) => setEditFirmTaken(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setEditFirmId(null)} className="h-11 border-white/10 bg-transparent text-white hover:bg-white/5 rounded-xl">Vazgeç</Button>
              <Button type="submit" disabled={editFirmMutation.isPending} className="h-11 bg-[#A67C52] hover:bg-[#A67C52]/90 text-white font-bold rounded-xl px-6">Güncelle</Button>
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
  const [newEmployeeDesc, setNewEmployeeDesc] = useState("");
  const [newEmployeeTaken, setNewEmployeeTaken] = useState("");
  const [newEmployeeRest, setNewEmployeeRest] = useState("");

  const [editEmployeeId, setEditEmployeeId] = useState<string | null>(null);
  const [editEmployeeName, setEditEmployeeName] = useState("");
  const [editEmployeeTaken, setEditEmployeeTaken] = useState("");
  const [editEmployeeRest, setEditEmployeeRest] = useState("");

  const [paymentEmployeeId, setPaymentEmployeeId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [newTxType, setNewTxType] = useState<"debt_addition" | "salary_payment" | "advance">("debt_addition");
  const [newTxAmount, setNewTxAmount] = useState("");
  const [newTxDate, setNewTxDate] = useState(new Date().toISOString().split("T")[0]);
  const [newTxDesc, setNewTxDesc] = useState("");



  const totalPaid = employees.reduce((sum, f) => sum + getEmployeePaid(f), 0);
  const totalRemaining = employees.reduce((sum, f) => sum + getEmployeeRemaining(f), 0);

  const addEmployeeMutation = useMutation({
    mutationFn: async (input: { name: string; taken: number; rest: number; desc: string }) => {
      const remaining = input.taken - input.rest;
      const { data: employee, error: sErr } = await supabaseClient
        .from("employees")
        .insert({
          name: input.name,
          currency: "TRY",
          total_debt: input.taken,
          total_paid: input.rest
        })
        .select("id, name, currency")
        .single();
      if (sErr) throw sErr;

      return employee;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees_ledger"] });
      toast.success("Personel eklendi");
      setIsAddEmployeeOpen(false);
      setNewEmployeeName(""); setNewEmployeeDesc(""); setNewEmployeeTaken(""); setNewEmployeeRest("");
    },
  });

  const editEmployeeMutation = useMutation({
    mutationFn: async (input: { id: string; name: string; takenDiff: number; restDiff: number; newTaken: number; newRest: number }) => {
      const remaining = input.newTaken - input.newRest;
      await supabaseClient.from("employees").update({
        name: input.name,
        total_debt: input.newTaken,
        total_paid: input.newRest
      }).eq("id", input.id);

      if (input.takenDiff !== 0) {
        await supabaseClient.from("salary_transactions").insert({
          employee_id: input.id, transaction_type: "debt_addition", amount: input.takenDiff, description: "Bakiye Düzenlemesi (Maaş)"
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
    mutationFn: async (input: { employee_id: string; type: string; amount: number; desc: string; date: string; currentSalary: number; currentPaid: number }) => {
      await supabaseClient.from("salary_transactions").insert({
        employee_id: input.employee_id, transaction_type: input.type, amount: input.amount, description: input.desc, created_at: new Date(input.date).toISOString()
      });

      let newSalary = input.currentSalary;
      let newPaid = input.currentPaid;

      if (input.type === "debt_addition") {
        newSalary += input.amount;
      } else if (input.type === "salary_payment" || input.type === "advance") {
        newPaid += input.amount;
      }

      await supabaseClient.from("employees").update({
        total_debt: newSalary,
        total_paid: newPaid
      }).eq("id", input.employee_id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees_ledger"] });
      toast.success("İşlem kaydedildi");
      setIsAddTxOpen(false); setNewTxAmount(""); setNewTxDesc("");
    },
  });

  const addPaymentMutation = useMutation({
    mutationFn: async (input: { employee_id: string; amount: number; currentPaid: number }) => {
      await supabaseClient.from("salary_transactions").insert({
        employee_id: input.employee_id, transaction_type: "salary_payment", amount: input.amount, description: "Hızlı Ödeme", created_at: new Date().toISOString()
      });
      await supabaseClient.from("employees").update({
        total_paid: input.currentPaid + input.amount
      }).eq("id", input.employee_id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees_ledger"] });
      toast.success("Ödeme başarıyla eklendi");
      setPaymentEmployeeId(null);
      setPaymentAmount("");
    },
  });

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployeeName.trim()) return;
    addEmployeeMutation.mutate({ name: newEmployeeName.trim(), taken: parseFloat(newEmployeeTaken) || 0, rest: parseFloat(newEmployeeRest) || 0, desc: newEmployeeDesc.trim() });
  };

  const handleEditEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEmployeeId || !editEmployeeName.trim()) return;
    const employee = employees.find(f => f.id === editEmployeeId);
    if (!employee) return;
    const currentTaken = employee.total_debt || 0;
    const currentRest = employee.total_paid || 0;
    const newTaken = parseFloat(editEmployeeTaken) || 0;
    const newRest = parseFloat(editEmployeeRest) || 0;
    editEmployeeMutation.mutate({
      id: editEmployeeId,
      name: editEmployeeName.trim(),
      newTaken,
      newRest,
      takenDiff: newTaken - currentTaken,
      restDiff: newRest - currentRest
    });
  };

  const handleAddTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId || !newTxAmount || !newTxDesc.trim()) return;
    const employee = employees.find((f) => f.id === selectedEmployeeId);
    if (!employee) return;

    addTxMutation.mutate({
      employee_id: selectedEmployeeId,
      type: newTxType,
      amount: parseFloat(newTxAmount),
      desc: newTxDesc.trim(),
      date: newTxDate,
      currentSalary: employee.total_debt || 0,
      currentPaid: employee.total_paid || 0
    });
  };

  const selectedEmployee = employees.find((f) => f.id === selectedEmployeeId);
  const filteredEmployees = employees
    .filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, 'tr'));

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
                        setEditEmployeeRest(f.total_paid?.toString() || "0");
                        setEditEmployeeTaken(f.total_debt?.toString() || "0");
                      }} className="p-2 rounded-lg hover:bg-white/5 text-[#9E9696] hover:text-[#12B76A] transition-colors cursor-pointer ml-4">
                        <Edit2 className="w-4.5 h-4.5" />
                      </button>
                      <button onClick={(e) => {
                        e.stopPropagation();
                        setPaymentEmployeeId(f.id);
                      }} className="p-2 rounded-lg hover:bg-white/5 text-[#9E9696] hover:text-[#12B76A] transition-colors cursor-pointer ml-1" title="Ödeme Ekle">
                        <Wallet className="w-4.5 h-4.5" />
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
              if (amount === 0) return null;
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
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-300">Açıklama (İsteğe bağlı)</Label>
              <Input placeholder="Ek notlar..." value={newEmployeeDesc} onChange={(e) => setNewEmployeeDesc(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Ödenen (İlk) ₺</Label>
                <Input type="number"  min="0" placeholder="0" value={newEmployeeRest} onChange={(e) => setNewEmployeeRest(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Maaş Tanımlama (İlk) ₺</Label>
                <Input type="number"  min="0" placeholder="0" value={newEmployeeTaken} onChange={(e) => setNewEmployeeTaken(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
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
                <Input type="number"  min="0" value={editEmployeeRest} onChange={(e) => setEditEmployeeRest(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Maaş Tanımlama (Toplam) ₺</Label>
                <Input type="number" step="any" min="0" value={editEmployeeTaken} onChange={(e) => setEditEmployeeTaken(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
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
              </div>
              <div className="grid grid-cols-3 gap-3 px-6 py-4 bg-white/[0.01] border-b border-white/5">
                <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-center">
                  <span className="text-[9px] font-bold text-[#9E9696] uppercase tracking-wider block">Ödenen</span>
                  <span className="font-mono text-sm font-bold text-[#12B76A] block mt-0.5">{getEmployeePaid(selectedEmployee).toLocaleString()} ₺</span>
                </div>
                <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-center">
                  <span className="text-[9px] font-bold text-[#9E9696] uppercase tracking-wider block">Toplam Maaş</span>
                  <span className="font-mono text-sm font-bold text-white block mt-0.5">{getEmployeeSalary(selectedEmployee).toLocaleString()} ₺</span>
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
              <div className="space-y-2"><Label className="text-sm font-semibold text-gray-300">Tutar (₺)</Label><Input required type="number"  min="1" value={newTxAmount} onChange={(e) => setNewTxAmount(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" /></div>
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

      {/* Hızlı Ödeme Modal */}
      <Dialog open={!!paymentEmployeeId} onOpenChange={(open) => !open && setPaymentEmployeeId(null)}>
        <DialogContent className="bg-[#0A0A0A] border-white/10 text-white sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Yeni Ödeme Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-300">Ödenecek Tutar (₺)</Label>
              <Input type="number"  min="1" placeholder="Örn: 5000" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="h-11 bg-white/5 border-white/10 text-white rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPaymentEmployeeId(null)} className="h-11 border-white/10 bg-transparent text-white hover:bg-white/5 rounded-xl">İptal</Button>
            <Button disabled={addPaymentMutation.isPending} onClick={() => {
              if (!paymentAmount) return;
              const emp = filteredEmployees.find(e => e.id === paymentEmployeeId);
              if (emp && paymentEmployeeId) {
                addPaymentMutation.mutate({
                  employee_id: paymentEmployeeId,
                  amount: parseFloat(paymentAmount),
                  currentPaid: Number(emp.total_paid || 0)
                });
              }
            }} className="h-11 bg-[#12B76A] hover:bg-[#12B76A]/90 text-white font-bold rounded-xl px-6">
              Ödeme Kaydet
            </Button>
          </DialogFooter>
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
  const [newExpenseDesc, setNewExpenseDesc] = useState("");
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
    mutationFn: async (input: { name: string; taken: number; rest: number; desc: string }) => {
      const { data: expense, error: sErr } = await supabaseClient
        .from("common_expenses")
        .insert({ name: input.name, currency: "TRY", total_debt: input.taken, total_paid: input.rest, description: input.desc })
        .select("id, name, currency")
        .single();
      if (sErr) throw sErr;
      return expense;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses_ledger"] });
      toast.success("Gider merkezi eklendi");
      setIsAddExpenseOpen(false);
      setNewExpenseName(""); setNewExpenseDesc(""); setNewExpenseTaken(""); setNewExpenseRest("");
    },
  });

  
  const updateSiraMutation = useMutation({
    mutationFn: async (updates: { id: string; sira: number }[]) => {
      const updatePromises = updates.map(u => 
        supabaseClient.from("common_expenses").update({ sira: u.sira }).eq("id", u.id)
      );
      const results = await Promise.all(updatePromises);
      const error = results.find(r => r.error)?.error;
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses_ledger"] });
    },
    onError: (err: any) => {
      toast.error(`Sıralama güncellenirken hata oluştu: ${err.message}`);
    }
  });

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination } = result;
    if (source.index === destination.index) return;

    const list = Array.from(expenses);
    const sourceExpense = filteredExpenses[source.index];
    const destinationExpense = filteredExpenses[destination.index];

    const sourceGlobalIndex = list.findIndex(e => e.id === sourceExpense.id);
    const destGlobalIndex = list.findIndex(e => e.id === destinationExpense.id);

    const [moved] = list.splice(sourceGlobalIndex, 1);
    list.splice(destGlobalIndex, 0, moved);

    qc.setQueryData(["expenses_ledger"], list);

    const updates = list.map((item, index) => ({
      id: item.id,
      sira: index
    }));
    
    updateSiraMutation.mutate(updates);
  };

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
    addExpenseMutation.mutate({ name: newExpenseName.trim(), taken: parseFloat(newExpenseTaken) || 0, rest: parseFloat(newExpenseRest) || 0, desc: newExpenseDesc.trim() });
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

  const filteredExpenses = expenses
    .filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, 'tr'));

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

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="expensesList">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="divide-y divide-white/5">
                {filteredExpenses.length === 0 ? (
            <div className="text-center py-16 text-sm text-[#9E9696] font-medium">Kayıtlı gider merkezi bulunamadı.</div>
          ) : (
            filteredExpenses.map((f, index) => {
              const paid = getExpensePaid(f, exchangeRates);
              const remaining = getExpenseRemaining(f, exchangeRates);
              return (
                <Draggable key={f.id} draggableId={f.id.toString()} index={index}>
                    {(provided, snapshot) => (
                      <motion.div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        style={provided.draggableProps.style}
                        key={f.id} whileHover={{ scale: 1.005, x: 2, backgroundColor: "rgba(255,255,255,0.02)" }} whileTap={{ scale: 0.995 }} onClick={() => setSelectedExpenseId(f.id)} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 cursor-pointer gap-4 transition-colors">
                  <div className="flex items-center gap-3.5">
                    <div {...provided.dragHandleProps} className="text-[#9E9696] hover:text-white cursor-grab active:cursor-grabbing mr-2 flex items-center justify-center">
                          <GripVertical className="w-5 h-5" />
                        </div>
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
                    )}
                  </Draggable>
                );
              })
            )}
            {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

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
              if (amount === 0) return null;
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
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-300">Açıklama (İsteğe bağlı)</Label>
              <Input placeholder="Ek notlar..." value={newExpenseDesc} onChange={(e) => setNewExpenseDesc(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Ödenen (İlk) ₺</Label>
                <Input type="number"  min="0" placeholder="0" value={newExpenseRest} onChange={(e) => setNewExpenseRest(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Borç Kaydı (İlk) ₺</Label>
                <Input type="number" step="any" min="0" placeholder="0" value={newExpenseTaken} onChange={(e) => setNewExpenseTaken(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
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
                <Input type="number"  min="0" value={editExpenseRest} onChange={(e) => setEditExpenseRest(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">Toplam Gider (Borç) ₺</Label>
                <Input type="number"  min="0" value={editExpenseTaken} onChange={(e) => setEditExpenseTaken(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
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
  const [newSchoolDesc, setNewSchoolDesc] = useState("");
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

  const totalPaid = schools.reduce((sum, f) => sum + getSchoolPaid(f, exchangeRates), 0);
  const totalRemaining = schools.reduce((sum, f) => sum + getSchoolRemaining(f, exchangeRates), 0);

  const addSchoolMutation = useMutation({
    mutationFn: async (input: { name: string; currency: string; rest: number; desc: string }) => {
      const { data: school, error: sErr } = await supabaseClient
        .from("schools")
        .insert({ name: input.name, currency: input.currency, description: input.desc, paid_amount: input.rest, remaining_amount: 0 })
        .select("id, name, currency")
        .single();
      if (sErr) throw sErr;

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
      setNewSchoolName(""); setNewSchoolDesc(""); setNewSchoolTaken(""); setNewSchoolRest(""); setNewSchoolCurrency("TRY");
    },
  });

  const editSchoolMutation = useMutation({
    mutationFn: async (input: { id: string; name: string; currency: string; restDiff: number; paid_amount: number }) => {
      await supabaseClient.from("schools").update({ name: input.name, currency: input.currency, paid_amount: input.paid_amount }).eq("id", input.id);

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
    addSchoolMutation.mutate({ name: newSchoolName.trim(), currency: newSchoolCurrency, rest: parseFloat(newSchoolRest) || 0, desc: newSchoolDesc.trim() });
  };

  const handleEditSchool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSchoolId) return;
    const school = schools.find((f) => f.id === editSchoolId);
    if (!school) return;
    const oldPaid = school.paid_amount || 0;
    const newPaid = parseFloat(editSchoolRest) || 0;
    const diff = newPaid - oldPaid;
    editSchoolMutation.mutate({ id: editSchoolId, name: editSchoolName.trim(), currency: editSchoolCurrency, restDiff: diff, paid_amount: newPaid });
  };

  const handleAddTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchoolId || !newTxAmount || !newTxDesc.trim()) return;
    const school = schools.find((f) => f.id === selectedSchoolId);
    addTxMutation.mutate({ school_id: selectedSchoolId, type: newTxType, amount: parseFloat(newTxAmount), desc: newTxDesc.trim(), date: newTxDate, currency: school?.currency });
  };

  const selectedSchool = schools.find((f) => f.id === selectedSchoolId);
  const filteredSchools = schools
    .filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, 'tr'));

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
                      <span className="text-xs font-semibold text-[#9E9696] uppercase tracking-wider mt-0.5 block">ID: {f.id.substring(0, 8).toUpperCase()}</span>
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
                        setEditSchoolRest(String(f.paid_amount || 0));
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
              if (amount === 0) return null;
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
              <Label className="text-sm font-semibold text-gray-300">Açıklama (İsteğe bağlı)</Label>
              <Input placeholder="Ek notlar..." value={newSchoolDesc} onChange={(e) => setNewSchoolDesc(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
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
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-300">Ödenen (İlk) {getCurrencySymbol(newSchoolCurrency)}</Label>
              <Input type="number"  min="0" placeholder="0" value={newSchoolRest} onChange={(e) => setNewSchoolRest(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
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
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-300">Ödenen (Toplam) {getCurrencySymbol(editSchoolCurrency)}</Label>
              <Input type="number" step="any" min="0" value={editSchoolRest} onChange={(e) => setEditSchoolRest(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" />
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label className="text-sm font-semibold text-gray-300">Tutar (₺)</Label><Input required type="number"  min="1" value={newTxAmount} onChange={(e) => setNewTxAmount(e.target.value)} className="h-11 border-white/10 bg-white/5 text-white rounded-xl" /></div>
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

interface BaskiListViewProps {
  exchangeRates?: Record<string, number>;
  onBack: () => void;
}

function BaskiListView({ exchangeRates, onBack }: BaskiListViewProps) {
  const { teamId } = useAuth();
  const [isBaskiModalOpen, setBaskiModalOpen] = useState(false);
  const [baskiSelectedProduct, setBaskiSelectedProduct] = useState("");
  const [baskiQuantity, setBaskiQuantity] = useState("1");
  const [baskiAciklama, setBaskiAciklama] = useState("");
  const [baskiPaidAmount, setBaskiPaidAmount] = useState("");
  const [baskiRemainingAmount, setBaskiRemainingAmount] = useState("");
  const [baskiEditId, setBaskiEditId] = useState<string | null>(null);
  const [isBaskiEditModalOpen, setBaskiEditModalOpen] = useState(false);
  const [baskiEditAmount, setBaskiEditAmount] = useState("");
  const [baskiEditPaid, setBaskiEditPaid] = useState("");
  const [baskiEditDesc, setBaskiEditDesc] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const queryClient = useQueryClient();

  const { data: productsForBaski = [] } = useQuery({
    queryKey: ["products_for_baski"],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("products")
        .select("id, name, base_price, sayfa_fiyatlari")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  const { data: baskiTransactions = [] } = useQuery({
    queryKey: ["print_expenses", teamId],
    enabled: !!teamId,
    queryFn: async () => {
      let q = supabaseClient
        .from("print_expenses")
        .select("*")
        .order("created_at", { ascending: false });

      if (teamId !== "all") {
        q = q.eq("team_id", teamId);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data.map((t) => {
        const match = String(t.description || "").match(/^(.*?)\s*\((\d+)\s*Adet\)(?:\s*-\s*(.*))?$/i);
        return {
          id: t.id,
          date: new Date(t.created_at).toISOString().split("T")[0],
          product: match ? match[1].trim() : "-",
          quantity: match ? parseFloat(match[2]) : "-",
          desc: match ? (match[3] ? match[3].trim() : "-") : (t.description || "-"),
          amount: t.amount,
          paidAmount: t.paid_amount || 0,
        };
      });
    }
  });

  const addBaskiExpenseMutation = useMutation({
    mutationFn: async ({ amount, desc, paid, remaining }: { amount: number; desc: string; paid: number; remaining: number }) => {
      const { error: txErr } = await supabaseClient
        .from("print_expenses")
        .insert({
          amount: amount,
          description: desc,
          paid_amount: paid,
          remaining_amount: remaining,
          team_id: teamId === "all" ? null : teamId
        });
      if (txErr) throw txErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["print_expenses"] });
      queryClient.invalidateQueries({ queryKey: ["print_expenses_overview"] });
      queryClient.invalidateQueries({ queryKey: ["finance_metrics"] });
      toast.success("Baskı gideri başarıyla kaydedildi.");
      setBaskiModalOpen(false);
      setBaskiQuantity("1");
      setBaskiSelectedProduct("");
      setBaskiAciklama("");
      setBaskiPaidAmount("");
      setBaskiRemainingAmount("");
    },
    onError: (error) => {
      toast.error("Baskı gideri eklenirken hata oluştu: " + error.message);
    }
  });

  const deleteBaskiExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseClient.from("print_expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["print_expenses"] });
      queryClient.invalidateQueries({ queryKey: ["print_expenses_overview"] });
      queryClient.invalidateQueries({ queryKey: ["finance_metrics"] });
      toast.success("Kayıt silindi");
    }
  });

  const editBaskiExpenseMutation = useMutation({
    mutationFn: async (input: { id: string, amount: number, paid: number, desc: string }) => {
      const remaining = input.amount - input.paid;
      const { error } = await supabaseClient.from("print_expenses").update({
        amount: input.amount,
        paid_amount: input.paid,
        remaining_amount: remaining > 0 ? remaining : 0,
        description: input.desc
      }).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["print_expenses"] });
      queryClient.invalidateQueries({ queryKey: ["print_expenses_overview"] });
      queryClient.invalidateQueries({ queryKey: ["finance_metrics"] });
      toast.success("Kayıt güncellendi");
      setBaskiEditModalOpen(false);
    }
  });

  const openBaskiEdit = (tx: any) => {
    setBaskiEditId(tx.id);
    setBaskiEditAmount(String(tx.amount));
    setBaskiEditPaid(String(tx.paidAmount));
    setBaskiEditDesc(tx.desc);
    setBaskiEditModalOpen(true);
  };


  const filteredBaskiTransactions = baskiTransactions
    .filter((tx: any) => tx.desc.toLowerCase().includes(searchQuery.toLowerCase()) || tx.product.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a: any, b: any) => a.desc.localeCompare(b.desc, 'tr'));

  const genelToplam = filteredBaskiTransactions.reduce((sum: number, item: any) => sum + item.amount, 0);
  const totalBaskiPaid = filteredBaskiTransactions.reduce((sum: number, item: any) => sum + item.paidAmount, 0);

  const totalBaskiRemaining = genelToplam - totalBaskiPaid;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full hover:bg-white/10 text-white">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-extrabold text-white">Baskı Detayları</h2>
          <p className="text-sm text-[#9E9696] font-medium mt-1">Baskı giderleri ve işlem geçmişi</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#9E9696]" />
            <Input 
              type="text" 
              placeholder="Baskı ara..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="pl-10 h-11 bg-[#131316] border-white/5 text-white placeholder:text-gray-500 rounded-xl focus-visible:ring-[#A67C52]" 
            />
          </div>
        </div>

        <div className="bg-[#131316] border border-white/5 rounded-3xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-bold text-white text-sm">İşlem Geçmişi</h4>
            <Button size="sm" onClick={() => setBaskiModalOpen(true)} className="bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white font-bold text-xs h-8 rounded-lg px-3">
              <PlusCircle className="w-3.5 h-3.5 mr-1 text-[#A67C52]" /> İşlem Ekle
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#9E9696]">
              <thead className="text-xs uppercase text-[#9E9696] bg-white/5 rounded-t-xl">
                <tr>
                  <th className="px-4 py-3 font-semibold rounded-tl-xl">Tarih</th>
                  <th className="px-4 py-3 font-semibold">Açıklama</th>
                  <th className="px-4 py-3 font-semibold">Ürün/Ölçü</th>
                  <th className="px-4 py-3 font-semibold text-center">Adet</th>
                  <th className="px-4 py-3 font-semibold text-right">Tutar (₺)</th>
                  <th className="px-4 py-3 font-semibold text-right">Ödenen (₺)</th>
                  <th className="px-4 py-3 font-semibold text-right">Kalan (₺)</th>
                  <th className="px-4 py-3 font-semibold text-center rounded-tr-xl">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredBaskiTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-sm font-medium border border-dashed border-white/5 rounded-2xl mt-4 block mx-4">
                      Henüz işlem bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  filteredBaskiTransactions.map((tx: any) => (
                    <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">{tx.date}</td>
                      <td className="px-4 py-3 font-medium text-white">{tx.desc}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{tx.product}</td>
                      <td className="px-4 py-3 text-center font-mono">{tx.quantity}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-[#A67C52]">
                        {tx.amount.toLocaleString()} ₺
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                        {tx.paidAmount.toLocaleString()} ₺
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-rose-400">
                        {(tx.amount - tx.paidAmount).toLocaleString()} ₺
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <Button variant="ghost" size="icon" onClick={() => openBaskiEdit(tx)} className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"><Edit2 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteBaskiExpenseMutation.mutate(tx.id)} disabled={deleteBaskiExpenseMutation.isPending} className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-400/10"><Trash2 className="h-4 w-4" /></Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredBaskiTransactions.length > 0 && (
                <tfoot className="bg-white/5 font-bold text-white border-t border-white/10">
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-right rounded-bl-xl text-lg font-bold text-white">
                      Genel Toplam:
                    </td>
                    <td className="px-4 py-4 text-right text-lg font-bold text-emerald-400">
                      {genelToplam.toLocaleString()} ₺
                    </td>
                    <td className="px-4 py-4 text-right text-lg font-bold text-emerald-400">
                      {totalBaskiPaid.toLocaleString()} ₺
                    </td>
                    <td className="px-4 py-4 text-right text-lg font-bold text-rose-400">
                      {totalBaskiRemaining.toLocaleString()} ₺
                    </td>
                    <td className="px-4 py-4 rounded-br-xl"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
        <div className="p-6 bg-white/[0.02] border-t border-white/5 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center max-w-4xl mx-auto">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 transition-all">
              <span className="text-xs font-semibold text-[#9E9696] uppercase tracking-wider block">TOPLAM ÖDENEN</span>
              <h4 className="font-mono text-2xl font-black text-emerald-400 mt-1.5">{Math.round(totalBaskiPaid).toLocaleString()} ₺</h4>
            </div>
            <div className="p-4 rounded-2xl bg-[#A67C52]/10 border border-[#A67C52]/20 transition-all">
              <span className="text-xs font-semibold text-[#A67C52] uppercase tracking-wider block">TOPLAM KALAN BORÇ</span>
              <h4 className="font-mono text-2xl font-black text-rose-400 mt-1.5">{Math.round(totalBaskiRemaining).toLocaleString()} ₺</h4>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isBaskiModalOpen} onOpenChange={setBaskiModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#111111] text-white border-white/10">
          <DialogHeader>
            <DialogTitle>Baskı Gideri Ekle</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Ürün (Baskı Boyutu)</Label>
              <Select value={baskiSelectedProduct} onValueChange={setBaskiSelectedProduct}>
                <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Ürün seçin..." />
                </SelectTrigger>
                <SelectContent className="bg-[#111111] border-white/10 text-white">
                  {productsForBaski
                    .filter((p: any) => /^\d+x\d+$/i.test(p.name.trim()))
                    .map((p: any) => (
                      <SelectItem key={p.id} value={p.id} className="hover:bg-white/10 focus:bg-white/10 focus:text-white">
                        {p.name} ({p.base_price} ₺)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Adet</Label>
              <Input
                type="number" 
                min="1"
                value={baskiQuantity}
                onChange={(e) => setBaskiQuantity(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label>Açıklama</Label>
              <Input
                type="text"
                placeholder="Hangi okul veya müşteri için?"
                value={baskiAciklama}
                onChange={(e) => setBaskiAciklama(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Ödenen Tutar (₺)</Label>
                <Input
                  type="number" 
                  min="0"
                  value={baskiPaidAmount}
                  onChange={(e) => setBaskiPaidAmount(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Kalan Borç (₺)</Label>
                <Input
                  type="number" step="any"
                  min="0"
                  value={baskiRemainingAmount}
                  onChange={(e) => setBaskiRemainingAmount(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>
            {baskiSelectedProduct && (
              <div className="p-3 bg-[#D0A36D]/10 border border-[#D0A36D]/20 rounded-md mt-2 flex justify-between items-center">
                <span className="text-sm text-gray-300">Toplam Gider:</span>
                <span className="font-bold text-[#D0A36D] text-lg">
                  {(
                    (productsForBaski.find((p: any) => p.id === baskiSelectedProduct)?.base_price || 0) *
                    (parseFloat(baskiQuantity) || 0)
                  ).toLocaleString("tr-TR")} ₺
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              disabled={!baskiSelectedProduct || addBaskiExpenseMutation.isPending || parseFloat(baskiQuantity) < 1 || !baskiAciklama.trim()}
              onClick={() => {
                const p = productsForBaski.find((p: any) => p.id === baskiSelectedProduct);
                if (p) {
                  const total = p.base_price * (parseFloat(baskiQuantity) || 0);
                  const desc = `${p.name} (${parseFloat(baskiQuantity) || 0} Adet) - ${baskiAciklama.trim()}`;
                  addBaskiExpenseMutation.mutate({ amount: total, desc, paid: parseFloat(baskiPaidAmount) || 0, remaining: parseFloat(baskiRemainingAmount) || 0 });
                }
              }}
              className="bg-[#A67C52] text-white hover:bg-[#8b6641] disabled:opacity-50"
            >
              {addBaskiExpenseMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBaskiEditModalOpen} onOpenChange={setBaskiEditModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#111111] text-white border-white/10">
          <DialogHeader>
            <DialogTitle>Baskı İşlemini Düzenle</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Açıklama</Label>
              <Input
                type="text"
                value={baskiEditDesc}
                onChange={(e) => setBaskiEditDesc(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Toplam Tutar (₺)</Label>
                <Input
                  type="number" 
                  min="0"
                  value={baskiEditAmount}
                  onChange={(e) => setBaskiEditAmount(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Ödenen Tutar (₺)</Label>
                <Input
                  type="number" 
                  min="0"
                  value={baskiEditPaid}
                  onChange={(e) => setBaskiEditPaid(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={editBaskiExpenseMutation.isPending || !baskiEditAmount}
              onClick={() => {
                if (baskiEditId) {
                  editBaskiExpenseMutation.mutate({
                    id: baskiEditId,
                    amount: parseFloat(baskiEditAmount) || 0,
                    paid: parseFloat(baskiEditPaid) || 0,
                    desc: baskiEditDesc
                  });
                }
              }}
              className="bg-[#A67C52] text-white hover:bg-[#8b6641] disabled:opacity-50"
            >
              {editBaskiExpenseMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
