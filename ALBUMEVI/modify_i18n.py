import re

with open("src/lib/i18n.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Define the new keys for EN, TR, and AR
tr_add = """    "accounting.employees.title": "Personel Maaşları",
    "accounting.employees.addSupplier": "Personel Ekle",
    "accounting.employees.taken": "Ödenen",
    "accounting.employees.rest": "Kalan Borç",
    "accounting.employees.totalTaken": "Toplam Ödenen",
    "accounting.employees.totalRest": "Toplam Kalan",
    "accounting.employees.fullTotal": "Genel Toplam",
    "accounting.employees.history": "İşlem Geçmişi",
    "accounting.employees.addTransaction": "İşlem Ekle",
    "accounting.common_expenses.title": "Ortak Giderler",
    "accounting.common_expenses.addSupplier": "Gider Ekle",
    "accounting.common_expenses.taken": "Ödenen",
    "accounting.common_expenses.rest": "Kalan Borç",
    "accounting.common_expenses.totalTaken": "Toplam Ödenen",
    "accounting.common_expenses.totalRest": "Toplam Kalan",
    "accounting.common_expenses.fullTotal": "Genel Toplam",
    "accounting.common_expenses.history": "İşlem Geçmişi",
    "accounting.common_expenses.addTransaction": "İşlem Ekle",
"""

en_add = """    "accounting.employees.title": "Employee Salaries",
    "accounting.employees.addSupplier": "Add Employee",
    "accounting.employees.taken": "Paid",
    "accounting.employees.rest": "Remaining Debt",
    "accounting.employees.totalTaken": "Total Paid",
    "accounting.employees.totalRest": "Total Remaining",
    "accounting.employees.fullTotal": "Grand Total",
    "accounting.employees.history": "Transaction History",
    "accounting.employees.addTransaction": "Add Transaction",
    "accounting.common_expenses.title": "Common Expenses",
    "accounting.common_expenses.addSupplier": "Add Expense",
    "accounting.common_expenses.taken": "Paid",
    "accounting.common_expenses.rest": "Remaining Debt",
    "accounting.common_expenses.totalTaken": "Total Paid",
    "accounting.common_expenses.totalRest": "Total Remaining",
    "accounting.common_expenses.fullTotal": "Grand Total",
    "accounting.common_expenses.history": "Transaction History",
    "accounting.common_expenses.addTransaction": "Add Transaction",
"""

ar_add = """    "accounting.employees.title": "رواتب الموظفين",
    "accounting.employees.addSupplier": "إضافة موظف",
    "accounting.employees.taken": "المدفوع",
    "accounting.employees.rest": "الدين المتبقي",
    "accounting.employees.totalTaken": "إجمالي المدفوع",
    "accounting.employees.totalRest": "إجمالي المتبقي",
    "accounting.employees.fullTotal": "المجموع الكلي",
    "accounting.employees.history": "سجل المعاملات",
    "accounting.employees.addTransaction": "إضافة معاملة",
    "accounting.common_expenses.title": "النفقات المشتركة",
    "accounting.common_expenses.addSupplier": "إضافة نفقة",
    "accounting.common_expenses.taken": "المدفوع",
    "accounting.common_expenses.rest": "الدين المتبقي",
    "accounting.common_expenses.totalTaken": "إجمالي المدفوع",
    "accounting.common_expenses.totalRest": "إجمالي المتبقي",
    "accounting.common_expenses.fullTotal": "المجموع الكلي",
    "accounting.common_expenses.history": "سجل المعاملات",
    "accounting.common_expenses.addTransaction": "إضافة معاملة",
"""

en_end = content.find('  AR: {')
if en_end != -1:
    content = content[:en_end-2] + en_add + content[en_end-2:]

ar_end = content.find('  TR: {')
if ar_end != -1:
    content = content[:ar_end-2] + ar_add + content[ar_end-2:]

tr_end = content.find('};\n\ninterface Ctx')
if tr_end != -1:
    content = content[:tr_end-2] + tr_add + content[tr_end-2:]

with open("src/lib/i18n.tsx", "w", encoding="utf-8") as f:
    f.write(content)
