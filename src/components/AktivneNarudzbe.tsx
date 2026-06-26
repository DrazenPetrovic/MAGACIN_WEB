import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  Loader,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  Mic,
  MessageSquare,
  X,
  CheckCircle2,
  XCircle,
  Search,
  Calculator,
  User,
  Package,
  GripVertical,
  Check,
  Lock,
} from "lucide-react";
import { KalkulatorModal } from "./KalkulatorModal";
import { NumericKeyboard } from "./NumericKeyboard";
import { theme } from "../theme";
import { apiFetch } from "../utils/apiFetch";
import { Capacitor } from "@capacitor/core";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";

const PRIMARY = theme.primary; // #785E9E
const SECONDARY = theme.secondary; // #8FC74A
const SWIPE_THRESHOLD = 100;
const isAndroid = Capacitor.getPlatform() === "android";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3005";

// ===== INTERFEJSI (identično kao KOMERCIJALA) =====

interface NarudzbaProizvod {
  sif: string;
  sifra_tabele?: number;
  naziv_proizvoda: string;
  jm: string;
  verifikovano?: number;
  kolicina: number;
  napomena?: string;
  spremljena_kolicina?: number;
  sifra_kupca: number;
}

interface NarudzbaKupac {
  sifra_kupca: number;
  naziv_kupca: string;
  naziv_grada?: string;
  sifra_grada?: number;
  referentni_broj?: string;
  proizvodi: NarudzbaProizvod[];
}

interface RedosljedGrada {
  sifra_terena: number;
  sifra_grada: number;
  sinhronizovano: number;
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
  rawDate: string;
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

const getKupacGroupingKey = (
  sifraKupca: number,
  referentniBroj?: string | null,
): string => {
  const norm = normalizeReferentniBroj(referentniBroj);
  return norm ? `${sifraKupca}::${norm}` : String(sifraKupca);
};

// ===== SPEECH RECOGNITION =====

interface ISpeechRec {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

const getSpeechRecognition = (): (new () => ISpeechRec) | undefined => {
  const w = window as Window & {
    SpeechRecognition?: new () => ISpeechRec;
    webkitSpeechRecognition?: new () => ISpeechRec;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

// ===== PROPS =====

interface Props {
  onBack: () => void;
}

// ===== KOMPONENTA =====

export function AktivneNarudzbe({ onBack }: Props) {
  const [tereniData, setTereniData] = useState<TerenoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedTerenaSifra, setSelectedTerenaSifra] = useState<number | null>(
    null,
  );
  const [narudzbePoKupcu, setNarudzbePoKupcu] = useState<NarudzbaKupac[]>([]);
  const [loadingNarudzbe, setLoadingNarudzbe] = useState(false);
  const [redosljedGradova, setRedosljedGradova] = useState<RedosljedGrada[]>(
    [],
  );
  const [viewMode, setViewMode] = useState<"po-kupcu" | "po-proizvodu">(
    "po-kupcu",
  );

  // ─── Spremljene količine ───────────────────────────────────────────────────
  const [spremljeno, setSpremljeno] = useState<Record<string, string>>({});
  const [napomenaOp, setNapomenaOp] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<
    Record<string, "saving" | "ok" | "error">
  >({});
  const [voiceKey, setVoiceKey] = useState<string | null>(null);
  const [voiceNoteKey, setVoiceNoteKey] = useState<string | null>(null);
  const [noteModal, setNoteModal] = useState<{
    key: string;
    title: string;
    sifra_tabele?: number;
  } | null>(null);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const [expandedKupci, setExpandedKupci] = useState<Record<string, boolean>>({});
  const [expandedProizvodi, setExpandedProizvodi] = useState<Record<string, boolean>>({});
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchListening, setSearchListening] = useState(false);
  const [verifikovaniKupci, setVerifikovaniKupci] = useState<Set<string>>(new Set());
  const [verifikovaniProizvodi, setVerifikovaniProizvodi] = useState<Set<string>>(new Set());
  const [verifikacijaGreska, setVerifikacijaGreska] = useState<string | null>(null);
  // ─── Reorder (samo Android) ───────────────────────────────────────────────
  const [reorderMode, setReorderMode] = useState(false);
  const [kupacCustomOrder, setKupacCustomOrder] = useState<string[] | null>(null);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [dragInsertBefore, setDragInsertBefore] = useState(true);
  const [kalkulatorOpen, setKalkulatorOpen] = useState(false);
  const [numKbState, setNumKbState] = useState<{
    key: string;
    sifraTabele?: number;
    label: string;
  } | null>(null);
  // Vrijeme zatvaranja numeričke tastature — sprječava "duh-klik" koji nakon
  // zatvaranja tastature pogodi red ispod prsta i otvori tastaturu za drugi proizvod.
  const kbClosedAtRef = useRef(0);
  const inputRefs = useRef<Map<string, HTMLInputElement | null>>(new Map());
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const overlayRefs = useRef(new Map<string, HTMLDivElement>());
  const swipeDrag = useRef({
    active: false,
    key: "",
    startX: 0,
    startY: 0,
    isHorizontal: null as boolean | null,
    canVerify: false,
    sifraTabeleArray: [] as number[],
  });
  // Reorder refs — mirror state za pristup iz closures bez deps
  const reorderModeRef = useRef(false);
  const kupacCustomOrderRef = useRef<string[] | null>(null);
  const dragOverKeyRef = useRef<string | null>(null);
  const dragInsertBeforeRef = useRef(true);
  const longPressRef = useRef<{
    timer: ReturnType<typeof setTimeout> | null;
    startX: number;
    startY: number;
    key: string;
  }>({ timer: null, startX: 0, startY: 0, key: "" });
  const reorderDrag = useRef({
    active: false,
    fromKey: "",
    overKey: null as string | null,
    insertBefore: true,
    startY: 0,
  });

  const rowKey = (kupacKey: string, sif: string, idx: number) =>
    `${kupacKey}::${sif}::${idx}`;

  const startSearchVoice = async () => {
    if (isAndroid) {
      try {
        const { available } = await SpeechRecognition.available();
        if (!available) { alert("Glasovni unos nije dostupan na ovom uređaju."); return; }

        // Provjeri trenutni status dozvole
        let permStatus = await SpeechRecognition.checkPermissions();
        if (permStatus.speechRecognition !== "granted") {
          // Pokušaj zatražiti dozvolu
          permStatus = await SpeechRecognition.requestPermissions();
        }
        if (permStatus.speechRecognition !== "granted") {
          alert("Mikrofon je onemogućen.\nIdi na: Podešavanja → Aplikacije → Magacin → Dozvole → Mikrofon → Dozvoli");
          return;
        }

        setSearchListening(true);
        SpeechRecognition.removeAllListeners();

        SpeechRecognition.addListener("results", (data: { matches: string[] }) => {
          if (data.matches && data.matches.length > 0) setSearchQuery(data.matches[0]);
          setSearchListening(false);
          SpeechRecognition.removeAllListeners();
        });
        SpeechRecognition.addListener("listeningState", (state: { status: string }) => {
          if (state.status === "stopped") {
            setSearchListening(false);
            SpeechRecognition.removeAllListeners();
          }
        });

        await SpeechRecognition.start({
          language: "bs-BA",
          maxResults: 1,
          popup: false,
          partialResults: false,
        });
      } catch {
        setSearchListening(false);
      }
      return;
    }
    const SRCtor = getSpeechRecognition();
    if (!SRCtor) { alert("Preglednik ne podržava glasovni unos."); return; }
    const rec = new SRCtor();
    rec.lang = "bs-BA";
    rec.continuous = false;
    rec.interimResults = false;
    setSearchListening(true);
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      if (text) setSearchQuery(text);
      setSearchListening(false);
    };
    rec.onerror = () => setSearchListening(false);
    rec.onend = () => setSearchListening(false);
    rec.start();
  };

  const isKupacExpanded = (key: string) => expandedKupci[key] !== false;
  const isProizvodExpanded = (sif: string) => expandedProizvodi[sif] === true;
  const toggleKupac = (key: string) => setExpandedKupci(p => ({ ...p, [key]: !isKupacExpanded(key) }));
  const toggleProizvod = (sif: string) => setExpandedProizvodi(p => ({ ...p, [sif]: !isProizvodExpanded(sif) }));

  // Sync refs sa state-om (za pristup iz closures)
  useEffect(() => { reorderModeRef.current = reorderMode; }, [reorderMode]);
  useEffect(() => { kupacCustomOrderRef.current = kupacCustomOrder; }, [kupacCustomOrder]);
  useEffect(() => { dragOverKeyRef.current = dragOverKey; }, [dragOverKey]);

  // Crveni border po kupcu — automatski kad su svi njegovi proizvodi verifikovani
  useEffect(() => {
    const newSet = new Set<string>();
    narudzbePoKupcu.forEach(kupac => {
      const kKey = getKupacGroupingKey(kupac.sifra_kupca, kupac.referentni_broj);
      if (kupac.proizvodi.length > 0 && kupac.proizvodi.every(p => verifikovaniProizvodi.has(String(p.sif)))) {
        newSet.add(kKey);
      }
    });
    setVerifikovaniKupci(newSet);
  }, [verifikovaniProizvodi, narudzbePoKupcu]);

  // Zaključavanje kupca — dostupno tek kad su mu svi proizvodi verifikovani (verifikovano=1).
  // Šalje istu verifikacionu proceduru, ali sa verifikovano=2, samo za stavke ovog kupca.
  const handleZakljucajKupca = async (kupac: NarudzbaKupac) => {
    const kupacKey = getKupacGroupingKey(kupac.sifra_kupca, kupac.referentni_broj);
    const sifraTabeleArray = kupac.proizvodi
      .map((p) => p.sifra_tabele)
      .filter((s): s is number => s != null);
    if (sifraTabeleArray.length === 0) return;

    setNarudzbePoKupcu((prev) =>
      prev.map((k) =>
        getKupacGroupingKey(k.sifra_kupca, k.referentni_broj) === kupacKey
          ? { ...k, proizvodi: k.proizvodi.map((p) => ({ ...p, verifikovano: 2 })) }
          : k,
      ),
    );

    try {
      const res = await apiFetch(`${API_URL}/api/aktivne-narudzbe-teren/verifikacija`, {
        method: "POST",
        body: JSON.stringify({ sifraTabeleArray, verifikovano: 2 }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || data.poruka || "Greška pri zaključavanju");
      }
    } catch (err) {
      setNarudzbePoKupcu((prev) =>
        prev.map((k) =>
          getKupacGroupingKey(k.sifra_kupca, k.referentni_broj) === kupacKey
            ? { ...k, proizvodi: k.proizvodi.map((p) => ({ ...p, verifikovano: 1 })) }
            : k,
        ),
      );
      setVerifikacijaGreska(err instanceof Error ? err.message : "Greška pri zaključavanju");
      setTimeout(() => setVerifikacijaGreska(null), 4000);
    }
  };

  const handleDragStart = useCallback((
    e: React.TouchEvent | React.MouseEvent,
    key: string,
    canVerify: boolean,
    sifraTabeleArray: number[],
  ) => {
    if (reorderModeRef.current) return; // swipe disabled u reorder modu
    if (e.type === "mousedown" && (e as React.MouseEvent).button !== 0) return;
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    swipeDrag.current = { active: true, key, startX: clientX, startY: clientY, isHorizontal: null, canVerify, sifraTabeleArray };
    if (key.startsWith("prod_")) {
      console.log("[DragStart-prod] key:", key, "| canVerify:", canVerify, "| sifraTabeleArray:", sifraTabeleArray);
    }
  }, []);

  useEffect(() => {
    const onMove = (e: TouchEvent | MouseEvent) => {
      const drag = swipeDrag.current;
      if (!drag.active) return;
      const clientX = "touches" in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = "touches" in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
      const dx = clientX - drag.startX;
      const dy = clientY - drag.startY;
      if (drag.isHorizontal === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        drag.isHorizontal = Math.abs(dx) > Math.abs(dy);
      }
      if (!drag.isHorizontal || dx <= 0) return;
      (e as TouchEvent).preventDefault?.();
      const limited = Math.min(dx, SWIPE_THRESHOLD * 1.5);
      const card = cardRefs.current.get(drag.key);
      const overlay = overlayRefs.current.get(drag.key);
      if (card) card.style.transform = `translateX(${limited}px)`;
      if (overlay) overlay.style.opacity = String(Math.min(limited / SWIPE_THRESHOLD, 1));
    };

    const onEnd = (e: TouchEvent | MouseEvent) => {
      const drag = swipeDrag.current;
      if (!drag.active) return;
      drag.active = false;
      const clientX = "changedTouches" in e
        ? (e as TouchEvent).changedTouches[0].clientX
        : (e as MouseEvent).clientX;
      const dx = clientX - drag.startX;
      const card = cardRefs.current.get(drag.key);
      const overlay = overlayRefs.current.get(drag.key);
      const swipedFar = drag.isHorizontal === true && dx >= SWIPE_THRESHOLD;
      const verified = swipedFar && drag.canVerify;
      if (drag.key.startsWith("prod_")) {
        console.log("[onEnd-prod] dx:", dx, "| isHorizontal:", drag.isHorizontal, "| swipedFar:", swipedFar, "| canVerify:", drag.canVerify, "| verified:", verified, "| sifraTabeleArray:", drag.sifraTabeleArray);
      }
      if (swipedFar && !drag.canVerify) {
        // Swipe je prošao threshold ali stavke nisu sve popunjene
        setVerifikacijaGreska("Popunite sve stavke prije verifikacije");
        setTimeout(() => setVerifikacijaGreska(null), 3000);
        if (card) { card.style.transition = "transform 250ms cubic-bezier(0.25,0.46,0.45,0.94)"; card.style.transform = "translateX(0)"; }
        if (overlay) { overlay.style.transition = "opacity 250ms ease"; overlay.style.opacity = "0"; }
        setTimeout(() => { if (card) card.style.transition = ""; if (overlay) overlay.style.transition = ""; }, 260);
        return;
      }
      if (verified) {
        // 1) leti desno do kraja s punim overlayom
        if (card) { card.style.transition = "transform 320ms ease-in"; card.style.transform = "translateX(110%)"; }
        if (overlay) { overlay.style.transition = "opacity 150ms ease"; overlay.style.opacity = "1"; }
        setTimeout(() => {
          // 2) resetuj poziciju bez animacije (overlay još pokriven)
          if (card) { card.style.transition = "none"; card.style.transform = "translateX(0)"; }
          // 3) ažuriraj state (crveni border se pojavljuje)
          setVerifikovaniProizvodi(prev => new Set([...prev, drag.key.slice(5)]));
          // 4) API poziv — snimanje u bazu
          const revertKey = drag.key;
          const revertVerifikaciju = () => {
            setVerifikovaniProizvodi(prev => { const n = new Set(prev); n.delete(revertKey.slice(5)); return n; });
          };
          const showGreska = (msg: string) => {
            setVerifikacijaGreska(msg);
            setTimeout(() => setVerifikacijaGreska(null), 4000);
          };
          if (drag.sifraTabeleArray.length > 0) {
            console.log("[Verifikacija] Šaljem sifraTabeleArray:", drag.sifraTabeleArray);
            apiFetch(`${API_URL}/api/aktivne-narudzbe-teren/verifikacija`, {
              method: "POST",
              body: JSON.stringify({ sifraTabeleArray: drag.sifraTabeleArray, verifikovano: 1 }),
            })
              .then((r) => r.json())
              .then((data) => {
                console.log("[Verifikacija] Odgovor:", JSON.stringify(data));
                if (!data.success) {
                  revertVerifikaciju();
                  showGreska(data.message || data.poruka || "Greška pri verifikaciji");
                }
              })
              .catch((err) => {
                console.error("[Verifikacija] Greška:", err);
                revertVerifikaciju();
                showGreska("Greška pri spajanju na server");
              });
          } else {
            console.warn("[Verifikacija] sifraTabeleArray je prazan — provjeri da li sifra_tabele dolazi iz API-ja");
            revertVerifikaciju();
            showGreska("Verifikacija nije moguća: nema sifra_tabele u podacima");
          }
          // 5) prebaci overlay u crvenu, pa fade out
          if (overlay) overlay.style.background = "#ef4444";
          setTimeout(() => {
            if (overlay) { overlay.style.transition = "opacity 400ms ease"; overlay.style.opacity = "0"; }
            setTimeout(() => {
              if (card) card.style.transition = "";
              if (overlay) { overlay.style.transition = ""; overlay.style.background = ""; }
            }, 420);
          }, 120);
        }, 330);
      } else {
        if (card) { card.style.transition = "transform 250ms cubic-bezier(0.25,0.46,0.45,0.94)"; card.style.transform = "translateX(0)"; }
        if (overlay) { overlay.style.transition = "opacity 250ms ease"; overlay.style.opacity = "0"; }
        setTimeout(() => { if (card) card.style.transition = ""; if (overlay) overlay.style.transition = ""; }, 260);
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, []);

  // ─── Reorder drag (samo Android, aktivan dok je reorderMode) ─────────────
  useEffect(() => {
    const onMove = (e: TouchEvent) => {
      if (!reorderDrag.current.fromKey) return;
      const touch = e.touches[0];
      const dy = Math.abs(touch.clientY - reorderDrag.current.startY);
      if (!reorderDrag.current.active && dy > 12) {
        reorderDrag.current.active = true;
        setDraggingKey(reorderDrag.current.fromKey);
      }
      if (!reorderDrag.current.active) return;
      e.preventDefault();
      // Nađi koji element je ispod prsta
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      let target: Element | null = el;
      let overKey: string | null = null;
      let insertBefore = true;
      while (target) {
        const key = (target as HTMLElement).dataset?.kupacKey;
        if (key && key !== reorderDrag.current.fromKey) {
          const rect = target.getBoundingClientRect();
          insertBefore = touch.clientY < rect.top + rect.height / 2;
          overKey = key;
          break;
        }
        target = target.parentElement;
      }
      reorderDrag.current.overKey = overKey;
      reorderDrag.current.insertBefore = insertBefore;
      if (overKey !== dragOverKeyRef.current || insertBefore !== dragInsertBeforeRef.current) {
        dragOverKeyRef.current = overKey;
        dragInsertBeforeRef.current = insertBefore;
        setDragOverKey(overKey);
        setDragInsertBefore(insertBefore);
      }
    };

    const onEnd = () => {
      if (!reorderDrag.current.fromKey) return;
      const { fromKey, overKey, insertBefore, active } = reorderDrag.current;
      reorderDrag.current = { active: false, fromKey: "", overKey: null, insertBefore: true, startY: 0 };
      setDraggingKey(null);
      setDragOverKey(null);
      setDragInsertBefore(true);
      if (active && overKey && overKey !== fromKey) {
        setKupacCustomOrder(prev => {
          if (!prev) return prev;
          const from = prev.indexOf(fromKey);
          const next = [...prev];
          next.splice(from, 1);
          const to = next.indexOf(overKey);
          if (to === -1) return prev;
          next.splice(insertBefore ? to : to + 1, 0, fromKey);
          return next;
        });
      }
    };

    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, []);

  // ─── Sačuvaj/učitaj custom redosljed u localStorage ───────────────────────
  useEffect(() => {
    if (kupacCustomOrder && selectedDay !== null) {
      localStorage.setItem(`kupacOrder_${selectedDay}`, JSON.stringify(kupacCustomOrder));
    }
  }, [kupacCustomOrder, selectedDay]);

  // ─── Long press pomoćnici ─────────────────────────────────────────────────
  const startLongPress = (kupacKey: string, clientX: number, clientY: number, initialOrderKeys: string[]) => {
    longPressRef.current.timer = setTimeout(() => {
      if (!reorderModeRef.current) {
        setReorderMode(true);
        reorderModeRef.current = true;
        if (!kupacCustomOrderRef.current) {
          setKupacCustomOrder(initialOrderKeys);
          kupacCustomOrderRef.current = initialOrderKeys;
        }
      }
      reorderDrag.current = { active: false, fromKey: kupacKey, overKey: null, insertBefore: true, startY: clientY };
      swipeDrag.current.active = false; // otkaži swipe ako je počeo
      if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
    }, 3000);
    longPressRef.current.startX = clientX;
    longPressRef.current.startY = clientY;
    longPressRef.current.key = kupacKey;
  };

  const cancelLongPress = () => {
    if (longPressRef.current.timer) {
      clearTimeout(longPressRef.current.timer);
      longPressRef.current.timer = null;
    }
  };

  const handleCollapseExpandAll = () => {
    if (viewMode === "po-kupcu") {
      const allCollapsed = narudzbePoKupcu.every(
        k => expandedKupci[getKupacGroupingKey(k.sifra_kupca, k.referentni_broj)] === false
      );
      if (allCollapsed) {
        setExpandedKupci({});
      } else {
        const next: Record<string, boolean> = {};
        narudzbePoKupcu.forEach(k => { next[getKupacGroupingKey(k.sifra_kupca, k.referentni_broj)] = false; });
        setExpandedKupci(next);
      }
    } else {
      const anyExpanded = filteredProizvodi.some(p => expandedProizvodi[p.sif] === true);
      if (anyExpanded) {
        setExpandedProizvodi({});
      } else {
        const next: Record<string, boolean> = {};
        filteredProizvodi.forEach(p => { next[p.sif] = true; });
        setExpandedProizvodi(next);
      }
    }
  };

  const handleSpremljenoChange = (key: string, raw: string) => {
    const stripped = raw.replace(",", ".").replace(/[^0-9.-]/g, "");
    const clean = stripped ? stripped[0] + stripped.slice(1).replace(/-/g, "") : "";
    setSpremljeno((p) => ({ ...p, [key]: clean }));
  };

  const startVoice = (key: string) => {
    const SRCtor = getSpeechRecognition();
    if (!SRCtor) { alert("Preglednik ne podržava glasovni unos."); return; }
    const rec = new SRCtor();
    rec.lang = "bs-BA";
    rec.continuous = false;
    rec.interimResults = false;
    setVoiceKey(key);
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      const num = text.replace(",", ".").replace(/[^0-9.]/g, "");
      if (num) setSpremljeno((p) => ({ ...p, [key]: num }));
      setVoiceKey(null);
      setTimeout(() => inputRefs.current.get(key)?.focus(), 50);
    };
    rec.onerror = () => setVoiceKey(null);
    rec.onend = () => setVoiceKey(null);
    rec.start();
  };

  const startVoiceNote = (key: string) => {
    const SRCtor = getSpeechRecognition();
    if (!SRCtor) { alert("Preglednik ne podržava glasovni unos."); return; }
    const rec = new SRCtor();
    rec.lang = "bs-BA";
    rec.continuous = false;
    rec.interimResults = false;
    setVoiceNoteKey(key);
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      if (text) setNapomenaOp((p) => ({ ...p, [key]: text }));
      setVoiceNoteKey(null);
    };
    rec.onerror = () => setVoiceNoteKey(null);
    rec.onend = () => setVoiceNoteKey(null);
    rec.start();
  };

  const handleSpremljenoReset = async (key: string, sifraTabele: number | undefined) => {
    if (!sifraTabele) return;
    setSaveStatus((p) => ({ ...p, [key]: "saving" }));
    try {
      const res = await apiFetch(`${API_URL}/api/aktivne-narudzbe-teren/reset`, {
        method: "POST",
        body: JSON.stringify({ sifraPolja: sifraTabele, kolicina: -1 }),
      });
      const data = await res.json();
      if (data.success) {
        setSpremljeno((p) => ({ ...p, [key]: "-1.000" }));
        setSaveStatus((p) => { const n = { ...p }; delete n[key]; return n; });
      } else {
        setSaveStatus((p) => ({ ...p, [key]: "error" }));
      }
    } catch {
      setSaveStatus((p) => ({ ...p, [key]: "error" }));
    }
  };

  const handleSpremljenoBlur = async (
    key: string,
    sifraTabele: number | undefined,
    napomena: string | undefined,
    overrideVal?: string,
  ) => {
    const val = overrideVal ?? spremljeno[key];
    if (!val || val === "-1.000" || !sifraTabele) return;
    const kolicina = parseFloat(val.replace(",", "."));
    if (isNaN(kolicina)) return;
    if (kolicina === -1) {
      await handleSpremljenoReset(key, sifraTabele);
      return;
    }
    setSaveStatus((p) => ({ ...p, [key]: "saving" }));
    try {
      const res = await apiFetch(
        `${API_URL}/api/aktivne-narudzbe-teren/azuriraj`,
        {
          method: "POST",
          body: JSON.stringify({
            sifraPolja: sifraTabele,
            kolicinaZaUnos: kolicina,
            napomena: napomena || null,
          }),
        },
      );
      const data = await res.json();
      setSaveStatus((p) => ({ ...p, [key]: data.success ? "ok" : "error" }));
    } catch {
      setSaveStatus((p) => ({ ...p, [key]: "error" }));
    }
  };

  // ─── Dohvat terena po danima ───────────────────────────────────────────────
  const fetchTerenPoDanima = async () => {
    try {
      setLoading(true);
      const [response, redosljedRes] = await Promise.all([
        apiFetch(`${API_URL}/api/aktivne-narudzbe-teren/tereni`),
        apiFetch(`${API_URL}/api/aktivne-narudzbe-teren/redosljed-gradova`),
      ]);
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const redosljedData = await redosljedRes.json();
      if (redosljedData.success) setRedosljedGradova(redosljedData.data);
      const result = await response.json();

      if (result.success && result.data) {
        setTereniData(result.data);
        if (result.data.length > 0) {
          // Lokalni datum kao "YYYY-MM-DD" (izbjegavamo UTC pomak koji .toISOString() pravi)
          const now = new Date();
          const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

          const sortedData = [...result.data].sort((a: TerenoData, b: TerenoData) =>
            new Date(a.datum_dostave).getTime() - new Date(b.datum_dostave).getTime()
          );
          const todayRecord: TerenoData =
            sortedData.find((t: TerenoData) => {
              if (!t.datum_dostave) return false;
              const d = new Date(t.datum_dostave);
              const dLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
              return dLocal > todayLocal;
            }) ?? sortedData[0];

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
        apiFetch(`${API_URL}/api/aktivne-narudzbe-teren/${sifraTerenaDostava}/grupisano`),
        apiFetch(`${API_URL}/api/aktivne-narudzbe-teren/${sifraTerenaDostava}`),
      ]);

      if (!grupisaneResponse.ok || !aktivneResponse.ok) {
        console.warn("Greška pri učitavanju narudžbi");
        return;
      }

      const grupisaneResult = await grupisaneResponse.json();
      const aktivneResult = await aktivneResponse.json();

      if (grupisaneResult.success && aktivneResult.success) {
        const grupisaneData = grupisaneResult.data || [];
        const aktivneData = aktivneResult.data || [];

        // ─── Grupisanje po kupcu + referentnom broju (identično KOMERCIJALA) ───
        const kupciMap = new Map<string, NarudzbaKupac>();

        grupisaneData.forEach(
          (item: {
            sifra_partnera: number;
            naziv_partnera: string;
            partnera: string;
            naziv_grada?: string;
            sifra_grada?: number;
            referentni_broj: string;
          }) => {
            const referentniBroj = normalizeReferentniBroj(
              item.referentni_broj,
            );
            const kupacKey = getKupacGroupingKey(
              item.sifra_partnera,
              referentniBroj,
            );
            if (!kupciMap.has(kupacKey)) {
              kupciMap.set(kupacKey, {
                sifra_kupca: item.sifra_partnera,
                naziv_kupca:
                  item.naziv_partnera || item.partnera || "Nepoznat kupac",
                naziv_grada: item.naziv_grada,
                sifra_grada: item.sifra_grada,
                referentni_broj: referentniBroj,
                proizvodi: [],
              });
            }
          },
        );

        aktivneData.forEach(
          (item: {
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
            verifikovano?: number;
          }) => {
            const sifraKupca = item.sifra_patnera || item.sifra_partnera;
            const referentniBroj = normalizeReferentniBroj(
              item.referentni_broj,
            );
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
                verifikovano: item.verifikovano ?? 0,
              });
            }
          },
        );

        const finalList = Array.from(kupciMap.values());


        const initialSpremljeno: Record<string, string> = {};
        const initialSaveStatus: Record<string, "saving" | "ok" | "error"> = {};
        finalList.forEach((kupac) => {
          kupac.proizvodi.forEach((proizvod, idx) => {
            const k = rowKey(
              getKupacGroupingKey(kupac.sifra_kupca, kupac.referentni_broj),
              proizvod.sif,
              idx,
            );
            const sk = proizvod.spremljena_kolicina;
            if (
              sk !== undefined &&
              sk !== null &&
              parseFloat(String(sk)) !== -1
            ) {
              initialSpremljeno[k] = String(sk);
              initialSaveStatus[k] = "ok";
            } else {
              initialSpremljeno[k] = "-1.000";
            }
          });
        });
        // ─── Inicijalizacija verifikacije iz baze ─────────────────────────────
        const prodVerMap = new Map<string, { total: number; verified: number }>();

        finalList.forEach((kupac) => {
          kupac.proizvodi.forEach((p) => {
            const entry = prodVerMap.get(p.sif) ?? { total: 0, verified: 0 };
            entry.total++;
            if ((p.verifikovano ?? 0) >= 1) entry.verified++;
            prodVerMap.set(p.sif, entry);
          });
        });

        const initialVerifikovaniProizvodi = new Set<string>();
        prodVerMap.forEach((entry, sif) => {
          if (entry.total > 0 && entry.verified === entry.total) {
            initialVerifikovaniProizvodi.add(String(sif));
          }
        });

        setVerifikovaniProizvodi(initialVerifikovaniProizvodi);
        setSpremljeno(initialSpremljeno);
        setSaveStatus(initialSaveStatus);
        setNarudzbePoKupcu(finalList);

        // Učitaj sačuvani redosljed kupaca iz localStorage
        try {
          const saved = localStorage.getItem(`kupacOrder_${sifraTerenaDostava}`);
          if (saved) {
            const parsed: string[] = JSON.parse(saved);
            setKupacCustomOrder(parsed);
            kupacCustomOrderRef.current = parsed;
          } else {
            setKupacCustomOrder(null);
            kupacCustomOrderRef.current = null;
          }
        } catch { /* ignoriši */ }
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
          rawDate: t.datum_dostave,
        },
      ]),
    ).values(),
  ).sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());

  const trenutniTeren = tereniData.find(
    (t) => t.sifra_terena_dostava === selectedDay,
  );
  const nazivDana = trenutniTeren?.naziv_dana ?? "";
  const datumDostave = trenutniTeren
    ? formatDate(trenutniTeren.datum_dostave)
    : "";

  void loading;

  const [dayDropdownOpen, setDayDropdownOpen] = useState(false);

  const toLocalDateStr = (raw: string) => {
    const d = new Date(raw);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const sortedNarudzbePoKupcu = [...narudzbePoKupcu].sort((a, b) => {
    const rA =
      redosljedGradova.find(
        (r) =>
          r.sifra_terena === selectedTerenaSifra &&
          r.sifra_grada === a.sifra_grada,
      )?.sinhronizovano ?? 9999;
    const rB =
      redosljedGradova.find(
        (r) =>
          r.sifra_terena === selectedTerenaSifra &&
          r.sifra_grada === b.sifra_grada,
      )?.sinhronizovano ?? 9999;
    return rA - rB;
  });

  // Primijeni custom redosljed ako postoji (drag-to-reorder)
  const displayedKupci: NarudzbaKupac[] = (() => {
    if (!kupacCustomOrder) return sortedNarudzbePoKupcu;
    const ordered: NarudzbaKupac[] = [];
    for (const key of kupacCustomOrder) {
      const k = narudzbePoKupcu.find(
        k2 => getKupacGroupingKey(k2.sifra_kupca, k2.referentni_broj) === key,
      );
      if (k) ordered.push(k);
    }
    // Dodaj kupce koji nisu u sačuvanom order-u (novi)
    for (const k of sortedNarudzbePoKupcu) {
      const key = getKupacGroupingKey(k.sifra_kupca, k.referentni_broj);
      if (!kupacCustomOrder.includes(key)) ordered.push(k);
    }
    return ordered;
  })();

  // ─── Brojači ──────────────────────────────────────────────────────────────
  const totalProizvoda = narudzbePoKupcu.reduce(
    (s, k) => s + k.proizvodi.length,
    0,
  );
  const spremljenoCount = narudzbePoKupcu.reduce(
    (s, kupac) =>
      s +
      kupac.proizvodi.filter((p, idx) => {
        const k = rowKey(
          getKupacGroupingKey(kupac.sifra_kupca, kupac.referentni_broj),
          p.sif,
          idx,
        );
        return saveStatus[k] === "ok";
      }).length,
    0,
  );
  const verifikovanoCount = narudzbePoKupcu.reduce(
    (s, kupac) => s + kupac.proizvodi.filter((p) => (p.verifikovano ?? 0) >= 1).length,
    0,
  );
  const totalKupaca = narudzbePoKupcu.length;
  const zakljucanoKupciCount = narudzbePoKupcu.filter(
    (k) => k.proizvodi.length > 0 && k.proizvodi.every((p) => p.verifikovano === 2),
  ).length;
  const zakljucanoProizvodaCount = narudzbePoKupcu.reduce(
    (s, k) => s + k.proizvodi.filter((p) => p.verifikovano === 2).length,
    0,
  );

  // ─── PO PROIZVODU — grupisanje ────────────────────────────────────────────
  const proizvodiPoNazivu = (() => {
    const map = new Map<
      string,
      {
        sif: string;
        sifra_tabele?: number;
        naziv: string;
        jm: string;
        stavke: {
          sifraKupca: number;
          nazivKupca: string;
          nazivGrada?: string;
          sifra_tabele?: number;
          kolicina: number;
          napomena?: string;
          key: string;
        }[];
      }
    >();
    narudzbePoKupcu.forEach((kupac) => {
      kupac.proizvodi.forEach((p, idx) => {
        const k = rowKey(
          getKupacGroupingKey(kupac.sifra_kupca, kupac.referentni_broj),
          p.sif,
          idx,
        );
        const existing = map.get(p.sif);
        const stavka = {
          sifraKupca: kupac.sifra_kupca,
          nazivKupca: kupac.naziv_kupca,
          nazivGrada: kupac.naziv_grada,
          sifra_tabele: p.sifra_tabele,
          kolicina: p.kolicina,
          napomena: p.napomena,
          key: k,
        };
        if (existing) existing.stavke.push(stavka);
        else
          map.set(p.sif, {
            sif: p.sif,
            sifra_tabele: p.sifra_tabele,
            naziv: p.naziv_proizvoda,
            jm: p.jm,
            stavke: [stavka],
          });
      });
    });
    return Array.from(map.values()).sort((a, b) =>
      a.naziv.localeCompare(b.naziv, "bs"),
    );
  })();

  const filteredProizvodi = searchQuery
    ? proizvodiPoNazivu.filter(p =>
        p.naziv.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : proizvodiPoNazivu;

  const openNumKbForKey = (key: string) => {
    for (const kupac of narudzbePoKupcu) {
      const kupacKey = getKupacGroupingKey(kupac.sifra_kupca, kupac.referentni_broj);
      for (let idx = 0; idx < kupac.proizvodi.length; idx++) {
        const p = kupac.proizvodi[idx];
        if (rowKey(kupacKey, p.sif, idx) === key) {
          setNumKbState({ key, sifraTabele: p.sifra_tabele, label: p.naziv_proizvoda });
          return;
        }
      }
    }
    for (const p of filteredProizvodi) {
      for (const stavka of p.stavke) {
        if (stavka.key === key) {
          setNumKbState({ key, sifraTabele: stavka.sifra_tabele, label: p.naziv });
          return;
        }
      }
    }
    setNumKbState({ key, label: "" });
  };

  // ===== RENDER =====
  return (
    <div
      className="flex flex-col"
      style={{ height: "100dvh", background: "#f1f5f9" }}
    >
      {verifikacijaGreska && (
        <div
          className="fixed top-4 left-1/2 z-50 rounded-xl px-5 py-3 shadow-2xl text-white text-sm font-semibold"
          style={{ transform: "translateX(-50%)", background: "#dc2626", minWidth: "260px", textAlign: "center" }}
        >
          {verifikacijaGreska}
        </div>
      )}
      {/* Reorder mode banner — fiksiran pri dnu, samo Android */}
      {isAndroid && reorderMode && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 shadow-2xl"
          style={{ background: PRIMARY }}
        >
          <div className="flex items-center gap-3 text-white">
            <GripVertical className="w-5 h-5" />
            <span className="text-sm font-semibold">Držite zaglavlje i prevucite za promjenu redosljeda</span>
          </div>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 rounded-xl text-sm font-bold text-white border border-white/40 active:opacity-70"
              onPointerDown={(e) => {
                e.preventDefault();
                setKupacCustomOrder(null);
                kupacCustomOrderRef.current = null;
                if (selectedDay !== null) localStorage.removeItem(`kupacOrder_${selectedDay}`);
              }}
            >
              Resetuj
            </button>
            <button
              className="px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 active:opacity-70"
              style={{ background: SECONDARY, color: "white" }}
              onPointerDown={(e) => {
                e.preventDefault();
                setReorderMode(false);
                reorderModeRef.current = false;
              }}
            >
              <Check className="w-4 h-4" />
              Gotovo
            </button>
          </div>
        </div>
      )}
      {/* ─── Outer card wrapper (identično KOMERCIJALA) ─────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden m-0 md:m-3">
        <div className="bg-white rounded-none md:rounded-2xl shadow-xl overflow-hidden flex flex-col h-full">
          {/* ─── HEADER — KOLAPSIBILAN (identično KOMERCIJALA) ──────────────── */}
          <div className="border-b-2 border-gray-200 bg-white flex-none">
            <div className="flex items-center gap-2 pl-2 pr-4 md:px-8 py-2 md:py-4">
              {/* ── LIJEVO: nazad + dan ── */}
              <div className="flex items-center gap-3">
                <button
                  onClick={onBack}
                  className="flex items-center justify-center w-8 h-8 rounded-lg border-2 transition-all active:scale-95 flex-none"
                  style={{ color: PRIMARY, borderColor: PRIMARY }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = `${PRIMARY}10`)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="relative">
                  <button
                    onClick={() => setDayDropdownOpen((o) => !o)}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1 transition-all hover:bg-gray-100 active:bg-gray-200"
                  >
                    <div className="flex flex-col items-start">
                      <span className="text-base md:text-lg font-bold leading-tight" style={{ color: PRIMARY }}>
                        {nazivDana || "Aktivne narudžbe"}
                      </span>
                      {datumDostave && (
                        <span className="text-xs font-normal text-gray-500 leading-tight">{datumDostave}</span>
                      )}
                    </div>
                    <ChevronDown
                      className="w-4 h-4 transition-transform flex-none"
                      style={{ color: PRIMARY, transform: dayDropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                    />
                  </button>
                  {dayDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setDayDropdownOpen(false)} />
                      <div className="absolute left-0 top-full mt-1 z-30 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden min-w-52">
                        {uniqueDays.filter((d) => {
                          const dStr = d.rawDate ? toLocalDateStr(d.rawDate) : '';
                          return dStr > todayStr;
                        }).map((d) => {
                          const dStr = d.rawDate ? toLocalDateStr(d.rawDate) : '';
                          const isAfterToday = dStr > todayStr;
                          const isSelected = selectedDay === d.sifraTerenaDostava;
                          return (
                            <button
                              key={d.sifraTerenaDostava}
                              onClick={() => { handleDayClick(d); setDayDropdownOpen(false); }}
                              className="w-full text-left px-4 py-3 flex items-center justify-between gap-4 transition-colors hover:bg-gray-50 active:bg-gray-100"
                              style={{
                                backgroundColor: isSelected ? `${PRIMARY}12` : undefined,
                                borderLeft: isSelected ? `3px solid ${PRIMARY}` : "3px solid transparent",
                              }}
                            >
                              <span className="font-semibold text-sm" style={{ color: isAfterToday ? "rgb(156 163 175)" : isSelected ? PRIMARY : "rgb(55 65 81)" }}>
                                {d.day}
                              </span>
                              <span className="text-xs" style={{ color: isAfterToday ? "rgb(209 213 219)" : "rgb(107 114 128)" }}>
                                {d.date}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* ── CENTAR: collapse + toggle po kupcu / po proizvodu ── */}
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={handleCollapseExpandAll}
                  className="flex items-center justify-center w-9 h-9 rounded-lg border-2 transition-all active:scale-95"
                  style={{ color: PRIMARY, borderColor: PRIMARY }}
                  title={
                    viewMode === "po-kupcu"
                      ? narudzbePoKupcu.every(k => expandedKupci[getKupacGroupingKey(k.sifra_kupca, k.referentni_broj)] === false) ? "Proširi sve" : "Kolabira sve"
                      : filteredProizvodi.some(p => expandedProizvodi[p.sif] === true) ? "Kolabira sve" : "Proširi sve"
                  }
                >
                  {viewMode === "po-kupcu"
                    ? narudzbePoKupcu.every(k => expandedKupci[getKupacGroupingKey(k.sifra_kupca, k.referentni_broj)] === false)
                      ? <ChevronsDown className="w-5 h-5" />
                      : <ChevronsUp className="w-5 h-5" />
                    : filteredProizvodi.some(p => expandedProizvodi[p.sif] === true)
                      ? <ChevronsUp className="w-5 h-5" />
                      : <ChevronsDown className="w-5 h-5" />
                  }
                </button>
                <div
                  className="flex rounded-lg overflow-hidden border-2"
                  style={{ borderColor: PRIMARY }}
                >
                  <button
                    className="px-3 py-2 transition-all"
                    style={{
                      backgroundColor: viewMode === "po-kupcu" ? PRIMARY : "transparent",
                      color: viewMode === "po-kupcu" ? "white" : PRIMARY,
                    }}
                    onClick={() => {
                      setViewMode("po-kupcu");
                    }}
                    title="Po kupcu"
                  >
                    <User className="w-6 h-6" />
                  </button>
                  <button
                    className="px-3 py-2 transition-all border-l-2"
                    style={{
                      backgroundColor: viewMode === "po-proizvodu" ? PRIMARY : "transparent",
                      color: viewMode === "po-proizvodu" ? "white" : PRIMARY,
                      borderColor: PRIMARY,
                    }}
                    onClick={() => {
                      setViewMode("po-proizvodu");
                      // Reorder mode je samo za po-kupcu — reset pri prelasku
                      if (reorderModeRef.current) {
                        setReorderMode(false);
                        reorderModeRef.current = false;
                      }
                    }}
                    title="Po proizvodu"
                  >
                    <Package className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* ── DESNO: search + Spremljeno ── */}
              <div className="flex items-center justify-end gap-1.5 ml-auto">
                <button
                  onClick={() => { setSearchModalOpen(true); setTimeout(startSearchVoice, 300); }}
                  className="p-2 rounded-lg transition-all relative"
                  style={{
                    backgroundColor: searchQuery ? `${PRIMARY}22` : `${PRIMARY}10`,
                    color: PRIMARY,
                    visibility: viewMode === "po-proizvodu" ? "visible" : "hidden",
                  }}
                  title="Pretraga glasom"
                >
                  <Search className="w-5 h-5" />
                  {searchQuery && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SECONDARY }} />
                  )}
                </button>
                {totalProizvoda > 0 && (
                  <div className="relative rounded-xl overflow-hidden" style={{ padding: '2px' }}>
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        width: '300%',
                        height: '300%',
                        top: '50%',
                        left: '50%',
                        animation: 'spinBorder 2s linear infinite',
                        background: zakljucanoKupciCount === totalKupaca && totalKupaca > 0
                          ? `conic-gradient(${SECONDARY}, #c5e87b, ${SECONDARY}88, #c5e87b, ${SECONDARY})`
                          : `conic-gradient(${PRIMARY}, #b8a8d4, ${PRIMARY}88, #b8a8d4, ${PRIMARY})`,
                      }}
                    />
                    <button
                      onClick={() => { if (selectedDay !== null) fetchAktivneNarudzbeZaTeren(selectedDay); }}
                      className="relative px-3 py-1.5 rounded-[10px] active:scale-95 transition-transform"
                      style={{
                        background: zakljucanoKupciCount === totalKupaca && totalKupaca > 0 ? `${SECONDARY}22` : 'white',
                        color: PRIMARY,
                      }}
                      title="Klikni za osvježavanje narudžbi"
                    >
                      {/* Gornji red — ikone */}
                      <div className="flex gap-3 items-center justify-between">
                        <Package className="w-3 h-3" style={{ color: PRIMARY }} title="Spremljeno" />
                        <CheckCircle2 className="w-3 h-3" style={{ color: PRIMARY }} title="Verifikovano" />
                        <Lock className="w-3 h-3" style={{ color: PRIMARY }} title="Zakljucano" />
                      </div>
                      {/* Linija */}
                      <div className="my-1" style={{ borderTop: `1px solid ${PRIMARY}33` }} />
                      {/* Donji red — brojevi */}
                      <div className="flex gap-3 items-center justify-between">
                        <span className="text-xs font-bold tabular-nums" style={{ color: PRIMARY }}>
                          {spremljenoCount}/{totalProizvoda}
                        </span>
                        <span className="text-xs font-bold tabular-nums" style={{ color: PRIMARY }}>
                          {verifikovanoCount}/{totalProizvoda}
                        </span>
                        <span className="text-xs font-bold tabular-nums" style={{ color: PRIMARY }}>
                          {zakljucanoProizvodaCount}/{totalProizvoda}
                        </span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
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
                      <Loader
                        className="w-8 h-8 animate-spin"
                        style={{ color: PRIMARY }}
                      />
                      <span className="ml-3 text-gray-600">
                        Učitavanje narudžbi...
                      </span>
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
                  ) : viewMode === "po-kupcu" ? (
                    <div className="space-y-6">
                      {displayedKupci.map((kupac) => {
                        const kupacKey = getKupacGroupingKey(kupac.sifra_kupca, kupac.referentni_broj);
                        const allFilled =
                          kupac.proizvodi.length > 0 &&
                          kupac.proizvodi.every((p, idx) => {
                            const k = rowKey(kupacKey, p.sif, idx);
                            return saveStatus[k] === "ok";
                          });
                        const sviProizvodiVerifikovani = verifikovaniKupci.has(kupacKey);
                        const sviProizvodiZakljucani =
                          kupac.proizvodi.length > 0 &&
                          kupac.proizvodi.every((p) => p.verifikovano === 2);
                        const isDragging = draggingKey === kupacKey;
                        const isOver = dragOverKey === kupacKey && !!draggingKey;
                        const dropLine = (
                          <div style={{
                            height: 4,
                            borderRadius: 2,
                            background: PRIMARY,
                            margin: "4px 0",
                            position: "relative",
                            flexShrink: 0,
                          }}>
                            <div style={{ position: "absolute", left: -5, top: "50%", transform: "translateY(-50%)", width: 12, height: 12, borderRadius: "50%", background: PRIMARY }} />
                            <div style={{ position: "absolute", right: -5, top: "50%", transform: "translateY(-50%)", width: 12, height: 12, borderRadius: "50%", background: PRIMARY }} />
                          </div>
                        );
                        return [
                          isOver && dragInsertBefore ? <div key={`line-before-${kupacKey}`}>{dropLine}</div> : null,
                          <div
                            key={kupacKey}
                            data-kupac-key={kupacKey}
                            className="relative rounded-xl overflow-hidden"
                            style={{
                              transition: "box-shadow 150ms ease, transform 150ms ease, opacity 150ms ease",
                              opacity: isDragging ? 0.55 : 1,
                              boxShadow: isDragging
                                ? `0 24px 48px rgba(0,0,0,0.32), 0 0 0 3px ${PRIMARY}`
                                : "0 4px 16px rgba(0,0,0,0.10)",
                              transform: isDragging ? "scale(1.025) rotate(0.4deg)" : "scale(1)",
                              zIndex: isDragging ? 20 : undefined,
                            }}
                          >
                            {/* Card */}
                            <div
                              className="bg-white rounded-xl overflow-hidden relative select-none"
                              style={{
                                border: sviProizvodiZakljucani
                                  ? "2px solid rgb(209 213 219)"
                                  : sviProizvodiVerifikovani
                                    ? "3px solid #ef4444"
                                    : allFilled
                                      ? `2px solid ${SECONDARY}`
                                      : "2px solid rgb(229 231 235)",
                                boxShadow: sviProizvodiZakljucani
                                  ? "none"
                                  : sviProizvodiVerifikovani
                                    ? "0 0 0 3px #ef4444"
                                    : allFilled
                                      ? `0 0 0 3px ${SECONDARY}`
                                      : undefined,
                                opacity: sviProizvodiZakljucani ? 0.55 : 1,
                                filter: sviProizvodiZakljucani ? "grayscale(1)" : undefined,
                                pointerEvents: sviProizvodiZakljucani ? "none" : undefined,
                              }}
                            >
                            {/* ─── Zaglavlje kupca ─── */}
                            <div
                              className="px-4 py-4 border-b-2 border-gray-200 cursor-pointer select-none"
                              style={{
                                background: reorderMode
                                  ? `linear-gradient(to right, ${PRIMARY}28, ${PRIMARY}10)`
                                  : `linear-gradient(to right, ${PRIMARY}18, ${SECONDARY}18)`,
                                touchAction: reorderMode ? "none" : "pan-y",
                              }}
                              onClick={() => { if (!reorderMode) toggleKupac(kupacKey); }}
                              onTouchStart={(e) => {
                                if (!isAndroid) return;
                                if (reorderMode) {
                                  // U reorder modu: odmah počni drag
                                  e.stopPropagation();
                                  reorderDrag.current = {
                                    active: false,
                                    fromKey: kupacKey,
                                    overKey: null,
                                    insertBefore: true,
                                    startY: e.touches[0].clientY,
                                  };
                                } else {
                                  // Normalni mod: počni long press timer
                                  const currentOrderKeys = sortedNarudzbePoKupcu.map(
                                    k => getKupacGroupingKey(k.sifra_kupca, k.referentni_broj)
                                  );
                                  startLongPress(kupacKey, e.touches[0].clientX, e.touches[0].clientY, currentOrderKeys);
                                }
                              }}
                              onTouchMove={(e) => {
                                if (reorderMode) return;
                                const dx = Math.abs(e.touches[0].clientX - longPressRef.current.startX);
                                const dy = Math.abs(e.touches[0].clientY - longPressRef.current.startY);
                                if (dx > 12 || dy > 12) cancelLongPress();
                              }}
                              onTouchEnd={() => {
                                if (!reorderMode) cancelLongPress();
                              }}
                            >
                              <div className="flex items-center gap-2">
                                {/* Drag handle — vidljiv samo u reorder modu */}
                                {isAndroid && reorderMode && (
                                  <GripVertical
                                    className="w-6 h-6 flex-none"
                                    style={{ color: PRIMARY, opacity: 0.7 }}
                                  />
                                )}
                                <div className="flex items-baseline gap-3 flex-wrap flex-1">
                                  <h3
                                    className="text-xl font-bold"
                                    style={{ color: PRIMARY }}
                                  >
                                    {kupac.naziv_kupca}
                                  </h3>
                                  {kupac.naziv_grada && (
                                    <span className="text-xs text-gray-500 font-medium">
                                      {kupac.naziv_grada}
                                    </span>
                                  )}
                                </div>
                                <div className="bg-white px-4 py-2 rounded-lg shadow flex-none">
                                  <span className="text-sm text-gray-600">
                                    Ukupno stavki:
                                  </span>
                                  <span
                                    className="ml-2 text-lg font-bold"
                                    style={{ color: SECONDARY }}
                                  >
                                    {kupac.proizvodi.length}
                                  </span>
                                </div>
                                {sviProizvodiZakljucani ? (
                                  <div
                                    className="flex items-center justify-center w-8 h-8 rounded-lg flex-none"
                                    style={{ background: "rgb(229 231 235)", color: "rgb(107 114 128)" }}
                                  >
                                    <Lock className="w-4 h-4" />
                                  </div>
                                ) : sviProizvodiVerifikovani ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleZakljucajKupca(kupac);
                                    }}
                                    className="flex items-center gap-1 px-3 py-2 rounded-lg flex-none transition-transform active:scale-95"
                                    style={{ background: "#ef4444", color: "white" }}
                                    title="Zaključaj kupca — onemogući dalje izmjene"
                                  >
                                    <Lock className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase">Zaključaj</span>
                                  </button>
                                ) : null}
                                <ChevronDown
                                  className="w-5 h-5 flex-none transition-transform duration-200"
                                  style={{
                                    color: PRIMARY,
                                    transform: isKupacExpanded(kupacKey) ? "rotate(0deg)" : "rotate(-90deg)",
                                  }}
                                />
                              </div>
                            </div>

                            {/* ─── Tabela sa proizvodima ─── */}
                            {isKupacExpanded(kupacKey) && (
                            <div className="overflow-x-auto">
                              <table className="w-full table-fixed divide-y divide-gray-200">
                                <thead
                                  style={{
                                    backgroundColor: allFilled
                                      ? `${SECONDARY}22`
                                      : undefined,
                                  }}
                                >
                                  <tr>
                                    <th
                                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                                      style={{
                                        color: allFilled
                                          ? SECONDARY
                                          : "rgb(107 114 128)",
                                      }}
                                    >
                                      NAZIV PROIZVODA
                                    </th>
                                    <th
                                      className="px-2 py-3 text-center text-xs font-medium uppercase tracking-wider"
                                      style={{
                                        color: allFilled
                                          ? SECONDARY
                                          : "rgb(107 114 128)",
                                        width: 96,
                                      }}
                                    >
                                      KOLIČINA
                                    </th>
                                    <th
                                      className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider"
                                      style={{
                                        color: allFilled
                                          ? SECONDARY
                                          : "rgb(107 114 128)",
                                        width: 220,
                                      }}
                                    >
                                      SPREMLJENO
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {kupac.proizvodi.length === 0 ? (
                                    <tr>
                                      <td
                                        colSpan={3}
                                        className="px-6 py-8 text-center text-gray-500"
                                      >
                                        Nema proizvoda
                                      </td>
                                    </tr>
                                  ) : (
                                    kupac.proizvodi.map((proizvod, index) => {
                                      const key = rowKey(kupacKey, proizvod.sif, index);
                                      const isListening = voiceKey === key;
                                      const verNivo =
                                        proizvod.verifikovano === 2
                                          ? 2
                                          : verifikovaniProizvodi.has(String(proizvod.sif)) || proizvod.verifikovano === 1
                                            ? 1
                                            : 0;
                                      const jeVerifikovan = verNivo >= 1;
                                      const jeZakljucan = verNivo === 2;
                                      return (
                                        <tr
                                          key={key}
                                          className={`transition-colors ${jeZakljucan ? "cursor-not-allowed" : "cursor-pointer"}`}
                                          style={{
                                            ...(saveStatus[key] === "error"
                                              ? { backgroundColor: "rgb(254 242 242)" }
                                              : saveStatus[key] === "ok"
                                                ? { backgroundColor: `${SECONDARY}22` }
                                                : {}),
                                            opacity: jeZakljucan ? 0.55 : 1,
                                          }}
                                          onClick={() => {
                                            if (jeVerifikovan) return;
                                            if (isAndroid && Date.now() - kbClosedAtRef.current < 350) return;
                                            const hasVal =
                                              spremljeno[key] &&
                                              spremljeno[key] !== "-1.000";
                                            if (hasVal) setConfirmKey(key);
                                            else
                                              inputRefs.current
                                                .get(key)
                                                ?.focus();
                                          }}
                                        >
                                          <td className="px-6 py-4 text-sm text-gray-900 align-top">
                                            <div>
                                              {proizvod.naziv_proizvoda}
                                              <span className="text-xs font-bold ml-1" style={{ color: PRIMARY }}>({proizvod.jm})</span>
                                              {verNivo === 1 && (
                                                <span
                                                  className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase"
                                                  style={{ background: "#ef444422", color: "#ef4444" }}
                                                >
                                                  Verifikovano
                                                </span>
                                              )}
                                              {verNivo === 2 && (
                                                <span
                                                  className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded"
                                                  style={{ background: "rgb(229 231 235)", color: "rgb(107 114 128)" }}
                                                >
                                                  <Lock className="w-2.5 h-2.5" />
                                                </span>
                                              )}
                                            </div>
                                            {proizvod.napomena &&
                                              proizvod.napomena.trim() &&
                                              proizvod.napomena.trim() !==
                                                "-" && (
                                                <div
                                                  className="mt-1 text-xs italic"
                                                  style={{ color: SECONDARY }}
                                                >
                                                  {proizvod.napomena.trim()}
                                                </div>
                                              )}
                                          </td>
                                          <td
                                            className="px-2 py-4 whitespace-nowrap align-top text-center"
                                          >
                                            {proizvod.jm.toLowerCase() !== "kg" ? (
                                              <span
                                                className="inline-block text-base font-bold px-3 py-3 rounded-lg transition-transform"
                                                style={{
                                                  backgroundColor: `${SECONDARY}22`,
                                                  color: jeVerifikovan ? "rgb(156 163 175)" : SECONDARY,
                                                  cursor: jeVerifikovan ? "default" : "pointer",
                                                }}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  if (jeVerifikovan) return;
                                                  const val = String(proizvod.kolicina);
                                                  setSpremljeno(p => ({ ...p, [key]: val }));
                                                  handleSpremljenoBlur(key, proizvod.sifra_tabele, napomenaOp[key], val);
                                                }}
                                              >
                                                {proizvod.kolicina}
                                              </span>
                                            ) : (
                                              <span className="text-sm font-semibold" style={{ color: SECONDARY }}>
                                                {proizvod.kolicina}
                                              </span>
                                            )}
                                          </td>
                                          <td
                                            className={`${isAndroid ? "pl-4 pr-2" : "px-4"} py-3 align-top`}
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <div className="flex items-center gap-1">
                                                {isAndroid && saveStatus[key] === "saving" && (
                                                  <Loader className="w-3 h-3 animate-spin text-gray-400" />
                                                )}
                                                {isAndroid && saveStatus[key] === "ok" && (
                                                  <CheckCircle2
                                                    className="w-3 h-3"
                                                    style={{ color: jeZakljucan ? "rgb(156 163 175)" : verNivo === 1 ? "#ef4444" : SECONDARY }}
                                                  />
                                                )}
                                                {isAndroid && saveStatus[key] === "error" && (
                                                  <XCircle className="w-3 h-3 text-red-500" />
                                                )}
                                                <input
                                                  ref={(el) =>
                                                    inputRefs.current.set(
                                                      key,
                                                      el,
                                                    )
                                                  }
                                                  type="number"
                                                  step="any"
                                                  inputMode="decimal"
                                                  value={spremljeno[key] === "-1.000" ? "" : (spremljeno[key] ?? "")}
                                                  onChange={(e) =>
                                                    handleSpremljenoChange(
                                                      key,
                                                      e.target.value,
                                                    )
                                                  }
                                                  placeholder="-1.000"
                                                  className={`w-24 text-right text-sm font-bold border-2 rounded-lg px-2 py-2 focus:outline-none transition${isAndroid ? " ml-auto" : ""}`}
                                                  style={{
                                                    borderColor:
                                                      saveStatus[key] ===
                                                      "error"
                                                        ? "#ef4444"
                                                        : saveStatus[key] ===
                                                            "ok"
                                                          ? PRIMARY
                                                          : "rgb(209 213 219)",
                                                    color:
                                                      spremljeno[key] ===
                                                      "-1.000"
                                                        ? "rgb(156 163 175)"
                                                        : PRIMARY,
                                                    backgroundColor:
                                                      saveStatus[key] ===
                                                      "error"
                                                        ? "rgb(254 242 242)"
                                                        : saveStatus[key] ===
                                                            "ok"
                                                          ? `${PRIMARY}10`
                                                          : "",
                                                  }}
                                                  readOnly={isAndroid || jeVerifikovan}
                                                  onMouseDown={(e) => {
                                                    if (isAndroid) return;
                                                    if (jeVerifikovan) return;
                                                    if (
                                                      spremljeno[key] &&
                                                      spremljeno[key] !== "-1.000"
                                                    ) {
                                                      e.preventDefault();
                                                      setConfirmKey(key);
                                                    }
                                                  }}
                                                  onClick={() => {
                                                    if (!isAndroid) return;
                                                    if (jeVerifikovan) return;
                                                    if (Date.now() - kbClosedAtRef.current < 350) return;
                                                    if (spremljeno[key] && spremljeno[key] !== "-1.000") {
                                                      setConfirmKey(key);
                                                    } else {
                                                      setNumKbState({ key, sifraTabele: proizvod.sifra_tabele, label: proizvod.naziv_proizvoda });
                                                    }
                                                  }}
                                                  onFocus={(e) => {
                                                    if (isAndroid || jeVerifikovan) { e.target.blur(); return; }
                                                    e.target.style.backgroundColor = "white";
                                                    if (spremljeno[key] === "-1.000") {
                                                      setSpremljeno((p) => ({ ...p, [key]: "" }));
                                                    } else {
                                                      e.target.select();
                                                    }
                                                  }}
                                                  onBlur={(e) => {
                                                    if (isAndroid || jeVerifikovan) return;
                                                    e.target.style.backgroundColor = "";
                                                    handleSpremljenoBlur(
                                                      key,
                                                      proizvod.sifra_tabele,
                                                      napomenaOp[key],
                                                    );
                                                  }}
                                                />
                                                {!isAndroid && (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    if (jeVerifikovan) return;
                                                    startVoice(key);
                                                  }}
                                                  disabled={jeVerifikovan}
                                                  className="p-2 rounded-lg transition-all"
                                                  style={{
                                                    backgroundColor: isListening
                                                      ? "#fee2e2"
                                                      : `${PRIMARY}18`,
                                                    color: isListening
                                                      ? "#dc2626"
                                                      : jeVerifikovan
                                                        ? "rgb(156 163 175)"
                                                        : PRIMARY,
                                                    opacity: jeVerifikovan ? 0.4 : 1,
                                                  }}
                                                  title={jeZakljucan ? "Zaključano — izmjena nije moguća" : jeVerifikovan ? "Verificirano — izmjena nije moguća" : "Glasovni unos"}
                                                >
                                                  <Mic
                                                    className={`w-4 h-4 ${isListening ? "animate-pulse" : ""}`}
                                                  />
                                                </button>
                                                )}
                                                {!isAndroid && saveStatus[key] ===
                                                  "saving" && (
                                                  <Loader className="w-3 h-3 animate-spin text-gray-400" />
                                                )}
                                                {!isAndroid && saveStatus[key] === "ok" && (
                                                  <CheckCircle2
                                                    className="w-3 h-3"
                                                    style={{ color: jeZakljucan ? "rgb(156 163 175)" : verNivo === 1 ? "#ef4444" : SECONDARY }}
                                                  />
                                                )}
                                                {!isAndroid && saveStatus[key] ===
                                                  "error" && (
                                                  <XCircle className="w-3 h-3 text-red-500" />
                                                )}
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  if (jeVerifikovan) return;
                                                  setNoteModal({
                                                    key,
                                                    sifra_tabele:
                                                      proizvod.sifra_tabele,
                                                    title: `${proizvod.sif}${proizvod.sifra_tabele ? ` (${proizvod.sifra_tabele})` : ""} — ${proizvod.naziv_proizvoda}`,
                                                  });
                                                }}
                                                disabled={jeVerifikovan}
                                                className={`${isAndroid ? "p-1" : "p-1.5"} rounded-lg transition-all`}
                                                style={{
                                                  backgroundColor: napomenaOp[key] ? `${SECONDARY}22` : `${PRIMARY}10`,
                                                  color: jeVerifikovan ? "rgb(156 163 175)" : napomenaOp[key] ? SECONDARY : PRIMARY,
                                                  opacity: jeVerifikovan ? 0.4 : 1,
                                                  cursor: jeVerifikovan ? "default" : "pointer",
                                                }}
                                                title={jeZakljucan ? "Zaključano — izmjena nije moguća" : jeVerifikovan ? "Verificirano — izmjena nije moguća" : napomenaOp[key] ? `Napomena: ${napomenaOp[key]}` : "Dodaj napomenu"}
                                              >
                                                <MessageSquare className={isAndroid ? "w-6 h-6" : "w-4 h-4"} />
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
                            )}
                            </div>
                          </div>,
                          isOver && !dragInsertBefore ? <div key={`line-after-${kupacKey}`}>{dropLine}</div> : null,
                        ];
                      })}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {filteredProizvodi.map((proizvod) => {
                        const allFilledP = proizvod.stavke.every(
                          (s) => saveStatus[s.key] === "ok",
                        );
                        const totalKolicina = proizvod.stavke.reduce((sum, s) => sum + parseFloat(String(s.kolicina)), 0);
                        const spremljenoKolicina = proizvod.stavke.reduce((sum, s) => {
                          if (saveStatus[s.key] === "ok") {
                            const val = parseFloat(String(spremljeno[s.key] ?? "0"));
                            return sum + (isNaN(val) ? 0 : val);
                          }
                          return sum;
                        }, 0);
                        return (
                          <div key={proizvod.sif} className="relative rounded-xl overflow-hidden shadow-lg">
                            {/* Swipe overlay */}
                            <div
                              ref={(el) => { if (el) overlayRefs.current.set(`prod_${proizvod.sif}`, el); else overlayRefs.current.delete(`prod_${proizvod.sif}`); }}
                              className="absolute inset-0 flex items-center pl-6 pointer-events-none"
                              style={{ background: SECONDARY, opacity: 0 }}
                            >
                              <CheckCircle2 className="w-8 h-8 flex-none" style={{ color: "white" }} />
                              <span className="ml-3 font-bold text-base" style={{ color: "white" }}>Verificirano</span>
                            </div>
                            {/* Card */}
                            <div
                              ref={(el) => { if (el) cardRefs.current.set(`prod_${proizvod.sif}`, el); else cardRefs.current.delete(`prod_${proizvod.sif}`); }}
                              className="bg-white rounded-xl overflow-hidden relative select-none transition-all"
                              style={{
                                border: verifikovaniProizvodi.has(String(proizvod.sif))
                                  ? "3px solid #ef4444"
                                  : allFilledP
                                    ? `2px solid ${SECONDARY}`
                                    : "2px solid rgb(229 231 235)",
                                boxShadow: verifikovaniProizvodi.has(String(proizvod.sif))
                                  ? "0 0 0 3px #ef4444"
                                  : allFilledP
                                    ? `0 0 0 3px ${SECONDARY}`
                                    : undefined,
                                touchAction: 'pan-y',
                              }}
                              onTouchStart={(e) => handleDragStart(
                                e, `prod_${proizvod.sif}`, allFilledP,
                                proizvod.stavke.map(s => s.sifra_tabele).filter((s): s is number => s != null),
                              )}
                              onMouseDown={(e) => handleDragStart(
                                e, `prod_${proizvod.sif}`, allFilledP,
                                proizvod.stavke.map(s => s.sifra_tabele).filter((s): s is number => s != null),
                              )}
                            >
                            {/* Zaglavlje proizvoda */}
                            <div
                              className="px-6 py-4 border-b-2 border-gray-200 cursor-pointer select-none"
                              style={{
                                background: `linear-gradient(to right, ${PRIMARY}18, ${SECONDARY}18)`,
                              }}
                              onClick={() => toggleProizvod(proizvod.sif)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex flex-col gap-0.5 flex-1">
                                  <div className="flex items-baseline gap-3 flex-wrap">
                                    <h3
                                      className="text-xl font-bold"
                                      style={{ color: PRIMARY }}
                                    >
                                      {proizvod.naziv}
                                    </h3>
                                    <span className="text-xs text-gray-500">
                                      JM:{" "}
                                      <span className="font-semibold text-gray-700">
                                        {proizvod.jm}
                                      </span>
                                    </span>
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    Kupaca: {proizvod.stavke.length}
                                  </span>
                                </div>
                                <div className="flex-none text-right">
                                  <span
                                    className="text-base font-bold"
                                    style={{ color: allFilledP ? SECONDARY : PRIMARY }}
                                  >
                                    {totalKolicina.toFixed(3)}/{spremljenoKolicina.toFixed(3)}
                                  </span>
                                </div>
                                <ChevronDown
                                  className="w-5 h-5 flex-none transition-transform duration-200"
                                  style={{
                                    color: PRIMARY,
                                    transform: isProizvodExpanded(proizvod.sif) ? "rotate(0deg)" : "rotate(-90deg)",
                                  }}
                                />
                              </div>
                            </div>

                            {/* Tabela kupaca */}
                            {isProizvodExpanded(proizvod.sif) && (
                            <div className="overflow-x-auto">
                              <table className="w-full table-fixed divide-y divide-gray-200">
                                <thead
                                  style={{
                                    backgroundColor: allFilledP
                                      ? `${SECONDARY}22`
                                      : undefined,
                                  }}
                                >
                                  <tr>
                                    <th
                                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                                      style={{
                                        color: allFilledP
                                          ? SECONDARY
                                          : "rgb(107 114 128)",
                                      }}
                                    >
                                      KUPAC
                                    </th>
                                    <th
                                      className="px-2 py-3 text-center text-xs font-medium uppercase tracking-wider"
                                      style={{
                                        color: allFilledP
                                          ? SECONDARY
                                          : "rgb(107 114 128)",
                                        width: 96,
                                      }}
                                    >
                                      KOLIČINA
                                    </th>
                                    <th
                                      className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider"
                                      style={{
                                        color: allFilledP
                                          ? SECONDARY
                                          : "rgb(107 114 128)",
                                        width: 220,
                                      }}
                                    >
                                      SPREMLJENO
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {proizvod.stavke.map((stavka) => {
                                    const isListening = voiceKey === stavka.key;
                                    const jeVerifikovan = verifikovaniProizvodi.has(String(proizvod.sif));
                                    return (
                                      <tr
                                        key={stavka.key}
                                        className="transition-colors cursor-pointer"
                                        style={
                                          saveStatus[stavka.key] === "error"
                                            ? {
                                                backgroundColor:
                                                  "rgb(254 242 242)",
                                              }
                                            : saveStatus[stavka.key] === "ok"
                                              ? {
                                                  backgroundColor: `${SECONDARY}22`,
                                                }
                                              : undefined
                                        }
                                        onClick={() => {
                                          if (jeVerifikovan) return;
                                          if (isAndroid && Date.now() - kbClosedAtRef.current < 350) return;
                                          const hasVal =
                                            spremljeno[stavka.key] &&
                                            spremljeno[stavka.key] !== "-1.000";
                                          if (hasVal) setConfirmKey(stavka.key);
                                          else
                                            inputRefs.current
                                              .get(stavka.key)
                                              ?.focus();
                                        }}
                                      >
                                        <td className="px-6 py-4 text-sm text-gray-900 align-top">
                                          <div className="flex items-baseline gap-2 flex-wrap">
                                            <span>{stavka.nazivKupca}</span>
                                            {stavka.nazivGrada && (
                                              <span className="text-xs text-gray-500 font-medium">
                                                {stavka.nazivGrada}
                                              </span>
                                            )}
                                          </div>
                                          {stavka.napomena &&
                                            stavka.napomena.trim() &&
                                            stavka.napomena.trim() !== "-" && (
                                              <div
                                                className="mt-1 text-xs italic"
                                                style={{ color: SECONDARY }}
                                              >
                                                {stavka.napomena.trim()}
                                              </div>
                                            )}
                                        </td>
                                        <td
                                          className="px-2 py-4 whitespace-nowrap text-sm font-semibold align-top text-center"
                                          style={{ color: SECONDARY }}
                                        >
                                          {stavka.kolicina}
                                        </td>
                                        <td
                                          className={`${isAndroid ? "pl-4 pr-2" : "px-4"} py-3 align-top`}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <div className="flex items-center gap-1">
                                              {isAndroid && saveStatus[stavka.key] === "saving" && (
                                                <Loader className="w-3 h-3 animate-spin text-gray-400" />
                                              )}
                                              {isAndroid && saveStatus[stavka.key] === "ok" && (
                                                <CheckCircle2
                                                  className="w-3 h-3"
                                                  style={{ color: SECONDARY }}
                                                />
                                              )}
                                              {isAndroid && saveStatus[stavka.key] === "error" && (
                                                <XCircle className="w-3 h-3 text-red-500" />
                                              )}
                                              <input
                                                ref={(el) =>
                                                  inputRefs.current.set(
                                                    stavka.key,
                                                    el,
                                                  )
                                                }
                                                type="number"
                                                step="any"
                                                inputMode="decimal"
                                                value={
                                                  spremljeno[stavka.key] === "-1.000" ? "" : (spremljeno[stavka.key] ?? "")
                                                }
                                                onChange={(e) =>
                                                  handleSpremljenoChange(
                                                    stavka.key,
                                                    e.target.value,
                                                  )
                                                }
                                                placeholder="-1.000"
                                                className={`w-24 text-right text-sm font-bold border-2 rounded-lg px-2 py-2 focus:outline-none transition${isAndroid ? " ml-auto" : ""}`}
                                                style={{
                                                  borderColor:
                                                    saveStatus[stavka.key] ===
                                                    "error"
                                                      ? "#ef4444"
                                                      : saveStatus[
                                                            stavka.key
                                                          ] === "ok"
                                                        ? PRIMARY
                                                        : "rgb(209 213 219)",
                                                  color:
                                                    spremljeno[stavka.key] ===
                                                    "-1.000"
                                                      ? "rgb(156 163 175)"
                                                      : PRIMARY,
                                                  backgroundColor:
                                                    saveStatus[stavka.key] ===
                                                    "error"
                                                      ? "rgb(254 242 242)"
                                                      : saveStatus[
                                                            stavka.key
                                                          ] === "ok"
                                                        ? `${PRIMARY}10`
                                                        : "",
                                                }}
                                                readOnly={isAndroid || jeVerifikovan}
                                                onMouseDown={(e) => {
                                                  if (isAndroid) return;
                                                  if (jeVerifikovan) return;
                                                  if (
                                                    spremljeno[stavka.key] &&
                                                    spremljeno[stavka.key] !== "-1.000"
                                                  ) {
                                                    e.preventDefault();
                                                    setConfirmKey(stavka.key);
                                                  }
                                                }}
                                                onClick={() => {
                                                  if (!isAndroid) return;
                                                  if (jeVerifikovan) return;
                                                  if (Date.now() - kbClosedAtRef.current < 350) return;
                                                  if (spremljeno[stavka.key] && spremljeno[stavka.key] !== "-1.000") {
                                                    setConfirmKey(stavka.key);
                                                  } else {
                                                    setNumKbState({ key: stavka.key, sifraTabele: stavka.sifra_tabele, label: proizvod.naziv });
                                                  }
                                                }}
                                                onFocus={(e) => {
                                                  if (isAndroid || jeVerifikovan) { e.target.blur(); return; }
                                                  e.target.style.backgroundColor = "white";
                                                  if (spremljeno[stavka.key] === "-1.000") {
                                                    setSpremljeno((p) => ({ ...p, [stavka.key]: "" }));
                                                  } else {
                                                    e.target.select();
                                                  }
                                                }}
                                                onBlur={(e) => {
                                                  if (isAndroid || jeVerifikovan) return;
                                                  e.target.style.backgroundColor = "";
                                                  handleSpremljenoBlur(
                                                    stavka.key,
                                                    stavka.sifra_tabele,
                                                    napomenaOp[stavka.key],
                                                  );
                                                }}
                                              />
                                              {!isAndroid && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  if (jeVerifikovan) return;
                                                  startVoice(stavka.key);
                                                }}
                                                disabled={jeVerifikovan}
                                                className="p-2 rounded-lg transition-all"
                                                style={{
                                                  backgroundColor: isListening
                                                    ? "#fee2e2"
                                                    : `${PRIMARY}18`,
                                                  color: isListening
                                                    ? "#dc2626"
                                                    : jeVerifikovan
                                                      ? "rgb(156 163 175)"
                                                      : PRIMARY,
                                                  opacity: jeVerifikovan ? 0.4 : 1,
                                                }}
                                                title={jeVerifikovan ? "Verificirano — izmjena nije moguća" : "Glasovni unos"}
                                              >
                                                <Mic
                                                  className={`w-4 h-4 ${isListening ? "animate-pulse" : ""}`}
                                                />
                                              </button>
                                              )}
                                              {!isAndroid && saveStatus[stavka.key] ===
                                                "saving" && (
                                                <Loader className="w-3 h-3 animate-spin text-gray-400" />
                                              )}
                                              {!isAndroid && saveStatus[stavka.key] ===
                                                "ok" && (
                                                <CheckCircle2
                                                  className="w-3 h-3"
                                                  style={{ color: SECONDARY }}
                                                />
                                              )}
                                              {!isAndroid && saveStatus[stavka.key] ===
                                                "error" && (
                                                <XCircle className="w-3 h-3 text-red-500" />
                                              )}
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  if (jeVerifikovan) return;
                                                  setNoteModal({
                                                    key: stavka.key,
                                                    sifra_tabele:
                                                      stavka.sifra_tabele,
                                                    title: `${proizvod.sif}${proizvod.sifra_tabele ? ` (${proizvod.sifra_tabele})` : ""} — ${proizvod.naziv}`,
                                                  });
                                                }}
                                                disabled={jeVerifikovan}
                                                className={`${isAndroid ? "p-1" : "p-1.5"} rounded-lg transition-all`}
                                                style={{
                                                  backgroundColor: napomenaOp[stavka.key] ? `${SECONDARY}22` : `${PRIMARY}10`,
                                                  color: jeVerifikovan ? "rgb(156 163 175)" : napomenaOp[stavka.key] ? SECONDARY : PRIMARY,
                                                  opacity: jeVerifikovan ? 0.4 : 1,
                                                  cursor: jeVerifikovan ? "default" : "pointer",
                                                }}
                                                title={jeVerifikovan ? "Verificirano — izmjena nije moguća" : napomenaOp[stavka.key] ? `Napomena: ${napomenaOp[stavka.key]}` : "Dodaj napomenu"}
                                              >
                                                <MessageSquare className={isAndroid ? "w-6 h-6" : "w-4 h-4"} />
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
                <p className="text-xs text-gray-400 uppercase tracking-wide">
                  Napomena za
                </p>
                <p className="text-sm font-bold" style={{ color: PRIMARY }}>
                  {noteModal.title}
                </p>
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
                onChange={(e) =>
                  setNapomenaOp((p) => ({
                    ...p,
                    [noteModal.key]: e.target.value,
                  }))
                }
                placeholder="Unesite napomenu..."
                className="w-full text-sm border-2 rounded-xl px-3 py-2 focus:outline-none resize-none transition"
                style={{ borderColor: "rgb(209 213 219)" }}
                onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                onBlur={(e) =>
                  (e.target.style.borderColor = "rgb(209 213 219)")
                }
              />
            </div>
            {/* Dugmad */}
            <div className="flex items-center gap-2 px-5 pb-5">
              <button
                type="button"
                onClick={() => startVoiceNote(noteModal.key)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{
                  backgroundColor:
                    voiceNoteKey === noteModal.key ? "#fee2e2" : `${PRIMARY}18`,
                  color: voiceNoteKey === noteModal.key ? "#dc2626" : PRIMARY,
                }}
              >
                <Mic
                  className={`w-4 h-4 ${voiceNoteKey === noteModal.key ? "animate-pulse" : ""}`}
                />
                {voiceNoteKey === noteModal.key ? "Snima..." : "Glasovni unos"}
              </button>
              <button
                className="ml-auto px-5 py-2 rounded-xl font-bold text-white transition-all active:scale-95"
                style={{ backgroundColor: PRIMARY }}
                onClick={() => {
                  const k = noteModal.key;
                  const val = spremljeno[k];
                  if (val && val !== "-1.000") {
                    handleSpremljenoBlur(
                      k,
                      noteModal.sifra_tabele,
                      napomenaOp[k],
                    );
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

      {/* ─── Modal: glasovna pretraga ────────────────────────────────────────── */}
      {searchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col items-center gap-5 px-8 py-7">
            <div className="flex items-center justify-between w-full">
              <p className="text-sm font-bold uppercase tracking-wide" style={{ color: PRIMARY }}>
                Pretraga proizvoda
              </p>
              <button
                onClick={() => setSearchModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100"
                style={{ color: PRIMARY }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Prikaz prepoznatog teksta */}
            <div
              className="w-full min-h-12 flex items-center justify-center rounded-xl px-4 py-3 text-center"
              style={{ backgroundColor: `${PRIMARY}10`, border: `2px solid ${PRIMARY}22` }}
            >
              {searchQuery ? (
                <span className="text-base font-semibold" style={{ color: PRIMARY }}>{searchQuery}</span>
              ) : (
                <span className="text-sm text-gray-400 italic">Govorite naziv proizvoda...</span>
              )}
            </div>

            {/* Mic dugme */}
            <button
              onClick={startSearchVoice}
              className="w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg"
              style={{
                backgroundColor: searchListening ? "#fee2e2" : `${PRIMARY}18`,
                border: `3px solid ${searchListening ? "#dc2626" : PRIMARY}`,
              }}
            >
              <Mic
                className={`w-9 h-9 ${searchListening ? "animate-pulse" : ""}`}
                style={{ color: searchListening ? "#dc2626" : PRIMARY }}
              />
            </button>
            <p className="text-sm font-medium -mt-2" style={{ color: searchListening ? "#dc2626" : "rgb(156 163 175)" }}>
              {searchListening ? "Slušam..." : "Tapnite da pretražite"}
            </p>

            {/* Akcije */}
            <div className="flex gap-3 w-full">
              {searchQuery && (
                <button
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all"
                  style={{ color: PRIMARY, borderColor: PRIMARY }}
                  onClick={() => { setSearchQuery(""); }}
                >
                  Obriši
                </button>
              )}
              <button
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                style={{ backgroundColor: PRIMARY }}
                onClick={() => setSearchModalOpen(false)}
              >
                Primijeni
              </button>
            </div>
          </div>
        </div>
      )}


      {numKbState && (
        <NumericKeyboard
          value={spremljeno[numKbState.key] ?? ""}
          label={numKbState.label}
          onChange={(val) => {
            if (val === "-1.000") {
              setSpremljeno(p => ({ ...p, [numKbState.key]: "-1.000" }));
            } else {
              handleSpremljenoChange(numKbState.key, val);
            }
          }}
          onConfirm={(val) => {
            const { key, sifraTabele } = numKbState;
            setNumKbState(null);
            kbClosedAtRef.current = Date.now();
            if (val !== "-1.000") {
              handleSpremljenoBlur(key, sifraTabele, napomenaOp[key], val);
            }
          }}
          onClose={() => {
            setNumKbState(null);
            kbClosedAtRef.current = Date.now();
          }}
        />
      )}

      {kalkulatorOpen && <KalkulatorModal onClose={() => setKalkulatorOpen(false)} />}

      {/* ─── Modal: potvrda izmjene ──────────────────────────────────────────── */}
      {confirmKey !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center gap-5 w-72">
            <p
              className="text-base font-bold text-center"
              style={{ color: PRIMARY }}
            >
              DA LI ŽELITE DA MIJENJATE?
            </p>
            <div className="flex gap-3 w-full">
              <button
                className="flex-1 py-3 rounded-xl font-bold text-white transition-all active:scale-95"
                style={{ backgroundColor: SECONDARY }}
                onClick={() => {
                  const k = confirmKey!;
                  setConfirmKey(null);
                  if (isAndroid) {
                    openNumKbForKey(k);
                  } else {
                    setTimeout(() => inputRefs.current.get(k)?.focus(), 50);
                  }
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
