export const LOCAL_ORDER_NEW_EVENT = "lokalne-narudzbe:new";

export interface LocalOrderNewEventDetail {
  count: number;
  orderNumbers: string[];
  createdAt: number;
  maxPriority?: number;
}

type SoundPriority = 1 | 2 | 3;

const normalizePriority = (priority?: number): SoundPriority => {
  if (priority === 3) return 3;
  if (priority === 2) return 2;
  return 1;
};

export const playLocalOrderTone = (priority?: number) => {
  try {
    const Ctx =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;

    const ctx = new Ctx();
    const now = ctx.currentTime;
    const soundPriority = normalizePriority(priority);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type =
      soundPriority === 3
        ? "square"
        : soundPriority === 2
          ? "triangle"
          : "sine";
    osc.connect(gain);

    if (soundPriority === 3) {
      // Hitno: glasniji dvostruki alarm da se odmah primijeti.
      gain.gain.exponentialRampToValueAtTime(0.3, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.32, now + 0.38);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.72);

      osc.frequency.setValueAtTime(980, now);
      osc.frequency.setValueAtTime(1160, now + 0.09);
      osc.frequency.setValueAtTime(980, now + 0.38);
      osc.frequency.setValueAtTime(1240, now + 0.5);

      osc.start(now);
      osc.stop(now + 0.76);
    } else if (soundPriority === 2) {
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

      osc.frequency.setValueAtTime(900, now);
      osc.frequency.setValueAtTime(1120, now + 0.14);

      osc.start(now);
      osc.stop(now + 0.4);
    } else {
      gain.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1047, now + 0.12);

      osc.start(now);
      osc.stop(now + 0.34);
    }

    osc.onended = () => {
      void ctx.close();
    };
  } catch {
    // Silent fallback: sound is best-effort and must never block UI.
  }
};
