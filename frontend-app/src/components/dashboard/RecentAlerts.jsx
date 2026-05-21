import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import SeverityBadge from '../shared/SeverityBadge.jsx';
import EmptyState from '../shared/EmptyState.jsx';
import { timeAgo } from '../../utils/formatters.js';
import { httpClient } from '../../services/httpClient.js';
import useAlertStore from '../../stores/useAlertStore.js';

export default function RecentAlerts({ alerts = [], onAlertResolved }) {
  const [resolving, setResolving] = useState(null);
  const decrementActive = useAlertStore((s) => s.decrementActive);

  const handleResolve = async (id) => {
    if (resolving) return;
    setResolving(id);
    try {
      const res = await httpClient.resolveAlert(id);
      if (res.success) {
        decrementActive();
        if (onAlertResolved) onAlertResolved(id);
      }
    } catch (err) {
      console.error('Failed to resolve alert', err);
    }
    setResolving(null);
  };

  return (
    <div className="glass-card p-6 h-full flex flex-col">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
        Peringatan Terbaru
      </h3>
      <div className="flex-1 overflow-y-auto">
        {alerts.length === 0 ? (
          <EmptyState message="Tidak ada peringatan aktif" icon={AlertTriangle} />
        ) : (
          <div className="space-y-3">
            {alerts.slice(0, 4).map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 p-3 rounded-xl 
                           bg-gray-50 dark:bg-surface-900/50
                           border border-gray-100 dark:border-white/[0.04]
                           hover:bg-gray-100 dark:hover:bg-surface-900
                           transition-colors duration-200 group"
              >
                <div className="mt-0.5">
                  <SeverityBadge severity={alert.severity} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 dark:text-gray-300 break-words leading-relaxed">
                    {alert.message}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                    {timeAgo(alert.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => handleResolve(alert.id)}
                  disabled={resolving === alert.id}
                  title="Tandai Selesai"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100 disabled:opacity-50"
                >
                  <CheckCircle2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
