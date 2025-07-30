
import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isInstalled = () => {
      return window.matchMedia('(display-mode: standalone)').matches ||
             (window.navigator as any).standalone === true ||
             document.referrer.includes('android-app://');
    };

    console.log('PWA Install Check - Already installed:', isInstalled());

    if (isInstalled()) {
      console.log('PWA already installed');
      return;
    }

    // Check if dismissed recently (reduced from 1 hour to 10 minutes for testing)
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const tenMinutes = 10 * 60 * 1000;
      if (Date.now() - dismissedTime < tenMinutes) {
        console.log('Install prompt recently dismissed');
        return;
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('Install prompt event fired');
      e.preventDefault();
      const installEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(installEvent);
      
      // Show prompt after shorter delay for testing
      setTimeout(() => {
        console.log('Showing install prompt');
        setShowPrompt(true);
      }, 2000);
    };

    const handleAppInstalled = () => {
      console.log('PWA installed successfully');
      setDeferredPrompt(null);
      setShowPrompt(false);
      localStorage.removeItem('pwa-install-dismissed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // More aggressive fallback for browsers that don't fire beforeinstallprompt
    const fallbackTimer = setTimeout(() => {
      if (!deferredPrompt && !localStorage.getItem('pwa-install-dismissed')) {
        console.log('Showing fallback install prompt');
        setShowPrompt(true);
      }
    }, 5000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(fallbackTimer);
    };
  }, [deferredPrompt]);

  const handleInstall = async () => {
    console.log('Install button clicked');
    
    if (deferredPrompt) {
      try {
        console.log('Triggering install prompt');
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('Install prompt result:', outcome);
        
        if (outcome === 'dismissed') {
          handleDismiss();
        } else {
          setShowPrompt(false);
        }
        setDeferredPrompt(null);
      } catch (error) {
        console.error('Install failed:', error);
        showManualInstructions();
      }
    } else {
      console.log('No deferred prompt, showing manual instructions');
      showManualInstructions();
    }
  };

  const showManualInstructions = () => {
    const isChrome = navigator.userAgent.includes('Chrome');
    const isSafari = navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome');
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = navigator.userAgent.includes('Android');
    
    let message = 'To install Cadence Codex as a PWA:\n\n';
    
    if (isIOS && isSafari) {
      message += '1. Tap the Share button (⬆️)\n2. Scroll down and select "Add to Home Screen"\n3. Tap "Add" to install';
    } else if (isAndroid && isChrome) {
      message += '1. Tap the menu (⋮) in the top right\n2. Select "Add to Home screen"\n3. Tap "Add" to install';
    } else if (isChrome) {
      message += '1. Look for the install icon (⬇️) in the address bar\n2. Or click the menu (⋮) and select "Install Cadence Codex"';
    } else {
      message += 'Look for "Add to Home screen" or "Install" in your browser menu.';
    }
    
    alert(message);
  };

  const handleDismiss = () => {
    console.log('Install prompt dismissed');
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-slide-up">
      <div className="lyric-surface border lyric-border border-opacity-30 rounded-2xl p-4 shadow-2xl backdrop-blur-sm">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl lyric-accent-bg flex items-center justify-center shadow-lg">
              <Smartphone className="text-white" size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base">Install Cadence Codex</h3>
              <p className="text-sm opacity-80 leading-tight">Install as a full PWA app</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg hover:lyric-highlight-bg transition-colors opacity-60 hover:opacity-100"
          >
            <X size={16} />
          </button>
        </div>
        
        <div className="space-y-2">
          <div className="flex text-xs opacity-70 space-x-4">
            <span>✓ Full PWA</span>
            <span>✓ Offline ready</span>
            <span>✓ App-like experience</span>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={handleInstall}
              className="flex-1 px-4 py-2.5 lyric-accent-bg text-white rounded-xl hover:opacity-90 transition-all duration-300 flex items-center justify-center space-x-2 font-semibold shadow-lg"
            >
              <Download size={16} />
              <span>Install PWA</span>
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2.5 lyric-surface border lyric-border border-opacity-30 rounded-xl hover:lyric-highlight-bg transition-all duration-300 text-sm"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
