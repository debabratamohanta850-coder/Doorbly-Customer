import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Smartphone,
  Download,
  Copy,
  Check,
  X,
  ShieldCheck,
  Sparkles,
  QrCode,
  Share2,
  CheckCircle2
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { DOORBLY_OFFICIAL_LOGO_URL } from './DoorblyLogo';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidInstallModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const {
    isInstalled,
    isIOS,
    installUrl,
    triggerInstall,
    hasDeferredPrompt
  } = usePWAInstall();

  const [copied, setCopied] = useState(false);
  const [installStatus, setInstallStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(installUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShareLink = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Install Doorbly Customer App',
          text: 'Book trusted doorstep services across Odisha with the Doorbly mobile app:',
          url: installUrl
        });
      } catch {
        // User cancelled share sheet
      }
    } else {
      handleCopyLink();
    }
  };

  const handleDirectInstall = async () => {
    if (hasDeferredPrompt) {
      const success = await triggerInstall();
      if (success) {
        setInstallStatus('Doorbly is installing! Check your phone home screen.');
      }
    } else if (isIOS) {
      setInstallStatus(
        'On iPhone/iPad: Tap the Share icon at the bottom of Safari, then tap "Add to Home Screen".'
      );
    } else {
      setInstallStatus(
        'Tap the browser menu (⋮) at the top-right of Chrome and select "Install app" or "Add to Home screen" to add Doorbly to your phone.'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0F766E] to-teal-800 text-white p-5 relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-white p-1.5 flex items-center justify-center shadow-md shrink-0">
              <img
                src={DOORBLY_OFFICIAL_LOGO_URL}
                alt="Doorbly"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="text-[10px] text-emerald-200 font-bold uppercase tracking-wider block">
                Direct Mobile App Installer
              </span>
              <h2 className="text-base font-bold text-white leading-tight">
                Install Doorbly on Phone
              </h2>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-slate-800">
          {/* Direct 1-Tap Install Button at Top for Mobile Users */}
          <div className="space-y-2">
            {isInstalled ? (
              <div className="w-full py-3.5 px-4 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs rounded-2xl flex items-center justify-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Doorbly is Installed on This Phone</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleDirectInstall}
                className="w-full py-3.5 bg-[#0F766E] hover:bg-teal-800 active:scale-[0.99] text-white font-bold text-xs rounded-2xl shadow-md flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-300 animate-bounce" />
                <span>
                  {hasDeferredPrompt
                    ? '1-Tap Direct Install Now'
                    : 'Install App on This Phone'}
                </span>
              </button>
            )}

            {installStatus && (
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl text-[11px] text-teal-900 font-medium leading-snug">
                {installStatus}
              </div>
            )}
          </div>

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-3xl space-y-3">
            <div className="bg-white p-3.5 rounded-2xl shadow-md border border-slate-200/80 relative flex items-center justify-center">
              <QRCodeSVG
                value={installUrl}
                size={184}
                level="H"
                fgColor="#0F766E"
                bgColor="#FFFFFF"
                imageSettings={{
                  src: DOORBLY_OFFICIAL_LOGO_URL,
                  x: undefined,
                  y: undefined,
                  height: 40,
                  width: 40,
                  excavate: true
                }}
              />
            </div>

            <div className="text-center">
              <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-teal-800 bg-teal-100/80 px-2.5 py-0.5 rounded-full">
                <QrCode className="w-3 h-3 text-teal-700" />
                <span>Scan to Install on Any Mobile Phone</span>
              </span>
              <p className="text-[11px] text-slate-500 mt-1">
                Scan with your phone camera or Google Lens to launch &amp; install
              </p>
            </div>
          </div>

          {/* Copy & Share Direct Install Link */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-2">
            <div className="truncate flex-1">
              <span className="text-[10px] text-slate-400 block font-medium">
                Direct Mobile Install Link
              </span>
              <span className="text-xs font-mono text-slate-700 truncate block">
                {installUrl}
              </span>
            </div>
            <div className="flex items-center space-x-1.5 shrink-0">
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 active:scale-95 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-1 transition-all"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-600" />
                    <span>Copy</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleShareLink}
                className="p-1.5 bg-teal-50 hover:bg-teal-100 active:scale-95 text-teal-800 rounded-xl border border-teal-200 transition-all"
                title="Share Install Link"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 3 Easy Steps Guide for Mobile Phones */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
            <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>How to Install on Your Mobile Phone</span>
            </span>

            <div className="space-y-2 text-[11px] text-slate-600">
              <div className="flex items-start space-x-2">
                <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <p>
                  Scan the <strong>QR Code</strong> above with your phone camera or open the link in <strong>Chrome</strong> (Android) or <strong>Safari</strong> (iOS).
                </p>
              </div>

              <div className="flex items-start space-x-2">
                <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <p>
                  Tap the <strong>"1-Tap Direct Install Now"</strong> button above, or tap the browser menu <strong>(⋮)</strong> at the top-right.
                </p>
              </div>

              <div className="flex items-start space-x-2">
                <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <p>
                  Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>. Doorbly installs directly on your home screen like a native app!
                </p>
              </div>
            </div>
          </div>

          {/* Standalone Security Badge */}
          <div className="flex items-center justify-center space-x-1.5 text-[10px] text-slate-400 font-medium pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Verified Mobile Web App • Instant Home Screen Install</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 text-center shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};
