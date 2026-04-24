import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Loader, ChevronDown, ChevronUp, Mic, MessageSquare, X, CheckCircle2, XCircle } from "lucide-react";
import { theme } from "../theme";

const PRIMARY   = theme.primary;   // #785E9E
const SECONDARY = theme.secondary; // #8FC74A

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3005";

// ===== INTERFEJSI (identično kao KOMERCIJALA) =====

interface NarudzbaProizvod {
  sif: string;
  sifra_tabele?: number;
  naziv_proizvoda: string;
  jm: string;
  kolicina: number;
  napomena?: string;
  spremljena_kolicina?: number;
  sifra_kupca: number;
}

interface NarudzbaKupac {
  sifra_kupca: number;
  naziv_kupca: string;
  naziv_grada?: string;
  referentni_broj?: string;
  proizvodi: NarudzbaProizvod[];
}

interface TerenoData {
  sifra_terena_dostava: number;
  sifra_terena: number;
  datum_dostave: string;
  zavrsena_dostava: number;
  naziv_dana: string;
}

interface DayOption {
  sifraTerenaDostava: number;
  sifraTerena: number;
  day: string;
  date: string;
}

// ===== HELPERS (identično kao KOMERCIJALA) =====

const formatDate = (dateString: string): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

const normalizeReferentniBroj = (value?: string | null): string => {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized === "-") return "";
  return normalized;
};

const getKupacGroupingKey = (sifraKupca: number, referentniBroj?: string | null): string => {
  const norm = normalizeReferentniBroj(referentniBroj);
  return norm ? `${sifraKupca}::${norm}` : String(sifraKupca);
};

// ===== PROPS =====

interface Props {
  onBack: () => void;
}

// ===== KOMPONENTA =====

export function AktivneNarudzbe({ onBack }: Props) {
  const [tereniData, setTereniData]           = useState<TerenoData[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [selectedDay, setSelectedDay]         = useState<number | null>(null);
  const [selectedTerenaSifra, setSelectedTerenaSifra] = useState<number | null>(null);
  const [narudzbePoKupcu, setNarudzbePoKupcu] = useState<NarudzbaKupac[]>([]);
  const [loadingNarudzbe, setLoadingNarudzbe] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<'po-kupcu' | 'po-proizvodu'>('po-kupcu');

  // ─── Spremljene količine ───────────────────────────────────────────────────
  const [spremljeno, setSpremljeno]   = useState<Record<string, string>>({});
  const [napomenaOp, setNapomenaOp]   = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus]   = useState<Record<string, 'saving' | 'ok' | 'error'>>({});
  const [voiceKey, setVoiceKey]         = useState<string | null>(null);
  const [voiceNoteKey, setVoiceNoteKey] = useState<string | null>(null);
  const [noteModal, setNoteModal]       = useState<{ key: string; title: string; sifra_tabele?: number } | null>(null);
  const [confirmKey, setConfirmKey]   = useState<string | null>(null);
  const inputRefs = useRef<Map<string, HTMLInputElement | null>>(new Map());

  const rowKey = (kupacKey: string, sif: string, idx: number) =>
    `${kupacKey}::${sif}::${idx}`;

  const handleSpremljenoChange = (key: string, raw: string) => {
    const clean = raw.replace(",", ".").replace(/[^0-9.]/g, "");
    setSpremljeno((p) => ({ ...p, [key]: clean }));
  };

  const startVoice = (key: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Preglednik ne podržava glasovni unos."); return; }
    const rec = new SR();
    rec.lang = "bs-BA";
    rec.continuous = false;
    rec.interimResults = false;
    setVoiceKey(key);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const text: string = e.results[0][0].transcript;
      const num = text.replace(",", ".").replace(/[^0-9.]/g, "");
      if (num) setSpremljeno((p) => ({ ...p, [key]: num }));
      setVoiceKey(null);
      setTimeout(() => inputRefs.current.get(key)?.focus(), 50);
    };
    rec.onerror = () => setVoiceKey(null);
    rec.onend   = () => setVoiceKey(null);
    rec.start();
  };

  const startVoiceNote = (key: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Preglednik ne podržava glasovni unos."); return; }
    const rec = new SR();
    rec.lang = "bs-BA";
    rec.continuous = false;
    rec.interimResults = false;
    setVoiceNoteKey(key);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const text: string = e.results[0][0].transcript;
      if (text) setNapomenaOp((p) => ({ ...p, [key]: text }));
      setVoiceNoteKey(null);
    };
    rec.onerror = () => setVoiceNoteKey(null);
    rec.onend   = () => setVoiceNoteKey(null);
    rec.start();
  };

  const handleSpremljenoBlur = async (key: string, sifraTabele: number | undefined, napomena: string | undefined) => {
    const val = spremljeno[key];
    if (!val || val === "-1.000" || !sifraTabele) return;
    const kolicina = parseFloat(val.replace(",", "."));
    if (isNaN(kolicina)) return;
    setSaveStatus(p => ({ ...p, [key]: 'saving' }));
    try {
      const res = await fetch(`${API_URL}/api/aktivne-narudzbe-teren/azuriraj`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sifraPolja: sifraTabele, kolicinaZaUnos: kolicina, napomena: napomena || null }),
      });
      const data = await res.json();
      setSaveStatus(p => ({ ...p, [key]: data.success ? 'ok' : 'error' }));
    } catch {
      setSaveStatus(p => ({ ...p, [key]: 'error' }));
    }
  };

  // ─── Dohvat terena po danima ───────────────────────────────────────────────
  const fetchTerenPoDanima = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/aktivne-narudzbe-teren/tereni`, {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const result = await response.json();

      if (result.success && result.data) {
        setTereniData(result.data);
        if (result.data.length > 0) {
          // Lokalni datum kao "YYYY-MM-DD" (izbjegavamo UTC pomak koji .toISOString() pravi)
          const now = new Date();
          const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

          const todayRecord: TerenoData =
            result.data.find((t: TerenoData) => {
              if (!t.datum_dostave) return false;
              const d = new Date(t.datum_dostave);
              const dLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
              return dLocal === todayLocal;
            }) ?? result.data[0];

          setSelectedDay(todayRecord.sifra_terena_dostava);
          setSelectedTerenaSifra(todayRecord.sifra_terena);
          fetchAktivneNarudzbeZaTeren(todayRecord.sifra_terena_dostava);
        }
      }
    } catch (error) {
      console.error("Greška pri učitavanju terena:", error);
    } finally {
      setLoading(false);
    }
  };

  // ─── Dohvat aktivnih narudžbi za teren ────────────────────────────────────
  // Prima sifra_terena_dostava — to je ključni parametar koji procedure očekuju
  const fetchAktivneNarudzbeZaTeren = async (sifraTerenaDostava: number) => {
    try {
      setLoadingNarudzbe(true);
      setNarudzbePoKupcu([]);

      const [grupisaneResponse, aktivneResponse] = await Promise.all([
        fetch(`${API_URL}/api/aktivne-narudzbe-teren/${sifraTerenaDostava}/grupisano`, {
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }),
        fetch(`${API_URL}/api/aktivne-narudzbe-teren/${sifraTerenaDostava}`, {
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }),
      ]);

      if (!grupisaneResponse.ok || !aktivneResponse.ok) {
        console.warn("Greška pri učitavanju narudžbi");
        return;
      }

      const grupisaneResult = await grupisaneResponse.json();
      const aktivneResult   = await aktivneResponse.json();

      if (grupisaneResult.success && aktivneResult.success) {
        const grupisaneData = grupisaneResult.data || [];
        const aktivneData   = aktivneResult.data   || [];

        // ─── Grupisanje po kupcu + referentnom broju (identično KOMERCIJALA) ───
        const kupciMap = new Map<string, NarudzbaKupac>();

        grupisaneData.forEach((item: {
          sifra_partnera: number;
          naziv_partnera: string;
          partnera: string;
          naziv_grada?: string;
          referentni_broj: string;
        }) => {
          const referentniBroj = normalizeReferentniBroj(item.referentni_broj);
          const kupacKey = getKupacGroupingKey(item.sifra_partnera, referentniBroj);
          if (!kupciMap.has(kupacKey)) {
            kupciMap.set(kupacKey, {
              sifra_kupca: item.sifra_partnera,
              naziv_kupca: item.naziv_partnera || item.partnera || "Nepoznat kupac",
              naziv_grada: item.naziv_grada,
              referentni_broj: referentniBroj,
              proizvodi: [],
            });
          }
        });

        aktivneData.forEach((item: {
          sifra_patnera: number;
          sifra_partnera: number;
          sifra_proizvoda: string;
          sifra_tabele?: number;
          naziv_proizvoda: string;
          jm: string;
          kolicina_proizvoda: number;
          napomena: string;
          spremljena_kolicina?: number;
          referentni_broj?: string;
        }) => {
          const sifraKupca = item.sifra_patnera || item.sifra_partnera;
          const referentniBroj = normalizeReferentniBroj(item.referentni_broj);
          const kupacKey = getKupacGroupingKey(sifraKupca, referentniBroj);

          let kupac = kupciMap.get(kupacKey);
          if (!kupac) {
            kupac = kupciMap.get(String(sifraKupca));
          }

          if (kupac) {
            if (!kupac.referentni_broj && referentniBroj) {
              kupac.referentni_broj = referentniBroj;
            }
            kupac.proizvodi.push({
              sif: item.sifra_proizvoda,
              sifra_tabele: item.sifra_tabele,
              naziv_proizvoda: item.naziv_proizvoda,
              jm: item.jm,
              kolicina: item.kolicina_proizvoda,
              napomena: item.napomena || " ",
              spremljena_kolicina: item.spremljena_kolicina,
              sifra_kupca: sifraKupca,
            });
          }
        });

        const finalList = Array.from(kupciMap.values()).sort((a, b) =>
          (a.naziv_grada ?? '').localeCompare(b.naziv_grada ?? '', 'bs')
        );
        const initialSpremljeno: Record<string, string> = {};
        const initialSaveStatus: Record<string, 'saving' | 'ok' | 'error'> = {};
        finalList.forEach((kupac) => {
          kupac.proizvodi.forEach((proizvod, idx) => {
            const k = rowKey(getKupacGroupingKey(kupac.sifra_kupca, kupac.referentni_broj), proizvod.sif, idx);
            const sk = proizvod.spremljena_kolicina;
            if (sk !== undefined && sk !== null && parseFloat(String(sk)) !== -1) {
              initialSpremljeno[k] = String(sk);
              initialSaveStatus[k] = 'ok';
            } else {
              initialSpremljeno[k] = "-1.000";
            }
          });
        });
        setSpremljeno(initialSpremljeno);
        setSaveStatus(initialSaveStatus);
        setNarudzbePoKupcu(finalList);
      }
    } catch (error) {
      console.error("Greška pri učitavanju narudžbi:", error);
    } finally {
      setLoadingNarudzbe(false);
    }
  };

  useEffect(() => {
    fetchTerenPoDanima();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Klik na dan ──────────────────────────────────────────────────────────
  const handleDayClick = (day: DayOption) => {
    setSelectedDay(day.sifraTerenaDostava);
    setSelectedTerenaSifra(day.sifraTerena);
    fetchAktivneNarudzbeZaTeren(day.sifraTerenaDostava);
  };

  // ─── Unikatni dani (identično KOMERCIJALA) ────────────────────────────────
  const uniqueDays = Array.from(
    new Map(
      tereniData.map((t) => [
        t.sifra_terena_dostava,
        {
          sifraTerenaDostava: t.sifra_terena_dostava,
          sifraTerena: t.sifra_terena,
          day: t.naziv_dana,
          date: formatDate(t.datum_dostave),
        },
      ])
    ).values()
  ).sort((a, b) => a.sifraTerenaDostava - b.sifraTerenaDostava);

  const trenutniTeren = tereniData.find(t => t.sifra_terena_dostava === selectedDay);
  const nazivDana   = trenutniTeren?.naziv_dana ?? "";
  const datumDostave = trenutniTeren ? formatDate(trenutniTeren.datum_dostave) : "";

  // Varijable sačuvane za kasniju upotrebu (lijevi panel)
  void loading; void selectedTerenaSifra;
  void uniqueDays; void handleDayClick;

  // ─── Brojač spremljenih ────────────────────────────────────────────────────
  const totalProizvoda = narudzbePoKupcu.reduce((s, k) => s + k.proizvodi.length, 0);
  const spremljenoCount = narudzbePoKupcu.reduce((s, kupac) =>
    s + kupac.proizvodi.filter((p, idx) => {
      const k = rowKey(getKupacGroupingKey(kupac.sifra_kupca, kupac.referentni_broj), p.sif, idx);
      return saveStatus[k] === 'ok';
    }).length, 0
  );

  // ─── PO PROIZVODU — grupisanje ────────────────────────────────────────────
  const proizvodiPoNazivu = (() => {
    const map = new Map<string, {
      sif: string; sifra_tabele?: number; naziv: string; jm: string;
      stavke: { sifraKupca: number; nazivKupca: string; nazivGrada?: string; sifra_tabele?: number; kolicina: number; napomena?: string; key: string }[];
    }>();
    narudzbePoKupcu.forEach((kupac) => {
      kupac.proizvodi.forEach((p, idx) => {
        const k = rowKey(getKupacGroupingKey(kupac.sifra_kupca, kupac.referentni_broj), p.sif, idx);
        const existing = map.get(p.sif);
        const stavka = { sifraKupca: kupac.sifra_kupca, nazivKupca: kupac.naziv_kupca, nazivGrada: kupac.naziv_grada, sifra_tabele: p.sifra_tabele, kolicina: p.kolicina, napomena: p.napomena, key: k };
        if (existing) existing.stavke.push(stavka);
        else map.set(p.sif, { sif: p.sif, sifra_tabele: p.sifra_tabele, naziv: p.naziv_proizvoda, jm: p.jm, stavke: [stavka] });
      });
    });
    return Array.from(map.values()).sort((a, b) => a.naziv.localeCompare(b.naziv, 'bs'));
  })();

  // ===== RENDER =====
  return (
    <div
      className="flex flex-col"
      style={{ height: "100dvh", background: "#f1f5f9" }}
    >
      {/* ─── Outer card wrapper (identično KOMERCIJALA) ─────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden m-0 md:m-3">
        <div className="bg-white rounded-none md:rounded-2xl shadow-xl overflow-hidden flex flex-col h-full">

          {/* ─── HEADER — KOLAPSIBILAN (identično KOMERCIJALA) ──────────────── */}
          <div
            className={`border-b-2 border-gray-200 bg-white transition-all duration-300 relative flex-none ${
              headerCollapsed ? "max-h-8" : "max-h-24"
            }`}
          >
            {/* Strelica za kolaps */}
            <div className="absolute top-1 left-3 z-20">
              <button
                onClick={() => setHeaderCollapsed(!headerCollapsed)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-all"
                title={headerCollapsed ? "Proširi header" : "Smanji header"}
              >
                {headerCollapsed
                  ? <ChevronDown className="w-4 h-4 text-gray-600" />
                  : <ChevronUp className="w-4 h-4 text-gray-600" />
                }
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 px-6 md:px-8 py-2 md:py-4">
              {!headerCollapsed && (
                <>
                  <div className="flex items-center gap-3 pl-6">
                    <button
                      onClick={onBack}
                      className="flex items-center justify-center w-8 h-8 rounded-lg border-2 transition-all active:scale-95"
                      style={{ color: PRIMARY, borderColor: PRIMARY }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = `${PRIMARY}10`)}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <h2 className="text-base md:text-lg font-bold" style={{ color: PRIMARY }}>
                      {nazivDana || "Aktivne narudžbe"}
                      {datumDostave && (
                        <span className="ml-2 text-sm font-normal text-gray-500">{datumDostave}</span>
                      )}
                    </h2>
                  </div>
                  <div className="flex rounded-lg overflow-hidden border-2 ml-2" style={{ borderColor: PRIMARY }}>
                    <button
                      className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-all"
                      style={{ backgroundColor: viewMode === 'po-kupcu' ? PRIMARY : 'transparent', color: viewMode === 'po-kupcu' ? 'white' : PRIMARY }}
                      onClick={() => setViewMode('po-kupcu')}
                    >
                      Po kupcu
                    </button>
                    <button
                      className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-all border-l-2"
                      style={{ backgroundColor: viewMode === 'po-proizvodu' ? PRIMARY : 'transparent', color: viewMode === 'po-proizvodu' ? 'white' : PRIMARY, borderColor: PRIMARY }}
                      onClick={() => setViewMode('po-proizvodu')}
                    >
                      Po proizvodu
                    </button>
                  </div>
                  {totalProizvoda > 0 && (
                    <div
                      className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm"
                      style={{
                        background: spremljenoCount === totalProizvoda
                          ? `${SECONDARY}22`
                          : `${PRIMARY}10`,
                        color: spremljenoCount === totalProizvoda ? SECONDARY : PRIMARY,
                        border: `2px solid ${spremljenoCount === totalProizvoda ? SECONDARY : `${PRIMARY}30`}`,
                      }}
                    >
                      Spremljeno: {spremljenoCount}/{totalProizvoda}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ─── MAIN FLEX ──────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-hidden">

            {/* ═══════════════════════════════════════════════════════════════
                LIJEVI PANEL — sačuvan za kasnije korištenje
                Uključuje: dugmad za dane, info panel (kupci/stavki)
                Logika: uniqueDays, handleDayClick, selectedDay, selectedTerenaSifra
            ════════════════════════════════════════════════════════════════
            <div className="w-full md:w-96 border-r-2 border-gray-200 overflow-y-auto bg-gray-50 flex-none">
              <div className="sticky top-0 bg-white border-b-2 border-gray-200 z-10">
                <div className="flex overflow-x-auto gap-1 p-3">
                  {loading ? (
                    <div className="flex items-center gap-2 px-3 py-2 text-gray-600">
                      <Loader className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Učitavanje...</span>
                    </div>
                  ) : uniqueDays.length === 0 ? (
                    <div className="px-3 py-2 text-gray-600 text-sm">Nema dostupnih dana</div>
                  ) : (
                    uniqueDays.map((d) => (
                      <button
                        key={d.sifraTerenaDostava}
                        onClick={() => handleDayClick(d)}
                        className={`px-3 py-2 rounded-lg whitespace-nowrap text-xs md:text-sm font-medium transition-all ${
                          selectedDay === d.sifraTerenaDostava
                            ? "text-white shadow-lg"
                            : "text-gray-700 hover:bg-gray-200 active:bg-gray-300"
                        }`}
                        style={{ backgroundColor: selectedDay === d.sifraTerenaDostava ? SECONDARY : "transparent" }}
                      >
                        <div>{d.day}</div>
                        <div className="text-xs">{d.date}</div>
                      </button>
                    ))
                  )}
                </div>
              </div>
              {selectedDay !== null && (
                <div className="p-4">
                  <div className="rounded-lg p-3 border-l-4 text-sm" style={{ backgroundColor: `${PRIMARY}10`, borderColor: PRIMARY }}>
                    <p className="font-semibold" style={{ color: PRIMARY }}>
                      {uniqueDays.find(d => d.sifraTerenaDostava === selectedDay)?.day}
                    </p>
                    <p className="text-gray-600 text-xs mt-0.5">
                      {uniqueDays.find(d => d.sifraTerenaDostava === selectedDay)?.date}
                    </p>
                    {!loadingNarudzbe && (
                      <p className="mt-2 text-xs font-medium" style={{ color: SECONDARY }}>
                        {narudzbePoKupcu.length} kupaca · {narudzbePoKupcu.reduce((s, k) => s + k.proizvodi.length, 0)} stavki
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            ════════════════════════════════════════════════════════════════ */}

              {/* ─── NARUDŽBE PO KUPCU — full width ────────────────────────── */}
              <div className="flex flex-col overflow-hidden h-full">
                <div className="flex-1 overflow-y-auto">
                  <div className="p-6">

                    {/* Loading narudžbi */}
                    {loadingNarudzbe ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader className="w-8 h-8 animate-spin" style={{ color: PRIMARY }} />
                        <span className="ml-3 text-gray-600">Učitavanje narudžbi...</span>
                      </div>

                    ) : narudzbePoKupcu.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-gray-500 text-lg">
                          Nema aktivnih narudžbi za odabrani dan
                        </p>
                        <p className="text-gray-400 text-sm mt-2">
                          Odaberite dan da vidite narudžbe
                        </p>
                      </div>

                    ) : viewMode === 'po-kupcu' ? (
                      <div className="space-y-6">
                        {narudzbePoKupcu.map((kupac) => {
                          const allFilled = kupac.proizvodi.length > 0 && kupac.proizvodi.every((p, idx) => {
                            const k = rowKey(getKupacGroupingKey(kupac.sifra_kupca, kupac.referentni_broj), p.sif, idx);
                            return saveStatus[k] === 'ok';
                          });
                          return (
                          <div
                            key={getKupacGroupingKey(kupac.sifra_kupca, kupac.referentni_broj)}
                            className="bg-white rounded-xl shadow-lg overflow-hidden transition-all"
                            style={{
                              border: "2px solid rgb(229 231 235)",
                              boxShadow: allFilled ? `0 0 0 3px ${SECONDARY}` : undefined,
                            }}
                          >
                            {/* ─── Zaglavlje kupca (identično KOMERCIJALA, drugačije boje) ─── */}
                            <div
                              className="px-6 py-4 border-b-2 border-gray-200"
                              style={{
                                background: `linear-gradient(to right, ${PRIMARY}18, ${SECONDARY}18)`,
                              }}
                            >
                              <div className="flex items-center">
                                <div className="flex items-baseline gap-3 flex-wrap">
                                  <h3 className="text-xl font-bold" style={{ color: PRIMARY }}>
                                    {kupac.naziv_kupca}
                                  </h3>
                                  {kupac.naziv_grada && (
                                    <span className="text-xs text-gray-500 font-medium">
                                      {kupac.naziv_grada}
                                    </span>
                                  )}
                                </div>
                                <div className="ml-auto bg-white px-4 py-2 rounded-lg shadow">
                                  <span className="text-sm text-gray-600">Ukupno stavki:</span>
                                  <span
                                    className="ml-2 text-lg font-bold"
                                    style={{ color: SECONDARY }}
                                  >
                                    {kupac.proizvodi.length}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* ─── Tabela sa proizvodima ─── */}
                            <div className="overflow-x-auto">
                              <table className="w-full table-fixed divide-y divide-gray-200">
                                <thead style={{ backgroundColor: allFilled ? `${SECONDARY}22` : undefined }}>
                                  <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: allFilled ? SECONDARY : "rgb(107 114 128)" }}>
                                      NAZIV PROIZVODA
                                    </th>
                                    <th className="px-2 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: allFilled ? SECONDARY : "rgb(107 114 128)", width: 52 }}>
                                      JM
                                    </th>
                                    <th className="px-2 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: allFilled ? SECONDARY : "rgb(107 114 128)", width: 96 }}>
                                      KOLIČINA
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: allFilled ? SECONDARY : "rgb(107 114 128)", width: 220 }}>
                                      SPREMLJENO
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {kupac.proizvodi.length === 0 ? (
                                    <tr>
                                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                        Nema proizvoda
                                      </td>
                                    </tr>
                                  ) : (
                                    kupac.proizvodi.map((proizvod, index) => {
                                      const key = rowKey(getKupacGroupingKey(kupac.sifra_kupca, kupac.referentni_broj), proizvod.sif, index);
                                      const isListening = voiceKey === key;
                                      return (
                                        <tr
                                          key={key}
                                          className="transition-colors cursor-pointer"
                                          style={
                                            saveStatus[key] === 'error'
                                              ? { backgroundColor: "rgb(254 242 242)" }
                                              : saveStatus[key] === 'ok'
                                                ? { backgroundColor: `${SECONDARY}22` }
                                                : undefined
                                          }
                                          onClick={() => {
                                            const hasVal = spremljeno[key] && spremljeno[key] !== "-1.000";
                                            if (hasVal) setConfirmKey(key);
                                            else inputRefs.current.get(key)?.focus();
                                          }}
                                        >
                                          <td className="px-6 py-4 text-sm text-gray-900 align-top">
                                            <div>{proizvod.naziv_proizvoda}</div>
                                            {proizvod.napomena && proizvod.napomena.trim() && proizvod.napomena.trim() !== "-" && (
                                              <div className="mt-1 text-xs italic" style={{ color: SECONDARY }}>
                                                {proizvod.napomena.trim()}
                                              </div>
                                            )}
                                          </td>
                                          <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900 align-top text-right">
                                            {proizvod.jm}
                                          </td>
                                          <td className="px-2 py-4 whitespace-nowrap text-sm font-semibold align-top text-right" style={{ color: SECONDARY }}>
                                            {proizvod.kolicina}
                                          </td>
                                          <td className="px-4 py-3 align-top" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex flex-col items-end gap-1">
                                              <div className="flex items-center gap-1">
                                              <input
                                                ref={(el) => inputRefs.current.set(key, el)}
                                                type="text"
                                                inputMode="decimal"
                                                value={spremljeno[key] ?? ""}
                                                onChange={(e) => handleSpremljenoChange(key, e.target.value)}
                                                placeholder="-1.000"
                                                className="w-24 text-right text-sm font-bold border-2 rounded-lg px-2 py-2 focus:outline-none transition"
                                                style={{
                                                  borderColor: saveStatus[key] === 'error' ? "rgb(239 68 68)" : saveStatus[key] === 'ok' ? PRIMARY : "rgb(209 213 219)",
                                                  color: spremljeno[key] === "-1.000" ? "rgb(156 163 175)" : PRIMARY,
                                                  backgroundColor: saveStatus[key] === 'error' ? "rgb(254 242 242)" : saveStatus[key] === 'ok' ? `${PRIMARY}10` : "",
                                                }}
                                                onMouseDown={(e) => {
                                                  if (spremljeno[key] && spremljeno[key] !== "-1.000") {
                                                    e.preventDefault();
                                                    setConfirmKey(key);
                                                  }
                                                }}
                                                onFocus={(e) => { e.target.style.backgroundColor = "white"; e.target.select(); }}
                                                onBlur={(e) => {
                                                  e.target.style.backgroundColor = "";
                                                  handleSpremljenoBlur(key, proizvod.sifra_tabele, napomenaOp[key]);
                                                }}
                                              />
                                              <button
                                                type="button"
                                                onClick={() => startVoice(key)}
                                                className="p-2 rounded-lg transition-all"
                                                style={{
                                                  backgroundColor: isListening ? "#fee2e2" : `${PRIMARY}18`,
                                                  color: isListening ? "#dc2626" : PRIMARY,
                                                }}
                                                title="Glasovni unos"
                                              >
                                                <Mic className={`w-4 h-4 ${isListening ? "animate-pulse" : ""}`} />
                                              </button>
                                              {saveStatus[key] === 'saving' && <Loader className="w-3 h-3 animate-spin text-gray-400" />}
                                              {saveStatus[key] === 'ok'      && <CheckCircle2 className="w-3 h-3" style={{ color: SECONDARY }} />}
                                              {saveStatus[key] === 'error'   && <XCircle className="w-3 h-3 text-red-500" />}
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => setNoteModal({ key, sifra_tabele: proizvod.sifra_tabele, title: `${proizvod.sif}${proizvod.sifra_tabele ? ` (${proizvod.sifra_tabele})` : ""} — ${proizvod.naziv_proizvoda}` })}
                                                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all self-end"
                                                style={{
                                                  backgroundColor: napomenaOp[key] ? `${SECONDARY}22` : `${PRIMARY}10`,
                                                  color: napomenaOp[key] ? SECONDARY : PRIMARY,
                                                }}
                                              >
                                                <MessageSquare className="w-3 h-3" />
                                                {napomenaOp[key] ? "napomena ✓" : "napomena"}
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })
                                  )}
                                </tbody>
                              </table>
                            </div>

                          </div>
                        );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {proizvodiPoNazivu.map((proizvod) => {
                          const allFilledP = proizvod.stavke.every(s => saveStatus[s.key] === 'ok');
                          return (
                            <div
                              key={proizvod.sif}
                              className="bg-white rounded-xl shadow-lg overflow-hidden transition-all"
                              style={{ border: "2px solid rgb(229 231 235)", boxShadow: allFilledP ? `0 0 0 3px ${SECONDARY}` : undefined }}
                            >
                              {/* Zaglavlje proizvoda */}
                              <div
                                className="px-6 py-4 border-b-2 border-gray-200"
                                style={{ background: `linear-gradient(to right, ${PRIMARY}18, ${SECONDARY}18)` }}
                              >
                                <div className="flex items-center">
                                  <div className="flex items-baseline gap-3 flex-wrap">
                                    <h3 className="text-xl font-bold" style={{ color: PRIMARY }}>
                                      {proizvod.naziv}
                                    </h3>
                                    <span className="text-xs text-gray-600">
                                      Šifra: <span className="font-semibold">{proizvod.sif}</span>
                                      {proizvod.sifra_tabele && <span className="text-gray-400 ml-1">({proizvod.sifra_tabele})</span>}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      JM: <span className="font-semibold text-gray-700">{proizvod.jm}</span>
                                    </span>
                                  </div>
                                  <div className="ml-auto bg-white px-4 py-2 rounded-lg shadow">
                                    <span className="text-sm text-gray-600">Kupaca:</span>
                                    <span className="ml-2 text-lg font-bold" style={{ color: SECONDARY }}>
                                      {proizvod.stavke.length}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Tabela kupaca */}
                              <div className="overflow-x-auto">
                                <table className="w-full table-fixed divide-y divide-gray-200">
                                  <thead style={{ backgroundColor: allFilledP ? `${SECONDARY}22` : undefined }}>
                                    <tr>
                                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: allFilledP ? SECONDARY : "rgb(107 114 128)" }}>KUPAC</th>
                                      <th className="px-2 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: allFilledP ? SECONDARY : "rgb(107 114 128)", width: 96 }}>KOLIČINA</th>
                                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: allFilledP ? SECONDARY : "rgb(107 114 128)", width: 220 }}>SPREMLJENO</th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {proizvod.stavke.map((stavka) => {
                                      const isListening = voiceKey === stavka.key;
                                      return (
                                        <tr
                                          key={stavka.key}
                                          className="transition-colors cursor-pointer"
                                          style={
                                            saveStatus[stavka.key] === 'error'
                                              ? { backgroundColor: "rgb(254 242 242)" }
                                              : saveStatus[stavka.key] === 'ok'
                                                ? { backgroundColor: `${SECONDARY}22` }
                                                : undefined
                                          }
                                          onClick={() => {
                                            const hasVal = spremljeno[stavka.key] && spremljeno[stavka.key] !== "-1.000";
                                            if (hasVal) setConfirmKey(stavka.key);
                                            else inputRefs.current.get(stavka.key)?.focus();
                                          }}
                                        >
                                          <td className="px-6 py-4 text-sm text-gray-900 align-top">
                                            <div className="flex items-baseline gap-2 flex-wrap">
                                              <span>{stavka.nazivKupca}</span>
                                              {stavka.nazivGrada && (
                                                <span className="text-xs text-gray-500 font-medium">{stavka.nazivGrada}</span>
                                              )}
                                            </div>
                                            {stavka.napomena && stavka.napomena.trim() && stavka.napomena.trim() !== "-" && (
                                              <div className="mt-1 text-xs italic" style={{ color: SECONDARY }}>{stavka.napomena.trim()}</div>
                                            )}
                                          </td>
                                          <td className="px-2 py-4 whitespace-nowrap text-sm font-semibold align-top text-right" style={{ color: SECONDARY }}>
                                            {stavka.kolicina}
                                          </td>
                                          <td className="px-4 py-3 align-top" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex flex-col items-end gap-1">
                                              <div className="flex items-center gap-1">
                                              <input
                                                ref={(el) => inputRefs.current.set(stavka.key, el)}
                                                type="text"
                                                inputMode="decimal"
                                                value={spremljeno[stavka.key] ?? "-1.000"}
                                                onChange={(e) => handleSpremljenoChange(stavka.key, e.target.value)}
                                                placeholder="-1.000"
                                                className="w-24 text-right text-sm font-bold border-2 rounded-lg px-2 py-2 focus:outline-none transition"
                                                style={{
                                                  borderColor: saveStatus[stavka.key] === 'error' ? "rgb(239 68 68)" : saveStatus[stavka.key] === 'ok' ? PRIMARY : "rgb(209 213 219)",
                                                  color: spremljeno[stavka.key] === "-1.000" ? "rgb(156 163 175)" : PRIMARY,
                                                  backgroundColor: saveStatus[stavka.key] === 'error' ? "rgb(254 242 242)" : saveStatus[stavka.key] === 'ok' ? `${PRIMARY}10` : "",
                                                }}
                                                onMouseDown={(e) => {
                                                  if (spremljeno[stavka.key] && spremljeno[stavka.key] !== "-1.000") {
                                                    e.preventDefault();
                                                    setConfirmKey(stavka.key);
                                                  }
                                                }}
                                                onFocus={(e) => { e.target.style.backgroundColor = "white"; e.target.select(); }}
                                                onBlur={(e) => {
                                                  e.target.style.backgroundColor = "";
                                                  handleSpremljenoBlur(stavka.key, stavka.sifra_tabele, napomenaOp[stavka.key]);
                                                }}
                                              />
                                              <button
                                                type="button"
                                                onClick={() => startVoice(stavka.key)}
                                                className="p-2 rounded-lg transition-all"
                                                style={{
                                                  backgroundColor: isListening ? "#fee2e2" : `${PRIMARY}18`,
                                                  color: isListening ? "#dc2626" : PRIMARY,
                                                }}
                                                title="Glasovni unos"
                                              >
                                                <Mic className={`w-4 h-4 ${isListening ? "animate-pulse" : ""}`} />
                                              </button>
                                              {saveStatus[stavka.key] === 'saving' && <Loader className="w-3 h-3 animate-spin text-gray-400" />}
                                              {saveStatus[stavka.key] === 'ok'      && <CheckCircle2 className="w-3 h-3" style={{ color: SECONDARY }} />}
                                              {saveStatus[stavka.key] === 'error'   && <XCircle className="w-3 h-3 text-red-500" />}
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => setNoteModal({ key: stavka.key, sifra_tabele: stavka.sifra_tabele, title: `${proizvod.sif}${proizvod.sifra_tabele ? ` (${proizvod.sifra_tabele})` : ""} — ${proizvod.naziv}` })}
                                                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all self-end"
                                                style={{
                                                  backgroundColor: napomenaOp[stavka.key] ? `${SECONDARY}22` : `${PRIMARY}10`,
                                                  color: napomenaOp[stavka.key] ? SECONDARY : PRIMARY,
                                                }}
                                              >
                                                <MessageSquare className="w-3 h-3" />
                                                {napomenaOp[stavka.key] ? "napomena ✓" : "napomena"}
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>

        </div>
      </div>

      {/* ─── Modal: napomena operatera ──────────────────────────────────────── */}
      {noteModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col gap-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Napomena za</p>
                <p className="text-sm font-bold" style={{ color: PRIMARY }}>{noteModal.title}</p>
              </div>
              <button
                onClick={() => setNoteModal(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-all"
                style={{ color: PRIMARY }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Textarea */}
            <div className="px-5">
              <textarea
                rows={4}
                autoFocus
                value={napomenaOp[noteModal.key] ?? ""}
                onChange={(e) => setNapomenaOp(p => ({ ...p, [noteModal.key]: e.target.value }))}
                placeholder="Unesite napomenu..."
                className="w-full text-sm border-2 rounded-xl px-3 py-2 focus:outline-none resize-none transition"
                style={{ borderColor: "rgb(209 213 219)" }}
                onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                onBlur={(e) => (e.target.style.borderColor = "rgb(209 213 219)")}
              />
            </div>
            {/* Dugmad */}
            <div className="flex items-center gap-2 px-5 pb-5">
              <button
                type="button"
                onClick={() => startVoiceNote(noteModal.key)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{
                  backgroundColor: voiceNoteKey === noteModal.key ? "#fee2e2" : `${PRIMARY}18`,
                  color: voiceNoteKey === noteModal.key ? "#dc2626" : PRIMARY,
                }}
              >
                <Mic className={`w-4 h-4 ${voiceNoteKey === noteModal.key ? "animate-pulse" : ""}`} />
                {voiceNoteKey === noteModal.key ? "Snima..." : "Glasovni unos"}
              </button>
              <button
                className="ml-auto px-5 py-2 rounded-xl font-bold text-white transition-all active:scale-95"
                style={{ backgroundColor: PRIMARY }}
                onClick={() => {
                  const k = noteModal.key;
                  const val = spremljeno[k];
                  if (val && val !== "-1.000") {
                    handleSpremljenoBlur(k, noteModal.sifra_tabele, napomenaOp[k]);
                  }
                  setNoteModal(null);
                }}
              >
                Sačuvaj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: potvrda izmjene ──────────────────────────────────────────── */}
      {confirmKey !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center gap-5 w-72">
            <p className="text-base font-bold text-center" style={{ color: PRIMARY }}>
              DA LI ŽELITE DA MIJENJATE?
            </p>
            <div className="flex gap-3 w-full">
              <button
                className="flex-1 py-3 rounded-xl font-bold text-white transition-all active:scale-95"
                style={{ backgroundColor: SECONDARY }}
                onClick={() => {
                  const k = confirmKey;
                  setConfirmKey(null);
                  setTimeout(() => inputRefs.current.get(k)?.focus(), 50);
                }}
              >
                Da
              </button>
              <button
                className="flex-1 py-3 rounded-xl font-bold transition-all active:scale-95 border-2"
                style={{ color: PRIMARY, borderColor: PRIMARY }}
                onClick={() => setConfirmKey(null)}
              >
                Ne
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
