import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Image } from 'lucide-react';
import { formatDateTime, formatLatency, formatPestName } from '../../utils/formatters.js';
import EmptyState from '../shared/EmptyState.jsx';

export default function LogTable({ logs = [], loading }) {
  const navigate = useNavigate();

  if (!loading && logs.length === 0) {
    return <EmptyState message="Belum ada log deteksi" icon={Image} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-white/[0.06]">
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Waktu</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Protokol</th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Deteksi</th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Latensi</th>
            <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Gambar</th>
            <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Detail</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr
              key={log.id}
              className="border-b border-gray-100 dark:border-white/[0.03] 
                         hover:bg-gray-50 dark:hover:bg-surface-800/50
                         transition-colors duration-150"
            >
              <td className="py-3 px-4 font-mono text-xs text-gray-500 dark:text-gray-400">#{log.id}</td>
              <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{formatDateTime(log.created_at)}</td>
              <td className="py-3 px-4">
                <span className="badge bg-gray-100 dark:bg-surface-800 text-gray-600 dark:text-gray-300 
                                 border border-gray-200 dark:border-white/[0.06]">
                  {log.protokol}
                </span>
              </td>
              <td className="py-3 px-4 text-right font-semibold text-gray-800 dark:text-gray-200">
                {log.total_detections}
              </td>
              <td className="py-3 px-4 text-right font-mono text-xs text-gray-500 dark:text-gray-400">
                {formatLatency(log.latency_ms)}
              </td>
              <td className="py-3 px-4 text-center">
                {log.image_path ? (
                  <a
                    href={`/${log.image_path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-brand-600 dark:text-brand-400 hover:underline text-xs"
                  >
                    <Image size={12} /> Lihat
                  </a>
                ) : (
                  <span className="text-gray-300 dark:text-gray-600">—</span>
                )}
              </td>
              <td className="py-3 px-4 text-center">
                <button
                  onClick={() => navigate(`/reports/${log.id}`)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-surface-800 
                             text-gray-400 hover:text-brand-600 dark:hover:text-brand-400
                             transition-colors"
                  aria-label={`Detail log #${log.id}`}
                >
                  <ExternalLink size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
