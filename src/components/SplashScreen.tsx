import React, { useEffect, useState } from 'react';
import { DoorblyLogo } from './DoorblyLogo';

interface Props {
  onComplete: () => void;
  statusText?: string;
}

export const SplashScreen: React.FC<Props> = ({ onComplete, statusText = 'Loading Doorbly Services...' }) => {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(onComplete, 300);
    }, 1200);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0F766E] text-white transition-opacity duration-300 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center space-y-4">
        {/* Doorbly Official Logo Lockup */}
        <div className="px-7 py-3.5 rounded-3xl bg-white flex items-center justify-center shadow-2xl relative transform animate-in zoom-in-75 duration-300">
          <DoorblyLogo size="lg" variant="full" />
        </div>

        <div className="text-center">
          <p className="text-xs text-teal-100 font-semibold tracking-widest uppercase mt-0.5">
            Odisha Doorstep Services
          </p>
        </div>

        <div className="pt-6 flex flex-col items-center space-y-2">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          <span className="text-[11px] text-teal-100/90 font-medium tracking-wide">
            {statusText}
          </span>
        </div>
      </div>

      <div className="absolute bottom-6 text-[10px] text-teal-200/80 font-medium">
        Fast • Trusted • Pay After Service
      </div>
    </div>
  );
};
