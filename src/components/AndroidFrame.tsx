import React, { useState } from 'react';
import { AndroidStatusBar } from './AndroidStatusBar';
import { AndroidNavBar } from './AndroidNavBar';
import { DoorblyLogo } from './DoorblyLogo';
import { Smartphone, Maximize2, Minimize2, QrCode } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  onOpenInstallModal?: () => void;
}

export const AndroidFrame: React.FC<Props> = ({ children, onOpenInstallModal }) => {
  const [deviceFrameMode, setDeviceFrameMode] = useState<boolean>(true);

  return (
    <div className="min-h-[100dvh] bg-slate-900 flex flex-col items-center justify-center p-0 md:p-6 text-slate-900 selection:bg-teal-600 selection:text-white font-sans">
      {/* Top desktop header bar (hidden on mobile phones) */}
      <header className="hidden md:flex items-center justify-between w-full max-w-md mb-3 px-2 text-white text-xs">
        <div className="flex items-center space-x-2">
          <div className="h-6 px-1.5 py-0.5 rounded-md bg-white flex items-center justify-center shadow-xs">
            <DoorblyLogo size="xs" variant="full" />
          </div>
          <span className="font-bold tracking-tight text-slate-200">Customer • Mobile App</span>
        </div>
        <div className="flex items-center space-x-2">
          {onOpenInstallModal && (
            <button
              type="button"
              onClick={onOpenInstallModal}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-2.5 py-1 rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Install on Mobile Phone via QR Code"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Install on Phone</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setDeviceFrameMode(!deviceFrameMode)}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors cursor-pointer"
            title="Toggle Mobile Device Frame"
          >
            {deviceFrameMode ? (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Full Width</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5" />
                <span>Phone Frame</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Device Body - Native full-screen 100dvh on real mobile phones, framed on desktop */}
      <main
        className={`w-full bg-white flex flex-col overflow-hidden transition-all duration-300 relative shadow-2xl ${
          deviceFrameMode
            ? 'max-w-md md:rounded-[40px] md:border-[10px] md:border-slate-800 md:ring-1 md:ring-slate-700 md:h-[844px] md:max-h-[92vh] h-[100dvh]'
            : 'max-w-2xl md:rounded-3xl md:h-[860px] md:max-h-[94vh] h-[100dvh]'
        }`}
      >
        {/* Android Punch Hole Camera on desktop device frame mode only */}
        {deviceFrameMode && (
          <div className="hidden md:block absolute top-2.5 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-900 rounded-full z-40 border border-slate-800 shadow-inner"></div>
        )}

        {/* Simulated Status Bar only on Desktop Frame (real phones use native OS status bar) */}
        <div className="hidden md:block shrink-0">
          <AndroidStatusBar />
        </div>

        {/* Inner App Content */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {children}
        </div>

        {/* Simulated Gesture Bar only on Desktop Frame (real phones use native OS navigation bar) */}
        <div className="hidden md:block shrink-0">
          <AndroidNavBar />
        </div>
      </main>
    </div>
  );
};
