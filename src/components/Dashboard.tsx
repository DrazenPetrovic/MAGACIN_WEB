import { LogOut, Package, MapPin, ClipboardList, CheckCircle2, LayoutList } from "lucide-react";
import { theme } from "../theme";

type Screen = 'dashboard' | 'aktivne-narudzbe';

interface DashboardProps {
  username: string;
  vrstaRadnika: number;
  onLogout: () => void;
  onNavigate: (screen: Screen) => void;
}

const PRIMARY   = theme.primary;
const SECONDARY = theme.secondary;

const menuItems: { label: string; icon: typeof MapPin; bg: string; bgHover: string; bgPress: string; screen?: Screen }[] = [
  {
    label: "NARUDŽBE\nBANJA LUKA",
    icon: MapPin,
    bg: PRIMARY,
    bgHover: "#684f8a",
    bgPress: "#574176",
  },
  {
    label: "AKTIVNE\nNARUDŽBE",
    icon: ClipboardList,
    bg: SECONDARY,
    bgHover: "#7fb83a",
    bgPress: "#6da030",
    screen: "aktivne-narudzbe",
  },
  {
    label: "ZAVRŠENE\nNARUDŽBE",
    icon: CheckCircle2,
    bg: "#1A7F4B",
    bgHover: "#166840",
    bgPress: "#0F4F30",
  },
  {
    label: "POPIS",
    icon: LayoutList,
    bg: "#2E4057",
    bgHover: "#243347",
    bgPress: "#1A2535",
  },
];

export function Dashboard({ username, onLogout, onNavigate }: DashboardProps) {
  return (
    <div className="flex flex-col" style={{ height: "100dvh", background: "#f1f5f9" }}>

      {/* Header */}
      <header
        className="flex-none text-white shadow-md"
        style={{
          background: `linear-gradient(90deg, #574176, ${PRIMARY})`,
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        <div className="px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            <span className="font-bold text-base tracking-wide">Magacin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm opacity-90 uppercase">{username}</span>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 text-sm bg-white/20 px-3 py-2 rounded-lg active:bg-white/40 transition"
              onTouchStart={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.35)")}
              onTouchEnd={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)")}
            >
              <LogOut className="w-4 h-4" />
              Odjava
            </button>
          </div>
        </div>
      </header>

      {/* 2×2 grid dugmadi */}
      <main className="flex-1 p-4 grid grid-cols-2 grid-rows-2 gap-4">
        {menuItems.map(({ label, icon: Icon, bg, bgHover, bgPress, screen }) => (
          <button
            key={label}
            onClick={() => screen && onNavigate(screen)}
            className="flex flex-col items-center justify-center rounded-2xl shadow-lg text-white font-bold text-xl leading-snug tracking-wide active:scale-95 transition-transform select-none"
            style={{ backgroundColor: bg }}
            onTouchStart={(e) => (e.currentTarget.style.backgroundColor = bgPress)}
            onTouchEnd={(e) => (e.currentTarget.style.backgroundColor = bg)}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = bgHover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = bg)}
            onMouseDown={(e) => (e.currentTarget.style.backgroundColor = bgPress)}
            onMouseUp={(e) => (e.currentTarget.style.backgroundColor = bgHover)}
          >
            <Icon className="mb-4" style={{ width: "3rem", height: "3rem" }} strokeWidth={1.5} />
            {label.split("\n").map((line, i) => (
              <span key={i} className="block text-center">{line}</span>
            ))}
          </button>
        ))}
      </main>

    </div>
  );
}
