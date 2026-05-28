"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  HomeIcon,
  UsersIcon,
  CircleStackIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  TagIcon,
  DocumentDuplicateIcon,
  BuildingOfficeIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  ClipboardDocumentCheckIcon,
} from "@heroicons/react/24/outline";
import { signOut } from "next-auth/react";
import clsx from "clsx";

const masterItems = [
  { href: "/dashboard/master/categories", label: "Kategori", icon: TagIcon },
  {
    href: "/dashboard/master/document-types",
    label: "Jenis Dokumen",
    icon: DocumentDuplicateIcon,
  },
  {
    href: "/dashboard/master/departments",
    label: "Departemen",
    icon: BuildingOfficeIcon,
  },
];

const documentControlItems = [
  {
    href: "/dashboard/document-control/distributions",
    label: "Distribusi Dokumen",
    icon: ArrowUpTrayIcon,
  },
  {
    href: "/dashboard/document-control/withdrawals",
    label: "Penarikan Dokumen",
    icon: ArrowDownTrayIcon,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const isMasterActive = pathname.startsWith("/dashboard/master");
  const isDocControlActive = pathname.startsWith("/dashboard/document-control");

  const [masterOpen, setMasterOpen] = useState(isMasterActive);
  const [docControlOpen, setDocControlOpen] = useState(isDocControlActive);

  return (
    <aside className="w-64 h-full bg-[#0f172a] text-white flex flex-col overflow-y-auto">
      <div className="px-6 py-6 border-b border-white/10">
        <h1 className="text-xl font-bold">DCS App</h1>
        <p className="text-white/40 text-xs mt-1">Document Control System</p>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {/* Dashboard */}
        <Link
          href="/dashboard"
          className={clsx(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            pathname === "/dashboard"
              ? "bg-blue-600 text-white"
              : "text-white/60 hover:bg-white/10 hover:text-white"
          )}
        >
          <HomeIcon className="w-5 h-5" />
          Dashboard
        </Link>

        {/* Dokumen */}
        <Link
          href="/dashboard/documents"
          className={clsx(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            pathname.startsWith("/dashboard/documents")
              ? "bg-blue-600 text-white"
              : "text-white/60 hover:bg-white/10 hover:text-white"
          )}
        >
          <DocumentTextIcon className="w-5 h-5" />
          Dokumen
        </Link>

        {/* Kendali Dokumen Dropdown */}
        <div>
          <button
            onClick={() => setDocControlOpen(!docControlOpen)}
            className={clsx(
              "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isDocControlActive
                ? "bg-white/10 text-white"
                : "text-white/60 hover:bg-white/10 hover:text-white"
            )}
          >
            <div className="flex items-center gap-3">
              <ClipboardDocumentCheckIcon className="w-5 h-5" />
              Kendali Dokumen
            </div>
            {docControlOpen ? (
              <ChevronDownIcon className="w-4 h-4" />
            ) : (
              <ChevronRightIcon className="w-4 h-4" />
            )}
          </button>

          {docControlOpen && (
            <div className="mt-1 ml-4 pl-4 border-l border-white/10 space-y-1">
              {documentControlItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      pathname === item.href
                        ? "bg-blue-600 text-white"
                        : "text-white/50 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Master Data Dropdown */}
        <div>
          <button
            onClick={() => setMasterOpen(!masterOpen)}
            className={clsx(
              "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isMasterActive
                ? "bg-white/10 text-white"
                : "text-white/60 hover:bg-white/10 hover:text-white"
            )}
          >
            <div className="flex items-center gap-3">
              <CircleStackIcon className="w-5 h-5" />
              Master Data
            </div>
            {masterOpen ? (
              <ChevronDownIcon className="w-4 h-4" />
            ) : (
              <ChevronRightIcon className="w-4 h-4" />
            )}
          </button>

          {masterOpen && (
            <div className="mt-1 ml-4 pl-4 border-l border-white/10 space-y-1">
              {masterItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      pathname === item.href
                        ? "bg-blue-600 text-white"
                        : "text-white/50 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Pengguna */}
        <Link
          href="/dashboard/users"
          className={clsx(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            pathname.startsWith("/dashboard/users")
              ? "bg-blue-600 text-white"
              : "text-white/60 hover:bg-white/10 hover:text-white"
          )}
        >
          <UsersIcon className="w-5 h-5" />
          Pengguna
        </Link>
      </nav>

      <div className="px-4 py-4 border-t border-white/10">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white/50 hover:bg-white/10 hover:text-white transition-colors"
        >
          <span>→</span>
          Logout
        </button>
      </div>
    </aside>
  );
}
