import React, { useState, useRef, useEffect } from 'react';
import { Bell, Sun, Moon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useSettingsStore from '../../stores/useSettingsStore.js';
import useAlertStore from '../../stores/useAlertStore.js';
import SeverityBadge from '../shared/SeverityBadge.jsx';
import { timeAgo } from '../../utils/formatters.js';

export default function TopBar({ title, subtitle }) {
  const theme = useSettingsStore((s) => s.theme);
  const toggleTheme = useSettingsStore((s) => s.toggleTheme);
  const activeCount = useAlertStore((s) => s.activeCount);
  const latestAlert = useAlertStore((s) => s.latestAlert);
  const [isOpen, setIsOpen] = useState(false);
  const [alertHistory, setAlertHistory] = useState([]);
  const dropdownRef = useRef(null);

  // Track alert history (keep the last 10 alerts)
  useEffect(() => {
    if (latestAlert) {
      setAlertHistory((prev) => {
        const updated = [latestAlert, ...prev.filter((a) => a.id !== latestAlert.id)];
        return updated.slice(0, 10);
      });
    }
  }, [latestAlert]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <header className="sticky top-0 z-20 bg-white/80 dark:bg-surface-950/80 backdrop-blur-xl 
                        border-b border-gray-200/60 dark:border-white/[0.04]">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl text-gray-500 dark:text-gray-400 
                       hover:bg-gray-100 dark:hover:bg-white/[0.06] 
                       hover:text-gray-700 dark:hover:text-gray-200
                       transition-all duration-200"
            aria-label="Toggle theme"
            id="theme-toggle"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Notification Bell */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="relative p-2.5 rounded-xl text-gray-500 dark:text-gray-400 
                         hover:bg-gray-100 dark:hover:bg-white/[0.06]
                         hover:text-gray-700 dark:hover:text-gray-200
                         transition-all duration-200"
              aria-label="Notifications"
              id="notification-bell"
            >
              <Bell size={18} />
              {activeCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 
                                 flex items-center justify-center rounded-full 
                                 bg-red-500 text-white text-[10px] font-bold 
                                 shadow-lg shadow-red-500/30 animate-pulse-slow">
                  {activeCount > 99 ? '99+' : activeCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="absolute right-0 top-full mt-2 w-80 sm:w-96 z-50
                             bg-white dark:bg-surface-900 
                             border border-gray-200 dark:border-white/[0.08]
                             rounded-2xl shadow-xl shadow-black/10 dark:shadow-black/40
                             overflow-hidden"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 
                                  border-b border-gray-100 dark:border-white/[0.04]">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                      Notifikasi
                    </h4>
                    <div className="flex items-center gap-2">
                      {activeCount > 0 && (
                        <span className="text-xs font-medium text-red-500 bg-red-50 dark:bg-red-500/10 
                                         px-2 py-0.5 rounded-full">
                          {activeCount} aktif
                        </span>
                      )}
                      <button
                        onClick={() => setIsOpen(false)}
                        className="p-1 rounded-lg text-gray-400 hover:text-gray-600 
                                   dark:hover:text-gray-300 hover:bg-gray-100 
                                   dark:hover:bg-white/[0.06] transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Alert List */}
                  <div className="max-h-80 overflow-y-auto">
                    {alertHistory.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 px-4">
                        <div className="p-3 rounded-2xl bg-gray-100 dark:bg-white/[0.04] mb-3">
                          <Bell size={20} className="text-gray-400 dark:text-gray-500" />
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                          Belum ada notifikasi
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          Peringatan hama akan muncul di sini
                        </p>
                      </div>
                    ) : (
                      alertHistory.map((alert, index) => (
                        <div
                          key={alert.id || index}
                          className="flex items-start gap-3 px-4 py-3
                                     hover:bg-gray-50 dark:hover:bg-white/[0.03]
                                     border-b border-gray-50 dark:border-white/[0.02]
                                     last:border-b-0 transition-colors duration-150"
                        >
                          <div className="mt-0.5 flex-shrink-0">
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
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  {alertHistory.length > 0 && (
                    <div className="px-4 py-2.5 border-t border-gray-100 dark:border-white/[0.04] 
                                    bg-gray-50/50 dark:bg-white/[0.02]">
                      <p className="text-xs text-center text-gray-400 dark:text-gray-500">
                        Menampilkan {alertHistory.length} notifikasi terbaru
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
