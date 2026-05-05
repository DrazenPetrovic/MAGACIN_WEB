export const LOCAL_ORDER_NEW_EVENT = "lokalne-narudzbe:new";

export interface LocalOrderNewEventDetail {
  count: number;
  orderNumbers: string[];
  createdAt: number;
  maxPriority?: number;
}

export const playLocalOrderTone = (priority?: number) => {
  try {
    const file =
      priority === 3 ? "/notifikacija_hitna.wav" : "/notifikacija_normalna.wav";
    const audio = new Audio(file);
    void audio.play();
  } catch {
    // Silent fallback: sound is best-effort and must never block UI.
  }
};
