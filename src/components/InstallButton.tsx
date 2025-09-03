import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from './ui/button';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export const InstallButton: React.FC = () => {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!promptEvent) return null;

  const install = async () => {
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome !== 'accepted') {
      setPromptEvent(null);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={install}
      title="Install App"
      className="rounded-lg"
    >
      <Download className="w-4 h-4" />
    </Button>
  );
};

export default InstallButton;
