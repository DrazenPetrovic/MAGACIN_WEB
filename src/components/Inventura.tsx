import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle, Save } from 'lucide-react';
import { theme } from '../theme';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005';
const PRIMARY = theme.primary;
const SECONDARY = theme.secondary;

interface InventuraStavka {
  sifra_artikla: number;
  naziv_artikla: string;
  jedinica_mjere: string;
  knjizna_kolicina: number;
  stvarna_kolicina?: number;
}

export default function Inventura() {
  const [stavke, setStavke] = useState<InventuraStavka[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uspjeh, setUspjeh] = useState('');
  const [unosi, setUnosi] = useState<Record<number, string>>({});
  const [snimanje, setSnimanje] = useState<number | null>(null);

  const ucitaj = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/magacin/inventura`, { credentials: 'include' });
      if (!res.ok) throw new Error('Greška pri učitavanju inventure');
      const data = await res.json();
      setStavke(data.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepoznata greška');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { ucitaj(); }, []);

  const handleUnosChange = (sifra: number, val: string) => {
    setUnosi((prev) => ({ ...prev, [sifra]: val }));
  };

  const snimi = async (sifraArtikla: number) => {
    const val = unosi[sifraArtikla];
    if (val === undefined || val === '') {
      setError('Unesite stvarnu količinu.');
      return;
    }
    setSnimanje(sifraArtikla);
    setError('');
    setUspjeh('');
    try {
      const res = await fetch(`${API_URL}/api/magacin/inventura`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sifraArtikla, stvarnaKolicina: Number(val) }),
      });
      const data = await res.json();
      if (data.success) {
        setUspjeh(`Inventura za artikal ${sifraArtikla} snimljena.`);
        setStavke((prev) =>
          prev.map((s) =>
            s.sifra_artikla === sifraArtikla ? { ...s, stvarna_kolicina: Number(val) } : s
          )
        );
        setUnosi((prev) => { const n = { ...prev }; delete n[sifraArtikla]; return n; });
      } else {
        setError(data.message || 'Greška pri snimanju.');
      }
    } catch {
      setError('Greška pri komunikaciji sa serverom.');
    } finally {
      setSnimanje(null);
    }
  };

  const razlika = (knjizna: number, stvarna?: number) => {
    if (stvarna === undefined) return null;
    return stvarna - knjizna;
  };

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold" style={{ color: PRIMARY }}>Inventura</h2>
        <button
          onClick={ucitaj}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-white rounded-lg disabled:opacity-50"
          style={{ backgroundColor: PRIMARY }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Osvježi
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-3">{error}</div>
      )}
      {uspjeh && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm mb-3">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {uspjeh}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-400 text-sm">Učitavanje...</div>
      ) : stavke.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">Nema stavki inventure</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: `${PRIMARY}18` }}>
                <th className="px-3 py-2 text-left font-semibold" style={{ color: PRIMARY }}>Šifra</th>
                <th className="px-3 py-2 text-left font-semibold" style={{ color: PRIMARY }}>Naziv</th>
                <th className="px-3 py-2 text-right font-semibold" style={{ color: PRIMARY }}>Knjižno</th>
                <th className="px-3 py-2 text-right font-semibold" style={{ color: PRIMARY }}>Stvarno</th>
                <th className="px-3 py-2 text-right font-semibold" style={{ color: PRIMARY }}>Razlika</th>
                <th className="px-3 py-2 text-left font-semibold" style={{ color: PRIMARY }}>JM</th>
                <th className="px-3 py-2 text-center font-semibold" style={{ color: PRIMARY }}>Unos</th>
              </tr>
            </thead>
            <tbody>
              {stavke.map((s) => {
                const raz = razlika(s.knjizna_kolicina, s.stvarna_kolicina);
                return (
                  <tr key={s.sifra_artikla} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-gray-600">{s.sifra_artikla}</td>
                    <td className="px-3 py-2 text-gray-800">{s.naziv_artikla}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{s.knjizna_kolicina}</td>
                    <td className="px-3 py-2 text-right font-semibold" style={{ color: SECONDARY }}>
                      {s.stvarna_kolicina ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {raz !== null ? (
                        <span className={raz === 0 ? 'text-green-600' : raz > 0 ? 'text-blue-600' : 'text-red-600'}>
                          {raz > 0 ? '+' : ''}{raz}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-500">{s.jedinica_mjere}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={unosi[s.sifra_artikla] ?? ''}
                          onChange={(e) => handleUnosChange(s.sifra_artikla, e.target.value)}
                          placeholder="Količina"
                          className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none"
                          onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                          onBlur={(e) => (e.target.style.borderColor = 'rgb(209 213 219)')}
                        />
                        <button
                          onClick={() => snimi(s.sifra_artikla)}
                          disabled={snimanje === s.sifra_artikla || !unosi[s.sifra_artikla]}
                          className="p-1 text-white rounded disabled:opacity-40"
                          style={{ backgroundColor: SECONDARY }}
                          title="Snimi"
                        >
                          {snimanje === s.sifra_artikla
                            ? <RefreshCw className="w-3 h-3 animate-spin" />
                            : <Save className="w-3 h-3" />
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
