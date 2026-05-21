import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Filter, ChevronLeft, ChevronRight, Layers, FileText } from 'lucide-react';
import TopBar from '../components/layout/TopBar.jsx';
import LogTable from '../components/reports/LogTable.jsx';
import LoadingSpinner from '../components/shared/LoadingSpinner.jsx';
import { httpClient } from '../services/httpClient.js';
import { formatDateTime, formatNumber, formatPestName } from '../utils/formatters.js';

const PAGE_SIZE = 20;

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('sessions'); // 'sessions' | 'logs'

  // --- Session state ---
  const [sessions, setSessions] = useState([]);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [sessionPage, setSessionPage] = useState(0);

  // --- Log state ---
  const [logs, setLogs] = useState([]);
  const [logTotal, setLogTotal] = useState(0);
  const [logPage, setLogPage] = useState(0);
  const [protokol, setProtokol] = useState('');

  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await httpClient.getSessions({
        limit: PAGE_SIZE,
        offset: sessionPage * PAGE_SIZE,
      });
      if (res.success) {
        setSessions(res.sessions || []);
        setSessionTotal(res.total || 0);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [sessionPage]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: PAGE_SIZE, offset: logPage * PAGE_SIZE };
      if (protokol) params.protokol = protokol;
      const res = await httpClient.getLogs(params);
      if (res.success) {
        setLogs(res.logs || []);
        setLogTotal(res.total || 0);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [logPage, protokol]);

  useEffect(() => {
    if (activeTab === 'sessions') fetchSessions();
    else fetchLogs();
  }, [activeTab, fetchSessions, fetchLogs]);

  const sessionTotalPages = Math.ceil(sessionTotal / PAGE_SIZE);
  const logTotalPages = Math.ceil(logTotal / PAGE_SIZE);

  return (
    <>
      <TopBar title="Laporan Deteksi" subtitle="Riwayat sesi monitoring dan deteksi hama" />
      <div className="p-6 space-y-4">
        {/* Tab Switcher */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('sessions')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === 'sessions'
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                : 'glass-card text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
            id="tab-sessions"
          >
            <Layers size={15} />
            Sesi Monitoring
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === 'logs'
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                : 'glass-card text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
            id="tab-logs"
          >
            <FileText size={15} />
            Log Deteksi (Raw)
          </button>
        </div>

        {/* ─── Sessions Tab ─── */}
        {activeTab === 'sessions' && (
          <>
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <Layers size={14} className="inline mr-1" />
                  {sessionTotal} total sesi
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="space-y-3"
            >
              {loading ? (
                <LoadingSpinner />
              ) : sessions.length === 0 ? (
                <div className="glass-card p-8 text-center">
                  <p className="text-gray-500 dark:text-gray-400">Belum ada sesi monitoring</p>
                </div>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.id}
                    className="glass-card p-4 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-400 dark:text-gray-500">
                          #{session.id}
                        </span>
                        <span className="badge bg-gray-100 dark:bg-surface-800 text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded-md font-medium">
                          {session.protokol}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {formatDateTime(session.ended_at || session.started_at)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-400 dark:text-gray-500">Frame</p>
                        <p className="font-medium text-gray-700 dark:text-gray-300">
                          {formatNumber(session.total_frames)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 dark:text-gray-500">Deteksi Mentah</p>
                        <p className="font-medium text-gray-700 dark:text-gray-300">
                          {formatNumber(session.raw_detections)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 dark:text-gray-500">Hama Unik</p>
                        <p className="font-bold text-brand-600 dark:text-brand-400">
                          {session.unique_pests}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 dark:text-gray-500">Deduplikasi</p>
                        <p className="font-medium text-emerald-600 dark:text-emerald-400">
                          {session.dedup_ratio != null ? `${session.dedup_ratio}%` : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 dark:text-gray-500">Hama</p>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {session.pest_summary && Object.keys(session.pest_summary).length > 0 ? (
                            Object.entries(session.pest_summary).map(([pest, count]) => (
                              <span
                                key={pest}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-brand-50 dark:bg-brand-500/10
                                           text-brand-700 dark:text-brand-400 font-medium"
                              >
                                {formatPestName(pest)} ({count})
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </motion.div>

            {/* Session Pagination */}
            {sessionTotalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setSessionPage((p) => Math.max(0, p - 1))}
                  disabled={sessionPage === 0}
                  className="btn-secondary py-2 px-3 disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400 px-4">
                  Halaman {sessionPage + 1} dari {sessionTotalPages}
                </span>
                <button
                  onClick={() => setSessionPage((p) => Math.min(sessionTotalPages - 1, p + 1))}
                  disabled={sessionPage >= sessionTotalPages - 1}
                  className="btn-secondary py-2 px-3 disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}

        {/* ─── Logs Tab (Legacy) ─── */}
        {activeTab === 'logs' && (
          <>
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-4"
            >
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Filter size={14} />
                  <span>Filter:</span>
                </div>
                <select
                  value={protokol}
                  onChange={(e) => { setProtokol(e.target.value); setLogPage(0); }}
                  className="input-field w-auto text-sm py-2"
                  id="protocol-filter"
                >
                  <option value="">Semua Protokol</option>
                  <option value="HTTP">HTTP</option>
                  <option value="WS">WebSocket</option>
                  <option value="MQTT">MQTT</option>
                </select>
                <span className="text-sm text-gray-400 dark:text-gray-500 ml-auto">
                  {logTotal} total log
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="glass-card overflow-hidden"
            >
              {loading ? (
                <LoadingSpinner />
              ) : (
                <LogTable logs={logs} loading={loading} />
              )}
            </motion.div>

            {/* Log Pagination */}
            {logTotalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setLogPage((p) => Math.max(0, p - 1))}
                  disabled={logPage === 0}
                  className="btn-secondary py-2 px-3 disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400 px-4">
                  Halaman {logPage + 1} dari {logTotalPages}
                </span>
                <button
                  onClick={() => setLogPage((p) => Math.min(logTotalPages - 1, p + 1))}
                  disabled={logPage >= logTotalPages - 1}
                  className="btn-secondary py-2 px-3 disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
