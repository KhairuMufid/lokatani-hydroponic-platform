import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Video, FileBarChart, Settings,
  ChevronLeft, ChevronRight, Leaf,
} from 'lucide-react';
import useProtocolStore from '../../stores/useProtocolStore.js';
import useAlertStore from '../../stores/useAlertStore.js';
import StatusPill from '../shared/StatusPill.jsx';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/live',      icon: Video,           label: 'Live Monitor' },
  { to: '/reports',   icon: FileBarChart,    label: 'Laporan' },
  { to: '/settings',  icon: Settings,        label: 'Pengaturan' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const activeProtocol = useProtocolStore((s) => s.activeProtocol);
  const connectionStatus = useProtocolStore((s) => s.connectionStatus);
  const activeCount = useAlertStore((s) => s.activeCount);

  return (
    <aside
      className={`glass-sidebar flex flex-col h-screen sticky top-0 z-30
                  transition-all duration-300 ease-in-out
                  ${collapsed ? 'w-[72px]' : 'w-[260px]'}`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-200/60 dark:border-white/[0.04]">
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 
                        flex items-center justify-center shadow-lg shadow-brand-500/20">
          <Leaf size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">HydroTect</h1>
            <p className="text-[10px] text-gray-500 dark:text-gray-500 font-medium tracking-wide uppercase">
              Smart Hydroponics
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''} ${collapsed ? 'justify-center px-0' : ''}`
            }
            title={collapsed ? label : undefined}
          >
            <Icon size={20} className="flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
            {!collapsed && to === '/live' && activeCount > 0 && (
              <span className="ml-auto badge bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400 text-[10px]">
                {activeCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Status Footer */}
      <div className="px-3 py-4 border-t border-gray-200/60 dark:border-white/[0.04] space-y-3">
        {!collapsed && (
          <StatusPill status={connectionStatus} protocol={activeProtocol} />
        )}
        {collapsed && (
          <div className="flex justify-center">
            <span className={`w-2.5 h-2.5 rounded-full ${
              connectionStatus === 'connected' ? 'bg-emerald-500' :
              connectionStatus === 'connecting' ? 'bg-amber-500 animate-pulse' :
              'bg-gray-400'
            }`} />
          </div>
        )}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center py-3 
                   border-t border-gray-200/60 dark:border-white/[0.04]
                   text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                   hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}
