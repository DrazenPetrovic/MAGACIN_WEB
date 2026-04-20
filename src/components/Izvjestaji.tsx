import { useState } from 'react';
import { Search, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { theme } from '../theme';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005';
const PRIMARY = theme.primary;
const SECONDARY = theme.secondary;

interface KretanjeStavka {
  datum: string;
  naziv_artikla: string;
  sifra_artikla: number;
  vrsta_promjene: string;
  kolicina: number;
  jedinica_mjere: string;
  naziv_partnera: string;
  napomena: string;
}

const today = () => new Date().toISOString().split('T')[0];
const monthAgo = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().split('T')[0];
};

export default function Izvjestaji() {
  const [datumOd, setDatumOd] = useState(monthAgo());
  const [datumDo, setDatumDo] = useState(today());
  const [stavke, setStavke] = useState<KretanjeStavka[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [pretraga, setPretraga] = useState('');

  const ucitaj = async () => {
    if (!datumOd || !datumDo) { setError('Odaberite oba datuma.'); return; }
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const url = `${API_URL}/api/magacin/izvjestaj?datumOd=${datumOd}&datumDo=${datumDo}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Greška pri učitavanju izvještaja');
      const data = await res.json();
      setStavke(data.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepoznata greška');
    } finally {
      setLoading(false);
    }
  };

  const filtrirane = stavke.filter((s) =>
    s.naziv_artikla?.toLowerCase().includes(pretraga.toLowerCase()) ||
    s.naziv_partnera?.toLowerCase().includes(pretraga.toLowerCase())
  );

  const ukupnoPrijem = filtrirane
    .filter((s) => s.vrsta_promjene?.toLowerCase().includes('prijem'))
    .reduce((sum, s) => sum + (s.kolicina ?? 0), 0);
  const ukupnoIzdavanje = filtrirane
    .filter((s) => s.vrsta_promjene?.toLowerCase().includes('izdav'))
    .reduce((sum, s) => sum + (s.kolicina ?? 0), 0);

  return (
    <div className="p-3">
      <h2 className="text-base font-bold mb-3" style={{ color: PRIMARY }}>Izvještaj — kretanje robe</h2>

      {/* Filter */}
      <div className="flex flex-wrap items-end gap-2 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Datum od</label>
          <input
            type="date"
            value={datumOd}
            onChange={(e) => setDatumOd(e.target.value)}
            className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none"
            onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
            onBlur={(e) => (e.target.style.borderColor = 'rgb(209 213 219)')}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Datum do</label>
          <input
            type="date"
            value={datumDo}
            onChange={(e) => setDatumDo(e.target.value)}
            className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none"
            onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
            onBlur={(e) => (e.target.style.borderColor = 'rgb(209 213 219)')}
          />
        </div>
        <button
          onClick={ucitaj}
          disabled={loading}
          className="flex items-center gap-1 px-4 py-1.5 text-sm text-white rounded-lg disabled:opacity-50"
          style={{ backgroundColor: PRIMARY }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Prikaži
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-3">{error}</div>
      )}

      {searched && !loading && (
        <>
          {/* Sumarno */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-xs font-semibold text-green-700">Ukupan prijem</span>
              </div>
              <div className="text-lg font-bold text-green-700">{ukupnoPrijem.toFixed(2)}</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-red-600" />
                <span className="text-xs font-semibold text-red-700">Ukupno izdato</span>
              </div>
              <div className="text-lg font-bold text-red-700">{ukupnoIzdavanje.toFixed(2)}</div>
            </div>
          </div>

          {/* Pretraga */}
          {stavke.length > 0 && (
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={pretraga}
                onChange={(e) => setPretraga(e.target.value)}
                placeholder="Filtriraj po artiklu ili partneru..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none"
                onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                onBlur={(e) => (e.target.style.borderColor = 'rgb(209 213 219)')}
              />
            </div>
          )}

          {filtrirane.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">Nema podataka za odabrani period</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ backgroundColor: `${PRIMARY}18` }}>
                    <th className="px-3 py-2 text-left font-semibold" style={{ color: PRIMARY }}>Datum</th>
                    <th className="px-3 py-2 text-left font-semibold" style={{ color: PRIMARY }}>Artikal</th>
                    <th className="px-3 py-2 text-center font-semibold" style={{ color: PRIMARY }}>Vrsta</th>
                    <th className="px-3 py-2 text-right font-semibold" style={{ color: PRIMARY }}>Količina</th>
                    <th className="px-3 py-2 text-left font-semibold" style={{ color: PRIMARY }}>JM</th>
                    <th className="px-3 py-2 text-left font-semibold" style={{ color: PRIMARY }}>Partner</th>
                    <th className="px-3 py-2 text-left font-semibold" style={{ color: PRIMARY }}>Napomena</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrirane.map((s, i) => {
                    const isPrijem = s.vrsta_promjene?.toLowerCase().includes('prijem');
                    return (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-500">
                          {s.datum ? new Date(s.datum).toLocaleDateString('bs-BA') : '—'}
                        </td>
                        <td className="px-3 py-2 text-gray-800">{s.naziv_artikla}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                            isPrijem ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {isPrijem
                              ? <TrendingUp className="w-3 h-3" />
                              : <TrendingDown className="w-3 h-3" />
                            }
                            {s.vrsta_promjene}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold" style={{ color: isPrijem ? SECONDARY : '#ef4444' }}>
                          {isPrijem ? '+' : '-'}{s.kolicina}
                        </td>
                        <td className="px-3 py-2 text-gray-500">{s.jedinica_mjere}</td>
                        <td className="px-3 py-2 text-gray-600">{s.naziv_partnera || '—'}</td>
                        <td className="px-3 py-2 text-gray-400">{s.napomena || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {!searched && (
        <div className="text-center py-10 text-gray-400 text-sm">
          Odaberite period i pritisnite "Prikaži"
        </div>
      )}
    </div>
  );
}
