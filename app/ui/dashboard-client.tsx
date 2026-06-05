"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  PaperAirplaneIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

type ActivityEvent = {
  type: "doc_created" | "distribution";
  id: string;
  label: string;
  sub: string;
  timestamp: string;
};

type DashboardData = {
  stats: {
    totalDocs: number;
    activeDocs: number;
    expiringSoonCount: number;
    distThisMonth: number;
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
  trendLabels: string[];
  trendDocs: number[];
  trendDists: number[];
  activities: ActivityEvent[];
};

type Period = "3B" | "6B" | "1T";
const PERIOD_WINDOW: Record<Period, number> = { "3B": 3, "6B": 6, "1T": 12 };
const CAT_COLORS = ["#378ADD", "#7F77DD", "#1D9E75", "#EF9F27", "#B4B2A9"];

function formatRelative(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
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

function getGreeting() {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}

function getUrgency(days: number) {
  if (days <= 7)
    return { bar: "#E24B4A", text: "text-red-700", bg: "bg-red-50" };
  if (days <= 14)
    return { bar: "#EF9F27", text: "text-amber-700", bg: "bg-amber-50" };
  return { bar: "#639922", text: "text-green-700", bg: "bg-green-50" };
}

function getActivityDot(type: ActivityEvent["type"]) {
  return type === "distribution" ? "#7F77DD" : "#378ADD";
}

// ── Animated counter ──────────────────────────────────────────────────────────
function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = value;
    if (end === 0) {
      setDisplay(0);
      return;
    }
    const duration = 600;
    const step = Math.ceil(end / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setDisplay(end);
        clearInterval(timer);
      } else setDisplay(start);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display.toLocaleString("id-ID")}</>;
}

// ── Delta badge ───────────────────────────────────────────────────────────────
function Delta({
  delta,
  suffix = "vs bulan lalu",
}: {
  delta: number;
  suffix?: string;
}) {
  if (delta === 0)
    return (
      <span className="text-[11px] text-slate-400">sama dengan bulan lalu</span>
    );
  const up = delta > 0;
  return (
    <span
      className={`flex items-center gap-1 text-[11px] font-medium ${
        up ? "text-emerald-600" : "text-red-600"
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

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  accent,
  iconBg,
  iconColor,
  icon,
  value,
  label,
  children,
}: {
  accent: string;
  iconBg: string;
  iconColor: string;
  icon: React.ReactNode;
  value: number;
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative bg-white border border-slate-200 rounded-2xl px-5 py-4 overflow-hidden transition-all hover:border-slate-300 hover:shadow-sm">
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
      </div>
      <p className="text-[28px] font-bold text-slate-900 leading-none tracking-tight">
        <AnimatedNumber value={value} />
      </p>
      <p className="text-xs text-slate-400 mt-1.5 mb-2.5">{label}</p>
      {children}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
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
    trendLabels,
    trendDocs,
    trendDists,
    activities,
  } = data;

  const [period, setPeriod] = useState<Period>("6B");

  // Solusi Hydration Error: Buat state penampung greeting dan tanggal lokal
  const [greeting, setGreeting] = useState("Selamat datang");
  const [formattedDate, setFormattedDate] = useState("");

  const trendRef = useRef<HTMLCanvasElement>(null);
  const donutRef = useRef<HTMLCanvasElement>(null);
  const trendInst = useRef<any>(null);
  const donutInst = useRef<any>(null);
  const ChartRef = useRef<any>(null);

  const buildTrend = useCallback(
    (Chart: any, p: Period) => {
      if (!trendRef.current) return;
      const w = PERIOD_WINDOW[p];
      const labels = trendLabels.slice(-w);
      const docs = trendDocs.slice(-w);
      const dists = trendDists.slice(-w);
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const gridC = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)";
      const tickC = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)";

      if (trendInst.current) trendInst.current.destroy();
      trendInst.current = new Chart(trendRef.current, {
        data: {
          labels,
          datasets: [
            {
              type: "bar" as const,
              label: "Dok baru",
              data: docs,
              backgroundColor: "#378ADD",
              borderRadius: 5,
              borderSkipped: false,
              yAxisID: "y",
              order: 2,
            },
            {
              type: "line" as const,
              label: "Distribusi",
              data: dists,
              borderColor: "#97C459",
              backgroundColor: "rgba(151,196,89,0.06)",
              borderWidth: 2,
              pointRadius: 4,
              pointBackgroundColor: "#fff",
              pointBorderColor: "#97C459",
              pointBorderWidth: 2,
              tension: 0.45,
              yAxisID: "y2",
              order: 1,
              borderDash: [5, 3],
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: isDark ? "#1e1e1e" : "#fff",
              titleColor: isDark ? "#e5e5e5" : "#1e293b",
              bodyColor: isDark ? "#a1a1aa" : "#64748b",
              borderColor: isDark
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.08)",
              borderWidth: 1,
              padding: 10,
              cornerRadius: 10,
            },
          },
          scales: {
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
              position: "left",
            },
            y2: {
              grid: { display: false },
              border: { display: false },
              ticks: { color: tickC, font: { size: 11 }, padding: 8 },
              beginAtZero: true,
              position: "right",
            },
          },
        },
      });
    },
    [trendLabels, trendDocs, trendDists]
  );

  useEffect(() => {
    // Set ucapan dan tanggal di client-side secara aman setelah mount
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
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

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
                hoverOffset: 6,
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
                backgroundColor: isDark ? "#1e1e1e" : "#fff",
                titleColor: isDark ? "#e5e5e5" : "#1e293b",
                bodyColor: isDark ? "#a1a1aa" : "#64748b",
                borderColor: isDark
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.08)",
                borderWidth: 1,
                padding: 8,
                cornerRadius: 10,
              },
            },
          },
        });
      }

      buildTrend(Chart, period);
    });
    return () => {
      cancelled = true;
    };
  }, [buildTrend, categoryData, period]);

  useEffect(() => {
    if (ChartRef.current) buildTrend(ChartRef.current, period);
  }, [period, buildTrend]);

  return (
    <div className="space-y-5 pb-10">
      {/* ── Header ── */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            {greeting}
            {userName ? `, ${userName.split(" ")[0]}` : ""} 👋
          </h1>
          <p className="text-sm text-slate-400 mt-0.5 capitalize">
            {formattedDate || "..."}
          </p>
        </div>
        <div className="flex bg-slate-100 rounded-full p-1 gap-0.5">
          {(["3B", "6B", "1T"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-xs font-semibold px-4 py-1.5 rounded-full transition-all ${
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

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          accent="#378ADD"
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          icon={<DocumentTextIcon className="w-4 h-4" />}
          value={stats.totalDocs}
          label="Total dokumen"
        >
          <Delta delta={stats.docDelta} />
        </StatCard>
        <StatCard
          accent="#10b981"
          iconBg="#F0FDF4"
          iconColor="#16a34a"
          icon={<CheckCircleIcon className="w-4 h-4" />}
          value={stats.activeDocs}
          label="Aktif / terbaru"
        >
          <span className="text-[11px] text-slate-400">
            {stats.activePercent}% dari total
          </span>
        </StatCard>
        <StatCard
          accent="#f59e0b"
          iconBg="#FFFBEB"
          iconColor="#d97706"
          icon={<ExclamationTriangleIcon className="w-4 h-4" />}
          value={stats.expiringSoonCount}
          label="Segera kadaluarsa"
        >
          <span className="text-[11px] text-slate-400">
            dalam 30 hari ke depan
          </span>
        </StatCard>
        <StatCard
          accent="#8b5cf6"
          iconBg="#F5F3FF"
          iconColor="#7c3aed"
          icon={<PaperAirplaneIcon className="w-4 h-4" />}
          value={stats.distThisMonth}
          label="Distribusi bulan ini"
        >
          <Delta delta={stats.distDelta} />
        </StatCard>
      </div>

      {/* ── Chart row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Tren dokumen
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Dokumen baru & distribusi per bulan
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />
                Dok baru
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span
                  className="inline-block w-5 border-t-2 border-dashed border-green-500"
                  style={{ verticalAlign: "middle" }}
                />
                Distribusi
              </span>
            </div>
          </div>
          <div className="relative h-48">
            <canvas
              ref={trendRef}
              role="img"
              aria-label="Grafik tren dokumen baru dan distribusi per bulan"
            >
              Data tren per bulan.
            </canvas>
          </div>
        </div>

        {/* Donut */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-sm font-semibold text-slate-800 mb-1">
            Per kategori
          </p>
          <p className="text-[11px] text-slate-400 mb-4">
            Distribusi dokumen aktif
          </p>
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-36 h-36">
              <canvas
                ref={donutRef}
                role="img"
                aria-label="Donut chart dokumen per kategori"
              >
                Distribusi per kategori.
              </canvas>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-lg font-bold text-slate-800">
                  {stats.totalDocs.toLocaleString("id-ID")}
                </p>
                <p className="text-[10px] text-slate-400">total</p>
              </div>
            </div>
            <div className="w-full space-y-2">
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
                      <span className="text-[11px] font-semibold text-slate-700 ml-2 shrink-0">
                        {cat.count.toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
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

      {/* ── Bottom row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Expiring */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Segera kadaluarsa
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Dokumen aktif dalam 30 hari ke depan
              </p>
            </div>
            {expiringSoon.length > 0 && (
              <span className="text-[10px] font-semibold bg-red-50 text-red-600 px-2.5 py-1 rounded-full border border-red-100">
                {expiringSoon.length} dokumen
              </span>
            )}
          </div>
          {expiringSoon.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircleIcon className="w-8 h-8 text-emerald-400 mb-2" />
              <p className="text-sm text-slate-500 font-medium">Semua aman</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Tidak ada dokumen yang akan kadaluarsa.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {expiringSoon.map((doc) => {
                const { bar, text } = getUrgency(doc.days_left);
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
                    <div className="text-right shrink-0">
                      <p className={`text-[11px] font-semibold ${text}`}>
                        {doc.days_left} hari
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {doc.dept_code || doc.category_name}
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Aktivitas terbaru
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Dokumen & distribusi terkini
              </p>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>
          {activities.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              Belum ada aktivitas.
            </p>
          ) : (
            <div>
              {activities.map((act, i) => (
                <div
                  key={act.id + i}
                  className="flex gap-3 py-2.5 border-b border-slate-50 last:border-0"
                >
                  <div className="flex flex-col items-center shrink-0">
                    <div
                      className="w-2 h-2 rounded-full mt-1.5"
                      style={{ background: getActivityDot(act.type) }}
                    />
                    {i < activities.length - 1 && (
                      <div className="w-px flex-1 bg-slate-100 mt-1" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pb-0.5">
                    <p className="text-[12px] font-medium text-slate-700 leading-snug">
                      {act.label}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {act.sub}
                    </p>
                    <p className="text-[10px] text-slate-300 mt-0.5">
                      {formatRelative(act.timestamp)}
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
