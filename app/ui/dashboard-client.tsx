"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  InboxArrowDownIcon,
  BuildingOffice2Icon,
  ArrowPathRoundedSquareIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";

type ActivityEvent = {
  type: "doc_created" | "distribution";
  id: string;
  label: string;
  sub: string;
  timestamp: string;
};

type YearTrend = { year: number; docs: number[]; dists: number[] };
type YearTotal = { year: number; totalDocs: number; totalDists: number };
type DeptBreakdown = { code: string; name: string; count: number };
type RevisedDoc = {
  doc_number: string;
  title: string;
  category_name: string;
  count: number;
};
type RecipientDept = {
  code: string;
  name: string;
  qty: number;
  formCount: number;
};

type DashboardData = {
  stats: {
    totalDocs: number;
    activeDocs: number;
    expiredDocs: number;
    expiringSoonCount: number;
    distThisMonth: number;
    totalDists: number;
    distDelta: number;
    docDelta: number;
    activePercent: number;
  };
  expiringSoon: {
    id: string;
    doc_number: string;
    title: string;
    expiry_date: string;
    days_left: number;
    dept_code: string;
    category_name: string;
  }[];
  categoryData: { name: string; count: number }[];
  departmentData: DeptBreakdown[];
  mostRevisedDocs: RevisedDoc[];
  topRecipientDepartments: RecipientDept[];
  trendLabels: string[];
  trendDocs: number[];
  trendDists: number[];
  trendByYear: YearTrend[];
  yearTotals: YearTotal[];
  availableYears: number[];
  monthLabels: string[];
  activities: ActivityEvent[];
};

type Period = "3B" | "6B" | "1T";
type TrendMode = "rolling" | "single_year" | "compare_years";
const PERIOD_WINDOW: Record<Period, number> = { "3B": 3, "6B": 6, "1T": 12 };
const CAT_COLORS = ["#378ADD", "#7F77DD", "#1D9E75", "#EF9F27", "#B4B2A9"];
const YEAR_COLORS = ["#378ADD", "#7F77DD", "#1D9E75", "#EF9F27", "#E24B4A"];

function formatRelative(ts: string, now: number) {
  const diff = now - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  return new Date(ts).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Hanya aktif setelah mount di client — hindari hydration mismatch
function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}

function getUrgency(days: number) {
  if (days <= 7)
    return {
      bar: "#E24B4A",
      badge: "bg-red-50 text-red-700 border-red-200",
      label: "Kritis",
    };
  if (days <= 14)
    return {
      bar: "#EF9F27",
      badge: "bg-amber-50 text-amber-700 border-amber-200",
      label: "Segera",
    };
  return {
    bar: "#639922",
    badge: "bg-green-50 text-green-700 border-green-200",
    label: "Normal",
  };
}

// ── Animated counter ─────────────────────────────────────────────────────────
function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) {
      setDisplay(0);
      return;
    }
    let start = 0;
    const duration = 700;
    const step = Math.max(1, Math.ceil(value / (duration / 16)));
    const timer = setInterval(() => {
      start = Math.min(start + step, value);
      setDisplay(start);
      if (start >= value) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display.toLocaleString("id-ID")}</>;
}

// ── Delta badge ──────────────────────────────────────────────────────────────
function Delta({
  delta,
  suffix = "vs bln lalu",
}: {
  delta: number;
  suffix?: string;
}) {
  if (delta === 0)
    return (
      <span className="text-[11px] text-slate-400">Sama dengan bulan lalu</span>
    );
  const up = delta > 0;
  return (
    <span
      className={`flex items-center gap-1 text-[11px] font-medium ${
        up ? "text-emerald-600" : "text-red-500"
      }`}
    >
      {up ? (
        <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
      ) : (
        <ArrowTrendingDownIcon className="w-3.5 h-3.5" />
      )}
      {up ? "+" : ""}
      {delta} {suffix}
    </span>
  );
}

// ── Progress ring (SVG) ──────────────────────────────────────────────────────
function ProgressRing({
  percent,
  color,
  size = 56,
}: {
  percent: number;
  color: string;
  size?: number;
}) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (percent / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#f1f5f9"
        strokeWidth={5}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />
    </svg>
  );
}

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  accent,
  iconBg,
  iconColor,
  icon,
  value,
  label,
  sub,
  children,
  ring,
}: {
  accent: string;
  iconBg: string;
  iconColor: string;
  icon: React.ReactNode;
  value: number;
  label: string;
  sub?: string;
  children?: React.ReactNode;
  ring?: { percent: number; color: string };
}) {
  return (
    <div className="relative bg-white border border-slate-200 rounded-2xl px-5 py-4 overflow-hidden hover:shadow-md hover:border-slate-300 transition-all duration-200">
      <div
        className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl"
        style={{ background: accent }}
      />
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: iconBg, color: iconColor }}
        >
          {icon}
        </div>
        {ring && (
          <div className="relative flex items-center justify-center">
            <ProgressRing percent={ring.percent} color={ring.color} />
            <span className="absolute text-[10px] font-bold text-slate-600">
              {ring.percent}%
            </span>
          </div>
        )}
      </div>
      <p className="text-[30px] font-bold text-slate-900 leading-none tracking-tight">
        <AnimatedNumber value={value} />
      </p>
      <p className="text-xs text-slate-500 mt-1 font-medium">{label}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

// ── Section header ───────────────────────────────────────────────────────────
function SectionHeader({
  title,
  sub,
  badge,
}: {
  title: string;
  sub?: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
      {badge}
    </div>
  );
}

// ── Mini bar (untuk panel departemen / revisi / top recipient) ───────────────
function MiniBarRow({
  label,
  sublabel,
  value,
  maxValue,
  color,
  valueLabel,
}: {
  label: string;
  sublabel?: string;
  value: number;
  maxValue: number;
  color: string;
  valueLabel?: string;
}) {
  const pct = maxValue > 0 ? Math.round((value / maxValue) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-2">
        <span className="text-[11px] text-slate-600 min-w-0 flex-1">
          <span className="font-medium text-slate-700">{label}</span>
          {sublabel && (
            <span className="text-slate-400 truncate"> · {sublabel}</span>
          )}
        </span>
        <span className="text-[11px] font-semibold text-slate-700 shrink-0">
          {valueLabel ?? value.toLocaleString("id-ID")}
        </span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function DashboardClient({
  data,
  userName,
}: {
  data: DashboardData;
  userName: string;
}) {
  const {
    stats,
    expiringSoon,
    categoryData,
    departmentData,
    mostRevisedDocs,
    topRecipientDepartments,
    trendLabels,
    trendDocs,
    trendDists,
    trendByYear,
    yearTotals,
    availableYears,
    monthLabels,
    activities,
  } = data;

  const [period, setPeriod] = useState<Period>("6B");
  const [trendMode, setTrendMode] = useState<TrendMode>("rolling");
  const [selectedYear, setSelectedYear] = useState<number>(
    availableYears[0] ?? new Date().getFullYear()
  );
  const [compareYears, setCompareYears] = useState<number[]>(
    availableYears.slice(0, 2)
  );
  const [greeting, setGreeting] = useState("Selamat datang");
  const [formattedDate, setFormattedDate] = useState("");
  const now = useNow();

  const trendRef = useRef<HTMLCanvasElement>(null);
  const donutRef = useRef<HTMLCanvasElement>(null);
  const trendInst = useRef<any>(null);
  const donutInst = useRef<any>(null);
  const ChartRef = useRef<any>(null);

  const toggleCompareYear = (y: number) => {
    setCompareYears((prev) =>
      prev.includes(y)
        ? prev.filter((p) => p !== y)
        : [...prev, y].sort((a, b) => b - a)
    );
  };

  // ── Bangun dataset chart sesuai trendMode ────────────────────────────────
  const buildTrend = useCallback(
    (Chart: any) => {
      if (!trendRef.current) return;
      const gridC = "rgba(0,0,0,0.05)";
      const tickC = "rgba(0,0,0,0.4)";

      let labels: string[] = [];
      let datasets: any[] = [];

      if (trendMode === "rolling") {
        const w = PERIOD_WINDOW[period];
        labels = trendLabels.slice(-w);
        const docs = trendDocs.slice(-w);
        const dists = trendDists.slice(-w);
        datasets = [
          {
            type: "bar" as const,
            label: "Dok baru",
            data: docs,
            backgroundColor: "#378ADD",
            borderRadius: 6,
            borderSkipped: false,
            yAxisID: "y",
            order: 2,
          },
          {
            type: "line" as const,
            label: "Distribusi",
            data: dists,
            borderColor: "#97C459",
            backgroundColor: "rgba(151,196,89,0.08)",
            borderWidth: 2.5,
            pointRadius: 4,
            pointBackgroundColor: "#fff",
            pointBorderColor: "#97C459",
            pointBorderWidth: 2,
            tension: 0.4,
            yAxisID: "y2",
            order: 1,
            borderDash: [5, 3],
            fill: true,
          },
        ];
      } else if (trendMode === "single_year") {
        labels = monthLabels;
        const yearData = trendByYear.find((t) => t.year === selectedYear);
        datasets = [
          {
            type: "bar" as const,
            label: "Dok baru",
            data: yearData?.docs ?? new Array(12).fill(0),
            backgroundColor: "#378ADD",
            borderRadius: 6,
            borderSkipped: false,
            yAxisID: "y",
            order: 2,
          },
          {
            type: "line" as const,
            label: "Distribusi",
            data: yearData?.dists ?? new Array(12).fill(0),
            borderColor: "#97C459",
            backgroundColor: "rgba(151,196,89,0.08)",
            borderWidth: 2.5,
            pointRadius: 4,
            pointBackgroundColor: "#fff",
            pointBorderColor: "#97C459",
            pointBorderWidth: 2,
            tension: 0.4,
            yAxisID: "y2",
            order: 1,
            borderDash: [5, 3],
            fill: true,
          },
        ];
      } else {
        // compare_years: overlay garis "Dok baru" per tahun yang dipilih
        labels = monthLabels;
        const yearsToShow =
          compareYears.length > 0 ? compareYears : availableYears.slice(0, 2);
        datasets = yearsToShow.map((y, i) => {
          const yearData = trendByYear.find((t) => t.year === y);
          return {
            type: "line" as const,
            label: `${y}`,
            data: yearData?.docs ?? new Array(12).fill(0),
            borderColor: YEAR_COLORS[i % YEAR_COLORS.length],
            backgroundColor: "transparent",
            borderWidth: 2.5,
            pointRadius: 3,
            pointBackgroundColor: "#fff",
            pointBorderColor: YEAR_COLORS[i % YEAR_COLORS.length],
            pointBorderWidth: 2,
            tension: 0.35,
            yAxisID: "y",
          };
        });
      }

      if (trendInst.current) trendInst.current.destroy();
      trendInst.current = new Chart(trendRef.current, {
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: {
              display: trendMode === "compare_years",
              position: "top" as const,
              labels: { boxWidth: 12, font: { size: 11 } },
            },
            tooltip: {
              backgroundColor: "#fff",
              titleColor: "#1e293b",
              bodyColor: "#64748b",
              borderColor: "rgba(0,0,0,0.08)",
              borderWidth: 1,
              padding: 12,
              cornerRadius: 10,
              callbacks: {
                title: (items: any[]) => `Bulan: ${items[0].label}`,
              },
            },
          },
          scales:
            trendMode === "compare_years"
              ? {
                  x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: { color: tickC, font: { size: 11 } },
                  },
                  y: {
                    grid: { color: gridC, drawTicks: false },
                    border: { display: false },
                    ticks: { color: tickC, font: { size: 11 }, padding: 8 },
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: "Dok baru",
                      color: "#94a3b8",
                      font: { size: 10 },
                    },
                  },
                }
              : {
                  x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: {
                      color: tickC,
                      font: { size: 11 },
                      autoSkip: false,
                      maxRotation: 0,
                    },
                  },
                  y: {
                    grid: { color: gridC, drawTicks: false },
                    border: { display: false, dash: [4, 4] },
                    ticks: { color: tickC, font: { size: 11 }, padding: 8 },
                    beginAtZero: true,
                    position: "left" as const,
                    title: {
                      display: true,
                      text: "Dok baru",
                      color: "#94a3b8",
                      font: { size: 10 },
                    },
                  },
                  y2: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: { color: tickC, font: { size: 11 }, padding: 8 },
                    beginAtZero: true,
                    position: "right" as const,
                    title: {
                      display: true,
                      text: "Distribusi",
                      color: "#94a3b8",
                      font: { size: 10 },
                    },
                  },
                },
        },
      });
    },
    [
      trendMode,
      period,
      selectedYear,
      compareYears,
      trendLabels,
      trendDocs,
      trendDists,
      trendByYear,
      monthLabels,
      availableYears,
    ]
  );

  useEffect(() => {
    setGreeting(getGreeting());
    setFormattedDate(
      new Date().toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    );
    let cancelled = false;
    import("chart.js/auto").then(({ default: Chart }) => {
      if (cancelled) return;
      ChartRef.current = Chart;
      if (donutRef.current) {
        if (donutInst.current) donutInst.current.destroy();
        donutInst.current = new Chart(donutRef.current, {
          type: "doughnut",
          data: {
            labels: categoryData.map((c) => c.name),
            datasets: [
              {
                data: categoryData.map((c) => c.count),
                backgroundColor: CAT_COLORS.slice(0, categoryData.length),
                borderWidth: 0,
                hoverOffset: 8,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "72%",
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: "#fff",
                titleColor: "#1e293b",
                bodyColor: "#64748b",
                borderColor: "rgba(0,0,0,0.08)",
                borderWidth: 1,
                padding: 10,
                cornerRadius: 10,
                callbacks: {
                  label: (ctx: any) => {
                    const pct =
                      stats.totalDocs > 0
                        ? Math.round((ctx.raw / stats.totalDocs) * 100)
                        : 0;
                    return ` ${ctx.raw.toLocaleString("id-ID")} dok (${pct}%)`;
                  },
                },
              },
            },
          },
        });
      }
      buildTrend(Chart);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryData, stats.totalDocs]);

  useEffect(() => {
    if (ChartRef.current) buildTrend(ChartRef.current);
  }, [buildTrend]);

  // ── Ringkasan kesehatan dokumen ───────────────────────────────────────────
  const healthScore =
    stats.totalDocs > 0
      ? Math.round(
          ((stats.activeDocs - stats.expiringSoonCount * 0.5) /
            stats.totalDocs) *
            100
        )
      : 0;
  const healthColor =
    healthScore >= 80 ? "#1D9E75" : healthScore >= 60 ? "#EF9F27" : "#E24B4A";
  const healthLabel =
    healthScore >= 80
      ? "Baik"
      : healthScore >= 60
      ? "Perlu Perhatian"
      : "Kritis";

  // ── Year-over-year delta untuk banner ringkasan tahun (mode compare) ──────
  const yoyDocsDelta = useMemo(() => {
    if (compareYears.length < 2) return null;
    const sorted = [...compareYears].sort((a, b) => b - a);
    const latest = yearTotals.find((y) => y.year === sorted[0]);
    const prev = yearTotals.find((y) => y.year === sorted[1]);
    if (!latest || !prev) return null;
    return {
      latestYear: sorted[0],
      prevYear: sorted[1],
      diff: latest.totalDocs - prev.totalDocs,
      pct:
        prev.totalDocs > 0
          ? Math.round(
              ((latest.totalDocs - prev.totalDocs) / prev.totalDocs) * 100
            )
          : 0,
    };
  }, [compareYears, yearTotals]);

  const maxDeptCount = Math.max(1, ...departmentData.map((d) => d.count));
  const maxRevisedCount = Math.max(1, ...mostRevisedDocs.map((d) => d.count));
  const maxRecipientQty = Math.max(
    1,
    ...topRecipientDepartments.map((d) => d.qty)
  );

  return (
    <div className="space-y-5 pb-10">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            {greeting}
            {userName ? `, ${userName.split(" ")[0]}` : ""} 👋
          </h1>
          <p className="text-sm text-slate-400 mt-0.5 capitalize">
            {formattedDate || "…"}
          </p>
        </div>
      </div>

      {/* ── Health banner ── */}
      <div
        className="rounded-2xl border px-5 py-3.5 flex items-center justify-between gap-4"
        style={{
          background: `${healthColor}10`,
          borderColor: `${healthColor}30`,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: `${healthColor}20` }}
          >
            <CheckCircleIcon
              className="w-5 h-5"
              style={{ color: healthColor }}
            />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: healthColor }}>
              Kesehatan Dokumen: {healthLabel}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {stats.activeDocs.toLocaleString("id-ID")} dokumen aktif ·{" "}
              {stats.expiredDocs.toLocaleString("id-ID")} kadaluarsa ·{" "}
              {stats.expiringSoonCount} akan kadaluarsa dalam 30 hari
            </p>
          </div>
        </div>
        <span
          className="text-2xl font-bold shrink-0"
          style={{ color: healthColor }}
        >
          {Math.max(0, healthScore)}%
        </span>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          accent="#378ADD"
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          icon={<DocumentTextIcon className="w-4 h-4" />}
          value={stats.totalDocs}
          label="Total Dokumen"
          sub="Aktif & kadaluarsa"
          ring={{ percent: stats.activePercent, color: "#378ADD" }}
        >
          <Delta delta={stats.docDelta} />
        </StatCard>

        <StatCard
          accent="#10b981"
          iconBg="#F0FDF4"
          iconColor="#16a34a"
          icon={<CheckCircleIcon className="w-4 h-4" />}
          value={stats.activeDocs}
          label="Dokumen Aktif"
          sub={`${stats.activePercent}% dari seluruh dokumen`}
        />

        <StatCard
          accent="#f59e0b"
          iconBg="#FFFBEB"
          iconColor="#d97706"
          icon={<ExclamationTriangleIcon className="w-4 h-4" />}
          value={stats.expiringSoonCount}
          label="Segera Kadaluarsa"
          sub="Dalam 30 hari ke depan"
        >
          {stats.expiringSoonCount > 0 ? (
            <span className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
              <ExclamationTriangleIcon className="w-3 h-3" />
              Perlu ditindaklanjuti
            </span>
          ) : (
            <span className="text-[11px] text-emerald-600 font-medium">
              ✓ Semua aman
            </span>
          )}
        </StatCard>

        <StatCard
          accent="#8b5cf6"
          iconBg="#F5F3FF"
          iconColor="#7c3aed"
          icon={<InboxArrowDownIcon className="w-4 h-4" />}
          value={stats.distThisMonth}
          label="Distribusi Bulan Ini"
          sub={`Total: ${stats.totalDists.toLocaleString("id-ID")} (terekam)`}
        >
          <Delta delta={stats.distDelta} />
        </StatCard>
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Tren Aktivitas
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {trendMode === "rolling" &&
                  "Dokumen baru & distribusi per bulan (relatif ke hari ini)"}
                {trendMode === "single_year" &&
                  `Dokumen baru & distribusi sepanjang tahun ${selectedYear}`}
                {trendMode === "compare_years" &&
                  "Perbandingan jumlah dokumen baru per bulan, antar tahun"}
              </p>
            </div>
            {/* Mode selector */}
            <div className="flex bg-slate-100 rounded-full p-1 gap-0.5 shrink-0">
              {(
                [
                  { key: "rolling", label: "Rolling" },
                  { key: "single_year", label: "Per Tahun" },
                  { key: "compare_years", label: "Bandingkan" },
                ] as { key: TrendMode; label: string }[]
              ).map((m) => (
                <button
                  key={m.key}
                  onClick={() => setTrendMode(m.key)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
                    trendMode === m.key
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sub-controls per mode */}
          {trendMode === "rolling" && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] text-slate-400">Periode:</span>
              <div className="flex bg-slate-100 rounded-full p-1 gap-0.5">
                {(["3B", "6B", "1T"] as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    title={
                      {
                        "3B": "3 Bulan Terakhir",
                        "6B": "6 Bulan Terakhir",
                        "1T": "1 Tahun Terakhir",
                      }[p]
                    }
                    className={`text-xs font-semibold px-3 py-1 rounded-full transition-all ${
                      period === p
                        ? "bg-white text-slate-800 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {trendMode === "single_year" && (
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-[11px] text-slate-400">Tahun:</span>
              <div className="flex bg-slate-100 rounded-full p-1 gap-0.5">
                {availableYears.map((y) => (
                  <button
                    key={y}
                    onClick={() => setSelectedYear(y)}
                    className={`text-xs font-semibold px-3 py-1 rounded-full transition-all ${
                      selectedYear === y
                        ? "bg-white text-slate-800 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
          )}

          {trendMode === "compare_years" && (
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-[11px] text-slate-400">
                Pilih tahun (boleh lebih dari satu):
              </span>
              <div className="flex gap-1.5 flex-wrap">
                {availableYears.map((y, i) => {
                  const active = compareYears.includes(y);
                  const colorIdx = compareYears.indexOf(y);
                  return (
                    <button
                      key={y}
                      onClick={() => toggleCompareYear(y)}
                      className={`text-xs font-semibold px-3 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
                        active
                          ? "bg-slate-800 text-white border-slate-800"
                          : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {active && (
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            background:
                              YEAR_COLORS[colorIdx % YEAR_COLORS.length],
                          }}
                        />
                      )}
                      {y}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="relative h-52">
            <canvas
              ref={trendRef}
              role="img"
              aria-label="Grafik tren dokumen baru dan distribusi"
            />
          </div>

          {/* Quick summary below chart */}
          {trendMode === "rolling" && (
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-50">
              <div className="text-center">
                <p className="text-base font-bold text-blue-600">
                  {trendDocs
                    .slice(-PERIOD_WINDOW[period])
                    .reduce((a, b) => a + b, 0)
                    .toLocaleString("id-ID")}
                </p>
                <p className="text-[10px] text-slate-400">
                  Dok baru ({period})
                </p>
              </div>
              <div className="w-px h-6 bg-slate-100" />
              <div className="text-center">
                <p className="text-base font-bold text-green-500">
                  {trendDists
                    .slice(-PERIOD_WINDOW[period])
                    .reduce((a, b) => a + b, 0)
                    .toLocaleString("id-ID")}
                </p>
                <p className="text-[10px] text-slate-400">
                  Distribusi ({period})
                </p>
              </div>
              <div className="w-px h-6 bg-slate-100" />
              <div className="text-center">
                <p className="text-base font-bold text-slate-600">
                  {period === "3B" ? "3" : period === "6B" ? "6" : "12"} bln
                </p>
                <p className="text-[10px] text-slate-400">Periode tampil</p>
              </div>
            </div>
          )}

          {trendMode === "single_year" && (
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-50">
              <div className="text-center">
                <p className="text-base font-bold text-blue-600">
                  {(
                    trendByYear.find((t) => t.year === selectedYear)?.docs ?? []
                  )
                    .reduce((a, b) => a + b, 0)
                    .toLocaleString("id-ID")}
                </p>
                <p className="text-[10px] text-slate-400">
                  Total dok baru {selectedYear}
                </p>
              </div>
              <div className="w-px h-6 bg-slate-100" />
              <div className="text-center">
                <p className="text-base font-bold text-green-500">
                  {(
                    trendByYear.find((t) => t.year === selectedYear)?.dists ??
                    []
                  )
                    .reduce((a, b) => a + b, 0)
                    .toLocaleString("id-ID")}
                </p>
                <p className="text-[10px] text-slate-400">
                  Total distribusi {selectedYear}
                </p>
              </div>
            </div>
          )}

          {trendMode === "compare_years" && yoyDocsDelta && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-50">
              <span className="text-[11px] text-slate-500">
                {yoyDocsDelta.latestYear} vs {yoyDocsDelta.prevYear}:
              </span>
              <span
                className={`flex items-center gap-1 text-[11px] font-semibold ${
                  yoyDocsDelta.diff >= 0 ? "text-emerald-600" : "text-red-500"
                }`}
              >
                {yoyDocsDelta.diff >= 0 ? (
                  <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
                ) : (
                  <ArrowTrendingDownIcon className="w-3.5 h-3.5" />
                )}
                {yoyDocsDelta.diff >= 0 ? "+" : ""}
                {yoyDocsDelta.diff} dok baru ({yoyDocsDelta.pct >= 0 ? "+" : ""}
                {yoyDocsDelta.pct}%)
              </span>
            </div>
          )}
        </div>

        {/* Donut */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <SectionHeader title="Per Kategori" sub="Distribusi dokumen aktif" />
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-36 h-36">
              <canvas
                ref={donutRef}
                role="img"
                aria-label="Donut chart dokumen per kategori"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-lg font-bold text-slate-800">
                  {stats.totalDocs.toLocaleString("id-ID")}
                </p>
                <p className="text-[10px] text-slate-400">total</p>
              </div>
            </div>
            <div className="w-full space-y-2.5">
              {categoryData.map((cat, i) => {
                const pct =
                  stats.totalDocs > 0
                    ? Math.round((cat.count / stats.totalDocs) * 100)
                    : 0;
                return (
                  <div key={cat.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1.5 text-[11px] text-slate-600 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: CAT_COLORS[i] }}
                        />
                        <span className="truncate">{cat.name}</span>
                      </span>
                      <span className="flex items-center gap-1.5 ml-2 shrink-0">
                        <span className="text-[10px] text-slate-400">
                          {pct}%
                        </span>
                        <span className="text-[11px] font-semibold text-slate-700">
                          {cat.count.toLocaleString("id-ID")}
                        </span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: CAT_COLORS[i] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Panel baru: Departemen, Revisi terbanyak, Top penerima distribusi ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Departemen */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <SectionHeader
            title="Dokumen per Departemen"
            sub="Jumlah dokumen QESH terbanyak"
            badge={
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <BuildingOffice2Icon className="w-4 h-4 text-blue-500" />
              </div>
            }
          />
          {departmentData.length === 0 ? (
            <p className="text-[11px] text-slate-400 text-center py-6">
              Belum ada data departemen.
            </p>
          ) : (
            <div className="space-y-3">
              {departmentData.map((d) => (
                <MiniBarRow
                  key={d.code}
                  label={d.code}
                  sublabel={d.name}
                  value={d.count}
                  maxValue={maxDeptCount}
                  color="#378ADD"
                />
              ))}
            </div>
          )}
        </div>

        {/* Dokumen paling sering direvisi */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <SectionHeader
            title="Paling Sering Direvisi"
            sub="Berdasarkan jumlah versi dokumen"
            badge={
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <ArrowPathRoundedSquareIcon className="w-4 h-4 text-amber-500" />
              </div>
            }
          />
          {mostRevisedDocs.length === 0 ? (
            <p className="text-[11px] text-slate-400 text-center py-6">
              Belum ada dokumen dengan lebih dari 1 revisi.
            </p>
          ) : (
            <div className="space-y-3">
              {mostRevisedDocs.map((d) => (
                <MiniBarRow
                  key={d.doc_number}
                  label={d.doc_number}
                  sublabel={d.title}
                  value={d.count}
                  maxValue={maxRevisedCount}
                  color="#EF9F27"
                  valueLabel={`${d.count}x`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Top departemen penerima distribusi */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <SectionHeader
            title="Top Penerima Distribusi"
            sub="Departemen penerima dokumen terbanyak"
            badge={
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                <TruckIcon className="w-4 h-4 text-violet-500" />
              </div>
            }
          />
          {topRecipientDepartments.length === 0 ? (
            <p className="text-[11px] text-slate-400 text-center py-6">
              Belum ada data distribusi.
            </p>
          ) : (
            <div className="space-y-3">
              {topRecipientDepartments.map((d) => (
                <MiniBarRow
                  key={d.code}
                  label={d.code}
                  sublabel={`${d.formCount} form`}
                  value={d.qty}
                  maxValue={maxRecipientQty}
                  color="#7F77DD"
                  valueLabel={`${d.qty} pcs`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Expiring */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <SectionHeader
            title="Segera Kadaluarsa"
            sub="Dokumen aktif yang habis masa berlakunya"
            badge={
              expiringSoon.length > 0 ? (
                <span className="text-[10px] font-semibold bg-red-50 text-red-600 px-2.5 py-1 rounded-full border border-red-100">
                  {expiringSoon.length} dokumen
                </span>
              ) : undefined
            }
          />
          {expiringSoon.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                <CheckCircleIcon className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-sm text-slate-600 font-medium">
                Semua dokumen aman
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Tidak ada dokumen yang kadaluarsa dalam 30 hari ke depan.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Legend */}
              <div className="flex items-center gap-3 mb-3 text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                  ≤7 hari: Kritis
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                  ≤14 hari: Segera
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                  &gt;14 hari: Normal
                </span>
              </div>
              {expiringSoon.map((doc) => {
                const { bar, badge } = getUrgency(doc.days_left);
                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0"
                  >
                    <div
                      className="w-1 h-10 rounded-full shrink-0"
                      style={{ background: bar }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-blue-700 font-mono tracking-wide">
                        {doc.doc_number}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {doc.title}
                      </p>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <span
                        className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge}`}
                      >
                        {doc.days_left} hari lagi
                      </span>
                      <p className="text-[10px] text-slate-400">
                        {new Date(doc.expiry_date).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Activity */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <SectionHeader
            title="Aktivitas Terbaru"
            sub="Dokumen & distribusi terkini"
            badge={
              <span className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            }
          />
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                <ClockIcon className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-sm text-slate-400">Belum ada aktivitas</p>
            </div>
          ) : (
            <div>
              {activities.map((act, i) => (
                <div
                  key={act.id + i}
                  className="flex gap-3 py-2.5 border-b border-slate-50 last:border-0"
                >
                  <div className="flex flex-col items-center shrink-0">
                    <div
                      className="w-2.5 h-2.5 rounded-full mt-1 ring-2 ring-white"
                      style={{
                        background:
                          act.type === "distribution" ? "#7F77DD" : "#378ADD",
                      }}
                    />
                    {i < activities.length - 1 && (
                      <div className="w-px flex-1 bg-slate-100 mt-1" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pb-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[12px] font-medium text-slate-700 leading-snug">
                        {act.label}
                      </p>
                      <span
                        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                          act.type === "distribution"
                            ? "bg-violet-50 text-violet-600"
                            : "bg-blue-50 text-blue-600"
                        }`}
                      >
                        {act.type === "distribution" ? "Distribusi" : "Dokumen"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {act.sub}
                    </p>
                    <p className="text-[10px] text-slate-300 mt-0.5">
                      {now ? formatRelative(act.timestamp, now) : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
