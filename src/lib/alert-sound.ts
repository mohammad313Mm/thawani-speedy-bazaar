// Shared alert tone + vibration used by the global order listener.
// A single AudioContext is kept alive and unlocked on the first user gesture
// so alerts can play from any screen without a fresh interaction.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const AC =
    (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

/** Call once from a user gesture (app root) so later tones aren't blocked. */
export function unlockAlertAudio() {
  const c = getCtx();
  if (c && c.state === "suspended") void c.resume().catch(() => {});
}

/** Short two-tone chime + vibration. Safe to call anywhere. */
export function playAlertTone(times = 2) {
  const c = getCtx();
  try {
    navigator.vibrate?.([300, 150, 300]);
  } catch {
    /* no vibration support */
  }
  if (!c) return;
  if (c.state === "suspended") void c.resume().catch(() => {});
  const start = c.currentTime + 0.02;
  for (let r = 0; r < times; r++) {
    [880, 660].forEach((freq, i) => {
      const t = start + r * 0.7 + i * 0.3;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.35, t + 0.02);
      gain.gain.linearRampToValueAtTime(0, t + 0.26);
      osc.connect(gain).connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.28);
    });
  }
}
