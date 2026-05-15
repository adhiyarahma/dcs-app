'use client';

import { useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

type ToastProps = {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
};

export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className={`flex items-start gap-3 px-4 py-3.5 rounded-2xl shadow-xl border max-w-sm
        ${type === 'success'
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
          : 'bg-red-50 border-red-200 text-red-800'}`}>
        {type === 'success'
          ? <CheckCircleIcon className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          : <XCircleIcon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />}
        <p className="text-sm font-medium flex-1">{message}</p>
        <button onClick={onClose} className="p-0.5 rounded-lg hover:bg-black/5 transition-all">
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
