import { LogOut, Package } from "lucide-react";
import { theme } from "../theme";

interface DashboardProps {
  username: string;
  vrstaRadnika: number;
  onLogout: () => void;
}

const PRIMARY = theme.primary;
const SECONDARY = theme.secondary;

export function Dashboard({ username, vrstaRadnika, onLogout }: DashboardProps) {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navigacija */}
      <header
        className="text-white shadow-md"
        style={{ background: `linear-gradient(90deg, ${PRIMARY}, ${SECONDARY})` }}
      >
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            <span className="font-bold text-base tracking-wide">Magacin</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm opacity-90">{username}</span>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 text-sm bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              Odjava
            </button>
          </div>
        </div>
      </header>

      {/* Sadržaj */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow p-8 text-center">
          <Package className="w-16 h-16 mx-auto mb-4" style={{ color: PRIMARY }} />
          <h2 className="text-xl font-bold mb-2" style={{ color: PRIMARY }}>
            Dobrodošli u Magacin
          </h2>
          <p className="text-gray-500 text-sm">
            Prijavljeni ste kao: <span className="font-semibold" style={{ color: SECONDARY }}>{username}</span>
            {vrstaRadnika > 0 && <span className="text-gray-400 ml-2">(vrsta: {vrstaRadnika})</span>}
          </p>
        </div>
      </main>

    </div>
  );
}
