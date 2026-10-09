import React, { useState } from 'react';
import { useLocation } from '../context/LocationContext';
import { MapPin, ShieldCheck, Compass } from 'lucide-react';

export const AndroidLocationDialog: React.FC = () => {
  const {
    showPermissionDialog,
    acceptAndroidPermission,
    denyAndroidPermission
  } = useLocation();

  const [locationAccuracy, setLocationAccuracy] = useState<'precise' | 'approximate'>('precise');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!showPermissionDialog) return null;

  const handleSelect = async (mode: 'while_using' | 'only_once') => {
    setIsProcessing(true);
    await acceptAndroidPermission(mode);
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200/80 text-slate-900 transform transition-all scale-100 animate-in zoom-in-95"
        role="dialog"
        aria-modal="true"
      >
        {/* Android system permission header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-700 shadow-xs">
            <MapPin className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200/60">
              Android Runtime Permission
            </span>
            <h3 className="text-lg font-bold text-slate-900 leading-snug mt-0.5">
              Allow Doorbly to access this device's location?
            </h3>
          </div>
        </div>

        <p className="text-xs text-slate-600 mb-5 leading-relaxed">
          Doorbly uses your exact GPS coordinates to match nearby doorstep service specialists, calculate service transit, and dispatch professionals to your doorstep.
        </p>

        {/* Android Precise vs Approximate selector */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => setLocationAccuracy('precise')}
            className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
              locationAccuracy === 'precise'
                ? 'border-teal-600 bg-teal-50/70 ring-2 ring-teal-500/20'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Compass className={`w-5 h-5 ${locationAccuracy === 'precise' ? 'text-teal-700' : 'text-slate-500'}`} />
              {locationAccuracy === 'precise' && (
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span>
              )}
            </div>
            <div>
              <p className="font-semibold text-xs text-slate-800">Precise GPS</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Recommended for doorstep services</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setLocationAccuracy('approximate')}
            className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
              locationAccuracy === 'approximate'
                ? 'border-teal-600 bg-teal-50/70 ring-2 ring-teal-500/20'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <ShieldCheck className={`w-5 h-5 ${locationAccuracy === 'approximate' ? 'text-teal-700' : 'text-slate-500'}`} />
              {locationAccuracy === 'approximate' && (
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span>
              )}
            </div>
            <div>
              <p className="font-semibold text-xs text-slate-800">Approximate</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Area-level accuracy</p>
            </div>
          </button>
        </div>

        {/* Action buttons matching Android 14 standard dialog */}
        <div className="flex flex-col space-y-2">
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => handleSelect('while_using')}
            className="w-full py-3 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 active:scale-[0.99] text-white font-semibold text-sm transition-all shadow-sm flex items-center justify-center space-x-2"
          >
            {isProcessing ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : null}
            <span>While using the app</span>
          </button>

          <button
            type="button"
            disabled={isProcessing}
            onClick={() => handleSelect('only_once')}
            className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-[0.99] text-slate-800 font-semibold text-sm transition-all"
          >
            Only this time
          </button>

          <button
            type="button"
            disabled={isProcessing}
            onClick={denyAndroidPermission}
            className="w-full py-2.5 px-4 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-50 font-medium text-xs transition-all"
          >
            Don't allow
          </button>
        </div>
      </div>
    </div>
  );
};
