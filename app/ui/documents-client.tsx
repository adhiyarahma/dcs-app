"use client";

import { useState, useMemo } from "react";
import clsx from "clsx";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  FunnelIcon,
  ChevronDownIcon,
  CheckBadgeIcon,
  ClockIcon,
  ChevronUpIcon,
  ChevronUpDownIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ArchiveBoxXMarkIcon,
} from "@heroicons/react/24/outline";
import {
  permanentDeleteDocument,
  markDocumentAsDeleted,
  forceDeleteDocument,
} from "@/app/lib/actions";
import ExportDocumentModal from "@/app/ui/ExportDocumentModal";

type Doc = {
  id: string;
  doc_number: string;
  title: string;
  revision: number;
  effective_date: string;
  revision_date: string | null;
  expiry_date: string | null;
  production_type: string | null;
  status: string;
  category_id: string;
  type_id: string;
  department_id: string | null;
  category_name: string;
  type_name: string;
  department_code: string;
  department_name: string;
  uploaded_by_name: string;
};
type Category = { id: string; name: string };
type Department = { id: string; code: string; name: string };
type DocType = {
  id: string;
  name: string;
  category_id: string;
  category_name: string;
};

type SortKey =
  | "doc_number"
  | "title"
  | "revision"
  | "effective_date"
  | "category_name"
  | "department_code"
  | "status";
type SortOrder = "asc" | "desc";

const PAGE_SIZE = 10;

function getCategoryConfig(categoryName: string, typeName: string = "") {
  const isMSDS = categoryName.toLowerCase().includes("msds");
  const isQESH = categoryName.toLowerCase().includes("qesh");
  const isMSDSKimia = isMSDS && typeName.toLowerCase().includes("kimia");
  const isMSDSBenang = typeName.toLowerCase().includes("msds benang");

  return {
    showDepartmentFilter: isQESH,
    showDepartmentCol: isQESH,
    showRevisionDateCol: isMSDS && !isMSDSBenang,
    showExpiryDateCol: isMSDS,
    showProductionTypeCol: isMSDSKimia,
  };
}

const PRODUCTION_TYPE_LABEL: Record<string, string> = {
  production: "Production",
  "non-production": "Non-Production",
  "production bahan baku": "Prod. Bahan Baku",
};

// ─── Pagination ───────────────────────────────────────────────────────────
function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    )
      pages.push(i);
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between px-2 py-3 border-t border-slate-100">
      <p className="text-xs text-slate-400">
        Halaman{" "}
        <span className="font-semibold text-slate-600">{currentPage}</span> dari{" "}
        <span className="font-semibold text-slate-600">{totalPages}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`dot-${i}`} className="px-2 text-slate-300 text-xs">
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={clsx(
                "min-w-[28px] h-7 px-1.5 rounded-lg text-xs font-medium transition-all",
                p === currentPage
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              )}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Single Delete Modal ──────────────────────────────────────────────────
function DeleteModal({
  doc,
  onConfirm,
  onForceConfirm,
  onCancel,
  loading,
  forceLoading,
  error,
}: {
  doc: Doc;
  onConfirm: () => void;
  onForceConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  forceLoading: boolean;
  error?: string | null;
}) {
  // ← TAMBAHAN: opsi "Hapus Paksa" hanya bisa ditekan setelah user secara
  // sadar mencentang checkbox konfirmasi risiko — mencegah klik tidak
  // sengaja pada aksi yang memutus tautan revisi/distribusi.
  const [confirmForce, setConfirmForce] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-sm font-bold text-slate-800 mb-1">
            Hapus Permanen
          </h2>
          <p className="text-sm text-slate-500">
            Hapus{" "}
            <span className="font-semibold text-slate-700">"{doc.title}"</span>?
          </p>
          <p className="text-xs text-red-400 mt-1 font-medium">
            ⚠ Dokumen akan dihapus permanen dan tidak bisa dipulihkan.
          </p>
          {/* Pesan error dari percobaan hapus biasa */}
          {error && (
            <div className="mt-3 w-full px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-600 font-medium text-left">
                {error}
              </p>
            </div>
          )}
          {/* ← TAMBAHAN: opsi Hapus Paksa, hanya muncul setelah hapus biasa
              gagal. Dipakai untuk kasus dokumen salah input yang memang
              harus dihapus total meski masih terikat data lain. */}
          {error && (
            <div className="mt-3 w-full px-3 py-3 bg-amber-50 border border-amber-200 rounded-lg text-left">
              <p className="text-xs font-bold text-amber-800 mb-1">
                Tetap ingin menghapus paksa?
              </p>
              <p className="text-xs text-amber-700 mb-2">
                Ini akan otomatis memutus tautan revisi (dokumen anak tidak
                ikut terhapus, hanya kehilangan referensi ke dokumen ini)
                dan menghapus riwayat distribusi yang terkait dengan
                dokumen ini secara permanen. Gunakan hanya jika dokumen ini
                memang salah input dan harus lenyap total.
              </p>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmForce}
                  onChange={(e) => setConfirmForce(e.target.checked)}
                  className="mt-0.5 w-3.5 h-3.5 rounded border-amber-300 text-amber-600 accent-amber-600 cursor-pointer"
                />
                <span className="text-xs text-amber-800">
                  Saya paham risikonya dan tetap ingin menghapus paksa.
                </span>
              </label>
            </div>
          )}
        </div>
        <div className="flex gap-2 px-6 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all"
          >
            {error ? "Tutup" : "Batal"}
          </button>
          {!error && (
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-all"
            >
              {loading ? "Menghapus..." : "Hapus Permanen"}
            </button>
          )}
          {error && (
            <button
              onClick={onForceConfirm}
              disabled={!confirmForce || forceLoading}
              className="flex-1 px-4 py-2.5 text-sm font-bold bg-amber-600 text-white rounded-xl hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {forceLoading ? "Menghapus Paksa..." : "Hapus Paksa"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Bulk Delete Modal ────────────────────────────────────────────────────
function BulkDeleteModal({
  count,
  onConfirm,
  onCancel,
  loading,
  errors,
}: {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  errors?: string[];
}) {
  const hasErrors = errors && errors.length > 0;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-sm font-bold text-slate-800 mb-1">
            Hapus Permanen
          </h2>
          {!hasErrors && (
            <>
              <p className="text-sm text-slate-500">
                Hapus{" "}
                <span className="font-semibold text-slate-700">
                  {count} dokumen
                </span>{" "}
                yang dipilih?
              </p>
              <p className="text-xs text-red-400 mt-1 font-medium">
                ⚠ Semua dokumen akan dihapus permanen dan tidak bisa
                dipulihkan.
              </p>
            </>
          )}
          {/* ← TAMBAHAN: tampilkan daftar dokumen yang gagal dihapus */}
          {hasErrors && (
            <div className="mt-1 w-full max-h-40 overflow-y-auto px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-left">
              <p className="text-xs font-bold text-red-700 mb-1">
                {errors!.length} dokumen gagal dihapus:
              </p>
              <ul className="space-y-1">
                {errors!.map((e, i) => (
                  <li key={i} className="text-xs text-red-600">
                    • {e}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="flex gap-2 px-6 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all"
          >
            {hasErrors ? "Tutup" : "Batal"}
          </button>
          {!hasErrors && (
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-all"
            >
              {loading ? "Menghapus..." : `Hapus ${count} Dokumen`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function getRowClass(status: string, isChild: boolean) {
  if (isChild) return "bg-red-100 hover:bg-red-200";
  if (status === "terbaru") return "bg-white hover:bg-emerald-50";
  if (status === "kadaluarsa") return "bg-red-100 hover:bg-red-200";
  return "bg-white hover:bg-slate-50";
}

// ─── Mark-as-Deleted (Soft Delete) Modal ──────────────────────────────────
// Beda dengan DeleteModal (hapus permanen dari database), modal ini hanya
// mengubah status dokumen menjadi "dihapus" — dokumen tetap ada di database
// dan bisa dipulihkan lewat halaman Trash.
function MarkDeletedModal({
  doc,
  onConfirm,
  onCancel,
  loading,
  error,
}: {
  doc: Doc;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  error?: string | null;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-3">
            <ArchiveBoxXMarkIcon className="w-6 h-6 text-amber-600" />
          </div>
          <h2 className="text-sm font-bold text-slate-800 mb-1">
            Tandai Sebagai Dihapus
          </h2>
          <p className="text-sm text-slate-500">
            Ubah status{" "}
            <span className="font-semibold text-slate-700">"{doc.title}"</span>{" "}
            (Rev. {doc.revision}) dari{" "}
            <span className="font-mono text-xs">kadaluarsa</span> menjadi{" "}
            <span className="font-mono text-xs">dihapus</span>?
          </p>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Dokumen akan pindah ke Trash. Tidak permanen — masih bisa
            dipulihkan lagi kapan saja lewat halaman Trash.
          </p>
          {error && (
            <div className="mt-3 w-full px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-600 font-medium text-left">
                {error}
              </p>
            </div>
          )}
        </div>
        <div className="flex gap-2 px-6 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all"
          >
            {error ? "Tutup" : "Batal"}
          </button>
          {!error && (
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-bold bg-amber-600 text-white rounded-xl hover:bg-amber-700 disabled:opacity-50 transition-all"
            >
              {loading ? "Memproses..." : "Ya, Tandai Dihapus"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── DocumentGroupRow ─────────────────────────────────────────────────────
function DocumentGroupRow({
  group,
  isExpanded,
  onToggle,
  categorySelected,
  cfg,
  isAdmin,
  setDeleteTarget,
  setStatusTarget,
  selectedIds,
  onToggleSelect,
  basePath,
}: {
  group: { latest: Doc; history: Doc[] };
  isExpanded: boolean;
  onToggle: () => void;
  categorySelected: boolean;
  cfg: any;
  isAdmin: boolean;
  setDeleteTarget: (d: Doc) => void;
  setStatusTarget: (d: Doc) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  basePath: string;
}) {
  const hasHistory = group.history.length > 0;

  const renderCells = (doc: Doc, isChild: boolean) => (
    <>
      {isAdmin && (
        <td className="pl-4 pr-2 py-4">
          <input
            type="checkbox"
            checked={selectedIds.has(doc.id)}
            onChange={() => onToggleSelect(doc.id)}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 rounded border-slate-300 text-red-600 accent-red-600 cursor-pointer"
          />
        </td>
      )}
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          {!isChild && (
            <button
              onClick={onToggle}
              disabled={!hasHistory}
              className={`p-1 rounded transition-all ${
                hasHistory
                  ? "hover:bg-slate-200 text-slate-500"
                  : "text-transparent cursor-default"
              }`}
            >
              {isExpanded ? (
                <ChevronDownIcon className="w-3.5 h-3.5" />
              ) : (
                <ChevronRightIcon className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          {isChild && <div className="w-5 h-px bg-slate-300 ml-4"></div>}
          <span className="font-mono text-xs font-bold text-slate-700 whitespace-nowrap">
            {doc.doc_number}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 max-w-[220px]">
        <p
          className={`text-xs truncate ${
            isChild ? "text-slate-500" : "text-slate-700"
          }`}
        >
          {doc.title}
        </p>
        {!isChild && (
          <p className="text-[10px] text-slate-400 mt-0.5">{doc.type_name}</p>
        )}
      </td>
      <td className="px-6 py-4">
        <span
          className={`font-mono text-xs ${
            isChild ? "text-slate-400" : "text-slate-700"
          }`}
        >
          Rev. {doc.revision}
        </span>
      </td>
      {!categorySelected && (
        <td className="px-6 py-4">
          <span className="text-xs text-slate-500">{doc.category_name}</span>
        </td>
      )}
      <td className="px-6 py-4">
        <p className="font-mono text-xs text-slate-700">
          {doc.effective_date ? (
            new Date(doc.effective_date).toLocaleDateString("id-ID")
          ) : (
            <span className="text-slate-300">—</span>
          )}
        </p>
      </td>
      {categorySelected && cfg.showDepartmentCol && (
        <td className="px-6 py-4">
          {doc.department_code ? (
            <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
              {doc.department_code}
            </span>
          ) : (
            <span className="text-slate-300 text-xs">—</span>
          )}
        </td>
      )}
      {categorySelected && cfg.showRevisionDateCol && (
        <td className="px-6 py-4">
          <p className="font-mono text-xs text-slate-700">
            {doc.type_name.toLowerCase().includes("msds benang") ? (
              <span className="text-slate-300">—</span>
            ) : doc.revision_date ? (
              new Date(doc.revision_date).toLocaleDateString("id-ID")
            ) : (
              <span className="text-slate-300">—</span>
            )}
          </p>
        </td>
      )}
      {categorySelected && cfg.showExpiryDateCol && (
        <td className="px-6 py-4">
          <p className="font-mono text-xs text-slate-700">
            {doc.expiry_date ? (
              new Date(doc.expiry_date).toLocaleDateString("id-ID")
            ) : (
              <span className="text-slate-300">—</span>
            )}
          </p>
        </td>
      )}
      {categorySelected && cfg.showProductionTypeCol && (
        <td className="px-6 py-4">
          {doc.production_type ? (
            <span
              className={clsx(
                "px-2 py-1 rounded-full text-[10px] font-bold uppercase whitespace-nowrap",
                doc.production_type === "production" &&
                  "bg-blue-100 text-blue-700",
                doc.production_type === "non-production" &&
                  "bg-slate-100 text-slate-600",
                doc.production_type === "production bahan baku" &&
                  "bg-violet-100 text-violet-700"
              )}
            >
              {PRODUCTION_TYPE_LABEL[doc.production_type] ??
                doc.production_type}
            </span>
          ) : (
            <span className="text-slate-300 text-xs">—</span>
          )}
        </td>
      )}
      {!categorySelected && (
        <td className="px-6 py-4">
          {doc.department_code ? (
            <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
              {doc.department_code}
            </span>
          ) : (
            <span className="text-slate-300 text-xs">—</span>
          )}
        </td>
      )}
      <td className="px-6 py-4">
        <span
          className={clsx(
            "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
            doc.status === "terbaru"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700"
          )}
        >
          {doc.status}
        </span>
      </td>
      {isAdmin && (
        <td className="px-6 py-4">
          <div className="flex justify-end gap-1.5">
            {doc.status === "terbaru" && (
              <a
                href={`${basePath}/${doc.id}/edit`}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex"
              >
                <PencilIcon className="w-4 h-4" />
              </a>
            )}
            {/* ← TAMBAHAN: tandai dokumen kadaluarsa jadi "dihapus" (soft
                delete), tanpa perlu hapus permanen yang bisa gagal karena
                foreign key. */}
            {doc.status === "kadaluarsa" && (
              <button
                onClick={() => setStatusTarget(doc)}
                title="Tandai sebagai dihapus"
                className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
              >
                <ArchiveBoxXMarkIcon className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setDeleteTarget(doc)}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </td>
      )}
    </>
  );

  return (
    <>
      <tr
        className={clsx(
          "transition-colors border-b border-slate-100 last:border-none",
          selectedIds.has(group.latest.id)
            ? "bg-red-50"
            : getRowClass(group.latest.status, false)
        )}
      >
        {renderCells(group.latest, false)}
      </tr>
      {isExpanded &&
        group.history.map((oldDoc) => (
          <tr
            key={oldDoc.id}
            className={clsx(
              "transition-colors border-b border-white",
              selectedIds.has(oldDoc.id)
                ? "bg-red-50"
                : getRowClass(oldDoc.status, true)
            )}
          >
            {renderCells(oldDoc, true)}
          </tr>
        ))}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────
export default function DocumentsClient({
  documents,
  categories,
  departments,
  documentTypes,
  role,
  userId,
  basePath = "/dashboard/documents",
}: {
  documents: Doc[];
  categories: Category[];
  departments: Department[];
  documentTypes: DocType[];
  role: string;
  userId: string;
  basePath?: string;
}) {
  const isAdmin = role === "admin";
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Doc | null>(null);
  const [loading, setLoading] = useState(false);
  // ← TAMBAHAN: simpan pesan error saat penghapusan gagal, supaya bisa
  // ditampilkan ke user alih-alih diam-diam diabaikan.
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // ← TAMBAHAN: loading state terpisah untuk aksi "Hapus Paksa"
  const [forceDeleteLoading, setForceDeleteLoading] = useState(false);
  const [bulkDeleteErrors, setBulkDeleteErrors] = useState<string[]>([]);
  // ← TAMBAHAN: state untuk aksi "tandai sebagai dihapus" (soft delete
  // status kadaluarsa -> dihapus, per satu baris/revisi saja).
  const [statusTarget, setStatusTarget] = useState<Doc | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("effective_date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {}
  );
  const [showExport, setShowExport] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Jika halaman per-kategori, otomatis set filter kategori
  const isCategoryPage = categories.length === 1;
  const activeCategoryName = isCategoryPage
    ? categories[0].name
    : categories.find((c) => c.id === filterCategory)?.name ?? "";
  const activeTypeName =
    documentTypes.find((t) => t.id === filterType)?.name ?? "";
  const cfg = getCategoryConfig(activeCategoryName, activeTypeName);
  const categorySelected = isCategoryPage || !!filterCategory;

  const filteredTypes = documentTypes.filter(
    (t) =>
      t.category_id === (isCategoryPage ? categories[0].id : filterCategory)
  );

  function handleCategoryChange(val: string) {
    setFilterCategory(val);
    setFilterType("");
    setFilterDept("");
    setFilterStatus("");
    setCurrentPage(1);
  }

  function handleFilterChange(setter: (v: string) => void, val: string) {
    setter(val);
    setCurrentPage(1);
  }

  const toggleGroup = (docNumber: string) => {
    setExpandedGroups((prev) => ({ ...prev, [docNumber]: !prev[docNumber] }));
  };

  const groupedDocs = useMemo(() => {
    let filtered = documents.filter((d) => {
      const matchSearch =
        !search ||
        d.title.toLowerCase().includes(search.toLowerCase()) ||
        d.doc_number.toLowerCase().includes(search.toLowerCase());
      const matchCat = isCategoryPage
        ? true
        : !filterCategory || d.category_id === filterCategory;
      const matchType = !filterType || d.type_id === filterType;
      const matchDept = !filterDept || d.department_id === filterDept;
      const matchStatus = !filterStatus || d.status === filterStatus;
      return matchSearch && matchCat && matchType && matchDept && matchStatus;
    });

    const groups: Record<string, Doc[]> = {};
    filtered.forEach((d) => {
      if (!groups[d.doc_number]) groups[d.doc_number] = [];
      groups[d.doc_number].push(d);
    });

    let result = Object.values(groups).map((group) => {
      group.sort(
        (a, b) =>
          new Date(b.effective_date).getTime() -
          new Date(a.effective_date).getTime()
      );
      const latestIdx = group.findIndex((d) => d.status === "terbaru");
      const latest = latestIdx >= 0 ? group[latestIdx] : group[0];
      const history = group.filter((d) => d.id !== latest.id);
      return { latest, history };
    });

    result.sort((a, b) => {
      let valA: any = a.latest[sortKey] ?? "";
      let valB: any = b.latest[sortKey] ?? "";
      if (sortKey === "effective_date") {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [
    documents,
    search,
    filterCategory,
    filterType,
    filterDept,
    filterStatus,
    sortKey,
    sortOrder,
    isCategoryPage,
  ]);

  // ← TAMBAHAN: total dokumen (flat, termasuk histori revisi) yang cocok
  // dengan filter & pencarian yang sedang aktif. Reaktif otomatis karena
  // groupedDocs sudah bergantung pada search/filterCategory/filterType/
  // filterDept/filterStatus.
  const filteredCount = useMemo(
    () => groupedDocs.reduce((acc, g) => acc + 1 + g.history.length, 0),
    [groupedDocs]
  );

  // Jumlah grup dokumen (unik per doc_number) yang cocok filter — berguna
  // kalau ingin ditampilkan terpisah dari total termasuk histori.
  const filteredGroupCount = groupedDocs.length;

  const visibleIdsOnPage = useMemo(() => {
    const ids: string[] = [];
    const paginated = groupedDocs.slice(
      (currentPage - 1) * PAGE_SIZE,
      currentPage * PAGE_SIZE
    );
    paginated.forEach((group) => {
      ids.push(group.latest.id);
      if (expandedGroups[group.latest.doc_number]) {
        group.history.forEach((h) => ids.push(h.id));
      }
    });
    return ids;
  }, [groupedDocs, currentPage, expandedGroups]);

  const isAllPageSelected =
    visibleIdsOnPage.length > 0 &&
    visibleIdsOnPage.every((id) => selectedIds.has(id));
  const isIndeterminate =
    !isAllPageSelected && visibleIdsOnPage.some((id) => selectedIds.has(id));

  function toggleSelectAll() {
    if (isAllPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleIdsOnPage.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleIdsOnPage.forEach((id) => next.add(id));
        return next;
      });
    }
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setLoading(true);
    setDeleteError(null);
    const result = await permanentDeleteDocument(deleteTarget.id);
    setLoading(false);

    // ← PERBAIKAN: kalau server mengembalikan error, tampilkan ke user dan
    // jangan tutup modal seolah-olah berhasil.
    if (result?.error) {
      setDeleteError(result.error);
      return;
    }

    setDeleteTarget(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(deleteTarget.id);
      return next;
    });
  }

  // ← TAMBAHAN: hapus paksa — dipakai setelah hapus biasa gagal karena
  // dokumen masih terikat (parent_id / distribution_items). Fungsi ini
  // memutus tautan tsb terlebih dulu lalu menghapus dokumennya.
  async function handleForceDelete() {
    if (!deleteTarget) return;
    setForceDeleteLoading(true);
    const result = await forceDeleteDocument(deleteTarget.id);
    setForceDeleteLoading(false);

    if (result?.error) {
      // Tetap tampilkan error terbaru (menimpa pesan sebelumnya) supaya
      // user tahu kenapa hapus paksa pun masih gagal.
      setDeleteError(result.error);
      return;
    }

    setDeleteTarget(null);
    setDeleteError(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(deleteTarget.id);
      return next;
    });
  }

  async function handleBulkDelete() {
    setLoading(true);
    setBulkDeleteErrors([]);

    const idsToDelete = Array.from(selectedIds);
    const results = await Promise.all(
      idsToDelete.map(async (id) => ({
        id,
        result: await permanentDeleteDocument(id),
      }))
    );
    setLoading(false);

    // ← PERBAIKAN: kumpulkan dokumen mana saja yang gagal dihapus beserta
    // alasannya, alih-alih mengabaikan hasilnya begitu saja.
    const failed = results.filter((r) => r.result?.error);
    const succeededIds = results
      .filter((r) => !r.result?.error)
      .map((r) => r.id);

    // Hapus dari daftar pilihan hanya yang benar-benar berhasil dihapus,
    // supaya yang gagal tetap tercentang dan bisa dicoba lagi / dilihat.
    setSelectedIds((prev) => {
      const next = new Set(prev);
      succeededIds.forEach((id) => next.delete(id));
      return next;
    });

    if (failed.length > 0) {
      const messages = failed.map((f) => {
        const doc = documents.find((d) => d.id === f.id);
        const label = doc ? `${doc.doc_number} (${doc.title})` : f.id;
        return `${label}: ${f.result?.error}`;
      });
      setBulkDeleteErrors(messages);
      return; // biarkan modal terbuka menampilkan daftar error
    }

    setShowBulkDeleteModal(false);
    setSelectedIds(new Set());
  }

  // ← TAMBAHAN: handler untuk menandai satu dokumen (biasanya berstatus
  // "kadaluarsa" karena salah input) menjadi "dihapus". Ini soft delete —
  // hanya mengubah status, tidak menyentuh baris/relasi lain sama sekali,
  // jadi tidak akan pernah gagal karena foreign key seperti hapus permanen.
  async function handleMarkDeleted() {
    if (!statusTarget) return;
    setStatusLoading(true);
    setStatusError(null);
    const result = await markDocumentAsDeleted(statusTarget.id);
    setStatusLoading(false);

    if (result?.error) {
      setStatusError(result.error);
      return;
    }

    setStatusTarget(null);
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(groupedDocs.length / PAGE_SIZE);
  const paginatedDocs = groupedDocs.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const SortableHeader = ({
    label,
    sortKeyParam,
  }: {
    label: string;
    sortKeyParam: SortKey;
  }) => {
    const isActive = sortKey === sortKeyParam;
    return (
      <th
        className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 hover:text-slate-600 transition-colors group select-none"
        onClick={() => handleSort(sortKeyParam)}
      >
        <div className="flex items-center gap-1.5">
          {label}
          <span className="text-slate-300 group-hover:text-slate-400">
            {!isActive ? (
              <ChevronUpDownIcon className="w-3.5 h-3.5" />
            ) : sortOrder === "asc" ? (
              <ChevronUpIcon className="w-3.5 h-3.5 text-blue-600" />
            ) : (
              <ChevronDownIcon className="w-3.5 h-3.5 text-blue-600" />
            )}
          </span>
        </div>
      </th>
    );
  };

  const StaticHeader = ({ label }: { label: string }) => (
    <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
      {label}
    </th>
  );

  const hasAnyFilter =
    (!isCategoryPage &&
      (filterCategory || filterType || filterDept || filterStatus)) ||
    (isCategoryPage && (filterType || filterDept || filterStatus));
  const totalDokumen = documents.length;
  const totalTerbaru = documents.filter((d) => d.status === "terbaru").length;
  const totalKadaluarsa = documents.filter(
    (d) => d.status === "kadaluarsa"
  ).length;

  const colCount =
    (isAdmin ? 1 : 0) +
    5 +
    (categorySelected
      ? (cfg.showDepartmentCol ? 1 : 0) +
        (cfg.showRevisionDateCol ? 1 : 0) +
        (cfg.showExpiryDateCol ? 1 : 0) +
        (cfg.showProductionTypeCol ? 1 : 0)
      : 1) +
    1 +
    (isAdmin ? 1 : 0);

  const renderMobileCard = (doc: Doc, isChild: boolean = false) => (
    <div
      key={doc.id}
      className={clsx(
        "border rounded-2xl px-4 py-3 shadow-sm relative transition-colors",
        selectedIds.has(doc.id) &&
          "ring-2 ring-red-400 border-red-300 bg-red-50",
        !selectedIds.has(doc.id) &&
          isChild &&
          "ml-4 border-dashed bg-slate-50/70 border-slate-200",
        !selectedIds.has(doc.id) &&
          !isChild &&
          doc.status === "terbaru" &&
          "bg-white border-slate-200",
        !selectedIds.has(doc.id) &&
          !isChild &&
          doc.status === "kadaluarsa" &&
          "bg-amber-50/40 border-amber-100"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 w-full">
          {isAdmin && (
            <input
              type="checkbox"
              checked={selectedIds.has(doc.id)}
              onChange={() => toggleSelectOne(doc.id)}
              className="mt-1 w-4 h-4 rounded border-slate-300 text-red-600 accent-red-600 cursor-pointer shrink-0"
            />
          )}
          <div className="min-w-0 w-full">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-slate-700 whitespace-nowrap">
                {doc.doc_number}
              </span>
              <span className="text-[10px] text-slate-400">
                Rev. {doc.revision}
              </span>
              <span
                className={clsx(
                  "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                  doc.status === "terbaru"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                )}
              >
                {doc.status}
              </span>
            </div>
            <p className="font-medium text-slate-800 text-sm mt-1 truncate">
              {doc.title}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {doc.category_name} · {doc.type_name}
            </p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-1 shrink-0">
            {doc.status === "terbaru" && (
              <a
                href={`${basePath}/${doc.id}/edit`}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex"
              >
                <PencilIcon className="w-4 h-4" />
              </a>
            )}
            {/* ← TAMBAHAN: tandai dokumen kadaluarsa jadi "dihapus" */}
            {doc.status === "kadaluarsa" && (
              <button
                onClick={() => setStatusTarget(doc)}
                title="Tandai sebagai dihapus"
                className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
              >
                <ArchiveBoxXMarkIcon className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setDeleteTarget(doc)}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const paginatedGroupsMobile = groupedDocs.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600 shrink-0">
            <DocumentTextIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Total Dokumen
            </p>
            <p className="text-2xl font-bold text-slate-900">{totalDokumen}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 shrink-0">
            <CheckBadgeIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Dokumen Terbaru
            </p>
            <p className="text-2xl font-bold text-slate-900">{totalTerbaru}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600 shrink-0">
            <ClockIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Dokumen Kadaluarsa
            </p>
            <p className="text-2xl font-bold text-slate-900">
              {totalKadaluarsa}
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nomor / judul dokumen..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowExport(true)}
            className="px-4 py-2.5 text-sm font-bold border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
          >
            <DocumentTextIcon className="w-4 h-4" /> Export Excel
          </button>
          {isAdmin && (
            <a
              href={`${basePath}/new`}
              className="flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all active:scale-95 shrink-0"
            >
              <PlusIcon className="w-4 h-4" /> Tambah Dokumen
            </a>
          )}
          {/* Trash hanya tampil di halaman utama documents */}
          {isAdmin && basePath === "/dashboard/documents" && (
            <a
              href="/dashboard/documents/trash"
              className="flex items-center justify-center gap-2 bg-red-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-red-700 transition-all active:scale-95 shrink-0"
            >
              <TrashIcon className="w-4 h-4" /> Trash
            </a>
          )}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* Filter kategori hanya tampil jika bukan halaman per-kategori */}
          {!isCategoryPage && (
            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="pl-8 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
              >
                <option value="">Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
            </div>
          )}

          {categorySelected && (
            <div className="relative">
              <select
                value={filterType}
                onChange={(e) =>
                  handleFilterChange(setFilterType, e.target.value)
                }
                className="px-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
              >
                <option value="">Semua Jenis</option>
                {filteredTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
            </div>
          )}

          {categorySelected && cfg.showDepartmentFilter && (
            <div className="relative">
              <select
                value={filterDept}
                onChange={(e) =>
                  handleFilterChange(setFilterDept, e.target.value)
                }
                className="px-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
              >
                <option value="">Semua Departemen</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    [{d.code}] {d.name}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
            </div>
          )}

          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) =>
                handleFilterChange(setFilterStatus, e.target.value)
              }
              className="px-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
            >
              <option value="">Semua Status</option>
              <option value="terbaru">Terbaru</option>
              <option value="kadaluarsa">Kadaluarsa</option>
            </select>
            <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
          </div>

          {hasAnyFilter && (
            <button
              onClick={() => {
                setFilterCategory("");
                setFilterType("");
                setFilterDept("");
                setFilterStatus("");
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-red-600 border border-slate-200 rounded-xl hover:border-red-200 hover:bg-red-50 transition-all"
            >
              Reset filter
            </button>
          )}
        </div>

        {/* ← TAMBAHAN: info jumlah dokumen sesuai filter/pencarian aktif */}
        <div className="px-1">
          <p className="text-xs text-slate-500">
            Menampilkan{" "}
            <span className="font-bold text-slate-700">{filteredCount}</span>{" "}
            dari{" "}
            <span className="font-semibold text-slate-600">
              {totalDokumen}
            </span>{" "}
            dokumen
            {filteredGroupCount !== filteredCount && (
              <span className="text-slate-400">
                {" "}
                ({filteredGroupCount} nomor dokumen)
              </span>
            )}
            {(hasAnyFilter || search) && (
              <span className="text-blue-500 font-medium">
                {" "}
                — sesuai filter aktif
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Bulk action bar */}
      {isAdmin && selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-red-700">
              {selectedIds.size} dokumen dipilih
            </span>
            <button
              onClick={clearSelection}
              className="text-xs text-red-400 hover:text-red-600 underline underline-offset-2 transition-colors"
            >
              Batalkan pilihan
            </button>
          </div>
          <button
            onClick={() => {
              setBulkDeleteErrors([]);
              setShowBulkDeleteModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-all active:scale-95"
          >
            <TrashIcon className="w-4 h-4" /> Hapus {selectedIds.size} Dokumen
          </button>
        </div>
      )}

      {/* Table desktop */}
      <div className="hidden sm:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {isAdmin && (
                  <th className="pl-4 pr-2 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isIndeterminate;
                      }}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-red-600 accent-red-600 cursor-pointer"
                    />
                  </th>
                )}
                <SortableHeader label="No. Dok" sortKeyParam="doc_number" />
                <SortableHeader label="Judul" sortKeyParam="title" />
                <SortableHeader label="Rev" sortKeyParam="revision" />
                {!categorySelected && (
                  <SortableHeader
                    label="Kategori"
                    sortKeyParam="category_name"
                  />
                )}
                <SortableHeader
                  label="Tgl Efektif"
                  sortKeyParam="effective_date"
                />
                {categorySelected && cfg.showDepartmentCol && (
                  <SortableHeader label="Dept" sortKeyParam="department_code" />
                )}
                {categorySelected && cfg.showRevisionDateCol && (
                  <StaticHeader label="Tgl Revisi" />
                )}
                {categorySelected && cfg.showExpiryDateCol && (
                  <StaticHeader label="Masa Berlaku" />
                )}
                {categorySelected && cfg.showProductionTypeCol && (
                  <StaticHeader label="Prod. Type" />
                )}
                {!categorySelected && (
                  <SortableHeader label="Dept" sortKeyParam="department_code" />
                )}
                <SortableHeader label="Status" sortKeyParam="status" />
                {isAdmin && (
                  <th className="text-right px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    Aksi
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedDocs.length === 0 && (
                <tr>
                  <td
                    colSpan={colCount}
                    className="px-6 py-12 text-center text-slate-400 text-sm"
                  >
                    Tidak ada dokumen ditemukan.
                  </td>
                </tr>
              )}
              {paginatedDocs.map((group) => (
                <DocumentGroupRow
                  key={group.latest.doc_number}
                  group={group}
                  isExpanded={!!expandedGroups[group.latest.doc_number]}
                  onToggle={() => toggleGroup(group.latest.doc_number)}
                  categorySelected={categorySelected}
                  cfg={cfg}
                  isAdmin={isAdmin}
                  setDeleteTarget={setDeleteTarget}
                  setStatusTarget={setStatusTarget}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelectOne}
                  basePath={basePath}
                />
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Card list mobile */}
      <div className="sm:hidden space-y-3">
        {isAdmin && paginatedGroupsMobile.length > 0 && (
          <div className="flex items-center gap-2 px-1">
            <input
              type="checkbox"
              checked={isAllPageSelected}
              ref={(el) => {
                if (el) el.indeterminate = isIndeterminate;
              }}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-slate-300 text-red-600 accent-red-600 cursor-pointer"
            />
            <span className="text-xs text-slate-500">
              Pilih semua di halaman ini
            </span>
          </div>
        )}
        {paginatedGroupsMobile.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-sm">
            Tidak ada dokumen ditemukan.
          </div>
        )}
        {paginatedGroupsMobile.map((group) => {
          const isExpanded = !!expandedGroups[group.latest.doc_number];
          const hasHistory = group.history.length > 0;
          return (
            <div key={group.latest.doc_number} className="space-y-1.5">
              {renderMobileCard(group.latest, false)}
              {hasHistory && (
                <button
                  onClick={() => toggleGroup(group.latest.doc_number)}
                  className="w-full flex justify-center items-center gap-1.5 py-2 text-[11px] font-medium text-slate-400 hover:text-blue-600 transition-colors"
                >
                  {isExpanded
                    ? "Sembunyikan Riwayat"
                    : `Lihat Riwayat Revisi (${group.history.length})`}
                  {isExpanded ? (
                    <ChevronUpIcon className="w-3 h-3" />
                  ) : (
                    <ChevronDownIcon className="w-3 h-3" />
                  )}
                </button>
              )}
              {isExpanded &&
                group.history.map((oldDoc) => renderMobileCard(oldDoc, true))}
            </div>
          );
        })}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {deleteTarget && (
        <DeleteModal
          doc={deleteTarget}
          onConfirm={handleDelete}
          onForceConfirm={handleForceDelete}
          onCancel={() => {
            setDeleteTarget(null);
            setDeleteError(null);
          }}
          loading={loading}
          forceLoading={forceDeleteLoading}
          error={deleteError}
        />
      )}
      {showBulkDeleteModal && (
        <BulkDeleteModal
          count={selectedIds.size}
          onConfirm={handleBulkDelete}
          onCancel={() => {
            setShowBulkDeleteModal(false);
            setBulkDeleteErrors([]);
          }}
          loading={loading}
          errors={bulkDeleteErrors}
        />
      )}
      {/* ← TAMBAHAN: modal konfirmasi "tandai sebagai dihapus" */}
      {statusTarget && (
        <MarkDeletedModal
          doc={statusTarget}
          onConfirm={handleMarkDeleted}
          onCancel={() => {
            setStatusTarget(null);
            setStatusError(null);
          }}
          loading={statusLoading}
          error={statusError}
        />
      )}
      {showExport && (
        <ExportDocumentModal
          categories={categories}
          documentTypes={documentTypes}
          departments={departments}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
