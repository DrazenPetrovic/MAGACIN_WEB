import { useState } from 'react';
import {
  LogOut,
  Warehouse,
  PackagePlus,
  PackageOpen,
  ClipboardList,
  BarChart2,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import StanjeMagacina from './StanjeMagacina';
import PrijemRobe from './PrijemRobe';
import IzdavanjeRobe from './IzdavanjeRobe';
import Narudzbenice from './Narudzbenice';
import Inventura from './Inventura';
import Izvjestaji from './Izvjestaji';
import { theme } from '../theme';

const PRIMARY = theme.primary;
const SECONDARY = theme.secondary;

interface DashboardProps {
  username: string;
  vrstaRadnika: number;
  onLogout: () => void;
}

type MenuSection =
  | 'stanje'
  | 'prijem'
  | 'izdavanje'
  | 'narudzbenice'
  | 'inventura'
  | 'izvjestaji'
  | null;

const menuItems: { id: MenuSection; label: string; icon: React.ElementType; adminOnly?: boolean }[] = [
  { id: 'stanje',       label: 'Stanje magacina',  icon: Warehouse       },
  { id: 'prijem',       label: 'Prijem robe',       icon: PackagePlus     },
  { id: 'izdavanje',    label: 'Izdavanje robe',    icon: PackageOpen     },
  { id: 'narudzbenice', label: 'Narudžbenice',      icon: ClipboardList   },
  { id: 'inventura',    label: 'Inventura',         icon: ClipboardCheck  },
  { id: 'izvjestaji',   label: 'Izvještaji',        icon: BarChart2,      adminOnly: true },
];

export function Dashboard({ username, vrstaRadnika, onLogout }: DashboardProps) {
  const [activeSection, setActiveSection] = useState<MenuSection>(null);
  const [navCollapsed, setNavCollapsed] = useState(false);

  const vrsta = Number(vrstaRadnika);

  const vidljivi = menuItems.filter((item) => !item.adminOnly || vrsta === 1);

  const renderContent = () => {
    switch (activeSection) {
      case 'stanje':       return <StanjeMagacina />;
      case 'prijem':       return <PrijemRobe />;
      case 'izdavanje':    return <IzdavanjeRobe />;
      case 'narudzbenice': return <Narudzbenice />;
      case 'inventura':    return <Inventura />;
      case 'izvjestaji':   return <Izvjestaji />;
      default:             return null;
    }
  };

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">

      {/* ─── TOP BAR ─── */}
      <div
        className="flex-shrink-0 bg-white flex items-center gap-1 px-2"
        style={{ borderBottom: `2px solid ${PRIMARY}`, height: '36px', minHeight: '36px' }}
      >
        <Warehouse className="w-4 h-4 flex-shrink-0" style={{ color: PRIMARY }} />
        <span className="font-bold text-sm whitespace-nowrap" style={{ color: PRIMARY }}>
          Magacin
        </span>

        <span className="text-gray-300 mx-1 text-xs">|</span>

        {!navCollapsed && (
          <div className="flex items-center gap-0.5 overflow-x-auto flex-1 min-w-0">
            {vidljivi.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                    isActive ? 'text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  style={isActive ? { backgroundColor: PRIMARY } : {}}
                  title={item.label}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {navCollapsed && <div className="flex-1" />}

        {/* Desno: korisnik + toggle + odjava */}
        <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
          <span className="text-xs text-gray-500 hidden md:inline mr-1">
            {username}
          </span>

          <button
            onClick={() => setNavCollapsed(!navCollapsed)}
            className="p-0.5 rounded hover:bg-gray-100 transition-all"
            title={navCollapsed ? 'Prikaži navigaciju' : 'Sakrij navigaciju'}
          >
            {navCollapsed
              ? <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
              : <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
            }
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-1 text-white text-xs px-2 py-1 rounded transition-all"
            style={{ backgroundColor: PRIMARY }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#6a4f8a')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = PRIMARY)}
            title="Odjava"
          >
            <LogOut className="w-3 h-3" />
            <span className="hidden sm:inline">Odjava</span>
          </button>
        </div>
      </div>

      {/* ─── SADRŽAJ ─── */}
      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-white">
        {activeSection === null ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Warehouse className="w-16 h-16 mb-4 opacity-20" style={{ color: PRIMARY }} />
            <h2 className="text-xl font-bold mb-2" style={{ color: PRIMARY }}>
              Dobrodošli u Magacin
            </h2>
            <p className="text-gray-500 text-sm max-w-sm">
              Izaberite stavku iz menija za upravljanje robom, pregled stanja ili izvještaje.
            </p>
            {/* Quick access buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-8 w-full max-w-md">
              {vidljivi.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all"
                  >
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${PRIMARY}15` }}>
                      <Icon className="w-5 h-5" style={{ color: PRIMARY }} />
                    </div>
                    <span className="text-xs font-medium text-gray-700">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          renderContent()
        )}
      </main>

      {/* ─── STATUS BAR ─── */}
      {activeSection !== null && (
        <div
          className="flex-shrink-0 flex items-center justify-between px-3 py-1 text-xs"
          style={{ backgroundColor: `${PRIMARY}10`, borderTop: `1px solid ${PRIMARY}30` }}
        >
          <span style={{ color: PRIMARY }} className="font-medium">
            {vidljivi.find((m) => m.id === activeSection)?.label ?? ''}
          </span>
          <span className="text-gray-400">{username}</span>
          {vrsta === 1 && (
            <span
              className="px-1.5 py-0.5 rounded text-xs font-medium"
              style={{ backgroundColor: `${SECONDARY}20`, color: SECONDARY }}
            >
              Admin
            </span>
          )}
        </div>
      )}
    </div>
  );
}
