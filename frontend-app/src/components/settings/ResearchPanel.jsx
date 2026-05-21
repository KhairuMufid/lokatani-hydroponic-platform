import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FlaskConical, ChevronDown, ChevronUp, Download, Activity } from 'lucide-react';
import ProtocolSwitcher from './ProtocolSwitcher.jsx';
import { httpClient } from '../../services/httpClient.js';
import useSettingsStore from '../../stores/useSettingsStore.js';
import { formatNumber, formatLatency } from '../../utils/formatters.js';

export default function ResearchPanel() {
  const researchMode = useSettingsStore((s) => s.researchMode);
  const toggleResearchMode = useSettingsStore((s) => s.toggleResearchMode);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!researchMode) return;
    const fetchStats = async () => {
      setLoading(true);
      try {
        const res = await httpClient.getLogStats();
        if (res.success) setStats(res.data || []);
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [researchMode]);

  const exportCsv = () => {
    if (stats.length === 0) return;
    const headers = ['protokol', 'total_frames', 'avg_latency_ms', 'min_latency_ms', 'max_latency_ms', 'stddev_latency_ms', 'median_latency_ms', 'p95_latency_ms', 'p99_latency_ms'];
    const rows = stats.map((s) => headers.map((h) => s[h] ?? '').join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lokatani-qos-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-8">
      <button
        onClick={toggleResearchMode}
        className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 
                   hover:text-gray-600 dark:hover:text-gray-300 
                   transition-colors duration-200 group"
        id="research-panel-toggle"
      >
        <FlaskConical size={14} className="group-hover:text-brand-500 transition-colors" />
        <span>Pengaturan Lanjutan</span>
        {researchMode ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      <AnimatePresence>
        {researchMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mt-4 p-5 rounded-xl border-2 border-dashed 
                            border-gray-300 dark:border-white/[0.08]
                            bg-gray-50/50 dark:bg-surface-900/30 space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-brand-500" />
                  <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 font-mono">
                    QoS Research Panel
                  </h4>
                </div>
                <button
                  onClick={exportCsv}
                  className="btn-secondary text-xs py-1.5 px-3"
                  id="export-csv-btn"
                >
                  <Download size={12} />
                  Export CSV
                </button>
              </div>

              {/* Protocol Switcher */}
              <ProtocolSwitcher />

              {/* QoS Metrics Table */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 
                                  uppercase tracking-wider mb-2">
                  Metrik QoS per Protokol
                </label>
                {stats.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 font-mono py-4 text-center">
                    {loading ? 'Loading...' : 'Belum ada data metrik'}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono">
                      <thead>
                        <tr className="text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-white/[0.06]">
                          <th className="text-left py-2 pr-4">Protokol</th>
                          <th className="text-right py-2 px-2">Frames</th>
                          <th className="text-right py-2 px-2">AVG</th>
                          <th className="text-right py-2 px-2">MIN</th>
                          <th className="text-right py-2 px-2">MAX</th>
                          <th className="text-right py-2 px-2">P50</th>
                          <th className="text-right py-2 px-2">P95</th>
                          <th className="text-right py-2 px-2">P99</th>
                          <th className="text-right py-2 pl-2">STDDEV</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.map((s) => (
                          <tr key={s.protokol} className="border-b border-gray-100 dark:border-white/[0.03] 
                                                          text-gray-600 dark:text-gray-300">
                            <td className="py-2.5 pr-4 font-semibold text-brand-600 dark:text-brand-400">
                              {s.protokol}
                            </td>
                            <td className="text-right py-2.5 px-2">{s.total_frames}</td>
                            <td className="text-right py-2.5 px-2">{formatLatency(s.avg_latency_ms)}</td>
                            <td className="text-right py-2.5 px-2">{formatLatency(s.min_latency_ms)}</td>
                            <td className="text-right py-2.5 px-2">{formatLatency(s.max_latency_ms)}</td>
                            <td className="text-right py-2.5 px-2">{formatLatency(s.median_latency_ms)}</td>
                            <td className="text-right py-2.5 px-2">{formatLatency(s.p95_latency_ms)}</td>
                            <td className="text-right py-2.5 px-2">{formatLatency(s.p99_latency_ms)}</td>
                            <td className="text-right py-2.5 pl-2">{formatNumber(s.stddev_latency_ms, 2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
