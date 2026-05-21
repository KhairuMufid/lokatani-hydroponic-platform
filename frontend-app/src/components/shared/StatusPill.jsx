import React from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

const STATUS_CONFIG = {
  connected:    { color: 'bg-emerald-500', label: 'Terhubung', icon: Wifi },
  connecting:   { color: 'bg-amber-500 animate-pulse', label: 'Menghubungkan...', icon: Loader2 },
  disconnected: { color: 'bg-gray-400', label: 'Terputus', icon: WifiOff },
  error:        { color: 'bg-red-500', label: 'Error', icon: WifiOff },
};

export default function StatusPill({ status, protocol }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.disconnected;
  const Icon = config.icon;
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full 
                    bg-gray-100 dark:bg-surface-800 border border-gray-200 dark:border-white/[0.06]
                    text-xs font-medium">
      <span className={`w-2 h-2 rounded-full ${config.color}`} />
      <Icon size={12} className="text-gray-500 dark:text-gray-400" />
      <span className="text-gray-600 dark:text-gray-400">
        {protocol} · {config.label}
      </span>
    </div>
  );
}
