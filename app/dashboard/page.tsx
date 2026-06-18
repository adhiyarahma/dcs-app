import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/app/lib/supabase";
import DashboardClient from "@/app/ui/dashboard-client";

const MONTH_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

async function getDashboardData() {
  const today = new Date();
  const in30Days = new Date(today);
  in30Days.setDate(today.getDate() + 30);

  const currentYear = today.getFullYear();
  // Ambil 4 tahun terakhir (termasuk tahun ini) untuk opsi perbandingan tahun.
  const YEARS_BACK = 4;
  const availableYears = Array.from(
    { length: YEARS_BACK },
    (_, i) => currentYear - i
  ); // contoh: [2026, 2025, 2024, 2023]
  const earliestYear = availableYears[availableYears.length - 1];
  const rangeStart = `${earliestYear}-01-01`;

  const PAGE = 1000;

  // ── Generic paginator ─────────────────────────────────────────────────────
  async function paginateAll<T>(
    buildQuery: (
      from: number,
      to: number
    ) => Promise<{ data: T[] | null; error?: any }>
  ): Promise<T[]> {
    let all: T[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await buildQuery(from, from + PAGE - 1);
      if (error) {
        console.error("[paginateAll] code:", error.code);
        console.error("[paginateAll] message:", error.message);
        console.error("[paginateAll] hint:", error.hint);
        break;
      }
      if (!data || data.length === 0) break;
      all = [...all, ...data];
      if (data.length < PAGE) break;
      from += PAGE;
    }
    return all;
  }

  // ── Fetch semua dokumen aktif/kadaluarsa (untuk stats, category, & dept) ──
  const allDocStats = await paginateAll<{
    status: string;
    category_id: string;
    department_id: string | null;
    categories: { name: string } | null;
    departments: { code: string; name: string } | null;
  }>(
    (from, to) =>
      supabaseAdmin
        .from("documents")
        .select(
          "status, category_id, department_id, categories!inner(name), departments(code, name)"
        )
        .in("status", ["terbaru", "kadaluarsa"])
        .range(from, to) as any
  );

  // ── Fetch dokumen untuk monthly trend, sekarang dari awal earliestYear ────
  // (sebelumnya hanya 12 bulan terakhir; sekarang diperluas agar mode
  // perbandingan multi-tahun punya cukup data historis)
  const allMonthlyDocs = await paginateAll<{ effective_date: string }>(
    (from, to) =>
      supabaseAdmin
        .from("documents")
        .select("effective_date")
        .in("status", ["terbaru", "kadaluarsa"])
        .not("effective_date", "is", null)
        .gte("effective_date", rangeStart)
        .order("effective_date", { ascending: true })
        .range(from, to) as any
  );

  // ── Fetch distribusi dari awal earliestYear, plus data recipient untuk top dept
  const allDists = await paginateAll<any>(
    (from, to) =>
      supabaseAdmin
        .from("distributions")
        .select(
          `id, form_number, distributed_date, created_at,
          departments!distributions_handed_by_dept_id_fkey(code, name),
          distribution_items(
            id,
            distribution_recipients(id, qty, dept_id, departments!distribution_recipients_dept_id_fkey(code, name))
          )`
        )
        .gte("distributed_date", rangeStart)
        .order("distributed_date", { ascending: false })
        .range(from, to) as any
  );

  // ── Fetch SEMUA dokumen (termasuk dihapus) untuk hitung jumlah revisi ─────
  // Dihitung dari doc_number yang sama -> makin banyak baris, makin sering direvisi.
  // Catatan: ini termasuk dokumen dengan status apapun, karena revisi lama
  // biasanya berstatus "kadaluarsa", bukan "dihapus".
  const allDocsForRevision = await paginateAll<{
    doc_number: string | null;
    title: string;
    category_id: string;
    categories: { name: string } | null;
  }>(
    (from, to) =>
      supabaseAdmin
        .from("documents")
        .select("doc_number, title, category_id, categories!inner(name)")
        .not("doc_number", "is", null)
        .in("status", ["terbaru", "kadaluarsa"])
        .range(from, to) as any
  );

  // ── Query non-paginated (sudah di-limit by design) ────────────────────────
  const [{ data: expiringDocs }, { data: recentDocs }] = await Promise.all([
    supabaseAdmin
      .from("documents")
      .select(
        `id, doc_number, title, expiry_date, status,
        departments(code),
        categories(name)`
      )
      .eq("status", "terbaru")
      .not("expiry_date", "is", null)
      .lte("expiry_date", in30Days.toISOString().split("T")[0])
      .gte("expiry_date", today.toISOString().split("T")[0])
      .order("expiry_date", { ascending: true })
      .limit(8),

    supabaseAdmin
      .from("documents")
      .select(
        `id, doc_number, title, status, created_at, updated_at,
        categories(name),
        users(name)`
      )
      .in("status", ["terbaru", "kadaluarsa"])
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalDocs = allDocStats.length;
  const activeDocs = allDocStats.filter((d) => d.status === "terbaru").length;
  const expiredDocs = allDocStats.filter(
    (d) => d.status === "kadaluarsa"
  ).length;

  const expiringSoon = (expiringDocs ?? []).map((d: any) => {
    const diffDays = Math.ceil(
      (new Date(d.expiry_date).getTime() - today.getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return {
      id: d.id,
      doc_number: d.doc_number,
      title: d.title,
      expiry_date: d.expiry_date,
      days_left: diffDays,
      dept_code: d.departments?.code ?? "",
      category_name: d.categories?.name ?? "",
    };
  });

  // ── Category breakdown ────────────────────────────────────────────────────
  const catMap = new Map<string, { name: string; count: number }>();
  allDocStats.forEach((d: any) => {
    const key = d.category_id;
    const name = d.categories?.name ?? "Lainnya";
    if (!catMap.has(key)) catMap.set(key, { name, count: 0 });
    catMap.get(key)!.count++;
  });
  const categoryData = Array.from(catMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // ── Department breakdown ──────────────────────────────────────────────────
  // Hanya dokumen yang punya department_id (umumnya QESH). Diurutkan terbanyak.
  const deptMap = new Map<
    string,
    { code: string; name: string; count: number }
  >();
  allDocStats.forEach((d: any) => {
    if (!d.department_id || !d.departments) return;
    const key = d.department_id;
    if (!deptMap.has(key))
      deptMap.set(key, {
        code: d.departments.code,
        name: d.departments.name,
        count: 0,
      });
    deptMap.get(key)!.count++;
  });
  const departmentData = Array.from(deptMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // ── Dokumen paling sering direvisi ────────────────────────────────────────
  // Hitung jumlah baris per doc_number (setiap baris = satu revisi/versi),
  // lalu ambil top N dengan jumlah revisi terbanyak (>1, karena revisi=1 berarti
  // dokumen itu belum pernah direvisi).
  const revisionMap = new Map<
    string,
    { title: string; category_name: string; count: number }
  >();
  allDocsForRevision.forEach((d: any) => {
    if (!d.doc_number) return;
    const key = d.doc_number;
    if (!revisionMap.has(key))
      revisionMap.set(key, {
        title: d.title,
        category_name: d.categories?.name ?? "",
        count: 0,
      });
    revisionMap.get(key)!.count++;
  });
  const mostRevisedDocs = Array.from(revisionMap.entries())
    .map(([doc_number, v]) => ({ doc_number, ...v }))
    .filter((d) => d.count > 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // ── Top departemen penerima distribusi ────────────────────────────────────
  const recipientDeptMap = new Map<
    string,
    { code: string; name: string; qty: number; formCount: number }
  >();
  allDists.forEach((d: any) => {
    (d.distribution_items ?? []).forEach((item: any) => {
      (item.distribution_recipients ?? []).forEach((r: any) => {
        if (!r.dept_id || !r.departments) return;
        const key = r.dept_id;
        if (!recipientDeptMap.has(key))
          recipientDeptMap.set(key, {
            code: r.departments.code,
            name: r.departments.name,
            qty: 0,
            formCount: 0,
          });
        const entry = recipientDeptMap.get(key)!;
        entry.qty += r.qty ?? 0;
        entry.formCount += 1;
      });
    });
  });
  const topRecipientDepartments = Array.from(recipientDeptMap.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 6);

  // ── Build month keys per tahun (untuk trend & perbandingan) ───────────────
  // docByYearMonth[year] = number[12] (index 0 = Jan, index 11 = Des)
  function emptyYearMap(): Map<number, number[]> {
    const m = new Map<number, number[]>();
    availableYears.forEach((y) => m.set(y, new Array(12).fill(0)));
    return m;
  }

  const docByYearMonth = emptyYearMap();
  allMonthlyDocs.forEach((d: any) => {
    const y = parseInt(d.effective_date.slice(0, 4));
    const m = parseInt(d.effective_date.slice(5, 7)) - 1;
    if (docByYearMonth.has(y)) docByYearMonth.get(y)![m] += 1;
  });

  const distByYearMonth = emptyYearMap();
  allDists.forEach((d: any) => {
    const y = parseInt(d.distributed_date.slice(0, 4));
    const m = parseInt(d.distributed_date.slice(5, 7)) - 1;
    if (distByYearMonth.has(y)) distByYearMonth.get(y)![m] += 1;
  });

  // Format akhir untuk dikonsumsi client: per tahun, array 12 bulan.
  const trendByYear = availableYears.map((y) => ({
    year: y,
    docs: docByYearMonth.get(y) ?? new Array(12).fill(0),
    dists: distByYearMonth.get(y) ?? new Array(12).fill(0),
  }));

  // ── Trend "rolling 12 bulan" (mode default, sebelum user pilih tahun) ─────
  const monthKeys: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    monthKeys.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }
  const docMonthMap = new Map<string, number>(monthKeys.map((k) => [k, 0]));
  allMonthlyDocs.forEach((d: any) => {
    const k = d.effective_date.slice(0, 7);
    if (docMonthMap.has(k)) docMonthMap.set(k, docMonthMap.get(k)! + 1);
  });
  const distMonthMap = new Map<string, number>(monthKeys.map((k) => [k, 0]));
  allDists.forEach((d: any) => {
    const k = d.distributed_date.slice(0, 7);
    if (distMonthMap.has(k)) distMonthMap.set(k, distMonthMap.get(k)! + 1);
  });
  const trendLabels = monthKeys.map(
    (k) => MONTH_ID[parseInt(k.split("-")[1]) - 1]
  );
  const trendDocs = monthKeys.map((k) => docMonthMap.get(k)!);
  const trendDists = monthKeys.map((k) => distMonthMap.get(k)!);

  // ── Month-over-month delta (tetap dihitung dari rolling 12 bulan) ─────────
  const thisMonthKey = monthKeys[11];
  const lastMonthKey = monthKeys[10];
  const distThisMonth = distMonthMap.get(thisMonthKey) ?? 0;
  const distDelta =
    (distMonthMap.get(thisMonthKey) ?? 0) -
    (distMonthMap.get(lastMonthKey) ?? 0);
  const docDelta =
    (docMonthMap.get(thisMonthKey) ?? 0) - (docMonthMap.get(lastMonthKey) ?? 0);

  // ── Total distribusi semua waktu (yang ter-fetch, dari earliestYear) ──────
  const totalDists = allDists.length;

  // ── Year-over-year total (untuk ringkasan banner perbandingan tahun) ──────
  const yearTotals = trendByYear.map((t) => ({
    year: t.year,
    totalDocs: t.docs.reduce((a, b) => a + b, 0),
    totalDists: t.dists.reduce((a, b) => a + b, 0),
  }));

  // ── Activity feed ─────────────────────────────────────────────────────────
  type ActivityEvent = {
    type: "doc_created" | "distribution";
    id: string;
    label: string;
    sub: string;
    timestamp: string;
  };

  const activities: ActivityEvent[] = [];

  (recentDocs ?? []).forEach((d: any) => {
    activities.push({
      type: "doc_created",
      id: d.id,
      label: `Dokumen ${d.doc_number} ditambahkan`,
      sub: `${d.categories?.name ?? ""} · oleh ${d.users?.name ?? "sistem"}`,
      timestamp: d.created_at,
    });
  });

  allDists.slice(0, 10).forEach((d: any) => {
    const itemCount = d.distribution_items?.length ?? 0;
    activities.push({
      type: "distribution",
      id: d.id,
      label: `Form ${d.form_number} dibuat`,
      sub: `${itemCount} dok · dari ${d.departments?.code ?? "DCC"}`,
      timestamp: d.created_at,
    });
  });

  activities.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return {
    stats: {
      totalDocs,
      activeDocs,
      expiredDocs,
      expiringSoonCount: expiringSoon.length,
      distThisMonth,
      totalDists,
      distDelta,
      docDelta,
      activePercent:
        totalDocs > 0 ? Math.round((activeDocs / totalDocs) * 100) : 0,
    },
    expiringSoon,
    categoryData,
    departmentData,
    mostRevisedDocs,
    topRecipientDepartments,
    trendLabels,
    trendDocs,
    trendDists,
    trendByYear, // [{ year, docs: number[12], dists: number[12] }]
    yearTotals, // [{ year, totalDocs, totalDists }]
    availableYears,
    monthLabels: MONTH_ID,
    activities: activities.slice(0, 7),
  };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const data = await getDashboardData();
  const userName = (session.user as any)?.name ?? "";

  return (
    <div className="max-w-8xl mx-auto py-2 px-4">
      <DashboardClient data={data} userName={userName} />
    </div>
  );
}
