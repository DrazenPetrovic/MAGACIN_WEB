import { useState, useEffect } from "react";
import { signIn } from "../utils/auth";
import { CheckCircle } from "lucide-react";
import { theme } from "../theme";

interface LoginPanelProps {
  onLoginSuccess: () => void;
}

const primary      = theme.primary;        // #785E9E
const primaryHover = "#684f8a";
const primaryPress = "#574176";
const accent       = theme.secondary;      // #8FC74A

export function LoginPanel({ onLoginSuccess }: LoginPanelProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [loginSuccess, setLoginSuccess] = useState(false);
  const [loggedName, setLoggedName] = useState("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!loginSuccess) return;
    const t1 = setTimeout(() => setProgress(100), 50);
    const t2 = setTimeout(() => onLoginSuccess(), 5300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [loginSuccess, onLoginSuccess]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: signInError, data } = await signIn(
        username.trim(),
        password.trim(),
      );
      if (signInError) {
        setError(signInError.message || "Pogrešno korisničko ime ili lozinka");
        setLoading(false);
      } else {
        setLoggedName(data?.username ?? username);
        setLoading(false);
        setLoginSuccess(true);
        setProgress(0);
      }
    } catch (err) {
      setError(`Greška: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
    }
  };

  // ── Ekran uspješnog logovanja ──
  if (loginSuccess) {
    return (
      <div className="min-h-screen login-soft-bg flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-8 pt-8 pb-7 text-center">
              <div className="flex justify-center mb-4">
                <img
                  src="/foto/karpas_logo_software.png"
                  alt="Karpas Logo"
                  className="h-24 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
              <CheckCircle className="w-14 h-14 mx-auto mb-3" style={{ color: accent }} />
              <p className="text-xl font-bold mb-1" style={{ color: primary }}>
                Pristup odobren
              </p>
              {loggedName && (
                <p className="text-base font-semibold mb-1" style={{ color: accent }}>
                  {loggedName}
                </p>
              )}
              <p className="text-sm text-gray-400 mb-6">Učitavanje aplikacije...</p>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="h-3 rounded-full"
                  style={{
                    width: `${progress}%`,
                    transition: "width 5s cubic-bezier(0.4, 0, 0.2, 1)",
                    background: `linear-gradient(90deg, ${primary}, ${accent})`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Forma za logovanje ──
  return (
    <div className="min-h-screen login-soft-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div
          className="bg-white rounded-2xl shadow-2xl p-8 border-2 border-transparent"
        >
          {/* Logo */}
          <div className="flex justify-center mb-7">
            <div className="w-36 h-36 flex items-center justify-center">
              <img
                src="/foto/karpas_logo_software.png"
                alt="Karpas Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = `<div style="background:${primary}" class="p-6 rounded-full"><svg class="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg></div>`;
                  }
                }}
              />
            </div>
          </div>

          <h1 className="text-center text-2xl font-bold text-gray-800 mb-1">
            Magacin
          </h1>
          <p className="text-center text-base mb-8 font-medium" style={{ color: primary }}>
            Karpas Ambalaže
          </p>

          <form onSubmit={handleLogin} autoComplete="on" className="space-y-5">
            <div>
              <label
                htmlFor="username"
                className="block text-base font-medium text-gray-700 mb-2"
              >
                Korisničko ime
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Unesite korisničko ime"
                className="w-full px-5 py-4 text-base border-2 border-gray-300 rounded-xl focus:outline-none transition"
                style={{ borderColor: "rgb(209 213 219)" }}
                onFocus={(e) => (e.target.style.borderColor = primary)}
                onBlur={(e) => (e.target.style.borderColor = "rgb(209 213 219)")}
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-base font-medium text-gray-700 mb-2"
              >
                Lozinka
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Unesite lozinku"
                className="w-full px-5 py-4 text-base border-2 border-gray-300 rounded-xl focus:outline-none transition"
                style={{ borderColor: "rgb(209 213 219)" }}
                onFocus={(e) => (e.target.style.borderColor = primary)}
                onBlur={(e) => (e.target.style.borderColor = "rgb(209 213 219)")}
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 px-5 py-4 rounded-xl text-base">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-semibold py-4 text-lg rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              style={{ backgroundColor: primary }}
              onTouchStart={(e) => (e.currentTarget.style.backgroundColor = primaryPress)}
              onTouchEnd={(e) => (e.currentTarget.style.backgroundColor = primary)}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = primaryHover)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = primary)}
              onMouseDown={(e) => (e.currentTarget.style.backgroundColor = primaryPress)}
              onMouseUp={(e) => (e.currentTarget.style.backgroundColor = primaryHover)}
            >
              {loading ? "Prijava u toku..." : "Prijava"}
            </button>

            <div className="h-1 w-full rounded-full" style={{ background: accent }} />
          </form>
        </div>
      </div>
    </div>
  );
}
