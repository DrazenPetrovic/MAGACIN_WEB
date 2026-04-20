import { useState, useRef, useEffect } from 'react';
import { signIn, signInByToken } from '../utils/auth';
import { CreditCard, User, Lock, CheckCircle, Warehouse } from 'lucide-react';
import { theme } from '../theme';

interface LoginPanelProps {
  onLoginSuccess: () => void;
}

type LoginTab = 'credentials' | 'token';

const PRIMARY = theme.primary;
const PRIMARY_DARK = '#6a4f8a';
const SECONDARY = theme.secondary;

// After successful login, show progress animation for this duration before redirecting
const LOGIN_SUCCESS_DELAY_MS = 5300;
// RFID tokens are automatically submitted once this many characters are received
const RFID_TOKEN_MIN_LENGTH = 10;

export function LoginPanel({ onLoginSuccess }: LoginPanelProps) {
  const [tab, setTab] = useState<LoginTab>('token');
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loggedName, setLoggedName] = useState('');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [rfidToken, setRfidToken] = useState('');
  const tokenInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tab === 'token') {
      setTimeout(() => tokenInputRef.current?.focus(), 50);
    }
  }, [tab]);

  useEffect(() => {
    if (!loginSuccess) return;
    const startTimer = setTimeout(() => setProgress(100), 50);
    const doneTimer = setTimeout(() => onLoginSuccess(), LOGIN_SUCCESS_DELAY_MS);
    return () => {
      clearTimeout(startTimer);
      clearTimeout(doneTimer);
    };
  }, [loginSuccess, onLoginSuccess]);

  const triggerSuccess = (naziv: string) => {
    setLoggedName(naziv);
    setLoading(false);
    setLoginSuccess(true);
    setProgress(0);
  };

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: signInError, data } = await signIn(username.trim(), password.trim());
      if (signInError) {
        setError(signInError.message || 'Pogrešno korisničko ime ili lozinka');
        setLoading(false);
      } else {
        triggerSuccess(data?.username ?? username);
      }
    } catch (err) {
      setError(`Greška: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
    }
  };

  const handleTokenSubmit = async (tokenValue: string) => {
    const trimmed = tokenValue.trim();
    if (!trimmed) return;
    setError('');
    setLoading(true);
    try {
      const { error: signInError, data } = await signInByToken(trimmed);
      if (signInError) {
        setError(signInError.message || 'Nepoznat token');
        setRfidToken('');
        setLoading(false);
        setTimeout(() => tokenInputRef.current?.focus(), 50);
      } else {
        triggerSuccess(data?.username ?? '');
      }
    } catch (err) {
      setError(`Greška: ${err instanceof Error ? err.message : String(err)}`);
      setRfidToken('');
      setLoading(false);
    }
  };

  const handleTokenKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleTokenSubmit(rfidToken);
  };

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRfidToken(val);
    if (val.length >= RFID_TOKEN_MIN_LENGTH) handleTokenSubmit(val);
  };

  if (loginSuccess) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: `linear-gradient(135deg, ${PRIMARY}15, ${SECONDARY}15)` }}
      >
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 pt-6 pb-5 text-center">
              <div className="flex justify-center mb-3">
                <img
                  src="/foto/karpas_logo_software.png"
                  alt="Karpas Logo"
                  className="h-20 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
              <CheckCircle className="w-12 h-12 mx-auto mb-2" style={{ color: SECONDARY }} />
              <p className="text-base font-bold mb-1" style={{ color: PRIMARY }}>Pristup odobren</p>
              {loggedName && (
                <p className="text-sm font-semibold mb-1" style={{ color: SECONDARY }}>{loggedName}</p>
              )}
              <p className="text-xs text-gray-400 mb-5">Učitavanje aplikacije...</p>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-2.5 rounded-full"
                  style={{
                    width: `${progress}%`,
                    transition: 'width 5s cubic-bezier(0.4, 0, 0.2, 1)',
                    background: `linear-gradient(90deg, ${PRIMARY}, ${SECONDARY})`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: `linear-gradient(135deg, ${PRIMARY}15, ${SECONDARY}15)` }}
    >
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="px-6 pt-5 pb-4 text-center" style={{ borderBottom: `3px solid ${PRIMARY}` }}>
            <div className="flex justify-center mb-3">
              <img
                src="/foto/karpas_logo_software.png"
                alt="Karpas Logo"
                className="h-20 object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = `<div style="background:${PRIMARY};padding:12px;border-radius:50%;display:inline-flex"><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/><rect width="8" height="8" x="8" y="14"/></svg></div>`;
                  }
                }}
              />
            </div>
            <div className="flex items-center justify-center gap-2">
              <Warehouse className="w-5 h-5" style={{ color: PRIMARY }} />
              <h1 className="text-lg font-bold" style={{ color: PRIMARY }}>Magacin — Prijava</h1>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => { setTab('credentials'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-all ${
                tab === 'credentials' ? 'text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              style={tab === 'credentials' ? { backgroundColor: PRIMARY } : {}}
            >
              <User className="w-4 h-4" />
              Korisnik / Šifra
            </button>
            <button
              onClick={() => { setTab('token'); setError(''); setRfidToken(''); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-all ${
                tab === 'token' ? 'text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              style={tab === 'token' ? { backgroundColor: SECONDARY } : {}}
            >
              <CreditCard className="w-4 h-4" />
              Prijava tokenom
            </button>
          </div>

          <div className="p-5">
            {tab === 'credentials' && (
              <form onSubmit={handleCredentialsLogin} autoComplete="on" className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Korisničko ime</label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Korisničko ime"
                      className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none transition"
                      onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                      onBlur={(e) => (e.target.style.borderColor = 'rgb(209 213 219)')}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Lozinka</label>
                  <div className="relative">
                    <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Lozinka"
                      className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none transition"
                      onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
                      onBlur={(e) => (e.target.style.borderColor = 'rgb(209 213 219)')}
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full text-white font-semibold py-2.5 text-sm rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: PRIMARY }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = PRIMARY_DARK)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = PRIMARY)}
                >
                  {loading ? 'Provjera...' : 'Prijava'}
                </button>
              </form>
            )}

            {tab === 'token' && (
              <div className="space-y-3">
                <div
                  className="rounded-xl p-4 text-center border-2 border-dashed"
                  style={{ borderColor: `${SECONDARY}88`, backgroundColor: `${SECONDARY}10` }}
                >
                  <CreditCard className="w-10 h-10 mx-auto mb-2" style={{ color: SECONDARY }} />
                  <p className="text-xs text-gray-600 font-medium">Prislonite 125kHz token čitaču</p>
                  <p className="text-xs text-gray-400 mt-0.5">ili unesite kod ručno i pritisnite Enter</p>
                </div>

                <input
                  ref={tokenInputRef}
                  type="text"
                  value={rfidToken}
                  onChange={handleTokenChange}
                  onKeyDown={handleTokenKeyDown}
                  placeholder="Čeka token..."
                  disabled={loading}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none text-center tracking-widest font-mono disabled:opacity-50"
                  onFocus={(e) => (e.target.style.borderColor = SECONDARY)}
                  onBlur={(e) => (e.target.style.borderColor = 'rgb(209 213 219)')}
                  autoComplete="off"
                />

                {loading && (
                  <div className="text-center text-xs text-gray-500">Provjera tokena...</div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs text-center">
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  disabled={loading || !rfidToken.trim()}
                  onClick={() => handleTokenSubmit(rfidToken)}
                  className="w-full text-white font-semibold py-2.5 text-sm rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: SECONDARY }}
                  onMouseEnter={(e) => !loading && rfidToken.trim() && (e.currentTarget.style.backgroundColor = '#7aad3a')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = SECONDARY)}
                >
                  Prijava tokenom
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
