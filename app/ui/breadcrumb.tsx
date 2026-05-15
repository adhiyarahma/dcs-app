'use client';

import Link from 'next/link';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';

type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6">
      <Link href="/dashboard" className="hover:text-slate-600 transition-colors">
        <HomeIcon className="w-3.5 h-3.5" />
      </Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRightIcon className="w-3 h-3" />
          {item.href ? (
            <Link href={item.href} className="hover:text-slate-600 transition-colors font-medium">
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-600 font-semibold">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
