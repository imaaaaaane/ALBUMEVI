import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const loginSchool = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        username: z.string().trim().min(1).max(60),
        password: z.string().min(1).max(100),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { data: schoolId, error } = await supabaseAdmin.rpc("verify_school_password", {
      _username: data.username,
      _password: data.password,
    });
    if (error) throw new Error(error.message);
    if (!schoolId) throw new Error("Invalid username or password");

    const { data: school, error: sErr } = await supabaseAdmin
      .from("schools")
      .select("id, name, unique_link_slug")
      .eq("id", schoolId as unknown as string)
      .single();
    if (sErr || !school) throw new Error("School not found");
    return school;
  });

export const getSchoolBySlug = createServerFn({ method: "GET" })
  .validator((input) => z.object({ slug: z.string().min(1).max(60) }).parse(input))
  .handler(async ({ data }) => {
    const { data: school, error } = await supabaseAdmin
      .from("schools")
      .select("id, name, city, unique_link_slug")
      .eq("unique_link_slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!school) throw new Error("School not found");

    const [{ data: orders }, { data: finance }] = await Promise.all([
      supabaseAdmin
        .from("orders")
        .select("id, package_name, quantity, total_price, order_status, created_at")
        .eq("school_id", school.id)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("finances")
        .select("total_revenue, amount_paid, balance_due, invoice_url")
        .eq("school_id", school.id)
        .maybeSingle(),
    ]);

    return { school, orders: orders ?? [], finance: finance ?? null };
  });

export const createSchoolOrder = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        slug: z.string().min(1).max(60),
        package_name: z.string().trim().min(1).max(120),
        quantity: z.number().int().min(1).max(10000),
        unit_price: z.number().min(0).max(100000),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { data: school, error: sErr } = await supabaseAdmin
      .from("schools")
      .select("id")
      .eq("unique_link_slug", data.slug)
      .maybeSingle();
    if (sErr || !school) throw new Error("School not found");

    const total = data.quantity * data.unit_price;
    const { error } = await supabaseAdmin.from("orders").insert({
      school_id: school.id,
      package_name: data.package_name,
      quantity: data.quantity,
      total_price: total,
      order_status: "Pending",
    });
    if (error) throw new Error(error.message);

    // Bump finance totals so Accounting reflects the new pending invoice
    const { data: fin } = await supabaseAdmin
      .from("finances")
      .select("id, total_revenue, amount_paid")
      .eq("school_id", school.id)
      .maybeSingle();

    if (fin) {
      const newRevenue = Number(fin.total_revenue ?? 0) + total;
      const paid = Number(fin.amount_paid ?? 0);
      await supabaseAdmin
        .from("finances")
        .update({ total_revenue: newRevenue, balance_due: newRevenue - paid })
        .eq("id", fin.id);
    } else {
      await supabaseAdmin.from("finances").insert({
        school_id: school.id,
        total_revenue: total,
        amount_paid: 0,
        balance_due: total,
      });
    }

    return { ok: true };
  });
