import React from 'react';
import { WifiOff, Wifi, Loader2 } from 'lucide-react';
import useProtocolStore from '../../stores/useProtocolStore.js';
import { PROTOCOL_LABELS } from '../../utils/constants.js';

export default function ConnectionBanner() {
  const status = useProtocolStore((s) => s.connectionStatus);
  const protocol = useProtocolStore((s) => s.activeProtocol);

  if (status === 'connected') return null;

  const configs = {
    connecting: {
      icon: Loader2,
      bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20',
      text: 'text-amber-700 dark:text-amber-300',
      message: `Menghubungkan ke ${PROTOCOL_LABELS[protocol]}...`,
      spin: true,
    },
    disconnected: {
      icon: WifiOff,
      bg: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20',
      text: 'text-red-700 dark:text-red-300',
      message: `Koneksi ${PROTOCOL_LABELS[protocol]} terputus. Mencoba menghubungkan kembali...`,
    },
    error: {
      icon: WifiOff,
      bg: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20',
      text: 'text-red-700 dark:text-red-300',
      message: `Error pada koneksi ${PROTOCOL_LABELS[protocol]}. Mencoba menghubungkan kembali...`,
    },
  };

  const config = configs[status] || configs.disconnected;
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${config.bg}`}>
      <Icon size={18} className={`${config.text} ${config.spin ? 'animate-spin' : ''}`} />
      <p className={`text-sm font-medium ${config.text}`}>{config.message}</p>
    </div>
  );
}
