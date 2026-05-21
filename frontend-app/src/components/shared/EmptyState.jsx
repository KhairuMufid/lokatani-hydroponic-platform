import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({ message = 'Belum ada data', icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 rounded-2xl bg-gray-100 dark:bg-surface-800 mb-4">
        <Icon size={32} className="text-gray-400 dark:text-gray-500" />
      </div>
      <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{message}</p>
    </div>
  );
}
