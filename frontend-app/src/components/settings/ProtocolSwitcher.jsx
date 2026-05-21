import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import useProtocolStore from '../../stores/useProtocolStore.js';
import { PROTOCOL_LABELS } from '../../utils/constants.js';

const PROTOCOLS = ['HTTP', 'WS', 'MQTT'];

export default function ProtocolSwitcher() {
  const activeProtocol = useProtocolStore((s) => s.activeProtocol);
  const setProtocol = useProtocolStore((s) => s.setProtocol);
  const [pendingProtocol, setPendingProtocol] = useState(null);

  const handleClick = (proto) => {
    if (proto === activeProtocol) return;
    setPendingProtocol(proto);
  };

  const confirmSwitch = () => {
    if (pendingProtocol) {
      setProtocol(pendingProtocol);
      setPendingProtocol(null);
    }
  };

  const cancelSwitch = () => {
    setPendingProtocol(null);
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
        Protokol Aktif
      </label>
      <div className="flex rounded-xl bg-gray-100 dark:bg-surface-900 p-1 
                      border border-gray-200 dark:border-white/[0.06]">
        {PROTOCOLS.map((proto) => (
          <button
            key={proto}
            onClick={() => handleClick(proto)}
            className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeProtocol === proto
                ? 'bg-white dark:bg-surface-800 text-brand-700 dark:text-brand-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            id={`protocol-${proto.toLowerCase()}`}
          >
            {PROTOCOL_LABELS[proto]}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
        Mengubah protokol akan memutus koneksi saat ini dan menghubungkan ulang.
      </p>

      {/* ── Confirmation Modal ── */}
      <AnimatePresence>
        {pendingProtocol && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={cancelSwitch}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 12 }}
              transition={{ type: 'spring', duration: 0.35, bounce: 0.2 }}
              className="glass-card p-6 w-full max-w-md mx-4 shadow-2xl border border-gray-200 dark:border-white/[0.08]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/20 flex-shrink-0">
                  <AlertTriangle size={18} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Ubah Protokol Jaringan?
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Koneksi saat ini ({PROTOCOL_LABELS[activeProtocol]}) akan diputus dan diganti ke <strong className="text-gray-700 dark:text-gray-200">{PROTOCOL_LABELS[pendingProtocol]}</strong>.
                  </p>
                </div>
                <button
                  onClick={cancelSwitch}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Warning */}
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 mb-5">
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  Data live feed yang sedang berlangsung akan terputus. Dashboard akan mereset koneksi secara otomatis.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={cancelSwitch}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium 
                             text-gray-600 dark:text-gray-400 
                             hover:bg-gray-100 dark:hover:bg-white/[0.06] 
                             transition-colors duration-200"
                >
                  Batal
                </button>
                <button
                  onClick={confirmSwitch}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold 
                             bg-gradient-to-r from-brand-500 to-brand-600 
                             text-white shadow-lg shadow-brand-500/25 
                             hover:shadow-brand-500/40 hover:scale-[1.02]
                             transition-all duration-200"
                  id="confirm-protocol-switch"
                >
                  Ya, Ganti ke {PROTOCOL_LABELS[pendingProtocol]}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
