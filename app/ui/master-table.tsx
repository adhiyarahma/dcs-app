"use client";

import { useState } from "react";
import clsx from "clsx";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  FolderIcon,
  BuildingOfficeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon,
  ChevronDownIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "@/app/lib/actions";

type Head = { name: string; title: string };
type Item = {
  id: string;
  name: string;
  subtitle?: string;
  created_at?: string;
  heads?: Head[];
  // head_title?: string | null;
};
type TableType = "category" | "department";

const PAGE_SIZE = 5;

// ─── Pagination Component ─────────────────────────────────────────────────
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

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function DeleteModal({
  item,
  onConfirm,
  onCancel,
  loading,
}: {
  item: Item;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
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
            Konfirmasi Hapus
          </h2>
          <p className="text-sm text-slate-500">
            Hapus{" "}
            <span className="font-semibold text-slate-700">"{item.name}"</span>?
          </p>
          <p className="text-xs text-red-500 mt-3 bg-red-50 px-3 py-2 rounded-lg w-full">
            Tindakan ini tidak dapat dibatalkan.
          </p>
        </div>
        <div className="flex gap-2 px-6 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-all"
          >
            {loading ? "Menghapus..." : "Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MasterTable({
  type,
  items,
}: {
  type: TableType;
  items: Item[];
}) {
  const [search, setSearch] = useState("");
  const [filterSort, setFilterSort] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isCategory = type === "category";
  const label = isCategory ? "Kategori" : "Departemen";
  const Icon = isCategory ? FolderIcon : BuildingOfficeIcon;

  // ─── FILTER & SORTING LOGIC ──────────────────────────────────────────────
  let processedItems = items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      (i.subtitle?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (i.heads?.[0]?.name?.toLowerCase().includes(search.toLowerCase()) ??
        false)
  );

  if (filterSort === "asc") {
    processedItems.sort((a, b) => a.name.localeCompare(b.name));
  } else if (filterSort === "desc") {
    processedItems.sort((a, b) => b.name.localeCompare(a.name));
  }

  // ─── PAGINATION LOGIC ────────────────────────────────────────────────────
  const totalPages = Math.ceil(processedItems.length / PAGE_SIZE);
  const paginatedItems = processedItems.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const result = isCategory
      ? await createCategory(fd)
      : await createDepartment(fd);
    setLoading(false);
    if (result?.error) setError(result.error);
    else setShowCreate(false);
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editItem) return;
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const result = isCategory
      ? await updateCategory(editItem.id, fd)
      : await updateDepartment(editItem.id, fd);
    setLoading(false);
    if (result?.error) setError(result.error);
    else setEditItem(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setLoading(true);
    const result = isCategory
      ? await deleteCategory(deleteTarget.id)
      : await deleteDepartment(deleteTarget.id);
    setLoading(false);
    if (result?.error) setError(result.error);
    else setDeleteTarget(null);
  }

  function FormFields({ defaultValues }: { defaultValues?: Item }) {
    const [heads, setHeads] = useState<Head[]>(
      defaultValues?.heads ?? [{ name: "", title: "" }]
    );

    const updateHead = (index: number, key: keyof Head, value: string) => {
      const newHeads = [...heads];
      newHeads[index][key] = value;
      setHeads(newHeads);
    };

    if (isCategory) {
      return (
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Nama Kategori
          </label>
          <input
            name="name"
            defaultValue={defaultValues?.name}
            required
            placeholder="contoh: Dokumen QESH"
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
          />
        </div>
      );
    }
    return (
      <div className="space-y-4">
        {/* Kode */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Kode
          </label>
          <input
            name="code"
            defaultValue={defaultValues?.subtitle}
            required
            placeholder="contoh: IQD"
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all uppercase"
          />
        </div>
        {/* Nama Departemen */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Nama Departemen
          </label>
          <input
            name="name"
            defaultValue={defaultValues?.name}
            required
            placeholder="contoh: Qualitas"
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
          />
        </div>
        {/* Divider */}
        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <UserIcon className="w-3 h-3" /> Kepala Departemen
            </p>
            <button
              type="button"
              onClick={() => setHeads([...heads, { name: "", title: "" }])}
              className="text-xs text-blue-600 font-bold hover:underline"
            >
              + Tambah
            </button>
          </div>

          <div className="space-y-3">
            {heads.map((head, index) => (
              <div
                key={index}
                className="bg-slate-50 p-3 rounded-xl border border-slate-100 relative"
              >
                <input
                  name={`head_name_${index}`}
                  value={head.name}
                  onChange={(e) => updateHead(index, "name", e.target.value)}
                  placeholder="Nama"
                  className="w-full bg-transparent border-b border-slate-200 py-1 text-sm outline-none focus:border-blue-500"
                />
                <input
                  name={`head_title_${index}`}
                  value={head.title}
                  onChange={(e) => updateHead(index, "title", e.target.value)}
                  placeholder="Jabatan"
                  className="w-full bg-transparent border-b border-slate-200 py-1 text-sm outline-none focus:border-blue-500 mt-2"
                />
                {heads.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setHeads(heads.filter((_, i) => i !== index))
                    }
                    className="absolute top-2 right-2 text-slate-400 hover:text-red-500"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {/* Input tersembunyi untuk kirim data ke Action */}
          <input
            type="hidden"
            name="heads_json"
            value={JSON.stringify(heads)}
          />
        </div>
      </div>
    );
  }

  function FormActions({
    onCancel,
    submitLabel,
  }: {
    onCancel: () => void;
    submitLabel: string;
  }) {
    return (
      <div className="flex gap-2 justify-end pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all"
        >
          {loading ? "Menyimpan..." : submitLabel}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stat card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
        <div className="p-3 bg-blue-50 rounded-xl text-blue-600 shrink-0">
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Total {label}
          </p>
          <p className="text-2xl font-bold text-slate-900">{items.length}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={`Cari ${label.toLowerCase()}...`}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <button
            onClick={() => {
              setShowCreate(true);
              setEditItem(null);
              setError("");
            }}
            className="flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all active:scale-95 shrink-0"
          >
            <PlusIcon className="w-4 h-4" />
            Tambah {label}
          </button>
        </div>

        {/* Dropdown Filter */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterSort}
              onChange={(e) => {
                setFilterSort(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
            >
              <option value="">Urutan Default</option>
              <option value="asc">Nama (A - Z)</option>
              <option value="desc">Nama (Z - A)</option>
            </select>
            <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
          </div>

          {filterSort && (
            <button
              onClick={() => {
                setFilterSort("");
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-red-600 border border-slate-200 rounded-xl hover:border-red-200 hover:bg-red-50 transition-all"
            >
              Reset filter
            </button>
          )}
        </div>
      </div>

      {error && !showCreate && !editItem && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Table — desktop */}
      <div className="hidden sm:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {!isCategory && (
                  <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    Kode
                  </th>
                )}
                <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  {label}
                </th>
                {!isCategory && (
                  <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    Kepala Departemen
                  </th>
                )}
                {isCategory && (
                  <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    Jumlah Tipe
                  </th>
                )}
                <th className="text-right px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedItems.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-10 text-center text-slate-400 text-sm"
                  >
                    Tidak ada data ditemukan.
                  </td>
                </tr>
              )}
              {paginatedItems.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  {!isCategory && (
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-100 uppercase">
                        {item.subtitle}
                      </span>
                    </td>
                  )}
                  <td className="px-6 py-4 font-medium text-slate-800 text-sm">
                    {item.name}
                  </td>
                  {!isCategory && (
                    <td className="px-6 py-4">
                      {item.heads?.[0]?.name ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                            <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                          <div>
                            {/* Cek isi objek dengan JSON.stringify untuk melihat nama properti aslinya */}
                            <p className="text-sm font-medium text-slate-700">
                              {item.heads?.[0]?.name}
                            </p>
                            {item.heads?.[0]?.title && (
                              <p className="text-xs text-slate-400">
                                {item.heads?.[0]?.title}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300 italic">
                          Belum diisi
                        </span>
                      )}
                    </td>
                  )}
                  {isCategory && (
                    <td className="px-6 py-4">
                      <a
                        href={`/dashboard/master/document-types?category=${item.id}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100 hover:bg-blue-100 transition-colors"
                      >
                        {item.subtitle} jenis
                      </a>
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditItem(item);
                          setShowCreate(false);
                          setError("");
                        }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteTarget(item);
                          setError("");
                        }}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
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

      {/* Card list — mobile */}
      <div className="sm:hidden space-y-2">
        {paginatedItems.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-sm">
            Tidak ada data ditemukan.
          </div>
        )}
        {paginatedItems.map((item) => (
          <div
            key={item.id}
            className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 shadow-sm"
          >
            <div className="min-w-0">
              {!isCategory && item.subtitle && (
                <span className="font-mono text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100 uppercase mr-2">
                  {item.subtitle}
                </span>
              )}
              <p className="font-medium text-slate-800 text-sm truncate mt-1">
                {item.name}
              </p>
              {/* Kepala departemen — mobile */}
              {!isCategory && item.heads?.[0]?.name && (
                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                  <UserIcon className="w-3 h-3 shrink-0" />
                  <span className="truncate">
                    {item.heads?.[0]?.name}
                    {item.heads?.[0]?.title
                      ? ` · ${item.heads?.[0]?.title}`
                      : ""}
                  </span>
                </p>
              )}
              {isCategory && item.subtitle && (
                <a
                  href={`/dashboard/master/document-types?category=${item.id}`}
                  className="inline-flex mt-1 items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100 hover:bg-blue-100 transition-colors"
                >
                  {item.subtitle} jenis dokumen →
                </a>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => {
                  setEditItem(item);
                  setShowCreate(false);
                  setError("");
                }}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setDeleteTarget(item);
                  setError("");
                }}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mt-3">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* Modal Tambah */}
      {showCreate && (
        <Modal title={`Tambah ${label}`} onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <FormFields />
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}
            <FormActions
              onCancel={() => setShowCreate(false)}
              submitLabel="Simpan"
            />
          </form>
        </Modal>
      )}

      {/* Modal Edit */}
      {editItem && (
        <Modal title={`Edit ${label}`} onClose={() => setEditItem(null)}>
          <form onSubmit={handleUpdate} className="space-y-4">
            <FormFields defaultValues={editItem} />
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}
            <FormActions
              onCancel={() => setEditItem(null)}
              submitLabel="Update"
            />
          </form>
        </Modal>
      )}

      {/* Modal Hapus */}
      {deleteTarget && (
        <DeleteModal
          item={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={loading}
        />
      )}
    </div>
  );
}
