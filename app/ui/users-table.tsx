'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { MagnifyingGlassIcon, UserPlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function UsersTable({ users }: { users: any[] }) {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Cari pengguna..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-[10px] text-sm focus:border-dcc-500 outline-none transition-all shadow-sm"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 bg-dcc-600 text-white px-4 py-2 rounded-[10px] text-[13.5px] font-bold hover:bg-dcc-700 transition-all shadow-md shadow-blue-500/20 active:scale-95">
          <UserPlusIcon className="w-4 h-4" />
          TAMBAH PENGGUNA
        </button>
      </div>

      {/* Table Card */}
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
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-blue-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-800 text-[13.5px]">{user.name}</div>
                  <div className="text-[12px] text-slate-400 font-medium">{user.email}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={clsx(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide",
                    user.role === 'admin' ? "bg-blue-100 text-dcc-600" : "bg-slate-100 text-slate-500"
                  )}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-[12.5px] font-mono text-slate-500">
                  {new Date(user.created_at).toLocaleDateString('id-ID')}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-dcc-600 hover:border-dcc-200 shadow-sm transition-all">
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-red-600 hover:border-red-200 shadow-sm transition-all">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}