import React from 'react';

const SEVERITY_STYLES = {
  critical: 'severity-critical',
  high: 'severity-high',
  medium: 'severity-medium',
  low: 'severity-low',
};

const LABELS = {
  critical: 'Kritis',
  high: 'Tinggi',
  medium: 'Sedang',
  low: 'Rendah',
};

export default function SeverityBadge({ severity }) {
  const cls = SEVERITY_STYLES[severity] || 'severity-low';
  return (
    <span className={`badge ${cls}`}>
      {LABELS[severity] || severity}
    </span>
  );
}
