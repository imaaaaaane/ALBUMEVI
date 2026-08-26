import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "school";

// ───────── Schools ─────────
export const listSchools = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("schools")
    .select("id, name, city, login_username, unique_link_slug, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const addSchool = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        name: z.string().trim().min(1).max(120),
        city: z.string().trim().max(80).optional().default(""),
        login_username: z
          .string()
          .trim()
          .min(3)
          .max(60)
          .regex(/^[a-zA-Z0-9_.-]+$/),
        password: z.string().min(6).max(100),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const base = slugify(data.name);
    const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;

    const { data: hashRes, error: hashErr } = await supabaseAdmin.rpc("hash_password", {
      plain: data.password,
    });
    if (hashErr) throw new Error(hashErr.message);

    const { data: row, error } = await supabaseAdmin
      .from("schools")
      .insert({
        name: data.name,
        city: data.city || null,
        login_username: data.login_username,
        password_hash: hashRes as unknown as string,
        unique_link_slug: slug,
      })
      .select("id, name, city, login_username, unique_link_slug, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ───────── Orders ─────────
export const listOrders = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(
      "id, school_id, package_name, quantity, total_price, order_status, created_at, schools(name)",
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((o: any) => ({
    ...o,
    school_name: o.schools?.name ?? "—",
  }));
});

export const updateOrderStatus = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["Pending", "Processing", "Completed", "Shipped"]),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ order_status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteOrder = createServerFn({ method: "POST" })
  .validator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("orders").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ───────── Inventory ─────────
export const listInventory = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("inventory")
    .select("id, item_name, stock_count, unit_price, created_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const addInventory = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        item_name: z.string().trim().min(1).max(120),
        unit_price: z.number().min(0).max(100000),
        stock_count: z.number().int().min(0).max(1000000),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("inventory")
      .insert({
        item_name: data.item_name,
        unit_price: data.unit_price,
        stock_count: data.stock_count,
      })
      .select("id, item_name, stock_count, unit_price, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ───────── Finance ─────────
export const getFinanceSummary = createServerFn({ method: "GET" }).handler(async () => {
  const [{ data: orders, error: oErr }, { data: txs, error: fErr }] = await Promise.all([
    supabaseAdmin.from("orders").select("total_price, order_status"),
    (supabaseAdmin as any).from("school_transactions").select("amount, type"),
  ]);
  if (oErr) throw new Error(oErr.message);
  if (fErr) throw new Error(fErr.message);

  const totalRevenue = (orders ?? []).reduce((s: number, o: any) => s + Number(o.total_price ?? 0), 0);
  const totalPaid = (txs ?? []).reduce((s: number, t: any) => s + (t.type === 'payment' ? Number(t.amount ?? 0) : 0), 0);
  const balanceDue = totalRevenue - totalPaid;
  const pendingOrders = (orders ?? []).filter((o: any) => o.order_status !== "Completed").length;

  return {
    totalRevenue,
    totalPaid,
    balanceDue,
    pendingOrders,
    invoices: [],
  };
});
