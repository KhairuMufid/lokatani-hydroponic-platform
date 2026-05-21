import React, { memo } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * VideoFeed — Performance-Critical Component
 *
 * Renders a static JSX shell exactly ONCE. All 15 FPS updates
 * are handled via refs passed from useLiveFrameRenderer.
 * React.memo with constant comparator prevents any re-render.
 */
const VideoFeed = memo(function VideoFeed({ imgRef, canvasRef, statsRef, fpsRef }) {
  return (
    <div className="glass-card overflow-hidden">
      {/* Live indicator bar */}
      <div className="flex items-center justify-between px-4 py-2.5 
                      border-b border-gray-200/50 dark:border-white/[0.04]
                      bg-gray-50/50 dark:bg-surface-900/30">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 live-pulse" />
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            Live Feed
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-gray-500 dark:text-gray-400">
          <span ref={fpsRef}>0 FPS</span>
          <span>Latency: <span ref={statsRef}>—</span></span>
        </div>
      </div>

      {/* Video container */}
      <div className="live-overlay-container bg-black">
        <img
          ref={imgRef}
          alt="Live camera feed"
          className="w-full h-full object-contain"
          src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='480'%3E%3Crect fill='%23111' width='640' height='480'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='%23555' font-family='Inter' font-size='16'%3EMenunggu feed kamera...%3C/text%3E%3C/svg%3E"
        />
        <canvas ref={canvasRef} />

        {/* Stale indicator (hidden by default, shown via JS) */}
        <div id="stale-indicator" className="stale-overlay" style={{ display: 'none' }}>
          <div className="flex flex-col items-center gap-2 text-white">
            <WifiOff size={28} className="opacity-70" />
            <span className="text-sm font-medium opacity-80">Feed terhenti</span>
            <span className="text-xs opacity-50">Menunggu frame baru...</span>
          </div>
        </div>
      </div>
    </div>
  );
}, () => true); // Never re-render — all updates via refs

export default VideoFeed;
