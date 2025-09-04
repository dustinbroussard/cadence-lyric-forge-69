import { useEffect, useState } from 'react';
import { Button } from './ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const MS_IN_DAY = 86400000;
// Developers can adjust this to control how often the banner reappears
const PROMPT_INTERVAL_DAYS = 0; // 0 = show on every visit

export function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isInstalled =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error - only present on iOS Safari
      navigator.standalone;

    if (isInstalled) return;

    if (sessionStorage.getItem('pwa-install-dismissed')) return;

    const last = localStorage.getItem('pwa-last-prompt');
    if (
      PROMPT_INTERVAL_DAYS > 0 &&
      last &&
      Date.now() - Number(last) < PROMPT_INTERVAL_DAYS * MS_IN_DAY
    ) {
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    localStorage.setItem('pwa-last-prompt', String(Date.now()));
    setVisible(false);
    setPromptEvent(null);
  };

  const dismiss = () => {
    sessionStorage.setItem('pwa-install-dismissed', '1');
    localStorage.setItem('pwa-last-prompt', String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 flex items-center justify-between p-4 lyric-surface border-t lyric-border z-50">
      <span className="text-sm">Install Cadence Codex?</span>
      <div className="space-x-2">
        <Button size="sm" variant="ghost" onClick={dismiss}>
          Not now
        </Button>
        <Button size="sm" onClick={install}>
          Install
        </Button>
      </div>
    </div>
  );
}

export default InstallPrompt;

