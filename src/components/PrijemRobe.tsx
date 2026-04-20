import { useEffect, useState } from 'react';
import { Search, CheckCircle, Plus } from 'lucide-react';
import { theme } from '../theme';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005';
const PRIMARY = theme.primary;
const SECONDARY = theme.secondary;

interface Artikal {
  sifra_artikla: number;
  naziv_artikla: string;
  jedinica_mjere: string;
}

interface Partner {
  sifra_partnera: number;
  naziv_partnera: string;
}

export default function PrijemRobe() {
  const [artikli, setArtikli] = useState<Artikal[]>([]);
  const [partneri, setPartneri] = useState<Partner[]>([]);
  const [loadingArtikli, setLoadingArtikli] = useState(true);

  const [sifraArtikla, setSifraArtikla] = useState('');
  const [kolicina, setKolicina] = useState('');
  const [sifraPartnera, setSifraPartnera] = useState('');
  const [napomena, setNapomena] = useState('');

  const [pretragaArtikla, setPretragaArtikla] = useState('');
  const [showArtikliDropdown, setShowArtikliDropdown] = useState(false);

  const [loading, setLoading] = useState(false);
  const [uspjeh, setUspjeh] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const ucitajArtikle = async () => {
      try {
        const res = await fetch(`${API_URL}/api/magacin/artikli`, { credentials: 'include' });
        const data = await res.json();
        setArtikli(data.data ?? []);
      } catch { /* ignore */ }
      setLoadingArtikli(false);
    };
    const ucitajPartnere = async () => {
      try {
        const res = await fetch(`${API_URL}/api/magacin/partneri`, { credentials: 'include' });
        const data = await res.json();
        setPartneri(data.data ?? []);
      } catch { /* ignore */ }
    };
    ucitajArtikle();
    ucitajPartnere();
  }, []);

  const filtrirani = artikli.filter((a) =>
    a.naziv_artikla?.toLowerCase().includes(pretragaArtikla.toLowerCase()) ||
    String(a.sifra_artikla).includes(pretragaArtikla)
  );

  const odabraniArtikal = artikli.find((a) => String(a.sifra_artikla) === sifraArtikla);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setUspjeh('');

    if (!sifraArtikla || !kolicina) {
      setError('Artikal i količina su obavezni.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/magacin/prijem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sifraArtikla: Number(sifraArtikla),
          kolicina: Number(kolicina),
          sifraPartnera: sifraPartnera ? Number(sifraPartnera) : 0,
          napomena,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setUspjeh('Prijem robe uspješno evidentiran!');
        setSifraArtikla('');
        setKolicina('');
        setSifraPartnera('');
        setNapomena('');
        setPretragaArtikla('');
      } else {
        setError(data.message || 'Greška pri evidenciji prijema.');
      }
    } catch {
      setError('Greška pri komunikaciji sa serverom.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3 max-w-lg mx-auto">
      <h2 className="text-base font-bold mb-4" style={{ color: PRIMARY }}>Prijem robe</h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Artikal */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Artikal *</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={odabraniArtikal ? `${odabraniArtikal.sifra_artikla} — ${odabraniArtikal.naziv_artikla}` : pretragaArtikla}
              onChange={(e) => {
                setPretragaArtikla(e.target.value);
                setSifraArtikla('');
                setShowArtikliDropdown(true);
              }}
              onFocus={() => setShowArtikliDropdown(true)}
              placeholder={loadingArtikli ? 'Učitavanje...' : 'Pretraži artikal...'}
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none"
              onFocusCapture={(e) => (e.target.style.borderColor = PRIMARY)}
              onBlurCapture={(e) => {
                e.target.style.borderColor = 'rgb(209 213 219)';
                setTimeout(() => setShowArtikliDropdown(false), 150);
              }}
              autoComplete="off"
              required
            />
          </div>
          {showArtikliDropdown && filtrirani.length > 0 && (
            <div className="absolute z-10 w-full max-w-lg bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
              {filtrirani.slice(0, 20).map((a) => (
                <button
                  key={a.sifra_artikla}
                  type="button"
                  className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
                  onMouseDown={() => {
                    setSifraArtikla(String(a.sifra_artikla));
                    setPretragaArtikla('');
                    setShowArtikliDropdown(false);
                  }}
                >
                  <span className="font-mono text-gray-500 mr-2">{a.sifra_artikla}</span>
                  {a.naziv_artikla}
                  <span className="ml-2 text-gray-400">({a.jedinica_mjere})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Količina */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Količina * {odabraniArtikal && <span className="text-gray-400">({odabraniArtikal.jedinica_mjere})</span>}
          </label>
          <input
            type="number"
            min="0.001"
            step="any"
            value={kolicina}
            onChange={(e) => setKolicina(e.target.value)}
            placeholder="0"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none"
            onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
            onBlur={(e) => (e.target.style.borderColor = 'rgb(209 213 219)')}
            required
          />
        </div>

        {/* Partner (dobavljač) */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Dobavljač (opcionalno)</label>
          <select
            value={sifraPartnera}
            onChange={(e) => setSifraPartnera(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none bg-white"
            onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
            onBlur={(e) => (e.target.style.borderColor = 'rgb(209 213 219)')}
          >
            <option value="">— Odaberi dobavljača —</option>
            {partneri.map((p) => (
              <option key={p.sifra_partnera} value={p.sifra_partnera}>
                {p.naziv_partnera}
              </option>
            ))}
          </select>
        </div>

        {/* Napomena */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Napomena</label>
          <textarea
            value={napomena}
            onChange={(e) => setNapomena(e.target.value)}
            placeholder="Opcionalna napomena..."
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none resize-none"
            onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
            onBlur={(e) => (e.target.style.borderColor = 'rgb(209 213 219)')}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">{error}</div>
        )}
        {uspjeh && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-xs">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            {uspjeh}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 text-white font-semibold py-2.5 text-sm rounded-lg transition-all disabled:opacity-50"
          style={{ backgroundColor: SECONDARY }}
          onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#7aad3a')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = SECONDARY)}
        >
          <Plus className="w-4 h-4" />
          {loading ? 'Evidentiranje...' : 'Evidentiraj prijem'}
        </button>
      </form>
    </div>
  );
}
