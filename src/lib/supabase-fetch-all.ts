/**
 * Fetches 100% of rows from a Supabase table using range pagination
 * so PostgREST's default 1,000-row limit never truncates results,
 * with zero status, active, or date filters applied.
 */
export async function fetchAllRows<T = any>(
  client: any,
  table: string,
  selectColumns = "*",
  orderColumn?: string,
  ascending = true,
): Promise<T[]> {
  const PAGE_SIZE = 1000;
  const allRows: T[] = [];
  let from = 0;

  while (true) {
    let query = client.from(table).select(selectColumns).range(from, from + PAGE_SIZE - 1);
    if (orderColumn) {
      query = query.order(orderColumn, { ascending });
    }
    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allRows;
}

/**
 * Safely fetches 100% of rows from a table, returning an empty array if the
 * table does not exist or cannot be read so callers never drop other data.
 */
export async function fetchAllRowsSafe<T = any>(
  client: any,
  table: string,
  selectColumns = "*",
  orderColumn?: string,
  ascending = true,
): Promise<T[]> {
  try {
    return await fetchAllRows<T>(client, table, selectColumns, orderColumn, ascending);
  } catch (err) {
    console.warn(`[fetchAllRowsSafe] Failed to fetch ${table}:`, err);
    return [];
  }
}

/**
 * Parses student package selection values across all historical formats
 * (comma-separated UUIDs, JSON arrays, legacy "paket1"/"paket2" keys).
 */
export function parseSelectionTokens(rawSelection: unknown): string[] {
  if (!rawSelection) return [];
  if (Array.isArray(rawSelection)) {
    return rawSelection.map((v) => String(v ?? "").trim()).filter(Boolean);
  }
  if (typeof rawSelection === "string") {
    const trimmed = rawSelection.trim();
    if (!trimmed || trimmed === "null" || trimmed === "[]") return [];
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((v) => String(v ?? "").trim()).filter(Boolean);
        }
      } catch {
        // Fall through to comma-separated parsing
      }
    }
    return trimmed
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}
