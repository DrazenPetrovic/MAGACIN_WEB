import { useMemo, useState } from "react";
import { X, Search } from "lucide-react";
import { theme } from "../theme";

const PRIMARY = theme.primary;
const SECONDARY = theme.secondary;

export interface ArtikalOption {
  sifra_proizvoda: string;
  naziv_proizvoda: string;
  jm: string;
  grupa_proizvoda?: string;
  kolicina_proizvoda?: number;
}

export interface ArtikalGrupa {
  grupa_proizvoda: string;
  naziv_grupe: string;
}

interface Props {
  artikli: ArtikalOption[];
  grupe: ArtikalGrupa[];
  trenutniNaziv: string;
  onSelect: (artikal: ArtikalOption) => void;
  onClose: () => void;
}

export function ZamjenaProizvodaModal({ artikli, grupe, trenutniNaziv, onSelect, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [grupaFilter, setGrupaFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return artikli.filter((a) => {
      if (grupaFilter && a.grupa_proizvoda !== grupaFilter) return false;
      if (!q) return true;
      return (
        a.naziv_proizvoda.toLowerCase().includes(q) ||
        a.sifra_proizvoda.toLowerCase().includes(q)
      );
    });
  }, [artikli, query, grupaFilter]);

  return (
    <div
      className="fixed inset-0 z-50"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col"
        style={{ position: "fixed", top: 5, left: 5, right: 5, bottom: 5 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-center justify-center px-5 pt-4 pb-3 border-b-2 border-gray-100 flex-none">
          <div className="min-w-0 text-center px-10">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Zamjena proizvoda
            </div>
            <div className="text-lg font-bold truncate" style={{ color: PRIMARY }}>{trenutniNaziv}</div>
          </div>
          <button
            onClick={onClose}
            className="absolute right-4 p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors flex-none"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="px-5 pt-3 flex-none">
          <div
            className="flex items-center gap-2 rounded-xl px-4"
            style={{ backgroundColor: "rgb(249 250 251)", border: "2px solid rgb(229 231 235)" }}
          >
            <Search className="w-5 h-5 text-gray-400 flex-none" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pretraga po šifri ili nazivu..."
              className="flex-1 bg-transparent outline-none py-3 text-base"
            />
            {query && (
              <button onClick={() => setQuery("")} className="p-1 flex-none">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {grupe.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-5 py-3 flex-none">
            <button
              onClick={() => setGrupaFilter(null)}
              className="flex-none px-4 py-2 rounded-full text-sm font-semibold transition-colors"
              style={{
                backgroundColor: grupaFilter === null ? PRIMARY : `${PRIMARY}10`,
                color: grupaFilter === null ? "white" : PRIMARY,
              }}
            >
              Sve
            </button>
            {grupe.map((g) => (
              <button
                key={g.grupa_proizvoda}
                onClick={() => setGrupaFilter(g.grupa_proizvoda)}
                className="flex-none px-4 py-2 rounded-full text-sm font-semibold transition-colors whitespace-nowrap"
                style={{
                  backgroundColor: grupaFilter === g.grupa_proizvoda ? PRIMARY : `${PRIMARY}10`,
                  color: grupaFilter === g.grupa_proizvoda ? "white" : PRIMARY,
                }}
              >
                {g.naziv_grupe}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {filtered.length === 0 ? (
            <div className="text-center text-gray-400 py-10 text-sm">Nema rezultata</div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {filtered.map((a) => {
                const nemaNaStanju = (a.kolicina_proizvoda ?? 0) === 0;
                return (
                  <button
                    key={a.sifra_proizvoda}
                    onClick={() => onSelect(a)}
                    className="flex flex-col items-start gap-2 p-4 rounded-2xl text-left transition-transform active:scale-[0.97]"
                    style={{
                      backgroundColor: nemaNaStanju ? "rgb(243 244 246)" : "rgb(249 250 251)",
                      border: `2px solid ${PRIMARY}`,
                      minHeight: "7rem",
                      opacity: nemaNaStanju ? 0.6 : 1,
                    }}
                  >
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-lg"
                        style={{ backgroundColor: `${SECONDARY}22`, color: SECONDARY }}
                      >
                        {a.jm}
                      </span>
                      {nemaNaStanju && (
                        <span
                          className="text-[10px] font-bold px-2 py-1 rounded-lg uppercase"
                          style={{ backgroundColor: "#ef444422", color: "#ef4444" }}
                        >
                          Nema na stanju
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-gray-900 leading-snug line-clamp-3">
                      {a.naziv_proizvoda}
                    </div>
                    <div className="text-xs text-gray-500 mt-auto">Šifra: {a.sifra_proizvoda}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
