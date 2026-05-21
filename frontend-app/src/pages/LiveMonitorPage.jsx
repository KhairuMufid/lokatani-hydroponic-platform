import React from 'react';
import TopBar from '../components/layout/TopBar.jsx';
import VideoFeed from '../components/live/VideoFeed.jsx';
import DetectionSidebar from '../components/live/DetectionSidebar.jsx';
import ConnectionBanner from '../components/live/ConnectionBanner.jsx';
import useLiveFrameRenderer from '../hooks/useLiveFrameRenderer.js';
import useProtocolStore from '../stores/useProtocolStore.js';
import { PROTOCOL_LABELS } from '../utils/constants.js';

export default function LiveMonitorPage() {
  const activeProtocol = useProtocolStore((s) => s.activeProtocol);
  const { imgRef, canvasRef, statsRef, fpsRef, detectionRef } = useLiveFrameRenderer();

  return (
    <>
      <TopBar
        title="Live Monitor"
        subtitle={`Feed kamera real-time via ${PROTOCOL_LABELS[activeProtocol]}`}
      />
      <div className="p-6 space-y-4">
        <ConnectionBanner />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Feed — takes 2/3 width */}
          <div className="lg:col-span-2">
            <VideoFeed
              imgRef={imgRef}
              canvasRef={canvasRef}
              statsRef={statsRef}
              fpsRef={fpsRef}
            />
          </div>

          {/* Detection Sidebar — takes 1/3 width */}
          <div>
            <DetectionSidebar detectionRef={detectionRef} />
          </div>
        </div>
      </div>
    </>
  );
}
