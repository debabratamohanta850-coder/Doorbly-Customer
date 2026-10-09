import React, { useState, useEffect } from 'react';
import { Wifi, BatteryFull, MapPin } from 'lucide-react';
import { useLocation } from '../context/LocationContext';

export const AndroidStatusBar: React.FC = () => {
  const { currentGps } = useLocation();
  const [time, setTime] = useState('09:41');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateClock();
    const id = setInterval(updateClock, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="w-full bg-[#0F766E] text-white px-4 pt-2 pb-1.5 flex items-center justify-between text-xs select-none tracking-tight z-30 shrink-0">
      <div className="flex items-center space-x-2">
        <span className="font-bold text-[12px] tracking-wide font-mono">{time}</span>
        {currentGps?.city && (
          <span className="flex items-center space-x-1 text-[10px] text-teal-200 bg-white/10 px-1.5 py-0.5 rounded-full">
            <MapPin className="w-2.5 h-2.5 text-emerald-300" />
            <span className="max-w-[70px] truncate text-[9px] font-medium">{currentGps.city}</span>
          </span>
        )}
      </div>

      <div className="flex items-center space-x-2 text-white/95">
        <span className="text-[9px] uppercase font-bold text-teal-200">5G</span>
        <Wifi className="w-3.5 h-3.5 text-white" />
        <BatteryFull className="w-3.5 h-3.5 text-white" />
      </div>
    </div>
  );
};
