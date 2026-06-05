"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import {
  HomeIcon,
  UsersIcon,
  CircleStackIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FolderOpenIcon,
  ArrowUpTrayIcon,
  BookOpenIcon,
} from "@heroicons/react/24/outline";
import { signOut } from "next-auth/react";
import clsx from "clsx";

type NavItem = { href: string; label: string };
type NavGroup = {
  key: string;
  label: string;
  icon: React.ElementType;
  isActive: (pathname: string) => boolean;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    key: "dokumen",
    label: "Kelola Dokumen",
    icon: FolderOpenIcon,
    isActive: (p) =>
      p.startsWith("/dashboard/documents") ||
      p.startsWith("/dashboard/dokumen-qesh") ||
      p.startsWith("/dashboard/dokumen-eksternal") ||
      p.startsWith("/dashboard/msds") ||
      p.startsWith("/dashboard/dokumen-customer") ||
      p.startsWith("/dashboard/manifes") ||
      p.startsWith("/dashboard/sertifikat"),
    items: [
      { href: "/dashboard/documents", label: "Semua Dokumen" },
      { href: "/dashboard/dokumen-qesh", label: "Dokumen QESH" },
      { href: "/dashboard/dokumen-eksternal", label: "Dokumen Eksternal" },
      { href: "/dashboard/msds", label: "MSDS" },
      { href: "/dashboard/dokumen-customer", label: "Dokumen Customer" },
      { href: "/dashboard/manifes", label: "Manifes" },
      { href: "/dashboard/sertifikat", label: "Sertifikat & Lisensi" },
    ],
  },
  {
    key: "buku",
    label: "Daftar Buku",
    icon: BookOpenIcon,
    isActive: (p) => p.startsWith("/dashboard/buku"),
    items: [
      { href: "/dashboard/buku", label: "Buku" },
      { href: "/dashboard/buku/peminjaman", label: "Peminjaman Buku" },
    ],
  },
  {
    key: "distribusi",
    label: "Kelola Distribusi",
    icon: ArrowUpTrayIcon,
    isActive: (p) => p.startsWith("/dashboard/document-control"),
    items: [
      {
        href: "/dashboard/document-control/distributions",
        label: "Distribusi",
      },
      { href: "/dashboard/document-control/withdrawals", label: "Penarikan" },
    ],
  },
  {
    key: "master",
    label: "Master Data",
    icon: CircleStackIcon,
    isActive: (p) => p.startsWith("/dashboard/master"),
    items: [
      { href: "/dashboard/master/categories", label: "Kategori" },
      { href: "/dashboard/master/document-types", label: "Jenis Dokumen" },
      { href: "/dashboard/master/departments", label: "Departemen" },
      { href: "/dashboard/master/customers", label: "Customer" },
      { href: "/dashboard/master/employees", label: "Karyawan" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const category = searchParams.get("category");
  const currentHref = category ? `${pathname}?category=${category}` : pathname;

  const [openKey, setOpenKey] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const active = navGroups.find((g) => g.isActive(pathname))?.key ?? null;
    setOpenKey(active);
    setActiveKey(active);
    setMounted(true);
  }, [pathname]);

  const toggle = (key: string) =>
    setOpenKey((prev) => (prev === key ? null : key));

  return (
    <aside className="w-60 h-screen bg-[#0f172a] text-white flex flex-col overflow-hidden fixed left-0 top-0">
      {/* Header */}
      <div className="px-5 py-5 border-b border-white/10 flex-shrink-0">
        <h1 className="text-lg font-bold leading-tight">DCS App</h1>
        <p className="text-white/40 text-xs mt-0.5">Document Control System</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {/* Dashboard */}
        <Link
          href="/dashboard"
          className={clsx(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            mounted && pathname === "/dashboard"
              ? "bg-blue-600 text-white"
              : "text-white/60 hover:bg-white/10 hover:text-white"
          )}
        >
          <HomeIcon className="w-4 h-4 flex-shrink-0" />
          Dashboard
        </Link>

        {/* Groups */}
        {navGroups.map((group) => {
          const Icon = group.icon;
          const isOpen = openKey === group.key;
          const isActive = mounted && activeKey === group.key;

          return (
            <div key={group.key}>
              <button
                onClick={() => toggle(group.key)}
                className={clsx(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{group.label}</span>
                </div>
                {isOpen ? (
                  <ChevronDownIcon className="w-3.5 h-3.5 flex-shrink-0" />
                ) : (
                  <ChevronRightIcon className="w-3.5 h-3.5 flex-shrink-0" />
                )}
              </button>

              {isOpen && (
                <div className="mt-0.5 ml-3 pl-3 border-l border-white/10 space-y-0.5">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={clsx(
                        "flex items-center px-3 py-2 rounded-lg text-sm transition-colors",
                        mounted && currentHref === item.href
                          ? "bg-blue-600 text-white font-medium"
                          : "text-white/50 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Pengguna */}
        <Link
          href="/dashboard/users"
          className={clsx(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            mounted && pathname.startsWith("/dashboard/users")
              ? "bg-blue-600 text-white"
              : "text-white/60 hover:bg-white/10 hover:text-white"
          )}
        >
          <UsersIcon className="w-4 h-4 flex-shrink-0" />
          Pengguna
        </Link>
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/10 flex-shrink-0">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/50 hover:bg-white/10 hover:text-white transition-colors"
        >
          <span>→</span>
          Logout
        </button>
      </div>
    </aside>
  );
}
