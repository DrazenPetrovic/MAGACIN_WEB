import { useState, useEffect } from "react";
import { ArrowLeft, Loader, Search, X, RefreshCw } from "lucide-react";
import { theme } from "../theme";
import { apiFetch } from "../utils/apiFetch";

const PRIMARY   = theme.primary;
const SECONDARY = theme.secondary;
const API_URL   = import.meta.env.VITE_API_URL || "http://localhost:3005";

// ===== INTERFEJSI =====

interface RawItem {
  id: number;
  order_id: number;
  line_number: number;
  product_id: number;
  product_name: string;
  product_uom: string;
  product_group: string | null;
  quantity: number;
  vpc: number;
  mpc: number;
  referent_number: string | null;
}

interface RawOrder {
  id: number;
  order_number: string;
  order_date: string | null;
  partner_id: number;
  partner_name: string;
  branch_id: number | null;
  branch_name: string | null;
  requested_delivery_date: string | null;
  confirmed_delivery_date: string | null;
  priority: number;
  notes: string | null;
  partner_order_number: string | null;
  partner_order_date: string | null;
  referent_number: string | null;
  items: RawItem[];
}

interface Props {
  onBack: () => void;
}

// ===== HELPERS =====

const formatDate = (s: string | null | undefined): string => {
  if (!s) return "";
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
};

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const priorityConfig: Record<number, { label: string; bg: string; color: string; border: string }> = {
  1: { label: "Normalno",  bg: "rgb(243 244 246)", color: "rgb(107 114 128)", border: "rgb(209 213 219)" },
  2: { label: "Dogovoreno",bg: "rgb(219 234 254)", color: "rgb(37 99 235)",   border: "rgb(147 197 253)" },
  3: { label: "Hitno",     bg: "rgb(254 226 226)", color: "rgb(220 38 38)",   border: "rgb(252 165 165)" },
};

// ===== KOMPONENTA =====

export function ZavrseneNarudzbeLokal({ onBack }: Props) {
  const [orders, setOrders]       = useState<RawOrder[]>([]);
  const [loading, setLoading]     = useState(true);
  const [viewMode, setViewMode]   = useState<"po-partneru" | "po-proizvodu">("po-partneru");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`${API_URL}/api/zavrsene-narudzbe-lokal`);
      const result = await res.json();
      if (result.success) {
        const sorted = (result.data ?? []).sort((a: RawOrder, b: RawOrder) => {
          const da = a.order_date ? new Date(a.order_date).getTime() : 0;
          const db = b.order_date ? new Date(b.order_date).getTime() : 0;
          return db - da;
        });
        setOrders(sorted);
      }
    } catch (err) {
      console.error("Greška pri učitavanju završenih narudžbi BL:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchData(); }, []);

  // ─── Pretraga ─────────────────────────────────────────────────────────────
  const activeSearch = searchTerm.length >= 4 ? norm(searchTerm) : "";

  // ─── Po partneru: svaka narudžba = jedna kartica ──────────────────────────
  const vidljiviPoPartneru = activeSearch
    ? orders.filter((o) => norm(o.partner_name).includes(activeSearch))
    : orders;

  // ─── Po proizvodu: grupisanje po product_id ───────────────────────────────
  const proizvodiMap = new Map<number, {
    product_id: number;
    product_name: string;
    product_uom: string;
    product_group: string | null;
    stavke: {
      order_id: number;
      order_number: string;
      partner_name: string;
      branch_name: string | null;
      quantity: number;
      order_ref: string | null;
      item_ref: string | null;
    }[];
  }>();

  orders.forEach((order) => {
    order.items.forEach((item) => {
      const ex = proizvodiMap.get(item.product_id);
      const stavka = {
        order_id:     order.id,
        order_number: order.order_number,
        partner_name: order.partner_name,
        branch_name:  order.branch_name,
        quantity:     item.quantity,
        order_ref:    order.referent_number,
        item_ref:     item.referent_number,
      };
      if (ex) ex.stavke.push(stavka);
      else proizvodiMap.set(item.product_id, {
        product_id:    item.product_id,
        product_name:  item.product_name,
        product_uom:   item.product_uom,
        product_group: item.product_group,
        stavke: [stavka],
      });
    });
  });

  const sviProizvodi = Array.from(proizvodiMap.values()).sort((a, b) =>
    a.product_name.localeCompare(b.product_name, "bs"),
  );

  const vidljiviPoProizvodu = activeSearch
    ? sviProizvodi.filter((p) => norm(p.product_name).includes(activeSearch))
    : sviProizvodi;

  // ===== RENDER =====
  return (
    <div className="flex flex-col" style={{ height: "100dvh", background: "#f1f5f9" }}>
      <div className="flex-1 flex flex-col overflow-hidden m-0 md:m-3">
        <div className="bg-white rounded-none md:rounded-2xl shadow-xl overflow-hidden flex flex-col h-full">

          {/* ─── HEADER ───────────────────────────────────────────────────── */}
          <div className="border-b-2 border-gray-200 bg-white flex-none">
            <div className="flex items-center justify-between gap-3 px-6 md:px-8 py-2 md:py-4">

              {/* Lijevo */}
              <div className="flex items-center gap-3 flex-none">
                <button
                  onClick={onBack}
                  className="flex items-center justify-center w-8 h-8 rounded-lg border-2 transition-all active:scale-95"
                  style={{ color: PRIMARY, borderColor: PRIMARY }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = `${PRIMARY}10`)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-base md:text-lg font-bold" style={{ color: PRIMARY }}>
                  Završene Banja Luka
                </span>
                <button
                  onClick={() => { void fetchData(); }}
                  className="p-1.5 rounded-lg transition-all"
                  style={{ color: PRIMARY }}
                  title="Osvježi"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>

              {/* Centar — pretraga */}
              <div className="flex-1 flex justify-center px-2">
                <div className="relative w-full max-w-xs">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: PRIMARY }}
                  />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={viewMode === "po-partneru" ? "Pretraži po partneru..." : "Pretraži po proizvodu..."}
                    className="w-full pl-9 pr-8 py-1.5 text-sm border-2 rounded-lg focus:outline-none transition"
                    style={{
                      borderColor: searchTerm.length >= 4 ? PRIMARY : "rgb(209 213 219)",
                      color: "rgb(17 24 39)",
                    }}
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded"
                      style={{ color: "rgb(156 163 175)" }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Desno — toggle */}
              <div className="flex rounded-lg overflow-hidden border-2 flex-none" style={{ borderColor: PRIMARY }}>
                <button
                  className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-all"
                  style={{
                    backgroundColor: viewMode === "po-partneru" ? PRIMARY : "transparent",
                    color: viewMode === "po-partneru" ? "white" : PRIMARY,
                  }}
                  onClick={() => setViewMode("po-partneru")}
                >
                  Po partneru
                </button>
                <button
                  className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-all border-l-2"
                  style={{
                    backgroundColor: viewMode === "po-proizvodu" ? PRIMARY : "transparent",
                    color: viewMode === "po-proizvodu" ? "white" : PRIMARY,
                    borderColor: PRIMARY,
                  }}
                  onClick={() => setViewMode("po-proizvodu")}
                >
                  Po proizvodu
                </button>
              </div>
            </div>
          </div>

          {/* ─── SADRŽAJ ──────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-8 h-8 animate-spin" style={{ color: PRIMARY }} />
                <span className="ml-3 text-gray-600">Učitavanje završenih narudžbi...</span>
              </div>

            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">Nema završenih narudžbi</p>
              </div>

            ) : viewMode === "po-partneru" ? (
              /* ══════════ PO PARTNERU ══════════ */
              <div className="space-y-6">
                {vidljiviPoPartneru.length === 0 && activeSearch && (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    Nema partnera koji odgovaraju pretrazi
                  </div>
                )}
                {vidljiviPoPartneru.map((order) => {
                  const prio = priorityConfig[order.priority] ?? priorityConfig[1];
                  const isHitno = order.priority === 3;
                  return (
                    <div
                      key={order.id}
                      className="bg-white rounded-xl shadow-lg overflow-hidden"
                      style={{
                        border: isHitno ? "2px solid rgb(239 68 68)" : "2px solid rgb(229 231 235)",
                      }}
                    >
                      {/* Zaglavlje */}
                      <div
                        className="px-6 py-4 border-b-2 border-gray-200"
                        style={{
                          background: isHitno
                            ? "linear-gradient(to right, rgb(254 226 226), rgb(255 241 242))"
                            : `linear-gradient(to right, ${PRIMARY}18, ${SECONDARY}18)`,
                        }}
                      >
                        <div className="grid grid-cols-3 items-center gap-4">

                          {/* Lijevo: partner + meta info */}
                          <div className="min-w-0">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <h3 className="text-xl font-bold" style={{ color: isHitno ? "rgb(185 28 28)" : PRIMARY }}>
                                {order.partner_name}
                              </h3>
                              {order.branch_name && (
                                <span className="text-xs text-gray-500 font-medium">{order.branch_name}</span>
                              )}
                            </div>
                            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                              <span className="text-gray-400">
                                Br. narudžbe: <span className="font-semibold text-gray-700">{order.order_number}</span>
                              </span>
                              {order.referent_number && (
                                <span className="text-gray-400">
                                  Ref: <span className="font-semibold text-gray-700">{order.referent_number}</span>
                                </span>
                              )}
                              {order.partner_order_number && (
                                <span className="text-gray-400">
                                  Nar. partnera: <span className="font-semibold text-gray-700">{order.partner_order_number}</span>
                                  {order.partner_order_date && (
                                    <span className="text-gray-400 ml-1">· {formatDate(order.partner_order_date)}</span>
                                  )}
                                </span>
                              )}
                            </div>
                            {order.notes && order.notes.trim() && (
                              <div className="mt-1 text-xs italic text-gray-500">{order.notes.trim()}</div>
                            )}
                          </div>

                          {/* Centar: datum narudžbe */}
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">
                              Datum narudžbe
                            </span>
                            <span
                              className="text-2xl font-extrabold"
                              style={{ color: isHitno ? "rgb(185 28 28)" : PRIMARY }}
                            >
                              {order.order_date ? formatDate(order.order_date) : "—"}
                            </span>
                          </div>

                          {/* Desno: priority + stavki */}
                          <div className="flex flex-col items-end gap-2">
                            <span
                              className="text-xs font-bold px-3 py-1.5 rounded-lg border"
                              style={{ background: prio.bg, color: prio.color, borderColor: prio.border }}
                            >
                              {prio.label}
                            </span>
                            <div className="bg-white px-4 py-2 rounded-lg shadow">
                              <span className="text-sm text-gray-600">Stavki:</span>
                              <span className="ml-2 text-lg font-bold" style={{ color: SECONDARY }}>
                                {order.items.length}
                              </span>
                            </div>
                          </div>

                        </div>
                      </div>

                      {/* Tabela stavki */}
                      <div className="overflow-x-auto">
                        <table className="w-full table-fixed divide-y divide-gray-200">
                          <thead>
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                NAZIV PROIZVODA
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500" style={{ width: 140 }}>
                                REF. BR.
                              </th>
                              <th className="px-2 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500" style={{ width: 52 }}>
                                JM
                              </th>
                              <th className="px-2 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500" style={{ width: 90 }}>
                                KOLIČINA
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {order.items.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">Nema stavki</td>
                              </tr>
                            ) : (
                              order.items.map((item) => (
                                <tr key={item.id}>
                                  <td className="px-6 py-4 text-sm text-gray-900 align-top">
                                    <div>{item.product_name}</div>
                                    {item.product_group && (
                                      <div className="text-xs text-gray-400 mt-0.5">{item.product_group}</div>
                                    )}
                                  </td>
                                  <td className="px-4 py-4 text-xs text-gray-500 align-top">
                                    {item.referent_number ?? "—"}
                                  </td>
                                  <td className="px-2 py-4 text-sm text-gray-700 align-top text-right">
                                    {item.product_uom}
                                  </td>
                                  <td className="px-2 py-4 text-sm font-semibold align-top text-right" style={{ color: SECONDARY }}>
                                    {item.quantity}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>

            ) : (
              /* ══════════ PO PROIZVODU ══════════ */
              <div className="space-y-6">
                {vidljiviPoProizvodu.length === 0 && activeSearch && (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    Nema proizvoda koji odgovaraju pretrazi
                  </div>
                )}
                {vidljiviPoProizvodu.map((proizvod) => (
                  <div
                    key={proizvod.product_id}
                    className="bg-white rounded-xl shadow-lg overflow-hidden"
                    style={{ border: "2px solid rgb(229 231 235)" }}
                  >
                    {/* Zaglavlje proizvoda */}
                    <div
                      className="px-6 py-4 border-b-2 border-gray-200"
                      style={{ background: `linear-gradient(to right, ${PRIMARY}18, ${SECONDARY}18)` }}
                    >
                      <div className="flex items-center">
                        <div className="flex items-baseline gap-3 flex-wrap">
                          <h3 className="text-xl font-bold" style={{ color: PRIMARY }}>
                            {proizvod.product_name}
                          </h3>
                          <span className="text-xs text-gray-500">
                            JM: <span className="font-semibold text-gray-700">{proizvod.product_uom}</span>
                          </span>
                          {proizvod.product_group && (
                            <span className="text-xs text-gray-400">{proizvod.product_group}</span>
                          )}
                        </div>
                        <div className="ml-auto bg-white px-4 py-2 rounded-lg shadow">
                          <span className="text-sm text-gray-600">Narudžbi:</span>
                          <span className="ml-2 text-lg font-bold" style={{ color: SECONDARY }}>
                            {proizvod.stavke.length}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Tabela partnera */}
                    <div className="overflow-x-auto">
                      <table className="w-full table-fixed divide-y divide-gray-200">
                        <thead>
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                              PARTNER
                            </th>
                            <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500" style={{ width: 130 }}>
                              BR. NARUDŽBE
                            </th>
                            <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500" style={{ width: 110 }}>
                              REF. (NAR.)
                            </th>
                            <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500" style={{ width: 110 }}>
                              REF. (STAVKA)
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500" style={{ width: 90 }}>
                              KOLIČINA
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {proizvod.stavke.map((stavka, idx) => (
                            <tr key={`${stavka.order_id}-${idx}`}>
                              <td className="px-6 py-4 text-sm text-gray-900 align-top">
                                <div>{stavka.partner_name}</div>
                                {stavka.branch_name && (
                                  <div className="text-xs text-gray-500 mt-0.5">{stavka.branch_name}</div>
                                )}
                              </td>
                              <td className="px-2 py-4 text-xs text-gray-600 align-top">
                                {stavka.order_number}
                              </td>
                              <td className="px-2 py-4 text-xs text-gray-500 align-top">
                                {stavka.order_ref ?? "—"}
                              </td>
                              <td className="px-2 py-4 text-xs text-gray-500 align-top">
                                {stavka.item_ref ?? "—"}
                              </td>
                              <td className="px-4 py-4 text-sm font-semibold align-top text-right" style={{ color: SECONDARY }}>
                                {stavka.quantity}
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
