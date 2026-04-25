import { useState, useEffect } from "react";
import { ArrowLeft, Loader, ChevronDown } from "lucide-react";
import { theme } from "../theme";

const PRIMARY   = theme.primary;
const SECONDARY = theme.secondary;
const API_URL   = import.meta.env.VITE_API_URL || "http://localhost:3005";

// ===== INTERFEJSI =====

interface TerenArhiva {
  sifra_terena_dostava: number;
  sifra_terena: number;
  datum_dostave: string;
  naziv_dana: string;
}

interface ArhivaKupacRaw {
  sifra_partnera: number;
  naziv_partnera: string;
  sifra_grada?: number;
  naziv_grada?: string;
  referentni_broj?: string;
}

interface ArhivaNarudzbaRaw {
  sifra_tabele?: number;
  sifra_partnera: number;
  sifra_patnera?: number;
  sifra_proizvoda: string;
  naziv_proizvoda: string;
  jm: string;
  kolicina_proizvoda: number;
  napomena?: string;
  referentni_broj?: string;
  spremljena_kolicina?: number;
  sifra_terena_dostava: number;
}

interface ArhivaProizvod {
  sifra_proizvoda: string;
  naziv_proizvoda: string;
  jm: string;
  kolicina_proizvoda: number;
  napomena?: string;
  spremljena_kolicina?: number;
}

interface ArhivaKupac {
  sifra_kupca: number;
  naziv_kupca: string;
  naziv_grada?: string;
  referentni_broj?: string;
  proizvodi: ArhivaProizvod[];
}

interface Props {
  onBack: () => void;
}

// ===== HELPERS =====

const formatDate = (s: string): string => {
  if (!s) return "";
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
};

const normalizeRef = (v?: string | null): string => {
  const n = String(v ?? "").trim();
  return !n || n === "-" ? "" : n;
};

const kupacGroupKey = (sifraKupca: number, ref?: string | null) => {
  const n = normalizeRef(ref);
  return n ? `${sifraKupca}::${n}` : String(sifraKupca);
};

// ===== KOMPONENTA =====

export function ZavrseneNarudzbe({ onBack }: Props) {
  const [tereniArhiva, setTereniArhiva]           = useState<TerenArhiva[]>([]);
  const [arhivaGrupisano, setArhivaGrupisano]     = useState<ArhivaKupacRaw[]>([]);
  const [arhivaNarudzbe, setArhivaNarudzbe]       = useState<ArhivaNarudzbaRaw[]>([]);
  const [loading, setLoading]                     = useState(true);
  const [selectedDay, setSelectedDay]             = useState<number | null>(null);
  const [viewMode, setViewMode]                   = useState<"po-kupcu" | "po-proizvodu">("po-kupcu");
  const [dayDropdownOpen, setDayDropdownOpen]     = useState(false);

  useEffect(() => {
    const opts = { headers: { "Content-Type": "application/json" }, credentials: "include" as RequestCredentials };
    Promise.all([
      fetch(`${API_URL}/api/aktivne-narudzbe-teren/tereni-arhiva`, opts),
      fetch(`${API_URL}/api/aktivne-narudzbe-teren/arhiva-grupisano`, opts),
      fetch(`${API_URL}/api/aktivne-narudzbe-teren/arhiva`, opts),
    ])
      .then(async ([r1, r2, r3]) => {
        const [tereni, grupisano, narudzbe] = await Promise.all([r1.json(), r2.json(), r3.json()]);
        if (tereni.success) {
          const sorted: TerenArhiva[] = [...tereni.data].sort(
            (a: TerenArhiva, b: TerenArhiva) =>
              new Date(b.datum_dostave).getTime() - new Date(a.datum_dostave).getTime()
          );
          setTereniArhiva(sorted);
          if (sorted.length > 0) setSelectedDay(sorted[0].sifra_terena_dostava);
        }
        if (grupisano.success) setArhivaGrupisano(grupisano.data);
        if (narudzbe.success)  setArhivaNarudzbe(narudzbe.data);
      })
      .catch((err) => console.error("Greška pri učitavanju arhive:", err))
      .finally(() => setLoading(false));
  }, []);

  // ─── Grupisanje po kupcu za odabrani dan ──────────────────────────────────
  const narudzbePoKupcu: ArhivaKupac[] = (() => {
    const kupciMap = new Map<string, ArhivaKupac>();

    // Gradi mapu kupaca iz grupisano podataka
    arhivaGrupisano.forEach((item) => {
      const ref  = normalizeRef(item.referentni_broj);
      const key  = kupacGroupKey(item.sifra_partnera, ref);
      if (!kupciMap.has(key)) {
        kupciMap.set(key, {
          sifra_kupca:    item.sifra_partnera,
          naziv_kupca:    item.naziv_partnera ?? "Nepoznat kupac",
          naziv_grada:    item.naziv_grada,
          referentni_broj: ref,
          proizvodi: [],
        });
      }
    });

    // Dodaje proizvode iz narudzbi filtriranih po odabranom danu
    arhivaNarudzbe
      .filter((n) => n.sifra_terena_dostava === selectedDay)
      .forEach((item) => {
        const sifraKupca = item.sifra_partnera ?? item.sifra_patnera ?? 0;
        const ref  = normalizeRef(item.referentni_broj);
        const key  = kupacGroupKey(sifraKupca, ref);
        const kupac = kupciMap.get(key) ?? kupciMap.get(String(sifraKupca));
        if (kupac) {
          kupac.proizvodi.push({
            sifra_proizvoda:    item.sifra_proizvoda,
            naziv_proizvoda:    item.naziv_proizvoda,
            jm:                 item.jm,
            kolicina_proizvoda: item.kolicina_proizvoda,
            napomena:           item.napomena,
            spremljena_kolicina: item.spremljena_kolicina,
          });
        }
      });

    return Array.from(kupciMap.values())
      .filter((k) => k.proizvodi.length > 0)
      .sort((a, b) => (a.naziv_grada ?? "").localeCompare(b.naziv_grada ?? "", "bs"));
  })();

  // ─── Grupisanje po proizvodu ──────────────────────────────────────────────
  const proizvodiPoNazivu = (() => {
    const map = new Map<string, {
      sifra: string; naziv: string; jm: string;
      stavke: { sifraKupca: number; nazivKupca: string; nazivGrada?: string; kolicina: number; spremljeno?: number; napomena?: string }[];
    }>();
    narudzbePoKupcu.forEach((kupac) => {
      kupac.proizvodi.forEach((p) => {
        const stavka = {
          sifraKupca:  kupac.sifra_kupca,
          nazivKupca:  kupac.naziv_kupca,
          nazivGrada:  kupac.naziv_grada,
          kolicina:    p.kolicina_proizvoda,
          spremljeno:  p.spremljena_kolicina,
          napomena:    p.napomena,
        };
        const ex = map.get(p.sifra_proizvoda);
        if (ex) ex.stavke.push(stavka);
        else map.set(p.sifra_proizvoda, { sifra: p.sifra_proizvoda, naziv: p.naziv_proizvoda, jm: p.jm, stavke: [stavka] });
      });
    });
    return Array.from(map.values()).sort((a, b) => a.naziv.localeCompare(b.naziv, "bs"));
  })();

  const trenutniTeren = tereniArhiva.find((t) => t.sifra_terena_dostava === selectedDay);

  const fmtSpremljeno = (sp?: number) => {
    const v = parseFloat(String(sp ?? -1));
    return isNaN(v) || v < 0 ? "—" : String(sp);
  };
  const colorSpremljeno = (sp?: number) => {
    const v = parseFloat(String(sp ?? -1));
    return isNaN(v) || v < 0 ? "rgb(156 163 175)" : SECONDARY;
  };

  // ===== RENDER =====

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: "100dvh" }}>
        <Loader className="w-8 h-8 animate-spin" style={{ color: PRIMARY }} />
        <span className="ml-3 text-gray-600">Učitavanje arhive...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "100dvh", background: "#f1f5f9" }}>
      <div className="flex-1 flex flex-col overflow-hidden m-0 md:m-3">
        <div className="bg-white rounded-none md:rounded-2xl shadow-xl overflow-hidden flex flex-col h-full">

          {/* ─── HEADER ─────────────────────────────────────────────────── */}
          <div className="border-b-2 border-gray-200 bg-white flex-none">
            <div className="flex items-center justify-between gap-3 px-6 md:px-8 py-2 md:py-4">
              <>
                <div className="flex items-center gap-3">
                  <button
                    onClick={onBack}
                    className="flex items-center justify-center w-8 h-8 rounded-lg border-2 transition-all active:scale-95"
                    style={{ color: PRIMARY, borderColor: PRIMARY }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = `${PRIMARY}10`)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => setDayDropdownOpen((o) => !o)}
                      className="flex items-center gap-2 rounded-lg px-2 py-1 transition-all hover:bg-gray-100 active:bg-gray-200"
                    >
                      <span className="text-base md:text-lg font-bold" style={{ color: PRIMARY }}>
                        {trenutniTeren?.naziv_dana || "Završene narudžbe"}
                      </span>
                      {trenutniTeren && (
                        <span className="text-sm font-normal text-gray-500">
                          {formatDate(trenutniTeren.datum_dostave)}
                        </span>
                      )}
                      <ChevronDown
                        className="w-4 h-4 transition-transform"
                        style={{ color: PRIMARY, transform: dayDropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                      />
                    </button>

                    {dayDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setDayDropdownOpen(false)} />
                        <div className="absolute left-0 top-full mt-1 z-30 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden min-w-52">
                          {tereniArhiva.map((t) => {
                            const isSel = selectedDay === t.sifra_terena_dostava;
                            return (
                              <button
                                key={t.sifra_terena_dostava}
                                onClick={() => { setSelectedDay(t.sifra_terena_dostava); setDayDropdownOpen(false); }}
                                className="w-full text-left px-4 py-3 flex items-center justify-between gap-4 transition-colors hover:bg-gray-50 active:bg-gray-100"
                                style={{
                                  backgroundColor: isSel ? `${PRIMARY}12` : undefined,
                                  borderLeft: isSel ? `3px solid ${PRIMARY}` : "3px solid transparent",
                                }}
                              >
                                <span className="font-semibold text-sm" style={{ color: isSel ? PRIMARY : "rgb(55 65 81)" }}>
                                  {t.naziv_dana}
                                </span>
                                <span className="text-xs text-gray-500">{formatDate(t.datum_dostave)}</span>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex rounded-lg overflow-hidden border-2" style={{ borderColor: PRIMARY }}>
                  <button
                    className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-all"
                    style={{ backgroundColor: viewMode === "po-kupcu" ? PRIMARY : "transparent", color: viewMode === "po-kupcu" ? "white" : PRIMARY }}
                    onClick={() => setViewMode("po-kupcu")}
                  >
                    Po kupcu
                  </button>
                  <button
                    className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-all border-l-2"
                    style={{ backgroundColor: viewMode === "po-proizvodu" ? PRIMARY : "transparent", color: viewMode === "po-proizvodu" ? "white" : PRIMARY, borderColor: PRIMARY }}
                    onClick={() => setViewMode("po-proizvodu")}
                  >
                    Po proizvodu
                  </button>
                </div>
              </>
            </div>
          </div>

          {/* ─── SADRŽAJ ─────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-6">
            {narudzbePoKupcu.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">Nema završenih narudžbi za odabrani dan</p>
              </div>

            ) : viewMode === "po-kupcu" ? (
              <div className="space-y-6">
                {narudzbePoKupcu.map((kupac) => (
                  <div
                    key={kupacGroupKey(kupac.sifra_kupca, kupac.referentni_broj)}
                    className="bg-white rounded-xl shadow-lg overflow-hidden"
                    style={{ border: "2px solid rgb(229 231 235)" }}
                  >
                    <div className="px-6 py-4 border-b-2 border-gray-200" style={{ background: `linear-gradient(to right, ${PRIMARY}18, ${SECONDARY}18)` }}>
                      <div className="flex items-center">
                        <div className="flex items-baseline gap-3 flex-wrap">
                          <h3 className="text-xl font-bold" style={{ color: PRIMARY }}>{kupac.naziv_kupca}</h3>
                          {kupac.naziv_grada && <span className="text-xs text-gray-500 font-medium">{kupac.naziv_grada}</span>}
                        </div>
                        <div className="ml-auto bg-white px-4 py-2 rounded-lg shadow">
                          <span className="text-sm text-gray-600">Stavki:</span>
                          <span className="ml-2 text-lg font-bold" style={{ color: SECONDARY }}>{kupac.proizvodi.length}</span>
                        </div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full table-fixed divide-y divide-gray-200">
                        <thead>
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">NAZIV PROIZVODA</th>
                            <th className="px-2 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500" style={{ width: 52 }}>JM</th>
                            <th className="px-2 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500" style={{ width: 90 }}>NARUČENO</th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500" style={{ width: 110 }}>PRIPREMLJENO</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {kupac.proizvodi.map((p, idx) => (
                            <tr key={`${p.sifra_proizvoda}-${idx}`}>
                              <td className="px-6 py-4 text-sm text-gray-900 align-top">
                                <div>{p.naziv_proizvoda}</div>
                                {p.napomena && p.napomena.trim() && p.napomena.trim() !== "-" && (
                                  <div className="mt-1 text-xs italic" style={{ color: SECONDARY }}>{p.napomena.trim()}</div>
                                )}
                              </td>
                              <td className="px-2 py-4 text-sm text-gray-900 align-top text-right">{p.jm}</td>
                              <td className="px-2 py-4 text-sm font-semibold align-top text-right" style={{ color: SECONDARY }}>{p.kolicina_proizvoda}</td>
                              <td className="px-4 py-4 text-sm font-bold align-top text-right" style={{ color: colorSpremljeno(p.spremljena_kolicina) }}>
                                {fmtSpremljeno(p.spremljena_kolicina)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>

            ) : (
              <div className="space-y-6">
                {proizvodiPoNazivu.map((proizvod) => (
                  <div
                    key={proizvod.sifra}
                    className="bg-white rounded-xl shadow-lg overflow-hidden"
                    style={{ border: "2px solid rgb(229 231 235)" }}
                  >
                    <div className="px-6 py-4 border-b-2 border-gray-200" style={{ background: `linear-gradient(to right, ${PRIMARY}18, ${SECONDARY}18)` }}>
                      <div className="flex items-center">
                        <div className="flex items-baseline gap-3 flex-wrap">
                          <h3 className="text-xl font-bold" style={{ color: PRIMARY }}>{proizvod.naziv}</h3>
                          <span className="text-xs text-gray-500">JM: <span className="font-semibold text-gray-700">{proizvod.jm}</span></span>
                        </div>
                        <div className="ml-auto bg-white px-4 py-2 rounded-lg shadow">
                          <span className="text-sm text-gray-600">Kupaca:</span>
                          <span className="ml-2 text-lg font-bold" style={{ color: SECONDARY }}>{proizvod.stavke.length}</span>
                        </div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full table-fixed divide-y divide-gray-200">
                        <thead>
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">KUPAC</th>
                            <th className="px-2 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500" style={{ width: 90 }}>NARUČENO</th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500" style={{ width: 110 }}>PRIPREMLJENO</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {proizvod.stavke.map((stavka, idx) => (
                            <tr key={`${stavka.sifraKupca}-${idx}`}>
                              <td className="px-6 py-4 text-sm text-gray-900 align-top">
                                <div className="flex items-baseline gap-2 flex-wrap">
                                  <span>{stavka.nazivKupca}</span>
                                  {stavka.nazivGrada && <span className="text-xs text-gray-500">{stavka.nazivGrada}</span>}
                                </div>
                                {stavka.napomena && stavka.napomena.trim() && stavka.napomena.trim() !== "-" && (
                                  <div className="mt-1 text-xs italic" style={{ color: SECONDARY }}>{stavka.napomena.trim()}</div>
                                )}
                              </td>
                              <td className="px-2 py-4 text-sm font-semibold align-top text-right" style={{ color: SECONDARY }}>{stavka.kolicina}</td>
                              <td className="px-4 py-4 text-sm font-bold align-top text-right" style={{ color: colorSpremljeno(stavka.spremljeno) }}>
                                {fmtSpremljeno(stavka.spremljeno)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
