import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Bell, Palette, SlidersHorizontal, LogOut, AlertTriangle, X } from 'lucide-react';
import TopBar from '../components/layout/TopBar.jsx';
import ResearchPanel from '../components/settings/ResearchPanel.jsx';
import useSettingsStore from '../stores/useSettingsStore.js';
import useAuthStore from '../stores/useAuthStore.js';

export default function SettingsPage() {
  const theme = useSettingsStore((s) => s.theme);
  const toggleTheme = useSettingsStore((s) => s.toggleTheme);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const toggleNotifications = useSettingsStore((s) => s.toggleNotifications);
  const minConfidence = useSettingsStore((s) => s.minConfidence);
  const setMinConfidence = useSettingsStore((s) => s.setMinConfidence);
  
  const { user, logout } = useAuthStore();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  const handleLogoutConfirm = () => {
    logout();
    // Redirect is handled automatically by ProtectedRoute which intercepts the auth state change
    setShowLogoutModal(false);
  };

  return (
    <>
      <TopBar title="Pengaturan" subtitle="Konfigurasi dan preferensi aplikasi" />
      <div className="p-6 space-y-6">
        {/* ── 2-Column Grid: Profile + Preferences ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Column: Profile */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 space-y-5"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 shadow-lg shadow-brand-500/20">
                <User size={18} className="text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Profil Pengguna</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Pengaturan dasar</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Role
                </label>
                <div className="input-field flex items-center bg-gray-50 dark:bg-gray-800/50 text-gray-500">
                  <span className="capitalize">{user?.role || 'Operator'}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Username
                </label>
                <div className="input-field flex items-center bg-gray-50 dark:bg-gray-800/50 text-gray-500">
                  {user?.username || 'admin'}
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => setShowLogoutModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 font-semibold text-sm rounded-xl transition-colors focus:ring-4 focus:ring-red-500/20"
                >
                  <LogOut className="w-4 h-4" />
                  Akhiri Sesi (Logout)
                </button>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Appearance + Notifications */}
          <div className="space-y-6">
            {/* Appearance */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/20">
                  <Palette size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Tampilan</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tema dan preferensi visual</p>
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-white/[0.04]">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Mode Gelap</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Aktifkan tema gelap untuk kenyamanan mata</p>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
                    theme === 'dark' ? 'bg-brand-500' : 'bg-gray-300'
                  }`}
                  id="dark-mode-toggle"
                  aria-label="Toggle dark mode"
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${
                      theme === 'dark' ? 'translate-x-6' : ''
                    }`}
                  />
                </button>
              </div>
            </motion.div>

            {/* Notifications */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/20">
                  <Bell size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Notifikasi</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Kelola peringatan hama</p>
                </div>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Peringatan Deteksi</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Terima notifikasi saat hama terdeteksi</p>
                </div>
                <button
                  onClick={toggleNotifications}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
                    notificationsEnabled ? 'bg-brand-500' : 'bg-gray-300'
                  }`}
                  id="notification-toggle"
                  aria-label="Toggle notifications"
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${
                      notificationsEnabled ? 'translate-x-6' : ''
                    }`}
                  />
                </button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ── Confidence Threshold (Full Width) ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20">
              <SlidersHorizontal size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Kualitas Deteksi</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Ambang batas confidence untuk filter motion blur</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Minimum Confidence</span>
              <span className="text-sm font-bold text-brand-600 dark:text-brand-400 tabular-nums">
                {(minConfidence * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.10"
              max="0.99"
              step="0.05"
              value={minConfidence}
              onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer
                         bg-gray-200 dark:bg-surface-800
                         accent-brand-500"
              id="confidence-slider"
            />
            <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
              <span>Sensitif (10%)</span>
              <span>Ketat (99%)</span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed mt-1">
              Deteksi dengan confidence di bawah threshold ini akan diabaikan untuk mengurangi
              false positive akibat motion blur kamera slider. Default: 60%.
            </p>
          </div>
        </motion.div>

        {/* ── Research Panel (Full Width Below Grid) ── */}
        <ResearchPanel />
      </div>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutModal(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-sm overflow-hidden 
                         bg-white dark:bg-surface-900 
                         border border-gray-100 dark:border-white/[0.05]
                         rounded-2xl shadow-2xl z-10"
            >
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-full shrink-0">
                    <AlertTriangle size={24} />
                  </div>
                  <div className="flex-1 mt-1 text-left">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                      Konfirmasi Logout
                    </h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      Apakah Anda yakin ingin keluar dari aplikasi? Sesi Anda saat ini akan diakhiri.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-surface-800/50 border-t border-gray-100 dark:border-white/[0.05]">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300
                             bg-white dark:bg-surface-800 border border-gray-200 dark:border-white/[0.1]
                             rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors focus:ring-4 focus:ring-gray-200 dark:focus:ring-white/[0.05]"
                >
                  Batal
                </button>
                <button
                  onClick={handleLogoutConfirm}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white
                             bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600
                             rounded-xl transition-colors focus:ring-4 focus:ring-red-500/20 shadow-md shadow-red-500/20"
                >
                  Ya, Logout
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
