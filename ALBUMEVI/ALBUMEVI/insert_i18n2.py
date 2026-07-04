with open("src/lib/i18n.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

en_add = [
    '    "accounting.employees.title": "Employee Salaries",\n',
    '    "accounting.employees.addSupplier": "Add Employee",\n',
    '    "accounting.employees.taken": "Paid",\n',
    '    "accounting.employees.rest": "Remaining Debt",\n',
    '    "accounting.employees.totalTaken": "Total Paid",\n',
    '    "accounting.employees.totalRest": "Total Remaining",\n',
    '    "accounting.employees.fullTotal": "Grand Total",\n',
    '    "accounting.employees.history": "Transaction History",\n',
    '    "accounting.employees.addTransaction": "Add Transaction",\n',
    '    "accounting.common_expenses.title": "Common Expenses",\n',
    '    "accounting.common_expenses.addSupplier": "Add Expense",\n',
    '    "accounting.common_expenses.taken": "Paid",\n',
    '    "accounting.common_expenses.rest": "Remaining Debt",\n',
    '    "accounting.common_expenses.totalTaken": "Total Paid",\n',
    '    "accounting.common_expenses.totalRest": "Total Remaining",\n',
    '    "accounting.common_expenses.fullTotal": "Grand Total",\n',
    '    "accounting.common_expenses.history": "Transaction History",\n',
    '    "accounting.common_expenses.addTransaction": "Add Transaction",\n'
]

ar_add = [
    '    "accounting.employees.title": "رواتب الموظفين",\n',
    '    "accounting.employees.addSupplier": "إضافة موظف",\n',
    '    "accounting.employees.taken": "المدفوع",\n',
    '    "accounting.employees.rest": "الدين المتبقي",\n',
    '    "accounting.employees.totalTaken": "إجمالي المدفوع",\n',
    '    "accounting.employees.totalRest": "إجمالي المتبقي",\n',
    '    "accounting.employees.fullTotal": "المجموع الكلي",\n',
    '    "accounting.employees.history": "سجل المعاملات",\n',
    '    "accounting.employees.addTransaction": "إضافة معاملة",\n',
    '    "accounting.common_expenses.title": "النفقات المشتركة",\n',
    '    "accounting.common_expenses.addSupplier": "إضافة نفقة",\n',
    '    "accounting.common_expenses.taken": "المدفوع",\n',
    '    "accounting.common_expenses.rest": "الدين المتبقي",\n',
    '    "accounting.common_expenses.totalTaken": "إجمالي المدفوع",\n',
    '    "accounting.common_expenses.totalRest": "إجمالي المتبقي",\n',
    '    "accounting.common_expenses.fullTotal": "المجموع الكلي",\n',
    '    "accounting.common_expenses.history": "سجل المعاملات",\n',
    '    "accounting.common_expenses.addTransaction": "إضافة معاملة",\n'
]

tr_add = [
    '    "accounting.employees.title": "Personel Maaşları",\n',
    '    "accounting.employees.addSupplier": "Personel Ekle",\n',
    '    "accounting.employees.taken": "Ödenen",\n',
    '    "accounting.employees.rest": "Kalan Borç",\n',
    '    "accounting.employees.totalTaken": "Toplam Ödenen",\n',
    '    "accounting.employees.totalRest": "Toplam Kalan",\n',
    '    "accounting.employees.fullTotal": "Genel Toplam",\n',
    '    "accounting.employees.history": "İşlem Geçmişi",\n',
    '    "accounting.employees.addTransaction": "İşlem Ekle",\n',
    '    "accounting.common_expenses.title": "Ortak Giderler",\n',
    '    "accounting.common_expenses.addSupplier": "Gider Ekle",\n',
    '    "accounting.common_expenses.taken": "Ödenen",\n',
    '    "accounting.common_expenses.rest": "Kalan Borç",\n',
    '    "accounting.common_expenses.totalTaken": "Toplam Ödenen",\n',
    '    "accounting.common_expenses.totalRest": "Toplam Kalan",\n',
    '    "accounting.common_expenses.fullTotal": "Genel Toplam",\n',
    '    "accounting.common_expenses.history": "İşlem Geçmişi",\n',
    '    "accounting.common_expenses.addTransaction": "İşlem Ekle",\n'
]

new_lines = []
for i, line in enumerate(lines):
    if line.strip() == "AR: {":
        # Insert EN entries right before "  AR: {" (which should be preceded by "  },")
        # We need to insert before the preceding "  },"
        # Wait, the preceding line is "  },"
        # Let's just pop the last line if it's "  }," and insert the new lines + "  },"
        if new_lines[-1].strip() == "},":
            last = new_lines.pop()
            new_lines.extend(en_add)
            new_lines.append(last)
        
    elif line.strip() == "TR: {":
        if new_lines[-1].strip() == "},":
            last = new_lines.pop()
            new_lines.extend(ar_add)
            new_lines.append(last)
            
    elif line.strip() == "};":
        # This is the end of the translations object
        # Wait, the preceding line might be "  }" for the TR block
        if new_lines[-1].strip() == "}" or new_lines[-1].strip() == "},":
            # the last line is "  }" which closes TR
            last = new_lines.pop()
            new_lines.extend(tr_add)
            new_lines.append(last)
            
    new_lines.append(line)

with open("src/lib/i18n.tsx", "w", encoding="utf-8") as f:
    f.writelines(new_lines)
