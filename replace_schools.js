import fs from 'fs';

const file = 'src/routes/dashboard.finance.tsx';
let text = fs.readFileSync(file, 'utf8');

const target1 = `      const { data: transactions, error: tErr } = await supabaseClient
        .from("school_transactions")
        .select("id, school_id, transaction_type, amount, description, created_at, currency")
        .order("created_at", { ascending: true });
      if (tErr) return schools.map(s => ({ id: s.id, name: s.name, currency: s.currency as any, transactions: [] }));

      console.log("Schools Raw:", schools);
      console.log("School Transactions Raw:", transactions);

      return schools.map((s) => ({`;

const rep1 = `      const { data: transactions, error: tErr } = await supabaseClient
        .from("school_transactions")
        .select("id, school_id, transaction_type, amount, description, created_at, currency")
        .order("created_at", { ascending: true });
      if (tErr) return schools.map(s => ({ id: s.id, name: s.name, currency: s.currency as any, transactions: [] }));

      const { data: orders, error: oErr } = await supabaseClient
        .from("orders")
        .select("id, school_id, package_name, quantity, total_price, order_status, created_at")
        .order("created_at", { ascending: true });
      const ordersData = orders || [];

      return schools.map((s) => ({`;

const target2 = `        transactions: transactions
          .filter((t) => String(t.school_id) === String(s.id))
          .map((t) => ({
            id: t.id,
            date: new Date(t.created_at).toISOString().split("T")[0],
            type: t.transaction_type as "debt" | "payment",
            amount: Number(t.amount),
            desc: t.description ?? "",
            createdAt: t.created_at,
            currency: t.currency
          }))
      }));`;

const rep2 = `        transactions: [
          ...transactions
            .filter((t) => String(t.school_id) === String(s.id) && t.transaction_type === "payment")
            .map((t) => ({
              id: t.id,
              date: new Date(t.created_at).toISOString().split("T")[0],
              type: "payment" as "debt" | "payment",
              amount: Number(t.amount),
              desc: t.description ?? "",
              createdAt: t.created_at,
              currency: t.currency
            })),
          ...ordersData
            .filter((o) => String(o.school_id) === String(s.id))
            .map((o) => ({
              id: o.id,
              date: new Date(o.created_at).toISOString().split("T")[0],
              type: "debt" as "debt" | "payment",
              amount: Number(o.total_price),
              desc: o.package_name ? \`Sipariş: \${o.package_name} (x\${o.quantity})\` : "Okul Siparişi",
              createdAt: o.created_at,
              currency: s.currency
            }))
        ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      }));`;

let patched = text.replace(target1, rep1).replace(target2, rep2);
if (patched === text) {
  console.log("No changes made!");
} else {
  fs.writeFileSync(file, patched, 'utf8');
  console.log("Patched successfully!");
}
