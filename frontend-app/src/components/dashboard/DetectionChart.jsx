import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { formatDate } from '../../utils/formatters.js';

Chart.register(...registerables);

export default function DetectionChart({ trendData = [] }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || trendData.length === 0) return;

    // Aggregate data by date
    const dateMap = new Map();
    for (const row of trendData) {
      let key = row.date;
      if (key) {
        // Convert UTC ISO string strictly to a local Date (WIB/Jakarta timezone),
        // then format to YYYY-MM-DD to avoid the -1 day shift bug from string splitting.
        // 'sv-SE' locale natively returns YYYY-MM-DD.
        key = new Date(key).toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
      }
      if (!dateMap.has(key)) dateMap.set(key, 0);
      dateMap.set(key, dateMap.get(key) + (row.pest_count || row.count || 0));
    }

    const labels = [...dateMap.keys()].map((d) => formatDate(d));
    const data = [...dateMap.values()];

    if (chartRef.current) chartRef.current.destroy();

    const ctx = canvasRef.current.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Deteksi Hama',
          data,
          fill: true,
          backgroundColor: gradient,
          borderColor: '#10B981',
          borderWidth: 2.5,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#10B981',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 2,
          pointHoverRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0,0,0,0.8)',
            titleFont: { family: 'Inter', size: 12 },
            bodyFont: { family: 'Inter', size: 12 },
            padding: 12,
            cornerRadius: 10,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { family: 'Inter', size: 11 },
              color: '#9CA3AF',
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(156, 163, 175, 0.1)',
              drawBorder: false,
            },
            ticks: {
              font: { family: 'Inter', size: 11 },
              color: '#9CA3AF',
              maxTicksLimit: 6,
            },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [trendData]);

  return (
    <div className="glass-card p-6 h-full flex flex-col">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
        Tren Deteksi Hama (7 Hari)
      </h3>
      <div className="flex-1 min-h-[260px]">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
