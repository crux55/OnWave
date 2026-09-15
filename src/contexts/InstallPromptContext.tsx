'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallPromptContextType {
  // True once a real Android/Chromium install prompt is available to fire.
  canInstall: boolean;
  promptInstall: () => Promise<void>;
  // True if the app is already running installed (standalone display mode,
  // or navigator.standalone on iOS) — nothing to offer in that case.
  isStandalone: boolean;
  // iOS has no beforeinstallprompt in any browser (all iOS browsers are
  // WebKit under Apple's policy) — Add to Home Screen is manual-only there.
  isIOS: boolean;
}

const InstallPromptContext = createContext<InstallPromptContextType | undefined>(undefined);

export function InstallPromptProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsStandalone(
      window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true
    );
    setIsIOS(/iPad|iPhone|iPod/.test(window.navigator.userAgent) && !(window as any).MSStream);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    // A captured prompt event can only be used once, whichever way the
    // user answers it — discard it either way.
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const value: InstallPromptContextType = {
    canInstall: !!deferredPrompt && !isStandalone,
    promptInstall,
    isStandalone,
    isIOS,
  };

  return <InstallPromptContext.Provider value={value}>{children}</InstallPromptContext.Provider>;
}

export function useInstallPrompt(): InstallPromptContextType {
  const ctx = useContext(InstallPromptContext);
  if (ctx === undefined) {
    throw new Error('useInstallPrompt must be used within an InstallPromptProvider');
  }
  return ctx;
}
