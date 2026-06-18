"use client";

// app/dashboard/master/employees/EmployeesClient.tsx

import { useRef, useState, useTransition } from "react";
import * as XLSX from "xlsx";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowUpTrayIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import {
  createEmployee,
  updateEmployee,
  deleteEmployee,
  importEmployees,
} from "@/app/lib/actions";

// ─── Types ────────────────────────────────────────────────────────────────────
type Employee = {
  id: string;
  nik: string;
  name: string;
  join_date: string | null;
  created_at: string;
  department_code: string;
  department_name: string;
};

type Department = {
  id: string;
  code: string;
  name: string;
};

type ImportPreview = {
  nik: string;
  name: string;
  department_id: string | null;
  join_date: string | null;
  department_label: string;
  error?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function parseExcelDate(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "number" && value > 10000) {
    const d = new Date((value - 25569) * 86400 * 1000);
    return d.toISOString().split("T")[0];
  }
  if (typeof value === "string") {
    const s = value.trim();
    const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmy)
      return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  }
  return null;
}

// ─── Modal: Tambah / Edit ─────────────────────────────────────────────────────
function EmployeeModal({
  mode,
  employee,
  departments,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  employee?: Employee;
  departments: Department[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  // Cari department_id berdasarkan code + name
  const defaultDeptId =
    departments.find(
      (d) =>
        d.code === employee?.department_code &&
        d.name === employee?.department_name
    )?.id ?? "";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(formRef.current!);
    setError("");
    startTransition(async () => {
      const res =
        mode === "create"
          ? await createEmployee(fd)
          : await updateEmployee(employee!.id, fd);
      if ("error" in res) {
        setError(res.error ?? "Terjadi kesalahan.");
      } else {
        onSaved();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">
            {mode === "create" ? "Tambah Karyawan" : "Edit Karyawan"}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="px-6 py-5 space-y-4"
        >
          {/* NIK */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              NIK <span className="text-red-500">*</span>
            </label>
            <input
              name="nik"
              defaultValue={employee?.nik ?? ""}
              placeholder="Nomor Induk Karyawan"
              required
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Nama */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Nama <span className="text-red-500">*</span>
            </label>
            <input
              name="name"
              defaultValue={employee?.name ?? ""}
              placeholder="Nama lengkap karyawan"
              required
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Departemen */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Departemen
            </label>
            <select
              name="department_id"
              defaultValue={defaultDeptId}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all bg-white"
            >
              <option value="">— Pilih departemen —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} - {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tanggal Masuk */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Tanggal Masuk
            </label>
            <input
              type="date"
              name="join_date"
              defaultValue={employee?.join_date ?? ""}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {isPending ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal: Konfirmasi Hapus ───────────────────────────────────────────────────
function DeleteModal({
  employee,
  onClose,
  onDeleted,
}: {
  employee: Employee;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteEmployee(employee.id);
      if ("error" in res) setError(res.error ?? "Terjadi kesalahan.");
      else onDeleted();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                Hapus Karyawan
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-600 mt-3">
            Hapus karyawan{" "}
            <span className="font-medium text-slate-800">{employee.name}</span>{" "}
            (NIK: <span className="font-medium">{employee.nik}</span>)?
          </p>
          {error && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg mt-3">
              {error}
            </p>
          )}
          <div className="flex items-center justify-end gap-2 mt-5">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-60 transition-colors"
            >
              {isPending ? "Menghapus..." : "Ya, Hapus"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Import Excel ───────────────────────────────────────────────────────
function ImportModal({
  departments,
  onClose,
  onImported,
}: {
  departments: Department[];
  onClose: () => void;
  onImported: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<ImportPreview[]>([]);
  const [globalError, setGlobalError] = useState("");
  const [importDone, setImportDone] = useState(false);
  const [importCount, setImportCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const deptMap = new Map<string, string>();
  departments.forEach((d) => {
    deptMap.set(`${d.code} - ${d.name}`.toLowerCase(), d.id);
    deptMap.set(d.code.toLowerCase(), d.id);
  });

  function handleDownloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ["NIK", "Nama", "Departemen", "Tanggal Masuk"],
      [
        "",
        "",
        `Contoh: ${departments[0]?.code ?? "QA"} - ${
          departments[0]?.name ?? "Quality Assurance"
        }`,
        "Contoh: 01/01/2024",
      ],
    ]);
    ws["!cols"] = [{ wch: 18 }, { wch: 30 }, { wch: 35 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Karyawan");
    XLSX.writeFile(wb, "template_import_karyawan.xlsx");
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setGlobalError("");
    setPreview([]);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
          defval: "",
        });

        const rows: ImportPreview[] = rawRows
          .map((r) => {
            const nik = String(r["NIK"] ?? "").trim();
            const name = String(r["Nama"] ?? "").trim();
            const deptRaw = String(r["Departemen"] ?? "").trim();
            const join_date = parseExcelDate(r["Tanggal Masuk"]);
            const department_id = deptRaw
              ? deptMap.get(deptRaw.toLowerCase()) ?? null
              : null;

            let rowError = "";
            if (!nik) rowError = "NIK kosong";
            else if (!name) rowError = "Nama kosong";
            else if (deptRaw && !department_id)
              rowError = `Departemen "${deptRaw}" tidak ditemukan`;

            return {
              nik,
              name,
              department_id,
              join_date,
              department_label: deptRaw,
              error: rowError || undefined,
            };
          })
          .filter((r) => r.nik || r.name);

        setPreview(rows);
      } catch {
        setGlobalError("Gagal membaca file. Pastikan format .xlsx benar.");
      }
    };
    reader.readAsBinaryString(file);
  }

  const validRows = preview.filter((r) => !r.error);
  const errorRows = preview.filter((r) => r.error);

  function handleImport() {
    if (!validRows.length) return;
    startTransition(async () => {
      const res = await importEmployees(
        validRows.map(({ nik, name, department_id, join_date }) => ({
          nik,
          name,
          department_id,
          join_date,
        }))
      );
      if ("error" in res) {
        setGlobalError(res.error);
      } else {
        setImportCount(res.count);
        setImportDone(true);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-base font-semibold text-slate-800">
            Import Karyawan dari Excel
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {importDone ? (
          <div className="flex flex-col items-center justify-center gap-3 p-12">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircleIcon className="w-7 h-7 text-green-500" />
            </div>
            <p className="text-sm font-medium text-slate-700">
              {importCount} karyawan berhasil diimport
            </p>
            <button
              onClick={onImported}
              className="mt-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Selesai
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* Step 1 */}
              <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-700">
                    Langkah 1 — Unduh Template
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Isi file template lalu upload kembali di bawah.
                  </p>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex-shrink-0"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  Unduh Template
                </button>
              </div>

              {/* Step 2 */}
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  Langkah 2 — Upload File Excel
                </p>
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl p-6 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
                  <ArrowUpTrayIcon className="w-6 h-6 text-slate-400" />
                  <span className="text-xs text-slate-500">
                    Klik untuk pilih file .xlsx
                  </span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleFile}
                  />
                </label>
              </div>

              {/* Preview table */}
              {preview.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-700">
                      Preview ({preview.length} baris)
                    </p>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-green-600 font-medium">
                        {validRows.length} valid
                      </span>
                      {errorRows.length > 0 && (
                        <span className="text-red-500 font-medium">
                          {errorRows.length} error
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">
                            NIK
                          </th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">
                            Nama
                          </th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">
                            Departemen
                          </th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">
                            Tgl Masuk
                          </th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, i) => (
                          <tr
                            key={i}
                            className={`border-t border-slate-100 ${
                              row.error ? "bg-red-50" : ""
                            }`}
                          >
                            <td className="px-3 py-2 font-mono text-slate-700">
                              {row.nik || "-"}
                            </td>
                            <td className="px-3 py-2 text-slate-700">
                              {row.name || "-"}
                            </td>
                            <td className="px-3 py-2 text-slate-500">
                              {row.department_label || "-"}
                            </td>
                            <td className="px-3 py-2 text-slate-500">
                              {row.join_date ? formatDate(row.join_date) : "-"}
                            </td>
                            <td className="px-3 py-2">
                              {row.error ? (
                                <span className="text-red-500">
                                  {row.error}
                                </span>
                              ) : (
                                <span className="text-green-600 font-medium">
                                  ✓
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {globalError && (
                <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">
                  {globalError}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 flex-shrink-0">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleImport}
                disabled={isPending || validRows.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isPending
                  ? "Mengimport..."
                  : `Import ${validRows.length} Karyawan`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────
export default function EmployeesClient({
  initialEmployees,
  departments,
}: {
  initialEmployees: Employee[];
  departments: Department[];
}) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  // Setelah mutasi, re-fetch data via router.refresh() agar server component
  // mengambil data terbaru dari Supabase
  const [, startTransition] = useTransition();

  function refresh() {
    // Trigger re-render server component tanpa full page reload
    startTransition(() => {
      window.location.reload();
    });
  }

  // Filter
  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      e.name.toLowerCase().includes(q) ||
      e.nik.toLowerCase().includes(q) ||
      e.department_name.toLowerCase().includes(q) ||
      e.department_code.toLowerCase().includes(q);
    const matchDept = !filterDept || e.department_code === filterDept;
    return matchSearch && matchDept;
  });

  // Unique departments dari data karyawan untuk filter dropdown
  const deptOptions = Array.from(
    new Map(
      employees
        .filter((e) => e.department_code)
        .map((e) => [e.department_code, e.department_name])
    ).entries()
  ).sort(([a], [b]) => a.localeCompare(b));

  return (
    <>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6 mt-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Master Karyawan</h1>
          <p className="text-sm text-slate-400 mt-1">
            {employees.length} karyawan terdaftar
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <ArrowUpTrayIcon className="w-4 h-4" />
            Import Excel
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Tambah Karyawan
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, NIK, departemen..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
          />
        </div>
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
        >
          <option value="">Semua Departemen</option>
          {deptOptions.map(([code, name]) => (
            <option key={code} value={code}>
              {code} - {name}
            </option>
          ))}
        </select>
        {(search || filterDept) && (
          <button
            onClick={() => {
              setSearch("");
              setFilterDept("");
            }}
            className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className="text-sm font-medium text-slate-500">
              Tidak ada data karyawan
            </p>
            <p className="text-xs text-slate-400">
              {search || filterDept
                ? "Coba ubah filter pencarian"
                : "Mulai tambah karyawan dengan klik tombol di atas"}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-600 text-xs">
                  No
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 text-xs">
                  NIK
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 text-xs">
                  Nama
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 text-xs">
                  Departemen
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 text-xs">
                  Tgl Masuk
                </th>
                <th className="px-4 py-3 text-xs" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp, i) => (
                <tr
                  key={emp.id}
                  className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
                >
                  <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    {emp.nik}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {emp.name}
                  </td>
                  <td className="px-4 py-3">
                    {emp.department_code ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-xs font-medium text-slate-600">
                        {emp.department_code}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {formatDate(emp.join_date)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditTarget(emp)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(emp)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Hapus"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer count */}
      {filtered.length > 0 && (
        <p className="text-xs text-slate-400 mt-3">
          Menampilkan {filtered.length} dari {employees.length} karyawan
        </p>
      )}

      {/* Modals */}
      {createOpen && (
        <EmployeeModal
          mode="create"
          departments={departments}
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            refresh();
          }}
        />
      )}
      {editTarget && (
        <EmployeeModal
          mode="edit"
          employee={editTarget}
          departments={departments}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            refresh();
          }}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          employee={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null);
            refresh();
          }}
        />
      )}
      {importOpen && (
        <ImportModal
          departments={departments}
          onClose={() => setImportOpen(false)}
          onImported={() => {
            setImportOpen(false);
            refresh();
          }}
        />
      )}
    </>
  );
}
