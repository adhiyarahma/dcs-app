'use client';

import { useState } from 'react';
import clsx from 'clsx';
import {
  MagnifyingGlassIcon, UserPlusIcon, PencilIcon, TrashIcon,
  XMarkIcon, ExclamationTriangleIcon, KeyIcon, UsersIcon,
  EyeIcon, ChevronLeftIcon, ChevronRightIcon,
  FunnelIcon, ChevronDownIcon // <-- Tambahan icon untuk filter
} from '@heroicons/react/24/outline';
import { createUser, updateUser, deleteUser, resetPassword } from '@/app/lib/actions';

type User = { id: string; name: string; email: string; role: 'admin' | 'viewer'; created_at: string; };

const PAGE_SIZE = 5;

// ─── Pagination Component ─────────────────────────────────────────────────
function Pagination({ currentPage, totalPages, onPageChange }: {
  currentPage: number; totalPages: number; onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between px-2 py-3 border-t border-slate-100">
      <p className="text-xs text-slate-400">
        Halaman <span className="font-semibold text-slate-600">{currentPage}</span> dari <span className="font-semibold text-slate-600">{totalPages}</span>
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
          p === '...'
            ? <span key={`dot-${i}`} className="px-2 text-slate-300 text-xs">...</span>
            : <button
                key={p}
                onClick={() => onPageChange(p as number)}
                className={clsx(
                  'min-w-[28px] h-7 px-1.5 rounded-lg text-xs font-medium transition-all',
                  p === currentPage
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                )}
              >
                {p}
              </button>
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

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function DeleteModal({ user, onConfirm, onCancel, loading }: {
  user: User; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-sm font-bold text-slate-800 mb-1">Hapus Pengguna</h2>
          <p className="text-sm text-slate-500">Hapus <span className="font-semibold text-slate-700">{user.name}</span>?</p>
          <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
          <p className="text-xs text-red-500 mt-3 bg-red-50 px-3 py-2 rounded-lg w-full">Tindakan ini tidak dapat dibatalkan.</p>
        </div>
        <div className="flex gap-2 px-6 pb-6">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all">Batal</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 px-4 py-2.5 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-all">
            {loading ? 'Menghapus...' : 'Hapus'}
          </button>
        </div>
      </div>
    </div>
  );
}

function UserForm({ defaultValues, onSubmit, onCancel, loading, error, isEdit }: {
  defaultValues?: User; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void; loading: boolean; error: string; isEdit?: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Nama</label>
        <input name="name" defaultValue={defaultValues?.name} required placeholder="Nama lengkap"
          className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email</label>
        <input name="email" type="email" defaultValue={defaultValues?.email} required placeholder="email@example.com"
          className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
      </div>
      {!isEdit && (
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Password</label>
          <input name="password" type="password" required minLength={6} placeholder="Minimal 6 karakter"
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
        </div>
      )}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Role</label>
        <select name="role" defaultValue={defaultValues?.role ?? 'viewer'}
          className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white">
          <option value="viewer">Viewer</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}
      <div className="flex gap-2 justify-end pt-1">
        <button type="button" onClick={onCancel} className="px-4 py-2.5 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all">Batal</button>
        <button type="submit" disabled={loading} className="px-5 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all">
          {loading ? 'Menyimpan...' : isEdit ? 'Update' : 'Simpan'}
        </button>
      </div>
    </form>
  );
}

function ResetPasswordForm({ onSubmit, onCancel, loading, error }: {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void; loading: boolean; error: string;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
        Password baru akan langsung aktif. Informasikan ke pengguna setelah direset.
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Password Baru</label>
        <input name="password" type="password" required minLength={6} placeholder="Minimal 6 karakter"
          className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Konfirmasi Password</label>
        <input name="confirmPassword" type="password" required minLength={6} placeholder="Ulangi password baru"
          className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}
      <div className="flex gap-2 justify-end pt-1">
        <button type="button" onClick={onCancel} className="px-4 py-2.5 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all">Batal</button>
        <button type="submit" disabled={loading} className="px-5 py-2.5 text-sm font-bold bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-50 transition-all">
          {loading ? 'Mereset...' : 'Reset Password'}
        </button>
      </div>
    </form>
  );
}

export default function UsersTable({ users, currentUserId }: { users: User[]; currentUserId: string }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState(''); // <-- State untuk filter role
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const totalViewers = users.filter(user => user.role === 'viewer').length;
  const totalAdmins = users.filter(user => user.role === 'admin').length;

  // ─── FILTERING LOGIC ──────────────────────────────────────────────────────
  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = filterRole === '' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  // ─── PAGINATION LOGIC ─────────────────────────────────────────────────────
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedUsers = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError('');
    const result = await createUser(new FormData(e.currentTarget));
    setLoading(false);
    if (result?.error) setError(result.error); else setShowCreate(false);
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!editUser) return;
    setLoading(true); setError('');
    const result = await updateUser(editUser.id, new FormData(e.currentTarget));
    setLoading(false);
    if (result?.error) setError(result.error); else setEditUser(null);
  }

  async function handleResetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!resetUser) return;
    setLoading(true); setError('');
    const result = await resetPassword(resetUser.id, new FormData(e.currentTarget));
    setLoading(false);
    if (result?.error) setError(result.error); else setResetUser(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return; setLoading(true);
    const result = await deleteUser(deleteTarget.id);
    setLoading(false);
    if (result?.error) setError(result.error); else setDeleteTarget(null);
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600 shrink-0">
            <UsersIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Pengguna</p>
            <p className="text-2xl font-bold text-slate-900">{users.length}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 shrink-0">
            <EyeIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Viewer</p>
            <p className="text-2xl font-bold text-slate-900">{totalViewers}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-purple-50 rounded-xl text-purple-600 shrink-0">
            <KeyIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Admin</p>
            <p className="text-2xl font-bold text-slate-900">{totalAdmins}</p>
          </div>
        </div>
      </div>

      {/* Toolbar dengan Search dan Filter */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Cari pengguna..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }} />
          </div>
          <button onClick={() => { setShowCreate(true); setEditUser(null); setError(''); }}
            className="flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all active:scale-95 shrink-0">
            <UserPlusIcon className="w-4 h-4" />
            Tambah Pengguna
          </button>
        </div>

        {/* Baris Filter Role */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterRole}
              onChange={e => { setFilterRole(e.target.value); setCurrentPage(1); }}
              className="pl-8 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
            >
              <option value="">Semua Role</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
            <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
          </div>

          {filterRole && (
            <button
              onClick={() => { setFilterRole(''); setCurrentPage(1); }}
              className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-red-600 border border-slate-200 rounded-xl hover:border-red-200 hover:bg-red-50 transition-all"
            >
              Reset filter
            </button>
          )}
        </div>
      </div>

      {/* Table — desktop */}
      <div className="hidden sm:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Nama & Email</th>
                <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Role</th>
                <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Dibuat</th>
                <th className="text-right px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedUsers.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-400 text-sm">Tidak ada pengguna ditemukan.</td></tr>
              )}
              {paginatedUsers.map((user) => {
                const isSelf = user.id === currentUserId;
                return (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 text-sm">{user.name}</span>
                        {isSelf && <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-100 text-green-700 uppercase">Anda</span>}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{user.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx('px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide',
                        user.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500')}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(user.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => { setResetUser(user); setEditUser(null); setShowCreate(false); setError(''); }}
                          title="Reset Password"
                          className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors">
                          <KeyIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setEditUser(user); setShowCreate(false); setResetUser(null); setError(''); }}
                          title="Edit"
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => { if (!isSelf) { setDeleteTarget(user); setError(''); } }}
                          title={isSelf ? 'Tidak bisa hapus akun sendiri' : 'Hapus'}
                          disabled={isSelf}
                          className={clsx('p-2 rounded-lg transition-colors',
                            isSelf ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-red-600 hover:bg-red-50')}>
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </div>

      {/* Card list — mobile */}
      <div className="sm:hidden space-y-2">
        {paginatedUsers.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-sm">Tidak ada pengguna ditemukan.</div>
        )}
        {paginatedUsers.map((user) => {
          const isSelf = user.id === currentUserId;
          return (
            <div key={user.id} className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800 text-sm">{user.name}</span>
                    {isSelf && <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-100 text-green-700 uppercase">Anda</span>}
                    <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                      user.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500')}>
                      {user.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{user.email}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setResetUser(user); setEditUser(null); setShowCreate(false); setError(''); }}
                    className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors">
                    <KeyIcon className="w-4 h-4" />
                  </button>
                  <button onClick={() => { setEditUser(user); setShowCreate(false); setResetUser(null); setError(''); }}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button onClick={() => { if (!isSelf) { setDeleteTarget(user); setError(''); } }}
                    disabled={isSelf}
                    className={clsx('p-2 rounded-lg transition-colors',
                      isSelf ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-red-600 hover:bg-red-50')}>
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Mobile pagination */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mt-3">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      </div>

      {showCreate && (
        <Modal title="Tambah Pengguna" onClose={() => setShowCreate(false)}>
          <UserForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} loading={loading} error={error} />
        </Modal>
      )}
      {editUser && (
        <Modal title="Edit Pengguna" onClose={() => setEditUser(null)}>
          <UserForm defaultValues={editUser} onSubmit={handleUpdate} onCancel={() => setEditUser(null)} loading={loading} error={error} isEdit />
        </Modal>
      )}
      {resetUser && (
        <Modal title={`Reset Password — ${resetUser.name}`} onClose={() => setResetUser(null)}>
          <ResetPasswordForm onSubmit={handleResetPassword} onCancel={() => setResetUser(null)} loading={loading} error={error} />
        </Modal>
      )}
      {deleteTarget && (
        <DeleteModal user={deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={loading} />
      )}
    </div>
  );
}