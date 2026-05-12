'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  HomeIcon, 
  DocumentTextIcon, 
  UsersIcon, 
  ArrowRightOnRectangleIcon,
  ShieldCheckIcon 
} from '@heroicons/react/24/outline';
import { signOut } from 'next-auth/react';
import clsx from 'clsx';

const navItems = [
  { href: '/dashboard', label: 'DASHBOARD', icon: HomeIcon },
  { href: '/dashboard/documents', label: 'DOKUMEN', icon: DocumentTextIcon },
  { href: '/dashboard/users', label: 'PENGGUNA', icon: UsersIcon },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[260px] min-h-screen bg-dcc-950 flex flex-col z-50 shadow-2xl">
      {/* Header Logo Section - Deep Navy Background */}
      <div className="h-20 flex items-center px-6 gap-3 border-b border-white/5">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
          <ShieldCheckIcon className="w-6 h-6 text-white" />
        </div>
        <div className="leading-tight">
          <h1 className="text-[16px] font-extrabold text-white tracking-tight">DCS APP</h1>
          <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Document Control</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-8 space-y-2">
        <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-[2px] mb-4">Main Navigation</p>
        
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-[13.5px] font-medium transition-all duration-300 group',
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              )}
            >
              <Icon className={clsx(
                'w-5 h-5 transition-colors',
                isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'
              )} />
              <span className="tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Info & Logout Section */}
      <div className="p-4 bg-black/20 mt-auto border-t border-white/5">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13.5px] font-semibold text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          <span>LOGOUT</span>
        </button>
      </div>
    </aside>
  );
}