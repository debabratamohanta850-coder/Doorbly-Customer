import { useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// Global state so beforeinstallprompt is never missed even if fired before component mount
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
let globalIsInstalled = false;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

if (typeof window !== 'undefined') {
  const checkStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  globalIsInstalled = checkStandalone();

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    globalIsInstalled = true;
    globalDeferredPrompt = null;
    notifyListeners();
  });
}

export function getPublicInstallUrl(): string {
  if (typeof window === 'undefined') {
    return 'https://ais-pre-hjcyxueovfdrvdsnqoenya-738826490911.asia-east1.run.app/?install=1';
  }
  // Convert dev preview host to public shared host so any mobile phone can open it directly
  const origin = window.location.origin.replace('https://ais-dev-', 'https://ais-pre-');
  return `${origin}/?install=1`;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [isInstalled, setIsInstalled] = useState<boolean>(globalIsInstalled);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [installUrl, setInstallUrl] = useState<string>(getPublicInstallUrl());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setInstallUrl(getPublicInstallUrl());
      const ua = window.navigator.userAgent.toLowerCase();
      setIsAndroid(/android/.test(ua));
      setIsIOS(/iphone|ipad|ipod/.test(ua));
    }

    const syncState = () => {
      setDeferredPrompt(globalDeferredPrompt);
      setIsInstalled(globalIsInstalled);
    };

    listeners.add(syncState);
    syncState();

    return () => {
      listeners.delete(syncState);
    };
  }, []);

  const triggerInstall = async (): Promise<boolean> => {
    if (!globalDeferredPrompt) {
      return false;
    }
    try {
      await globalDeferredPrompt.prompt();
      const { outcome } = await globalDeferredPrompt.userChoice;
      if (outcome === 'accepted') {
        globalIsInstalled = true;
        globalDeferredPrompt = null;
        notifyListeners();
        return true;
      }
    } catch (err) {
      console.warn('Install prompt error:', err);
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isAndroid,
    isIOS,
    installUrl,
    triggerInstall,
    hasDeferredPrompt: !!deferredPrompt
  };
}
