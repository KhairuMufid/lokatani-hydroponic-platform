import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bug, Shield, Beaker } from 'lucide-react';
import SeverityBadge from '../shared/SeverityBadge.jsx';
import { formatPestName } from '../../utils/formatters.js';

/**
 * DetectionSidebar — Displays current frame's detections and DSS actions.
 * Uses controlled re-renders throttled to 2/sec max.
 */
export default function DetectionSidebar({ detectionRef }) {
  const [frame, setFrame] = useState(null);
  const throttleTimer = useRef(null);

  const updateFrame = useCallback((data) => {
    if (throttleTimer.current) return;
    setFrame(data);
    throttleTimer.current = setTimeout(() => {
      throttleTimer.current = null;
    }, 500); // Max 2 updates per second
  }, []);

  useEffect(() => {
    detectionRef.current = updateFrame;
    return () => { detectionRef.current = null; };
  }, [detectionRef, updateFrame]);

  const detections = frame?.detections || [];
  const dss = frame?.dss || [];

  return (
    <div className="glass-card p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-200px)]">
      {/* Detections */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Bug size={16} className="text-brand-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Deteksi Aktif
          </h3>
          {detections.length > 0 && (
            <span className="badge bg-brand-100 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300">
              {detections.length}
            </span>
          )}
        </div>

        {detections.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic py-4 text-center">
            Tidak ada hama terdeteksi
          </p>
        ) : (
          <div className="space-y-2">
            {detections.map((det, i) => (
              <div
                key={`${det.class_name}-${i}`}
                className="flex items-center gap-3 p-2.5 rounded-lg 
                           bg-gray-50 dark:bg-surface-900/50
                           border border-gray-100 dark:border-white/[0.04]"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {formatPestName(det.class_name)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-surface-800">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
                        style={{ width: `${(det.confidence || 0) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                      {((det.confidence || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DSS Actions */}
      {dss.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Rekomendasi Penanganan
            </h3>
          </div>
          <div className="space-y-3">
            {dss.map((pestDss) => (
              <div key={pestDss.hama_id} className="space-y-2">
                <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
                  {formatPestName(pestDss.nama_hama)}
                </p>
                {pestDss.penanganan?.slice(0, 2).map((p) => (
                  <div
                    key={p.id}
                    className="p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-500/[0.06]
                               border border-amber-200/50 dark:border-amber-500/10"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Beaker size={12} className="text-amber-600 dark:text-amber-400" />
                      <span className="badge bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px]">
                        {p.jenis}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      {p.deskripsi}
                    </p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alert */}
      {frame?.alert && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/[0.08] 
                        border border-red-200/50 dark:border-red-500/15">
          <div className="flex items-center gap-2 mb-1">
            <SeverityBadge severity={frame.alert.severity} />
          </div>
          <p className="text-xs text-red-700 dark:text-red-300 mt-1">
            {frame.alert.message}
          </p>
        </div>
      )}
    </div>
  );
}
