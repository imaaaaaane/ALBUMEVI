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
    let query = client
      .from(table)
      .select(selectColumns)
      .range(from, from + PAGE_SIZE - 1);
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
  const INVALID_TOKENS = new Set(["", "null", "undefined", "false", "none", "[]", "{}"]);

  if (!rawSelection) return [];
  if (Array.isArray(rawSelection)) {
    return rawSelection
      .map((v) => String(v ?? "").trim())
      .filter((v) => !INVALID_TOKENS.has(v.toLowerCase()));
  }
  if (typeof rawSelection === "object") {
    return Object.entries(rawSelection as Record<string, unknown>)
      .filter(([, val]) => Boolean(val))
      .map(([k]) => k.trim())
      .filter((v) => !INVALID_TOKENS.has(v.toLowerCase()));
  }
  if (typeof rawSelection === "string") {
    const trimmed = rawSelection.trim();
    if (INVALID_TOKENS.has(trimmed.toLowerCase())) return [];
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .map((v) => String(v ?? "").trim())
            .filter((v) => !INVALID_TOKENS.has(v.toLowerCase()));
        }
      } catch {
        // Fall through to comma-separated parsing
      }
    }
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return Object.entries(parsed as Record<string, unknown>)
            .filter(([, val]) => Boolean(val))
            .map(([k]) => k.trim())
            .filter((v) => !INVALID_TOKENS.has(v.toLowerCase()));
        }
      } catch {
        // Fall through to comma-separated parsing
      }
    }
    return trimmed
      .split(",")
      .map((v) => v.trim())
      .filter((v) => !INVALID_TOKENS.has(v.toLowerCase()));
  }
  return [];
}

/**
 * Parses `students.note` across both package-keyed JSON maps
 * (e.g. `{"<productId>":"Not..."}`) and legacy plain-text strings.
 */
export function parsePackageNotes(rawNote: unknown): {
  byPackage: Record<string, string>;
  plainNote: string | null;
} {
  if (!rawNote) {
    return { byPackage: {}, plainNote: null };
  }

  if (typeof rawNote === "object" && !Array.isArray(rawNote)) {
    const byPackage: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawNote as Record<string, unknown>)) {
      if (typeof v === "string" && v.trim() !== "") {
        byPackage[k.trim()] = v.trim();
      }
    }
    return { byPackage, plainNote: null };
  }

  if (typeof rawNote === "string") {
    const trimmed = rawNote.trim();
    if (!trimmed) {
      return { byPackage: {}, plainNote: null };
    }

    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
          const byPackage: Record<string, string> = {};
          for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
            if (typeof v === "string" && v.trim() !== "") {
              byPackage[k.trim()] = v.trim();
            }
          }
          return { byPackage, plainNote: null };
        }
      } catch {
        // Fall through to legacy plain-text note
      }
    }

    return { byPackage: {}, plainNote: trimmed };
  }

  return { byPackage: {}, plainNote: null };
}

/**
 * Serializes package-scoped notes strictly for currently selected packages.
 * Returns "" when no selected package has a note.
 */
export function serializePackageNotes(
  selectedPackageIds: string[],
  notesByPackage: Record<string, string>,
): string {
  const uniquePkgIds = Array.from(
    new Set((selectedPackageIds || []).map((id) => String(id ?? "").trim()).filter(Boolean)),
  );
  const cleaned: Record<string, string> = {};

  for (const pkgId of uniquePkgIds) {
    const val = (notesByPackage?.[pkgId] ?? "").trim();
    if (val) {
      cleaned[pkgId] = val;
    }
  }

  if (Object.keys(cleaned).length === 0) {
    return "";
  }

  return JSON.stringify(cleaned);
}

/**
 * Resolves the note strictly belonging to `targetPackage` so notes from one
 * package never bleed onto another package.
 */
export function resolveNoteForPackage(
  rawNote: unknown,
  targetPackage: { id: string; name: string; rawToken?: string },
  allMatchedPackages: Array<{ id: string; name: string; rawToken?: string }>,
): string | null {
  const { byPackage, plainNote } = parsePackageNotes(rawNote);

  if (Object.keys(byPackage).length > 0) {
    if (byPackage[targetPackage.id]) {
      return byPackage[targetPackage.id];
    }
    if (targetPackage.rawToken && byPackage[targetPackage.rawToken]) {
      return byPackage[targetPackage.rawToken];
    }
    const normTargetName = (targetPackage.name || "").trim().toLocaleLowerCase("tr-TR");
    if (normTargetName) {
      for (const [k, v] of Object.entries(byPackage)) {
        if (k.trim().toLocaleLowerCase("tr-TR") === normTargetName && v) {
          return v;
        }
      }
    }
    return null;
  }

  if (!plainNote) {
    return null;
  }

  // Legacy plain-text note: if the student only selected a single package, it belongs to that package.
  if (allMatchedPackages.length <= 1) {
    return plainNote;
  }

  // Legacy plain-text note on a multi-package student: match package name or distinct keywords
  // if mentioned, otherwise scope strictly to the first selected package so it never duplicates.
  const normPlain = plainNote.toLocaleLowerCase("tr-TR");
  const packagesMentioned = allMatchedPackages.filter((pkg) => {
    const n = (pkg.name || "").trim().toLocaleLowerCase("tr-TR");
    return n.length > 0 && normPlain.includes(n);
  });

  if (packagesMentioned.length === 1) {
    return packagesMentioned[0].id === targetPackage.id ? plainNote : null;
  }

  const keywordMatched = allMatchedPackages.filter((pkg) => {
    const keywords = (pkg.name || "")
      .toLocaleLowerCase("tr-TR")
      .replace(/[()[\]{},./\\-]+/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && w !== "paket");
    return keywords.some((kw) => normPlain.includes(kw));
  });

  if (keywordMatched.length === 1) {
    return keywordMatched[0].id === targetPackage.id ? plainNote : null;
  }

  return allMatchedPackages[0]?.id === targetPackage.id ? plainNote : null;
}
