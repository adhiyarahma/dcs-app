import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/app/lib/supabase";
import DashboardClient from "@/app/ui/dashboard-client";

async function getDashboardData() {
  const today = new Date();
  const in30Days = new Date(today);
  in30Days.setDate(today.getDate() + 30);

  const twelveMonthsAgo = new Date(
    today.getFullYear(),
    today.getMonth() - 11,
    1
  );

  // Fetch semua distribusi 12 bulan terakhir untuk monthly aggregation (tanpa limit)
  async function fetchAllDistributions() {
    const PAGE = 1000;
    let all: any[] = [];
    let from = 0;
    while (true) {
      const { data } = await supabaseAdmin
        .from("distributions")
        .select(
          `id, form_number, distributed_date, created_at,
          departments!distributions_handed_by_dept_id_fkey(code, name),
          distribution_items(id)`
        )
        .gte("created_at", twelveMonthsAgo.toISOString())
        .order("created_at", { ascending: false })
        .range(from, from + PAGE - 1);
      if (!data || data.length === 0) break;
      all = [...all, ...data];
      if (data.length < PAGE) break;
      from += PAGE;
    }
    return all;
  }

  const [
    { data: docStats },
    { data: expiringDocs },
    { data: recentDocs },
    { data: categoryStats },
    { data: monthlyDocs },
    allDists,
  ] = await Promise.all([
    supabaseAdmin
      .from("documents")
      .select("status")
      .in("status", ["terbaru", "kadaluarsa"]),

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

    supabaseAdmin
      .from("documents")
      .select("category_id, status, categories!inner(name)")
      .in("status", ["terbaru", "kadaluarsa"]),

    supabaseAdmin
      .from("documents")
      .select("created_at")
      .in("status", ["terbaru", "kadaluarsa"])
      .gte("created_at", twelveMonthsAgo.toISOString())
      .order("created_at", { ascending: true }),

    fetchAllDistributions(),
  ]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalDocs = docStats?.length ?? 0;
  const activeDocs =
    docStats?.filter((d) => d.status === "terbaru").length ?? 0;

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
  (categoryStats ?? []).forEach((d: any) => {
    const key = d.category_id;
    const name = d.categories?.name ?? "Lainnya";
    if (!catMap.has(key)) catMap.set(key, { name, count: 0 });
    catMap.get(key)!.count++;
  });
  const categoryData = Array.from(catMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // ── Build 12-month keys ───────────────────────────────────────────────────
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
  const monthKeys: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    monthKeys.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }

  const docMonthMap = new Map<string, number>(monthKeys.map((k) => [k, 0]));
  (monthlyDocs ?? []).forEach((d: any) => {
    const dt = new Date(d.created_at);
    const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
    if (docMonthMap.has(k)) docMonthMap.set(k, docMonthMap.get(k)! + 1);
  });

  const distMonthMap = new Map<string, number>(monthKeys.map((k) => [k, 0]));
  allDists.forEach((d: any) => {
    const dt = new Date(d.created_at);
    const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
    if (distMonthMap.has(k)) distMonthMap.set(k, distMonthMap.get(k)! + 1);
  });

  const trendLabels = monthKeys.map(
    (k) => MONTH_ID[parseInt(k.split("-")[1]) - 1]
  );
  const trendDocs = monthKeys.map((k) => docMonthMap.get(k)!);
  const trendDists = monthKeys.map((k) => distMonthMap.get(k)!);

  // ── Month-over-month delta ────────────────────────────────────────────────
  const thisMonthKey = monthKeys[11];
  const lastMonthKey = monthKeys[10];
  const distThisMonth = distMonthMap.get(thisMonthKey) ?? 0;
  const distDelta =
    (distMonthMap.get(thisMonthKey) ?? 0) -
    (distMonthMap.get(lastMonthKey) ?? 0);
  const docDelta =
    (docMonthMap.get(thisMonthKey) ?? 0) - (docMonthMap.get(lastMonthKey) ?? 0);

  // ── Activity feed (gabung dokumen + distribusi, sort by time) ─────────────
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
      expiringSoonCount: expiringSoon.length,
      distThisMonth,
      distDelta,
      docDelta,
      activePercent:
        totalDocs > 0 ? Math.round((activeDocs / totalDocs) * 100) : 0,
    },
    expiringSoon,
    categoryData,
    trendLabels,
    trendDocs,
    trendDists,
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
