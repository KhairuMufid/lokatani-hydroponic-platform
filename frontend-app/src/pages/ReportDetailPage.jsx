import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bug, Clock, Zap, Image } from 'lucide-react';
import TopBar from '../components/layout/TopBar.jsx';
import SeverityBadge from '../components/shared/SeverityBadge.jsx';
import LoadingSpinner from '../components/shared/LoadingSpinner.jsx';
import EmptyState from '../components/shared/EmptyState.jsx';
import { httpClient } from '../services/httpClient.js';
import { formatDateTime, formatLatency, formatPestName } from '../utils/formatters.js';

export default function ReportDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [details, setDetails] = useState([]);
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [detailRes, logsRes] = await Promise.all([
          httpClient.getLogDetails(id),
          httpClient.getLogs({ limit: 1, offset: 0 }),
        ]);
        if (detailRes.success) setDetails(detailRes.data || []);
        // Find the specific log from a broader query
        const logRes = await fetch(`/api/logs?limit=200`);
        const logData = await logRes.json();
        if (logData.success) {
          const found = logData.logs?.find((l) => String(l.id) === String(id));
          if (found) setLog(found);
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  if (loading) return <LoadingSpinner />;

  return (
    <>
      <TopBar title={`Detail Log #${id}`} subtitle="Informasi deteksi lengkap" />
      <div className="p-6 space-y-6">
        {/* Back button */}
        <button
          onClick={() => navigate('/reports')}
          className="btn-secondary text-sm"
        >
          <ArrowLeft size={16} /> Kembali ke Laporan
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Image */}
          <div className="glass-card overflow-hidden">
            {log?.image_path ? (
              <img
                src={`/${log.image_path}`}
                alt={`Detection #${id}`}
                className="w-full aspect-[4/3] object-contain bg-black"
              />
            ) : (
              <div className="aspect-[4/3] flex items-center justify-center bg-gray-100 dark:bg-surface-900">
                <EmptyState message="Gambar tidak tersedia" icon={Image} />
              </div>
            )}
            {/* Log metadata */}
            {log && (
              <div className="p-4 space-y-2 border-t border-gray-200 dark:border-white/[0.04]">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                    <Clock size={14} />
                    {formatDateTime(log.created_at)}
                  </div>
                  <span className="badge bg-gray-100 dark:bg-surface-800 text-gray-600 dark:text-gray-300 
                                   border border-gray-200 dark:border-white/[0.06]">
                    {log.protokol}
                  </span>
                  <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 font-mono">
                    <Zap size={14} />
                    {formatLatency(log.latency_ms)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Detections */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Bug size={18} className="text-brand-500" />
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Detail Deteksi
              </h3>
              <span className="badge bg-brand-100 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300">
                {details.length} objek
              </span>
            </div>
            {details.length === 0 ? (
              <EmptyState message="Tidak ada hama terdeteksi pada frame ini" />
            ) : (
              <div className="space-y-3">
                {details.map((det) => (
                  <div
                    key={det.id}
                    className="p-4 rounded-xl bg-gray-50 dark:bg-surface-900/50
                               border border-gray-100 dark:border-white/[0.04]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-gray-800 dark:text-gray-200">
                        {formatPestName(det.nama_hama)}
                      </p>
                      <span className="font-mono text-sm text-brand-600 dark:text-brand-400 font-bold">
                        {((det.confidence || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                    {det.hama_deskripsi && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        {det.hama_deskripsi}
                      </p>
                    )}
                    {/* Confidence bar */}
                    <div className="mt-2 h-1.5 rounded-full bg-gray-200 dark:bg-surface-800">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
                        style={{ width: `${(det.confidence || 0) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
