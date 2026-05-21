import React from 'react';

export default function LoadingSpinner({ size = 'md' }) {
  const sizeMap = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className="flex items-center justify-center py-16">
      <div className={`${sizeMap[size]} border-2 border-brand-200 dark:border-brand-900 
                        border-t-brand-500 rounded-full animate-spin`} />
    </div>
  );
}
