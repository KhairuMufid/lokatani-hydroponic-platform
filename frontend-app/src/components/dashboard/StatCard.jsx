import React from 'react';
import { motion } from 'framer-motion';

export default function StatCard({ icon: Icon, label, value, unit, trend, subtitle, color = 'brand' }) {
  const colorMap = {
    brand:  'from-brand-500 to-brand-600',
    amber:  'from-amber-500 to-amber-600',
    red:    'from-red-500 to-red-600',
    blue:   'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="stat-card"
    >
      <div className="flex items-center justify-between">
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${colorMap[color] || colorMap.brand} 
                         shadow-lg shadow-${color}-500/20`}>
          <Icon size={18} className="text-white" />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-semibold ${
            trend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
          }`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
          {value ?? '—'}
          {unit && <span className="text-sm font-medium text-gray-500 dark:text-gray-400 ml-1">{unit}</span>}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
        {subtitle && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
    </motion.div>
  );
}
