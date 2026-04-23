const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3005";

export interface TerenData {
  sifra_terena_dostava: number;
  sifra_terena: number;
  datum_dostave: string;
  naziv_dana: string;
  zavrsena_dostava: number;
}

// Detaljna stavka — jedan red po kupcu i proizvodu
export interface NarudzbaStavka {
  sif: string;
  naziv_proizvoda: string;
  jm: string;
  kolicina: number;
  napomena?: string;
  sifra_kupca: number;
  naziv_kupca: string;
}

// Grupisani red — zbir količina po proizvodu za cijeli teren
export interface NarudzbaGrupisano {
  sif: string;
  naziv_proizvoda: string;
  jm: string;
  kolicina: number;
}

const headers = { "Content-Type": "application/json" };
const opts = { credentials: "include" as RequestCredentials };

export const fetchTereniPoDanima = async (): Promise<TerenData[]> => {
  const res = await fetch(`${API_URL}/api/aktivne-narudzbe-teren/tereni`, opts);
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.message || "Greška pri dohvatanju terena");
  return data.data;
};

export const fetchAktivneNarudzbe = async (sifraTerena: number): Promise<NarudzbaStavka[]> => {
  const res = await fetch(`${API_URL}/api/aktivne-narudzbe-teren/${sifraTerena}`, opts);
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.message || "Greška pri dohvatanju narudžbi");
  return data.data;
};

export const fetchAktivneNarudzbeGrupisano = async (sifraTerena: number): Promise<NarudzbaGrupisano[]> => {
  const res = await fetch(`${API_URL}/api/aktivne-narudzbe-teren/${sifraTerena}/grupisano`, opts);
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.message || "Greška pri dohvatanju grupiranih narudžbi");
  return data.data;
};

// Placeholder — dodati kad service bude spreman
export const savePripremljeneKolicine = async (
  _sifraTerena: number,
  _stavke: { sif: string; sifra_kupca: number; pripremljenoKg: number }[]
): Promise<void> => {
  void headers;
  throw new Error("savePripremljeneKolicine — service još nije implementiran");
};
