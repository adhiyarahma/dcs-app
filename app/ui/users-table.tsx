'use client';

import { useState } from 'react';
import clsx from 'clsx';
import {
  MagnifyingGlassIcon, UserPlusIcon, PencilIcon, TrashIcon,
  XMarkIcon, ExclamationTriangleIcon, KeyIcon
} from '@heroicons/react/24/outline';
import { createUser, updateUser, deleteUser, resetPassword } from '@/app/lib/actions';

type User = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'viewer';
  created_at: string;
};

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function DeleteModal({ user, onConfirm, onCancel, loading }: {
  user: User; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="px-6 pt-6 pb-5 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <ExclamationTriangleIcon className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-base font-bold text-slate-800 mb-1">Hapus Pengguna</h2>
          <p className="text-sm text-slate-500 mb-1">Kamu yakin ingin menghapus pengguna</p>
          <p className="text-sm font-bold text-slate-700 mb-1">{user.name}</p>
          <p className="text-xs text-slate-400">{user.email}</p>
          <p className="text-xs text-red-400 mt-3 bg-red-50 px-3 py-2 rounded-lg w-full">
            Tindakan ini tidak dapat dibatalkan.
          </p>
        </div>
        <div className="flex gap-2 px-6 pb-6">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all">
            Batal
          </button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 px-4 py-2.5 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-all active:scale-95">
            {loading ? 'Menghapus...' : 'Ya, Hapus'}
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
        <button type="button" onClick={onCancel} className="px-4 py-2.5 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all">
          Batal
        </button>
        <button type="submit" disabled={loading} className="px-5 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95">
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
        <button type="button" onClick={onCancel} className="px-4 py-2.5 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all">
          Batal
        </button>
        <button type="submit" disabled={loading} className="px-5 py-2.5 text-sm font-bold bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-50 transition-all active:scale-95">
          {loading ? 'Mereset...' : 'Reset Password'}
        </button>
      </div>
    </form>
  );
}

export default function UsersTable({ users, currentUserId }: { users: User[]; currentUserId: string }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError('');
    const result = await createUser(new FormData(e.currentTarget));
    setLoading(false);
    if (result?.error) setError(result.error);
    else setShowCreate(false);
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editUser) return;
    setLoading(true); setError('');
    const result = await updateUser(editUser.id, new FormData(e.currentTarget));
    setLoading(false);
    if (result?.error) setError(result.error);
    else setEditUser(null);
  }

  async function handleResetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!resetUser) return;
    setLoading(true); setError('');
    const result = await resetPassword(resetUser.id, new FormData(e.currentTarget));
    setLoading(false);
    if (result?.error) setError(result.error);
    else setResetUser(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setLoading(true);
    const result = await deleteUser(deleteTarget.id);
    setLoading(false);
    if (result?.error) setError(result.error);
    else setDeleteTarget(null);
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Cari pengguna..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-[10px] text-sm focus:border-blue-500 outline-none transition-all shadow-sm"
            onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <button
          onClick={() => { setShowCreate(true); setEditUser(null); setError(''); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-[10px] text-[13.5px] font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 active:scale-95"
        >
          <UserPlusIcon className="w-4 h-4" />
          TAMBAH PENGGUNA
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-[10px] text-sm">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-[12px] overflow-hidden shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nama & Email</th>
              <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Role</th>
              <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dibuat</th>
              <th className="text-right px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((user) => {
              const isSelf = user.id === currentUserId;
              return (
                <tr key={user.id} className="hover:bg-blue-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-[13.5px]">{user.name}</span>
                      {isSelf && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-100 text-green-600 uppercase tracking-wide">
                          Anda
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-slate-400 font-medium">{user.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={clsx(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide",
                      user.role === 'admin' ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"
                    )}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[12.5px] font-mono text-slate-500">
                    {new Date(user.created_at).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setResetUser(user); setEditUser(null); setShowCreate(false); setError(''); }}
                        title="Reset Password"
                        className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-amber-500 hover:border-amber-200 shadow-sm transition-all"
                      >
                        <KeyIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setEditUser(user); setShowCreate(false); setResetUser(null); setError(''); }}
                        title="Edit"
                        className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-blue-600 hover:border-blue-200 shadow-sm transition-all"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { if (!isSelf) { setDeleteTarget(user); setError(''); } }}
                        title={isSelf ? 'Tidak bisa hapus akun sendiri' : 'Hapus'}
                        disabled={isSelf}
                        className={clsx(
                          "p-2 bg-white border border-slate-200 rounded-lg shadow-sm transition-all",
                          isSelf
                            ? "text-slate-200 border-slate-100 cursor-not-allowed"
                            : "text-slate-400 hover:text-red-600 hover:border-red-200"
                        )}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-slate-400 text-sm">
                  Tidak ada pengguna ditemukan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Tambah */}
      {showCreate && (
        <Modal title="Tambah Pengguna" onClose={() => setShowCreate(false)}>
          <UserForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} loading={loading} error={error} />
        </Modal>
      )}

      {/* Modal Edit */}
      {editUser && (
        <Modal title="Edit Pengguna" onClose={() => setEditUser(null)}>
          <UserForm defaultValues={editUser} onSubmit={handleUpdate} onCancel={() => setEditUser(null)} loading={loading} error={error} isEdit />
        </Modal>
      )}

      {/* Modal Reset Password */}
      {resetUser && (
        <Modal title={`Reset Password — ${resetUser.name}`} onClose={() => setResetUser(null)}>
          <ResetPasswordForm onSubmit={handleResetPassword} onCancel={() => setResetUser(null)} loading={loading} error={error} />
        </Modal>
      )}

      {/* Modal Hapus */}
      {deleteTarget && (
        <DeleteModal user={deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={loading} />
      )}
    </div>
  );
}
