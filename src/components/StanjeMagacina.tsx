import { useEffect, useState } from 'react';
import { RefreshCw, Search, AlertTriangle, TrendingDown } from 'lucide-react';
import { theme } from '../theme';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005';
const PRIMARY = theme.primary;
const SECONDARY = theme.secondary;

interface StavkaMagacina {
  sifra_artikla: number;
  naziv_artikla: string;
  jedinica_mjere: string;
  kolicina: number;
  min_kolicina: number;
}

export default function StanjeMagacina() {
  const [stavke, setStavke] = useState<StavkaMagacina[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pretraga, setPretraga] = useState('');

  const ucitaj = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/magacin/stanje`, { credentials: 'include' });
      if (!res.ok) throw new Error('Greška pri učitavanju podataka');
      const data = await res.json();
      setStavke(data.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepoznata greška');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { ucitaj(); }, []);

  const filtrirane = stavke.filter((s) =>
    s.naziv_artikla?.toLowerCase().includes(pretraga.toLowerCase()) ||
    String(s.sifra_artikla).includes(pretraga)
  );

  const nizkiNivo = filtrirane.filter((s) => s.kolicina <= s.min_kolicina);
  const normalne = filtrirane.filter((s) => s.kolicina > s.min_kolicina);

  return (
    <div className="p-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={pretraga}
            onChange={(e) => setPretraga(e.target.value)}
            placeholder="Pretraga artikala..."
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none"
            onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
            onBlur={(e) => (e.target.style.borderColor = 'rgb(209 213 219)')}
          />
        </div>
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
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-3">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-400 text-sm">Učitavanje...</div>
      ) : (
        <>
          {/* Upozorenje — nizak nivo zaliha */}
          {nizkiNivo.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2 text-amber-700 text-sm font-semibold">
                <AlertTriangle className="w-4 h-4" />
                Nizak nivo zaliha ({nizkiNivo.length})
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ backgroundColor: '#fef3c7' }}>
                      <th className="px-3 py-2 text-left font-semibold text-amber-800">Šifra</th>
                      <th className="px-3 py-2 text-left font-semibold text-amber-800">Naziv</th>
                      <th className="px-3 py-2 text-right font-semibold text-amber-800">Količina</th>
                      <th className="px-3 py-2 text-right font-semibold text-amber-800">Min.</th>
                      <th className="px-3 py-2 text-left font-semibold text-amber-800">JM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nizkiNivo.map((s) => (
                      <tr key={s.sifra_artikla} className="border-b border-amber-100 hover:bg-amber-50">
                        <td className="px-3 py-2 font-mono text-amber-800">{s.sifra_artikla}</td>
                        <td className="px-3 py-2 text-amber-900">{s.naziv_artikla}</td>
                        <td className="px-3 py-2 text-right font-bold text-red-600">
                          <span className="flex items-center justify-end gap-1">
                            <TrendingDown className="w-3 h-3" />
                            {s.kolicina}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-amber-700">{s.min_kolicina}</td>
                        <td className="px-3 py-2 text-amber-700">{s.jedinica_mjere}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Normalne zalihe */}
          <div>
            {nizkiNivo.length > 0 && (
              <div className="text-sm font-semibold mb-2" style={{ color: PRIMARY }}>
                Normalne zalihe ({normalne.length})
              </div>
            )}
            {filtrirane.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">Nema podataka</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ backgroundColor: `${PRIMARY}18` }}>
                      <th className="px-3 py-2 text-left font-semibold" style={{ color: PRIMARY }}>Šifra</th>
                      <th className="px-3 py-2 text-left font-semibold" style={{ color: PRIMARY }}>Naziv</th>
                      <th className="px-3 py-2 text-right font-semibold" style={{ color: PRIMARY }}>Količina</th>
                      <th className="px-3 py-2 text-right font-semibold" style={{ color: PRIMARY }}>Min.</th>
                      <th className="px-3 py-2 text-left font-semibold" style={{ color: PRIMARY }}>JM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {normalne.map((s) => (
                      <tr key={s.sifra_artikla} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono text-gray-600">{s.sifra_artikla}</td>
                        <td className="px-3 py-2 text-gray-800">{s.naziv_artikla}</td>
                        <td className="px-3 py-2 text-right font-semibold" style={{ color: SECONDARY }}>{s.kolicina}</td>
                        <td className="px-3 py-2 text-right text-gray-500">{s.min_kolicina}</td>
                        <td className="px-3 py-2 text-gray-500">{s.jedinica_mjere}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
