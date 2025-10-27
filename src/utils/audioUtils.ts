
// Sound effects and haptic feedback utilities
let sharedAudioContext: (AudioContext | null) = null;
let lastTypeSoundAt = 0;

function getAudioContext(): AudioContext | null {
  try {
    const w = window as Window & { webkitAudioContext?: typeof window.AudioContext };
    const Ctor = window.AudioContext || w.webkitAudioContext;
    if (!Ctor) return null;
    if (!sharedAudioContext) sharedAudioContext = new Ctor();
    // Attempt to resume if suspended (common before user interaction)
    if (sharedAudioContext.state === 'suspended') void sharedAudioContext.resume().catch(() => {});
    return sharedAudioContext;
  } catch {
    return null;
  }
}

export const playTypewriterSound = () => {
  const now = performance.now();
  // Rate limit to avoid excessive audio node creation
  if (now - lastTypeSoundAt < 50) return; // ~20Hz max
  lastTypeSoundAt = now;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const t0 = ctx.currentTime;
    osc.frequency.setValueAtTime(850, t0);
    osc.frequency.exponentialRampToValueAtTime(220, t0 + 0.08);

    gain.gain.setValueAtTime(0.08, t0);
    gain.gain.exponentialRampToValueAtTime(0.01, t0 + 0.08);

    osc.start(t0);
    osc.stop(t0 + 0.09);
  } catch {
    // noop if audio fails
  }
};

export const triggerHaptic = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(10);
  }
};
