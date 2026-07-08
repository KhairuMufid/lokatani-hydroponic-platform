import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Bug, AlertTriangle, Activity, Layers, BarChart3, Filter } from 'lucide-react';
import TopBar from '../components/layout/TopBar.jsx';
import StatCard from '../components/dashboard/StatCard.jsx';
import DetectionChart from '../components/dashboard/DetectionChart.jsx';
import RecentAlerts from '../components/dashboard/RecentAlerts.jsx';
import LoadingSpinner from '../components/shared/LoadingSpinner.jsx';
import { httpClient } from '../services/httpClient.js';
import { formatNumber, timeAgo, formatPestName } from '../utils/formatters.js';
import useDashboardRealtime from '../hooks/useDashboardRealtime.js';

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { realtimeDelta, resetDelta, lastCompletedSession } = useDashboardRealtime();

  const fetchData = useCallback(async () => {
    try {
      const [sumRes, trendRes, alertsRes] = await Promise.all([
        httpClient.getDashboardSummary(),
        httpClient.getDashboardTrend(7),
        httpClient.getAlerts({ status: 'active', limit: 5 }),
      ]);
      if (sumRes.success) setSummary(sumRes.data);
      if (trendRes.success) setTrend(trendRes.data);
      if (alertsRes.success) setAlerts(alertsRes.data || []);
      // Reset realtime deltas after a full poll refresh
      resetDelta();
    } catch { /* ignore */ }
    setLoading(false);
  }, [resetDelta]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Re-fetch when a session completes (real-time push event)
  useEffect(() => {
    if (lastCompletedSession) fetchData();
  }, [lastCompletedSession, fetchData]);

  if (loading) return <LoadingSpinner />;

  // Session-based metrics (precision agriculture)
  const sessions = summary?.sessions || {};
  const latestSession = sessions.latest;
  const liveAlerts = (summary?.active_alerts ?? 0) + realtimeDelta.alerts;
  const liveLatency = realtimeDelta.lastLatencyMs ?? summary?.avg_latency_ms;
  const liveLastDetection = realtimeDelta.lastDetectionAt ?? summary?.last_detection_at;

  return (
    <>
      <TopBar title="Dashboard" subtitle="Ringkasan sistem monitoring hidroponik" />
      <div className="p-6 space-y-6">
        {/* Primary Stat Cards — Session-Based */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            icon={Bug}
            label="Hama Unik (Sesi Terakhir)"
            value={latestSession?.unique_pests ?? 0}
            subtitle={latestSession
              ? `Sesi #${latestSession.id} · ${latestSession.total_frames} frame`
              : 'Belum ada sesi'}
            color="brand"
          />
          <StatCard
            icon={Layers}
            label="Total Sesi Hari Ini"
            value={sessions.total_today ?? 0}
            subtitle={`${sessions.unique_pests_today ?? 0} hama unik total`}
            color="purple"
          />
          <StatCard
            icon={AlertTriangle}
            label="Peringatan Aktif"
            value={liveAlerts}
            color="red"
          />
        </div>

        {/* Latest Session Detail */}
        {latestSession && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={16} className="text-brand-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Sesi Monitoring Terakhir — #{latestSession.id}
              </h3>
              <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
                {timeAgo(latestSession.ended_at)}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">Protokol</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200">
                  {latestSession.protokol}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">Total Frame</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200">
                  {formatNumber(latestSession.total_frames)}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">Deteksi Mentah</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200">
                  {formatNumber(latestSession.raw_detections)}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">Hama Unik</p>
                <p className="font-bold text-brand-600 dark:text-brand-400">
                  {latestSession.unique_pests}
                </p>
              </div>
            </div>

            {/* Pest Summary Breakdown */}
            {latestSession.pest_summary && Object.keys(latestSession.pest_summary).length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/[0.04]">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Jenis Hama Ditemukan:</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(latestSession.pest_summary).map(([pest, count]) => (
                    <span
                      key={pest}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium
                                 bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400
                                 border border-brand-200/50 dark:border-brand-500/20"
                    >
                      {formatPestName(pest)}
                      <span className="bg-brand-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {count}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Chart & Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          <div className="lg:col-span-2">
            <DetectionChart trendData={trend} />
          </div>
          <div>
            <RecentAlerts 
              alerts={alerts} 
              onAlertResolved={() => {
                fetchData(); // Refresh UI instantly when an alert is resolved 
              }} 
            />
          </div>
        </div>

        {/* System Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-6"
        >
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Informasi Sistem
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Deteksi Terakhir</p>
              <p className="font-medium text-gray-800 dark:text-gray-200">
                {timeAgo(liveLastDetection)}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Rata-rata Latensi</p>
              <p className="font-medium text-gray-800 dark:text-gray-200">
                {formatNumber(liveLatency)} ms
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Uptime Server</p>
              <p className="font-medium text-gray-800 dark:text-gray-200">
                {summary?.uptime ? `${Math.floor(summary.uptime / 3600)}j ${Math.floor((summary.uptime % 3600) / 60)}m` : '—'}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Hama Terbanyak</p>
              <p className="font-medium text-gray-800 dark:text-gray-200">
                {summary?.top_pest ? formatPestName(summary.top_pest.nama_hama) : 'Aman'}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
