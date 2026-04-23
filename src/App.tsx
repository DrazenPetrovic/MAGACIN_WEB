import { useEffect, useState } from 'react';
import { LoginPanel } from './components/LoginPanel';
import { Dashboard } from './components/Dashboard';
import { AktivneNarudzbe } from './components/AktivneNarudzbe';
import { verifyAuth, signOut } from './utils/auth';

type Screen = 'dashboard' | 'aktivne-narudzbe';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [vrstaRadnika, setVrstaRadnika] = useState(0);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>('dashboard');

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

  const handleLoginSuccess = async () => {
    const user = await verifyAuth();
    if (user) {
      setUsername(user.username);
      setVrstaRadnika(user.vrstaRadnika);
      setIsAuthenticated(true);
    }
  };

  const handleLogout = async () => {
    await signOut();
    setIsAuthenticated(false);
    setUsername('');
    setVrstaRadnika(0);
    setScreen('dashboard');
  };

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

  if (screen === 'aktivne-narudzbe') {
    return <AktivneNarudzbe onBack={() => setScreen('dashboard')} />;
  }

  return (
    <Dashboard
      username={username}
      vrstaRadnika={vrstaRadnika}
      onLogout={handleLogout}
      onNavigate={setScreen}
    />
  );
}

export default App;
