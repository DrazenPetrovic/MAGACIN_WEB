import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle, Clock, Truck } from 'lucide-react';
import { theme } from '../theme';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005';
const PRIMARY = theme.primary;
const SECONDARY = theme.secondary;

interface Narudzbenica {
  sifra_narudzbenice: number;
  broj_narudzbenice: string;
  naziv_partnera: string;
  datum_narudzbe: string;
  ukupan_iznos: number;
  status: string;
}

export default function Narudzbenice() {
  const [narudzbenice, setNarudzbenice] = useState<Narudzbenica[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [potvrdjivanje, setPotvrdjivanje] = useState<number | null>(null);
  const [uspjeh, setUspjeh] = useState('');

  const ucitaj = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/magacin/narudzbenice`, { credentials: 'include' });
      if (!res.ok) throw new Error('Greška pri učitavanju narudžbenica');
      const data = await res.json();
      setNarudzbenice(data.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepoznata greška');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { ucitaj(); }, []);

  const potvrdi = async (sifraNarudzbenice: number) => {
    setPotvrdjivanje(sifraNarudzbenice);
    setUspjeh('');
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/magacin/narudzbenice/potvrdi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sifraNarudzbenice }),
      });
      const data = await res.json();
      if (data.success) {
        setUspjeh(`Narudžbenica #${sifraNarudzbenice} potvrđena.`);
        ucitaj();
      } else {
        setError(data.message || 'Greška pri potvrdi.');
      }
    } catch {
      setError('Greška pri komunikaciji sa serverom.');
    } finally {
      setPotvrdjivanje(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'potvrđena':
      case 'potvrdjena':
      case 'primljeno':
        return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
      case 'isporučena':
      case 'isporucena':
        return <Truck className="w-3.5 h-3.5 text-blue-500" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-amber-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'potvrđena':
      case 'potvrdjena':
      case 'primljeno':
        return 'bg-green-100 text-green-700';
      case 'isporučena':
      case 'isporucena':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-amber-100 text-amber-700';
    }
  };

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold" style={{ color: PRIMARY }}>Narudžbenice</h2>
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
      ) : narudzbenice.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">Nema narudžbenica</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: `${PRIMARY}18` }}>
                <th className="px-3 py-2 text-left font-semibold" style={{ color: PRIMARY }}>Br. narudžbe</th>
                <th className="px-3 py-2 text-left font-semibold" style={{ color: PRIMARY }}>Partner</th>
                <th className="px-3 py-2 text-left font-semibold" style={{ color: PRIMARY }}>Datum</th>
                <th className="px-3 py-2 text-right font-semibold" style={{ color: PRIMARY }}>Iznos</th>
                <th className="px-3 py-2 text-center font-semibold" style={{ color: PRIMARY }}>Status</th>
                <th className="px-3 py-2 text-center font-semibold" style={{ color: PRIMARY }}>Akcija</th>
              </tr>
            </thead>
            <tbody>
              {narudzbenice.map((n) => (
                <tr key={n.sifra_narudzbenice} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-gray-700">{n.broj_narudzbenice || n.sifra_narudzbenice}</td>
                  <td className="px-3 py-2 text-gray-800">{n.naziv_partnera}</td>
                  <td className="px-3 py-2 text-gray-500">{n.datum_narudzbe ? new Date(n.datum_narudzbe).toLocaleDateString('bs-BA') : '—'}</td>
                  <td className="px-3 py-2 text-right font-semibold" style={{ color: SECONDARY }}>
                    {n.ukupan_iznos != null ? `${Number(n.ukupan_iznos).toFixed(2)} KM` : '—'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${getStatusColor(n.status)}`}>
                      {getStatusIcon(n.status)}
                      {n.status || 'Na čekanju'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {(!n.status || n.status.toLowerCase() === 'na čekanju' || n.status.toLowerCase() === 'na cekanju') && (
                      <button
                        onClick={() => potvrdi(n.sifra_narudzbenice)}
                        disabled={potvrdjivanje === n.sifra_narudzbenice}
                        className="px-2 py-1 text-xs text-white rounded-md disabled:opacity-50"
                        style={{ backgroundColor: SECONDARY }}
                      >
                        {potvrdjivanje === n.sifra_narudzbenice ? '...' : 'Potvrdi prijem'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
