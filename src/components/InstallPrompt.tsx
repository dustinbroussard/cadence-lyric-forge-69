
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

    // Check if dismissed recently (reduced to 5 minutes for aggressive prompting)
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const fiveMinutes = 5 * 60 * 1000;
      if (Date.now() - dismissedTime < fiveMinutes) {
        console.log('Install prompt recently dismissed');
        return;
      } else {
        // Clear old dismissal
        localStorage.removeItem('pwa-install-dismissed');
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('Install prompt event fired');
      e.preventDefault();
      const installEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(installEvent);
      
      // Show prompt immediately
      setTimeout(() => {
        console.log('Showing install prompt');
        setShowPrompt(true);
      }, 1000);
    };

    const handleAppInstalled = () => {
      console.log('PWA installed successfully');
      setDeferredPrompt(null);
      setShowPrompt(false);
      localStorage.removeItem('pwa-install-dismissed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Very aggressive fallback - show install option even without the event
    const fallbackTimer = setTimeout(() => {
      if (!localStorage.getItem('pwa-install-dismissed')) {
        console.log('Showing fallback install prompt');
        setShowPrompt(true);
      }
    }, 3000);

    // Log for debugging
    console.log('InstallPrompt: Setup complete, waiting for beforeinstallprompt event');

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(fallbackTimer);
    };
  }, []);

  const handleInstall = async () => {
    console.log('Install button clicked');
    
    if (deferredPrompt) {
      try {
        console.log('Triggering native install prompt');
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('Install prompt result:', outcome);
        
        if (outcome === 'accepted') {
          console.log('User accepted the install');
          setShowPrompt(false);
        } else {
          console.log('User dismissed the install');
          handleDismiss();
        }
        setDeferredPrompt(null);
      } catch (error) {
        console.error('Install failed:', error);
        showManualInstructions();
      }
    } else {
      console.log('No deferred prompt available, showing manual instructions');
      showManualInstructions();
    }
  };

  const showManualInstructions = () => {
    const userAgent = navigator.userAgent;
    const isChrome = userAgent.includes('Chrome');
    const isSafari = userAgent.includes('Safari') && !userAgent.includes('Chrome');
    const isFirefox = userAgent.includes('Firefox');
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = userAgent.includes('Android');
    
    let message = 'To install Cadence Codex as a PWA app:\n\n';
    
    if (isIOS && isSafari) {
      message += '1. Tap the Share button (⬆️) at the bottom\n2. Scroll down and select "Add to Home Screen"\n3. Tap "Add" to install the app';
    } else if (isAndroid && isChrome) {
      message += '1. Tap the menu (⋮) in the top right corner\n2. Select "Add to Home screen" or "Install app"\n3. Tap "Add" to install';
    } else if (isChrome) {
      message += '1. Look for the install icon (⬇️) in the address bar\n2. Or click the menu (⋮) and select "Install Cadence Codex"\n3. Click "Install" to add the app';
    } else if (isFirefox) {
      message += '1. Look for the home icon (+) in the address bar\n2. Or go to Menu > Install this site as an app\n3. Click "Install" to add the app';
    } else {
      message += 'Look for "Add to Home screen", "Install app", or similar option in your browser menu.\n\nThis works best in Chrome, Edge, or Safari browsers.';
    }
    
    alert(message);
  };

  const handleDismiss = () => {
    console.log('Install prompt dismissed by user');
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
              <p className="text-sm opacity-80 leading-tight">Get the full app experience</p>
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
            <span>✓ Works offline</span>
            <span>✓ Full app experience</span>
            <span>✓ Home screen access</span>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={handleInstall}
              className="flex-1 px-4 py-2.5 lyric-accent-bg text-white rounded-xl hover:opacity-90 transition-all duration-300 flex items-center justify-center space-x-2 font-semibold shadow-lg"
            >
              <Download size={16} />
              <span>Install App</span>
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
