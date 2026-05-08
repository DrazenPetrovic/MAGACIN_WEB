import { useEffect, useState } from "react";
import { LoginPanel } from "./components/LoginPanel";
import { Dashboard } from "./components/Dashboard";
import { AktivneNarudzbe } from "./components/AktivneNarudzbe";
import { ZavrseneNarudzbe } from "./components/ZavrseneNarudzbe";
import { ZavrseneNarudzbeLokal } from "./components/ZavrseneNarudzbeLokal";
import { NarudzbeLokalno } from "./components/NarudzbeLokalno";
import { verifyAuth, getCurrentUser, signOut } from "./utils/auth";
import { apiFetch } from "./utils/apiFetch";
import {
  LOCAL_ORDER_NEW_EVENT,
  playLocalOrderTone,
  type LocalOrderNewEventDetail,
} from "./utils/localOrderMonitoring";

type Screen =
  | "dashboard"
  | "aktivne-narudzbe"
  | "zavrsene-narudzbe"
  | "zavrsene-banja-luka"
  | "narudzbe-banja-luka";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3005";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [vrstaRadnika, setVrstaRadnika] = useState(0);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [pendingLocalOrders, setPendingLocalOrders] = useState(0);
  const [toast, setToast] = useState<{ text: string; ts: number } | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const user = await verifyAuth();
      if (user) {
        setUsername(user.username);
        setVrstaRadnika(user.vrstaRadnika);
        setIsAuthenticated(true);
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const handleLoginSuccess = () => {
    const user = getCurrentUser();
    if (user) {
      setUsername(user.username);
      setVrstaRadnika(user.vrstaRadnika);
      setIsAuthenticated(true);
    }
  };

  const handleLogout = async () => {
    await signOut();
    setIsAuthenticated(false);
    setUsername("");
    setVrstaRadnika(0);
    setScreen("dashboard");
    setPendingLocalOrders(0);
    setToast(null);
  };

  useEffect(() => {
    if (screen === "narudzbe-banja-luka") {
      setPendingLocalOrders(0);
    }
  }, [screen]);

  useEffect(() => {
    if (!isAuthenticated || screen === "narudzbe-banja-luka") return;

    let stop = false;
    let seeded = false;
    let knownOrderIds = new Set<number>();

    const monitor = async () => {
      try {
        const res = await apiFetch(`${API_URL}/api/narudzbe-lokalno`);
        if (!res.ok) return;

        const result = await res.json();
        if (!result?.success || !Array.isArray(result.data) || stop) return;

        const currentOrders = result.data as Array<{
          id: number;
          order_number?: string;
          priority?: number;
        }>;
        const currentIds = new Set(
          currentOrders
            .map((o) => Number(o.id))
            .filter((n) => !Number.isNaN(n)),
        );

        if (!seeded) {
          knownOrderIds = currentIds;
          seeded = true;
          return;
        }

        const fresh = currentOrders.filter(
          (o) =>
            Number.isFinite(Number(o.id)) && !knownOrderIds.has(Number(o.id)),
        );
        knownOrderIds = currentIds;
        if (!fresh.length) return;

        const maxPriority = fresh.reduce((max, order) => {
          const p = Number(order.priority) || 1;
          return p > max ? p : max;
        }, 1);

        const detail: LocalOrderNewEventDetail = {
          count: fresh.length,
          orderNumbers: fresh.map((o) => o.order_number || `#${o.id}`),
          createdAt: Date.now(),
          maxPriority,
        };

        window.dispatchEvent(
          new CustomEvent<LocalOrderNewEventDetail>(LOCAL_ORDER_NEW_EVENT, {
            detail,
          }),
        );
        playLocalOrderTone(maxPriority);
        setPendingLocalOrders((prev) => prev + fresh.length);
        setToast({
          text:
            fresh.length === 1
              ? `Nova lokalna narudžba: ${detail.orderNumbers[0]}`
              : `Stiglo ${fresh.length} novih lokalnih narudžbi`,
          ts: Date.now(),
        });
      } catch {
        // Silent fail - monitoring must not impact regular workflow.
      }
    };

    void monitor();
    const timer = window.setInterval(() => {
      void monitor();
    }, 15000);

    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [isAuthenticated, screen]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500 text-sm">Učitavanje...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPanel onLoginSuccess={handleLoginSuccess} />;
  }

  let content = (
    <Dashboard
      username={username}
      vrstaRadnika={vrstaRadnika}
      onLogout={handleLogout}
      onNavigate={setScreen}
      localOrdersBadgeCount={pendingLocalOrders}
    />
  );

  if (screen === "aktivne-narudzbe") {
    content = <AktivneNarudzbe onBack={() => setScreen("dashboard")} />;
  }

  if (screen === "zavrsene-narudzbe") {
    content = <ZavrseneNarudzbe onBack={() => setScreen("dashboard")} />;
  }

  if (screen === "zavrsene-banja-luka") {
    content = <ZavrseneNarudzbeLokal onBack={() => setScreen("dashboard")} />;
  }

  if (screen === "narudzbe-banja-luka") {
    content = <NarudzbeLokalno onBack={() => setScreen("dashboard")} />;
  }

  return (
    <>
      {content}
      {toast && (
        <div
          className="fixed right-4 top-4 z-[60] max-w-sm rounded-xl border px-4 py-3 shadow-xl backdrop-blur animate-[fadeIn_180ms_ease-out]"
          style={{
            backgroundColor: "#fffbeb",
            borderColor: "#fbbf24",
            color: "#92400e",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide">
            Monitoring
          </p>
          <p className="text-sm font-bold leading-snug">{toast.text}</p>
        </div>
      )}
    </>
  );
}

export default App;
