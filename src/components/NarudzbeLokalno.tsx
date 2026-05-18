import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Bell,
  Loader,
  Mic,
  MessageSquare,
  X,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Play,
} from "lucide-react";
import { theme } from "../theme";

import { Capacitor } from "@capacitor/core";
import { apiFetch } from "../utils/apiFetch";
import {
  LOCAL_ORDER_NEW_EVENT,
  playLocalOrderTone,
  type LocalOrderNewEventDetail,
} from "../utils/localOrderMonitoring";

const PRIMARY = theme.primary;
const SECONDARY = theme.secondary;
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3005";
const isAndroid = Capacitor.getPlatform() === "android";

// ===== INTERFEJSI =====

// Standardizovani format za prikaz
interface LokalniProizvod {
  item_id: number; // trade_order_items.id — order_item_id pri snimanju
  order_id: number;
  product_id: number;
  product_name: string;
  product_uom: string;
  product_group: string | null;
  quantity: number; // originalno naručena količina
  preparation_id?: number; // trade_orders_preparation.id
  prepared_quantity?: number;
  remaining_quantity?: number;
  order_status?: string; // 'pending' | 'partial' | 'ready' | 'unavailable'
  preparation_notes?: string;
}

interface LokalnaNarudzba {
  order_id: number; // id iz sp_get_active_orders
  order_number: string;
  partner_id: number;
  partner_name: string;
  branch_id: number | null;
  branch_name: string | null;
  requested_delivery_date: string;
  confirmed_delivery_date: string | null;
  notes: string | null;
  priority: number;
  status_id: number;
  partner_order_number: string | null;
  partner_order_date: string | null;
  items: LokalniProizvod[];
}

// Raw tipovi — direktno iz SP-a (tačna polja)
interface RawOrder {
  id: number;
  order_number: string;
  partner_id: number;
  partner_name: string;
  branch_id: number | null;
  branch_name: string | null;
  order_type: string;
  radnik_id: number;
  vrsta_placanja: number;
  created_by: number;
  order_date: string;
  requested_delivery_date: string;
  confirmed_delivery_date: string | null;
  status_id: number;
  priority: number;
  notes: string | null;
  partner_order_number: string | null;
  partner_order_date: string | null;
  created_at: string;
  updated_at: string;
  items?: RawItem[];
}

interface RawPreparation {
  id: number;
  order_item_id: number;
  ordered_quantity: number;
  prepared_quantity: number;
  remaining_quantity: number;
  order_status: string;
  preparation_notes: string | null;
}

interface RawItem {
  id: number; // order_item_id — primarni ključ u trade_order_items
  order_id: number;
  line_number: number;
  product_id: number;
  product_name: string;
  product_uom: string;
  product_group: string | null;
  quantity: number;
  vpc: number;
  mpc: number;
  created_at: string;
  updated_at: string;
  preparation: RawPreparation | null;
}

// ===== HELPERS =====

const formatKolicina = (val: number): string =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(val);

const formatDate = (dateString: string): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${d}.${m}.${date.getFullYear()}`;
};

// Mapira raw podatke iz SP-a u standardizovani format
const mapOrder = (
  raw: RawOrder,
): Omit<LokalnaNarudzba, "items"> & { items: RawItem[] } => ({
  order_id: raw.id,
  order_number: raw.order_number,
  partner_id: raw.partner_id,
  partner_name: raw.partner_name,
  branch_id: raw.branch_id ?? null,
  branch_name: raw.branch_name ?? null,
  requested_delivery_date: raw.requested_delivery_date,
  confirmed_delivery_date: raw.confirmed_delivery_date ?? null,
  notes: raw.notes ?? null,
  priority: raw.priority ?? 1,
  status_id: raw.status_id ?? 1,
  partner_order_number: raw.partner_order_number ?? null,
  partner_order_date: raw.partner_order_date ?? null,
  items: raw.items ?? [],
});

const mapItem = (raw: RawItem, orderId: number): LokalniProizvod => ({
  item_id: raw.id,
  order_id: orderId,
  product_id: raw.product_id,
  product_name: raw.product_name,
  product_uom: raw.product_uom,
  product_group: raw.product_group ?? null,
  quantity: raw.quantity,
  preparation_id: raw.preparation?.id,
  prepared_quantity: raw.preparation?.prepared_quantity,
  remaining_quantity: raw.preparation?.remaining_quantity,
  order_status: raw.preparation?.order_status,
  preparation_notes: raw.preparation?.preparation_notes ?? undefined,
});

// ===== SPEECH RECOGNITION =====

interface ISpeechRec {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  onresult:
    | ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void)
    | null;
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

// ===== PRIORITY =====

const priorityConfig: Record<
  number,
  { label: string; bg: string; color: string; border: string }
> = {
  1: {
    label: "Normalno",
    bg: "rgb(243 244 246)",
    color: "rgb(107 114 128)",
    border: "rgb(209 213 219)",
  },
  2: {
    label: "Dogovoreno",
    bg: "rgb(219 234 254)",
    color: "rgb(37 99 235)",
    border: "rgb(147 197 253)",
  },
  3: {
    label: "Hitno",
    bg: "rgb(254 226 226)",
    color: "rgb(220 38 38)",
    border: "rgb(252 165 165)",
  },
};

// ===== PROPS =====

interface Props {
  onBack: () => void;
}

// ===== KOMPONENTA =====

export function NarudzbeLokalno({ onBack }: Props) {
  const [narudzbe, setNarudzbe] = useState<LokalnaNarudzba[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"po-partneru" | "po-proizvodu">(
    "po-partneru",
  );

  // ─── Pokretanje / zaključivanje pripreme ─────────────────────────────────
  const [pokrenuStatus, setPokrenuStatus] = useState<
    Record<number, "idle" | "saving" | "ok" | "error">
  >({});
  const [pokrenuMsg, setPokrenuMsg] = useState<Record<number, string>>({});
  const [zakljuciStatus, setZakljuciStatus] = useState<
    Record<number, "idle" | "saving" | "ok">
  >({});

  const handleZakljuciPripremu = async (nar: LokalnaNarudzba) => {
    setZakljuciStatus((p) => ({ ...p, [nar.order_id]: "saving" }));

    for (const item of nar.items) {
      if (!item.preparation_id) continue;
      // Preskači samo "ready" — "unavailable" se može ponovo ažurirati ako korisnik unese novu vrijednost
      if (item.order_status === "ready") continue;

      const key = rowKey(item.item_id);
      const val = spremljeno[key];

      // Preskači stavke bez unesene vrijednosti — procedura ne prihvata 0 ni prazno
      if (!val || val === "-1.000") continue;
      const parsed = parseFloat(val.replace(",", "."));
      if (isNaN(parsed) || parsed <= 0) continue;
      const quantityToSend = parsed;

      const res = await apiFetch(`${API_URL}/api/narudzbe-lokalno/azuriraj`, {
        method: "POST",
        body: JSON.stringify({
          preparation_id: item.preparation_id,
          prepared_quantity: quantityToSend,
          notes: napomenaOp[key] || null,
        }),
      }).catch(() => null);

      const resData = res ? await res.json().catch(() => null) : null;
      if (resData?.success) {
        setSpremljeno((p) => ({ ...p, [key]: "-1.000" }));
      }
    }

    setZakljuciStatus((p) => ({ ...p, [nar.order_id]: "ok" }));
    await fetchNarudzbe(true);
    setTimeout(
      () => setZakljuciStatus((p) => ({ ...p, [nar.order_id]: "idle" })),
      2000,
    );
  };

  const handleZakljuciStavku = async (item: LokalniProizvod) => {
    if (!item.preparation_id || item.order_status === "ready") return;
    const key = rowKey(item.item_id);
    const val = spremljeno[key];
    if (!val || val === "-1.000") return;
    const parsed = parseFloat(val.replace(",", "."));
    if (isNaN(parsed) || parsed <= 0) return;
    setZakljuciStatus((p) => ({ ...p, [item.order_id]: "saving" }));
    const res = await apiFetch(`${API_URL}/api/narudzbe-lokalno/azuriraj`, {
      method: "POST",
      body: JSON.stringify({
        preparation_id: item.preparation_id,
        prepared_quantity: parsed,
        notes: napomenaOp[key] || null,
      }),
    }).catch(() => null);
    const resData = res ? await res.json().catch(() => null) : null;
    if (resData?.success) setSpremljeno((p) => ({ ...p, [key]: "-1.000" }));
    setZakljuciStatus((p) => ({ ...p, [item.order_id]: "ok" }));
    await fetchNarudzbe(true);
    setTimeout(() => setZakljuciStatus((p) => ({ ...p, [item.order_id]: "idle" })), 2000);
  };

  const handlePokreniPripremu = async (orderId: number) => {
    setPokrenuStatus((p) => ({ ...p, [orderId]: "saving" }));
    try {
      const res = await apiFetch(
        `${API_URL}/api/narudzbe-lokalno/pokreni-pripremu`,
        {
          method: "POST",
          body: JSON.stringify({ order_id: orderId }),
        },
      );
      const data = await res.json();
      setPokrenuStatus((p) => ({
        ...p,
        [orderId]: data.success ? "ok" : "error",
      }));
      setPokrenuMsg((p) => ({ ...p, [orderId]: data.message ?? "" }));
      if (data.success) {
        await fetchNarudzbe(true);
        setTimeout(
          () => setPokrenuStatus((p) => ({ ...p, [orderId]: "idle" })),
          1000,
        );
      }
    } catch {
      setPokrenuStatus((p) => ({ ...p, [orderId]: "error" }));
      setPokrenuMsg((p) => ({ ...p, [orderId]: "Greška pri povezivanju" }));
    }
  };

  // ─── Spremljene količine ──────────────────────────────────────────────────
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
    item: LokalniProizvod;
  } | null>(null);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const [monitorBanner, setMonitorBanner] = useState<{
    text: string;
    ts: number;
  } | null>(null);
  const [newOrderIds, setNewOrderIds] = useState<Record<number, boolean>>({});
  const knownOrderIdsRef = useRef<Set<number>>(new Set());
  const inputRefs = useRef<Map<string, HTMLInputElement | null>>(new Map());

  // item_id je primarni ključ trade_order_items — uvijek jedinstven
  const rowKey = (itemId: number) => `lok::${itemId}`;

  const handleSpremljenoChange = (key: string, raw: string) => {
    const clean = raw.replace(",", ".").replace(/[^0-9.]/g, "");
    setSpremljeno((p) => ({ ...p, [key]: clean }));
  };

  const startVoice = (key: string) => {
    const SRCtor = getSpeechRecognition();
    if (!SRCtor) {
      alert("Preglednik ne podržava glasovni unos.");
      return;
    }
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
    if (!SRCtor) {
      alert("Preglednik ne podržava glasovni unos.");
      return;
    }
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

  // Blur samo validira lokalno — snimanje u bazu ide isključivo kroz "Ažuriraj pripremu"
  const handleSpremljenoBlur = (key: string) => {
    const val = spremljeno[key];
    if (!val || val === "") {
      setSpremljeno((p) => ({ ...p, [key]: "-1.000" }));
      return;
    }
    if (val === "-1.000") return;
    const kolicina = parseFloat(val.replace(",", "."));
    if (isNaN(kolicina) || kolicina < 0) {
      setSpremljeno((p) => ({ ...p, [key]: "-1.000" }));
    }
  };

  // ─── Dohvat narudžbi ─────────────────────────────────────────────────────
  // silent=true: bez loading spinnera, čuva unesene vrijednosti u poljima
  const fetchNarudzbe = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await apiFetch(`${API_URL}/api/narudzbe-lokalno`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const result = await res.json();

      if (result.success && result.data) {
        const mapped: LokalnaNarudzba[] = (result.data as RawOrder[]).map(
          (raw) => {
            const ord = mapOrder(raw);
            const items = (ord.items as RawItem[]).map((item) =>
              mapItem(item, ord.order_id),
            );
            return { ...ord, items };
          },
        );

        const currentIds = new Set(mapped.map((o) => o.order_id));
        if (!knownOrderIdsRef.current.size) {
          knownOrderIdsRef.current = currentIds;
        } else if (silent) {
          const newlyArrived = mapped.filter(
            (o) => !knownOrderIdsRef.current.has(o.order_id),
          );
          knownOrderIdsRef.current = currentIds;

          if (newlyArrived.length > 0) {
            const topLabel =
              newlyArrived[0].order_number || `#${newlyArrived[0].order_id}`;
            const maxPriority = newlyArrived.reduce(
              (max, order) => (order.priority > max ? order.priority : max),
              1,
            );
            setMonitorBanner({
              text:
                newlyArrived.length === 1
                  ? `Stigla nova narudžba: ${topLabel}`
                  : `Stiglo ${newlyArrived.length} novih narudžbi`,
              ts: Date.now(),
            });
            setNewOrderIds((prev) => {
              const updated = { ...prev };
              newlyArrived.forEach((order) => {
                updated[order.order_id] = true;
              });
              return updated;
            });
            playLocalOrderTone(maxPriority);
          }
        } else {
          knownOrderIdsRef.current = currentIds;
        }

        setNarudzbe(mapped);

        if (!silent) {
          // Inicijalno učitavanje — resetuj sva polja
          const initialSpremljeno: Record<string, string> = {};
          const initialStatus: Record<string, "saving" | "ok" | "error"> = {};
          mapped.forEach((nar) => {
            nar.items.forEach((item) => {
              const k = rowKey(item.item_id);
              initialSpremljeno[k] = "-1.000";
              if (
                item.order_status === "ready" ||
                item.order_status === "unavailable"
              ) {
                initialStatus[k] = "ok";
              }
            });
          });
          setSpremljeno(initialSpremljeno);
          setSaveStatus(initialStatus);
        } else {
          // Tihi refresh — osvježi saveStatus iz baze, ali sačuvaj unesene vrijednosti
          setSaveStatus((prev) => {
            const updated = { ...prev };
            mapped.forEach((nar) => {
              nar.items.forEach((item) => {
                const k = rowKey(item.item_id);
                if (
                  item.order_status === "ready" ||
                  item.order_status === "unavailable"
                ) {
                  updated[k] = "ok";
                } else {
                  delete updated[k];
                }
              });
            });
            return updated;
          });
          // Obriši polja samo za "ready" stavke — "unavailable" čuvamo jer korisnik može upisivati novu vrijednost
          setSpremljeno((prev) => {
            const updated = { ...prev };
            mapped.forEach((nar) => {
              nar.items.forEach((item) => {
                const k = rowKey(item.item_id);
                if (item.order_status === "ready") {
                  updated[k] = "-1.000";
                }
              });
            });
            return updated;
          });
        }
      }
    } catch (error) {
      console.error("Greška pri učitavanju lokalnih narudžbi:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchNarudzbe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void fetchNarudzbe(true);
    }, 12000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onGlobalNewOrder = (event: Event) => {
      const detail = (event as CustomEvent<LocalOrderNewEventDetail>).detail;
      if (!detail?.count) return;

      setMonitorBanner({
        text:
          detail.count === 1
            ? `Monitoring: nova narudžba ${detail.orderNumbers[0]}`
            : `Monitoring: stiglo ${detail.count} novih narudžbi`,
        ts: Date.now(),
      });

      playLocalOrderTone(detail.maxPriority);
    };

    window.addEventListener(LOCAL_ORDER_NEW_EVENT, onGlobalNewOrder);
    return () =>
      window.removeEventListener(LOCAL_ORDER_NEW_EVENT, onGlobalNewOrder);
  }, []);

  useEffect(() => {
    if (!monitorBanner) return;
    const timer = window.setTimeout(() => setMonitorBanner(null), 5000);
    return () => window.clearTimeout(timer);
  }, [monitorBanner]);

  useEffect(() => {
    if (!Object.keys(newOrderIds).length) return;
    const timer = window.setTimeout(() => setNewOrderIds({}), 20000);
    return () => window.clearTimeout(timer);
  }, [newOrderIds]);

  // ─── Brojači ──────────────────────────────────────────────────────────────
  const totalProizvoda = narudzbe.reduce((s, n) => s + n.items.length, 0);
  const spremljenoCount = narudzbe.reduce(
    (s, nar) =>
      s +
      nar.items.filter((item) => saveStatus[rowKey(item.item_id)] === "ok")
        .length,
    0,
  );

  // ─── PO PROIZVODU — grupisanje ────────────────────────────────────────────
  const proizvodiPoNazivu = (() => {
    const map = new Map<
      number, // product_id
      {
        product_id: number;
        product_name: string;
        product_uom: string;
        product_group: string | null;
        stavke: {
          partner_id: number;
          partner_name: string;
          branch_name: string | null;
          datum_dostave: string;
          partner_order_number: string | null;
          partner_order_date: string | null;
          order_id: number;
          order_status_id: number;
          item: LokalniProizvod;
          key: string;
        }[];
      }
    >();
    narudzbe.forEach((nar) => {
      nar.items.forEach((item) => {
        const k = rowKey(item.item_id);
        const existing = map.get(item.product_id);
        const stavka = {
          partner_id: nar.partner_id,
          partner_name: nar.partner_name,
          branch_name: nar.branch_name,
          datum_dostave: nar.requested_delivery_date,
          partner_order_number: nar.partner_order_number,
          partner_order_date: nar.partner_order_date,
          order_id: nar.order_id,
          order_status_id: nar.status_id,
          item,
          key: k,
        };
        if (existing) {
          existing.stavke.push(stavka);
        } else {
          map.set(item.product_id, {
            product_id: item.product_id,
            product_name: item.product_name,
            product_uom: item.product_uom,
            product_group: item.product_group,
            stavke: [stavka],
          });
        }
      });
    });
    return Array.from(map.values()).sort((a, b) =>
      a.product_name.localeCompare(b.product_name, "bs"),
    );
  })();

  // ─── Input helper ─────────────────────────────────────────────────────────
  const renderInput = (key: string, item: LokalniProizvod, title: string) => {
    const isListening = voiceKey === key;
    const hasPrepData = item.preparation_id !== undefined;
    const isReady = item.order_status === "ready";

    if (!hasPrepData) {
      return (
        <div className="text-xs text-gray-400 italic text-right py-2">
          Pokreni pripremu
        </div>
      );
    }

    return (
      <div className="flex flex-col items-end gap-1">
        {/* Info o dosad pripremljenoj količini */}
        {hasPrepData && (item.prepared_quantity ?? 0) > 0 && (
          <div className="flex items-center gap-2 text-xs mb-0.5">
            <span className="text-gray-400">Dosad:</span>
            <span
              className="font-semibold"
              style={{ color: isReady ? SECONDARY : "rgb(146 64 14)" }}
            >
              {formatKolicina(item.prepared_quantity ?? 0)}
            </span>
            {!isReady && item.remaining_quantity !== undefined && (
              <>
                <span className="text-gray-300">|</span>
                <span className="text-gray-400">Ostalo:</span>
                <span className="font-semibold text-amber-700">
                  {formatKolicina(item.remaining_quantity)}
                </span>
              </>
            )}
          </div>
        )}
        <div className="flex items-center gap-1">
          <input
            ref={(el) => inputRefs.current.set(key, el)}
            type="text"
            inputMode="decimal"
            pattern="[0-9.]*"
            value={spremljeno[key] ?? ""}
            onChange={(e) => handleSpremljenoChange(key, e.target.value)}
            placeholder="-1.000"
            className="w-24 text-right text-sm font-bold border-2 rounded-lg px-2 py-2 focus:outline-none transition"
            style={{
              borderColor:
                saveStatus[key] === "error"
                  ? "rgb(239 68 68)"
                  : saveStatus[key] === "ok"
                    ? PRIMARY
                    : "rgb(209 213 219)",
              color:
                spremljeno[key] === "-1.000" ? "rgb(156 163 175)" : PRIMARY,
              backgroundColor:
                saveStatus[key] === "error"
                  ? "rgb(254 242 242)"
                  : saveStatus[key] === "ok"
                    ? `${PRIMARY}10`
                    : "",
            }}
            onMouseDown={(e) => {
              if (spremljeno[key] && spremljeno[key] !== "-1.000") {
                e.preventDefault();
                setConfirmKey(key);
              }
            }}
            onFocus={(e) => {
              e.target.style.backgroundColor = "white";
              if (spremljeno[key] === "-1.000") {
                setSpremljeno((p) => ({ ...p, [key]: "" }));
              } else {
                e.target.select();
              }
            }}
            onBlur={(e) => {
              e.target.style.backgroundColor = "";
              handleSpremljenoBlur(key);
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
          {saveStatus[key] === "saving" && (
            <Loader className="w-3 h-3 animate-spin text-gray-400" />
          )}
          {saveStatus[key] === "ok" && (
            <CheckCircle2 className="w-3 h-3" style={{ color: SECONDARY }} />
          )}
          {saveStatus[key] === "error" && (
            <XCircle className="w-3 h-3 text-red-500" />
          )}
        </div>
        <button
          type="button"
          onClick={() => setNoteModal({ key, item, title })}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all self-end"
          style={{
            backgroundColor: napomenaOp[key]
              ? `${SECONDARY}22`
              : `${PRIMARY}10`,
            color: napomenaOp[key] ? SECONDARY : PRIMARY,
          }}
        >
          <MessageSquare className="w-3 h-3" />
          {napomenaOp[key] ? "napomena ✓" : "napomena"}
        </button>
      </div>
    );
  };

  // ===== RENDER =====
  return (
    <div
      className="flex flex-col"
      style={{ height: "100dvh", background: "#f1f5f9" }}
    >
      <div className="flex-1 flex flex-col overflow-hidden m-0 md:m-3">
        <div className="bg-white rounded-none md:rounded-2xl shadow-xl overflow-hidden flex flex-col h-full">
          {/* ─── HEADER ─────────────────────────────────────────────────────── */}
          <div className="border-b-2 border-gray-200 bg-white flex-none">
            <div className="flex items-center justify-between gap-3 px-6 md:px-8 py-2 md:py-4 flex-wrap">
              {/* Lijevo: Back + naslov */}
              <div className="flex items-center gap-3">
                <button
                  onClick={onBack}
                  className="flex items-center justify-center w-8 h-8 rounded-lg border-2 transition-all active:scale-95"
                  style={{ color: PRIMARY, borderColor: PRIMARY }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = `${PRIMARY}10`)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span
                  className="text-base md:text-lg font-bold"
                  style={{ color: PRIMARY }}
                >
                  Narudžbe Banja Luka
                </span>
                <button
                  onClick={() => {
                    void fetchNarudzbe();
                  }}
                  className="p-1.5 rounded-lg transition-all"
                  style={{ color: PRIMARY }}
                  title="Osvježi"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                  />
                </button>
              </div>

              {/* Centar: toggle */}
              <div
                className="flex rounded-lg overflow-hidden border-2"
                style={{ borderColor: PRIMARY }}
              >
                <button
                  className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-all"
                  style={{
                    backgroundColor:
                      viewMode === "po-partneru" ? PRIMARY : "transparent",
                    color: viewMode === "po-partneru" ? "white" : PRIMARY,
                  }}
                  onClick={() => setViewMode("po-partneru")}
                >
                  Po partneru
                </button>
                <button
                  className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-all border-l-2"
                  style={{
                    backgroundColor:
                      viewMode === "po-proizvodu" ? PRIMARY : "transparent",
                    color: viewMode === "po-proizvodu" ? "white" : PRIMARY,
                    borderColor: PRIMARY,
                  }}
                  onClick={() => setViewMode("po-proizvodu")}
                >
                  Po proizvodu
                </button>
              </div>

              {/* Desno: brojač */}
              {totalProizvoda > 0 && (
                <div
                  className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm"
                  style={{
                    background:
                      spremljenoCount === totalProizvoda
                        ? `${SECONDARY}22`
                        : `${PRIMARY}10`,
                    color:
                      spremljenoCount === totalProizvoda ? SECONDARY : PRIMARY,
                    border: `2px solid ${
                      spremljenoCount === totalProizvoda
                        ? SECONDARY
                        : `${PRIMARY}30`
                    }`,
                  }}
                >
                  Spremljeno: {spremljenoCount}/{totalProizvoda}
                </div>
              )}
            </div>
            {monitorBanner && (
              <div className="px-6 md:px-8 pb-3">
                <div
                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold animate-[fadeIn_200ms_ease-out]"
                  style={{
                    backgroundColor: "#eff6ff",
                    borderColor: "#93c5fd",
                    color: "#1d4ed8",
                  }}
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>{monitorBanner.text}</span>
                </div>
              </div>
            )}
          </div>

          {/* ─── SADRŽAJ ─────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-hidden">
            <div className="flex flex-col overflow-hidden h-full">
              <div className="flex-1 overflow-y-auto">
                <div className="p-6">
                  {/* Loading */}
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader
                        className="w-8 h-8 animate-spin"
                        style={{ color: PRIMARY }}
                      />
                      <span className="ml-3 text-gray-600">
                        Učitavanje narudžbi...
                      </span>
                    </div>
                  ) : narudzbe.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500 text-lg">
                        Nema aktivnih lokalnih narudžbi
                      </p>
                    </div>
                  ) : viewMode === "po-partneru" ? (
                    /* ══════════ PO PARTNERU ══════════ */
                    <div className="space-y-6">
                      {[...narudzbe]
                        .sort(
                          (a, b) =>
                            (b.priority === 3 ? 1 : 0) -
                            (a.priority === 3 ? 1 : 0),
                        )
                        .map((nar) => {
                          const allFilled =
                            nar.items.length > 0 &&
                            nar.items.every(
                              (item) =>
                                saveStatus[rowKey(item.item_id)] === "ok",
                            );
                          const prio =
                            priorityConfig[nar.priority] ?? priorityConfig[1];
                          const isHitno = nar.priority === 3;
                          const isUPripremi = nar.status_id === 2;
                          const renderDugme = () => {
                            const ps = pokrenuStatus[nar.order_id] ?? "idle";
                            const msg = pokrenuMsg[nar.order_id];
                            if (ps === "saving") return (
                              <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white shadow text-sm text-gray-500 flex-none">
                                <Loader className="w-4 h-4 animate-spin" />
                                <span>Kreiranje...</span>
                              </div>
                            );
                            if (ps === "ok") return (
                              <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg shadow text-sm font-semibold flex-none" style={{ background: `${SECONDARY}22`, color: SECONDARY }}>
                                <CheckCircle2 className="w-4 h-4" />
                                <span>{msg || "Priprema kreirana"}</span>
                              </div>
                            );
                            if (ps === "error") return (
                              <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg shadow text-sm font-semibold text-red-600 bg-red-50 flex-none">
                                <XCircle className="w-4 h-4" />
                                <span>{msg || "Greška"}</span>
                              </div>
                            );
                            if (isUPripremi) {
                              const zs = zakljuciStatus[nar.order_id] ?? "idle";
                              if (zs === "saving") return (
                                <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white shadow text-sm text-amber-700 flex-none">
                                  <Loader className="w-4 h-4 animate-spin" />
                                  <span>Ažuriranje...</span>
                                </div>
                              );
                              if (zs === "ok") return (
                                <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg shadow text-sm font-semibold flex-none" style={{ background: `${SECONDARY}22`, color: SECONDARY }}>
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>Ažurirano</span>
                                </div>
                              );
                              return (
                                <button type="button" onClick={(e) => { e.stopPropagation(); void handleZakljuciPripremu(nar); }}
                                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg shadow text-sm font-bold transition-all active:scale-95 flex-none"
                                  style={{ backgroundColor: "rgb(254 243 199)", color: "rgb(146 64 14)", border: "1px solid rgb(251 191 36)" }}>
                                  <RefreshCw className="w-4 h-4" />
                                  Ažuriraj
                                </button>
                              );
                            }
                            return (
                              <button type="button" onClick={(e) => { e.stopPropagation(); void handlePokreniPripremu(nar.order_id); }}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-lg shadow text-sm font-bold text-white transition-all active:scale-95 flex-none"
                                style={{ backgroundColor: PRIMARY }}>
                                <Play className="w-4 h-4" />
                                Pokreni
                              </button>
                            );
                          };
                          return (
                            <div
                              key={nar.order_id}
                              className="bg-white rounded-xl shadow-lg overflow-hidden transition-all"
                              style={{
                                border: isHitno
                                  ? "2px solid rgb(239 68 68)"
                                  : newOrderIds[nar.order_id]
                                    ? "2px solid rgb(37 99 235)"
                                    : isUPripremi
                                      ? "2px solid rgb(251 191 36)"
                                      : "2px solid rgb(229 231 235)",
                                boxShadow: allFilled
                                  ? `0 0 0 3px ${SECONDARY}`
                                  : isHitno
                                    ? "0 0 0 3px rgb(254 202 202)"
                                    : newOrderIds[nar.order_id]
                                      ? "0 0 0 3px rgb(191 219 254)"
                                      : isUPripremi
                                        ? "0 0 0 3px rgb(254 243 199)"
                                        : undefined,
                              }}
                            >
                              {/* Traka "U pripremi" za status_id=2 */}
                              {isUPripremi && (
                                <div
                                  className="flex items-center gap-2 px-6 py-1.5 text-xs font-bold uppercase tracking-wide"
                                  style={{
                                    background: "rgb(254 243 199)",
                                    color: "rgb(146 64 14)",
                                  }}
                                >
                                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                  Narudžba u pripremi — djelimično pripremljeno
                                </div>
                              )}
                              {/* Zaglavlje narudžbe */}
                              <div
                                className="px-6 py-4 border-b-2 border-gray-200"
                                style={{
                                  background: isHitno
                                    ? "linear-gradient(to right, rgb(254 226 226), rgb(255 241 242))"
                                    : isUPripremi
                                      ? "linear-gradient(to right, rgb(255 251 235), rgb(254 252 232))"
                                      : `linear-gradient(to right, ${PRIMARY}18, ${SECONDARY}18)`,
                                }}
                              >
                                {isAndroid ? (
                                  <div className="flex flex-col gap-2">
                                    <h3 className="text-2xl font-bold truncate" style={{ color: PRIMARY }}>
                                      {nar.partner_name}
                                      {nar.branch_name && (
                                        <span className="text-sm font-medium text-gray-500 ml-2">{nar.branch_name}</span>
                                      )}
                                    </h3>
                                    {nar.notes && nar.notes.trim() && (
                                      <p className="text-xs text-gray-600 italic">{nar.notes.trim()}</p>
                                    )}
                                    <div className="flex items-center gap-3">
                                      <span className="flex-none text-xs font-bold px-3 py-1.5 rounded-lg border"
                                        style={{ background: prio.bg, color: prio.color, borderColor: prio.border }}>
                                        {prio.label}
                                      </span>
                                      {nar.requested_delivery_date && (
                                        <span className="flex-1 text-center text-lg font-bold" style={{ color: isHitno ? "rgb(185 28 28)" : PRIMARY }}>
                                          {formatDate(nar.requested_delivery_date)}
                                        </span>
                                      )}
                                      {renderDugme()}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-3">
                                      <h3 className="flex-1 text-2xl font-bold truncate" style={{ color: PRIMARY }}>
                                        {nar.partner_name}
                                        {nar.branch_name && (
                                          <span className="text-sm font-medium text-gray-500 ml-2">{nar.branch_name}</span>
                                        )}
                                      </h3>
                                      {renderDugme()}
                                    </div>
                                    {nar.requested_delivery_date && (
                                      <div className="text-center">
                                        <span className="text-lg font-bold" style={{ color: isHitno ? "rgb(185 28 28)" : PRIMARY }}>
                                          {formatDate(nar.requested_delivery_date)}
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-3">
                                      <div className="flex-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                                        <span className="text-gray-400">
                                          Br. narudžbe: <span className="font-semibold text-gray-700">{nar.order_number}</span>
                                        </span>
                                        {nar.partner_order_number && (
                                          <span className="text-gray-400">
                                            Nar. partnera: <span className="font-semibold text-gray-700">{nar.partner_order_number}</span>
                                            {nar.partner_order_date && (
                                              <span className="ml-1">· {formatDate(nar.partner_order_date)}</span>
                                            )}
                                          </span>
                                        )}
                                      </div>
                                      <span className="flex-none text-xs font-bold px-3 py-1.5 rounded-lg border"
                                        style={{ background: prio.bg, color: prio.color, borderColor: prio.border }}>
                                        {prio.label}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <div className="flex-1 text-xs italic text-gray-400">
                                        {nar.notes && nar.notes.trim() ? nar.notes.trim() : ""}
                                      </div>
                                      <div className="flex-none bg-white px-4 py-1.5 rounded-lg shadow">
                                        <span className="text-sm text-gray-600">Stavki:</span>
                                        <span className="ml-2 text-lg font-bold" style={{ color: SECONDARY }}>{nar.items.length}</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Tabela sa proizvodima */}
                              <div className="relative">
                                {/* Spinner overlay — prikazuje se samo dok se ažurira, tabela ostaje vidljiva */}
                                {zakljuciStatus[nar.order_id] === "saving" && (
                                  <div
                                    className="absolute inset-0 z-10 flex items-center justify-center"
                                    style={{
                                      backgroundColor: "rgba(255,251,235,0.75)",
                                    }}
                                  >
                                    <div className="flex flex-col items-center gap-2">
                                      <Loader
                                        className="w-8 h-8 animate-spin"
                                        style={{ color: "rgb(146 64 14)" }}
                                      />
                                      <span
                                        className="text-sm font-semibold"
                                        style={{ color: "rgb(146 64 14)" }}
                                      >
                                        Snimanje u bazu...
                                      </span>
                                    </div>
                                  </div>
                                )}
                                <div className="overflow-x-auto">
                                  <table className="w-full table-fixed divide-y divide-gray-200">
                                    <thead
                                      style={{
                                        backgroundColor: allFilled
                                          ? `${SECONDARY}22`
                                          : undefined,
                                      }}
                                    >
                                      {isAndroid ? (
                                        <tr>
                                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                                            style={{ color: allFilled ? SECONDARY : "rgb(107 114 128)" }}>
                                            NAZIV PROIZVODA
                                          </th>
                                          <th className="px-2 py-3 text-right text-xs font-medium uppercase tracking-wider"
                                            style={{ color: isUPripremi ? "rgb(146 64 14)" : allFilled ? SECONDARY : "rgb(107 114 128)", width: 90 }}>
                                            {isUPripremi ? "PREOS." : "KOL."}
                                          </th>
                                          <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider"
                                            style={{ color: allFilled ? SECONDARY : "rgb(107 114 128)", width: 200 }}>
                                            SPREMLJENO
                                          </th>
                                        </tr>
                                      ) : (
                                        <tr>
                                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                                            style={{ color: allFilled ? SECONDARY : "rgb(107 114 128)" }}>
                                            NAZIV PROIZVODA
                                          </th>
                                          <th className="px-2 py-3 text-right text-xs font-medium uppercase tracking-wider"
                                            style={{ color: allFilled ? SECONDARY : "rgb(107 114 128)", width: 52 }}>
                                            JM
                                          </th>
                                          <th className="px-2 py-3 text-right text-xs font-medium uppercase tracking-wider"
                                            style={{ color: isUPripremi ? "rgb(146 64 14)" : allFilled ? SECONDARY : "rgb(107 114 128)", width: 96 }}>
                                            {isUPripremi ? "PREOSTALO" : "KOLIČINA"}
                                          </th>
                                          <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider"
                                            style={{ color: allFilled ? SECONDARY : "rgb(107 114 128)", width: 220 }}>
                                            SPREMLJENO
                                          </th>
                                        </tr>
                                      )}
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                      {nar.items.length === 0 ? (
                                        <tr>
                                          <td
                                            colSpan={isAndroid ? 3 : 4}
                                            className="px-6 py-8 text-center text-gray-500"
                                          >
                                            Nema stavki
                                          </td>
                                        </tr>
                                      ) : (
                                        nar.items.map((item) => {
                                          const key = rowKey(item.item_id);
                                          return (
                                            <tr
                                              key={key}
                                              className="transition-colors cursor-pointer"
                                              style={
                                                saveStatus[key] === "error"
                                                  ? {
                                                      backgroundColor:
                                                        "rgb(254 242 242)",
                                                    }
                                                  : saveStatus[key] === "ok"
                                                    ? {
                                                        backgroundColor: `${SECONDARY}22`,
                                                      }
                                                    : undefined
                                              }
                                              onClick={() => {
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
                                              <td className="px-4 py-3 text-sm text-gray-900 align-top">
                                                {item.product_name}
                                              </td>
                                              {isAndroid ? (
                                                <td className="pr-3 py-3 whitespace-nowrap text-sm font-semibold align-top text-right">
                                                  {item.remaining_quantity !== undefined ? (
                                                    <div className="flex flex-col items-end gap-0.5">
                                                      <span style={{ color: "rgb(146 64 14)" }}>{formatKolicina(item.remaining_quantity)}</span>
                                                      <span className="text-xs text-gray-400 font-normal">/{formatKolicina(item.quantity)} {item.product_uom}</span>
                                                    </div>
                                                  ) : (
                                                    <div className="flex flex-col items-end gap-0.5">
                                                      <span style={{ color: SECONDARY }}>{formatKolicina(item.quantity)}</span>
                                                      <span className="text-xs text-gray-400 font-normal">{item.product_uom}</span>
                                                    </div>
                                                  )}
                                                </td>
                                              ) : (
                                                <>
                                                  <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900 align-top text-right">
                                                    {item.product_uom}
                                                  </td>
                                                  <td className="px-2 py-4 whitespace-nowrap text-sm font-semibold align-top text-right">
                                                    {item.remaining_quantity !== undefined ? (
                                                      <div className="flex flex-col items-end gap-0.5">
                                                        <span style={{ color: "rgb(146 64 14)" }}>{formatKolicina(item.remaining_quantity)}</span>
                                                        <span className="text-xs text-gray-400 font-normal">/{formatKolicina(item.quantity)}</span>
                                                      </div>
                                                    ) : (
                                                      <span style={{ color: SECONDARY }}>{formatKolicina(item.quantity)}</span>
                                                    )}
                                                  </td>
                                                </>
                                              )}
                                              <td
                                                className="px-4 py-3 align-top"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                {renderInput(key, item, item.product_name)}
                                              </td>
                                            </tr>
                                          );
                                        })
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                              {/* /relative */}
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    /* ══════════ PO PROIZVODU ══════════ */
                    <div className="space-y-6">
                      {proizvodiPoNazivu.map((proizvod) => {
                        const allFilledP = proizvod.stavke.every(
                          (s) => saveStatus[s.key] === "ok",
                        );
                        return (
                          <div
                            key={proizvod.product_id}
                            className="bg-white rounded-xl shadow-lg overflow-hidden transition-all"
                            style={{
                              border: "2px solid rgb(229 231 235)",
                              boxShadow: allFilledP
                                ? `0 0 0 3px ${SECONDARY}`
                                : undefined,
                            }}
                          >
                            {/* Zaglavlje proizvoda */}
                            <div
                              className="px-6 py-4 border-b-2 border-gray-200"
                              style={{
                                background: `linear-gradient(to right, ${PRIMARY}18, ${SECONDARY}18)`,
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <h3 className="text-xl font-bold" style={{ color: PRIMARY }}>
                                  {proizvod.product_name}
                                </h3>
                                <span className="text-xs text-gray-500">
                                  JM: <span className="font-semibold text-gray-700">{proizvod.product_uom}</span>
                                </span>
                              </div>
                            </div>

                            {/* Tabela partnera */}
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
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                                      style={{ color: allFilledP ? SECONDARY : "rgb(107 114 128)" }}>
                                      PARTNER
                                    </th>
                                    <th className="px-2 py-3 text-right text-xs font-medium uppercase tracking-wider"
                                      style={{ color: allFilledP ? SECONDARY : "rgb(107 114 128)", width: 96 }}>
                                      KOLIČINA
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider"
                                      style={{ color: allFilledP ? SECONDARY : "rgb(107 114 128)", width: 220 }}>
                                      SPREMLJENO
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {proizvod.stavke.map((stavka) => {
                                    const isUPripremiS = stavka.order_status_id === 2;
                                    const zsS = zakljuciStatus[stavka.order_id] ?? "idle";
                                    return (
                                    <tr
                                      key={stavka.key}
                                      className="transition-colors cursor-pointer"
                                      style={
                                        saveStatus[stavka.key] === "error"
                                          ? { backgroundColor: "rgb(254 242 242)" }
                                          : saveStatus[stavka.key] === "ok"
                                            ? { backgroundColor: `${SECONDARY}22` }
                                            : isUPripremiS
                                              ? { backgroundColor: "rgb(255 251 235)" }
                                              : undefined
                                      }
                                      onClick={() => {
                                        const hasVal = spremljeno[stavka.key] && spremljeno[stavka.key] !== "-1.000";
                                        if (hasVal) setConfirmKey(stavka.key);
                                        else inputRefs.current.get(stavka.key)?.focus();
                                      }}
                                    >
                                      <td className="px-4 py-3 text-sm text-gray-900 align-top">
                                        <div className="font-semibold">{stavka.partner_name}</div>
                                        {stavka.branch_name && (
                                          <div className="text-xs text-gray-500 mt-0.5">{stavka.branch_name}</div>
                                        )}
                                        {stavka.datum_dostave && (
                                          <div className="text-xs mt-1" style={{ color: PRIMARY }}>
                                            {formatDate(stavka.datum_dostave)}
                                          </div>
                                        )}
                                        {isUPripremiS && (
                                          <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
                                            {zsS === "saving" ? (
                                              <div className="flex items-center gap-1 text-xs text-amber-700">
                                                <Loader className="w-3 h-3 animate-spin" />
                                                <span>Ažuriranje...</span>
                                              </div>
                                            ) : zsS === "ok" ? (
                                              <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: SECONDARY }}>
                                                <CheckCircle2 className="w-3 h-3" />
                                                <span>Ažurirano</span>
                                              </div>
                                            ) : (
                                              <button type="button"
                                                onClick={() => void handleZakljuciStavku(stavka.item)}
                                                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-bold transition-all active:scale-95"
                                                style={{ backgroundColor: "rgb(254 243 199)", color: "rgb(146 64 14)", border: "1px solid rgb(251 191 36)" }}>
                                                <RefreshCw className="w-3 h-3" />
                                                Ažuriraj
                                              </button>
                                            )}
                                          </div>
                                        )}
                                      </td>
                                      <td className="px-2 py-3 whitespace-nowrap text-sm font-semibold align-top text-right">
                                        {stavka.item.remaining_quantity !== undefined ? (
                                          <div className="flex flex-col items-end gap-0.5">
                                            <span style={{ color: "rgb(146 64 14)" }}>{formatKolicina(stavka.item.remaining_quantity)}</span>
                                            <span className="text-xs text-gray-400 font-normal">/{formatKolicina(stavka.item.quantity)}</span>
                                          </div>
                                        ) : (
                                          <span style={{ color: SECONDARY }}>{formatKolicina(stavka.item.quantity)}</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-3 align-top" onClick={(e) => e.stopPropagation()}>
                                        {renderInput(stavka.key, stavka.item, `${stavka.partner_name} — ${proizvod.product_name}`)}
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

      {/* ─── Modal: napomena ────────────────────────────────────────────────── */}
      {noteModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col gap-4 overflow-hidden">
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
