import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Clienti from "./pages/Clienti";
import Insoluti from "./pages/Insoluti";
import PraticheLegali from "./pages/PraticheLegali";
import Report from "./pages/Report";
import CalendarTest from "./pages/CalendarTest"; // ✅ Import per il test
import Login from "./pages/Login";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { ensureMsalInitialized, msalInstance } from "./msalInstance";

function ProtectedRoute({ children }) {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        await ensureMsalInitialized();
        const account = msalInstance.getActiveAccount();
        if (mounted) setAuthenticated(Boolean(account));
      } catch {
        if (mounted) setAuthenticated(false);
      } finally {
        if (mounted) setReady(true);
      }
    }

    init();
    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) {
    return <div className="p-6 text-sm opacity-70">Verifica accesso Microsoft 365…</div>;
  }

  if (!authenticated) {
    return <Login />;
  }

  return children;
}

function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-grow">
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Home */}
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="/Home" element={<Navigate to="/" replace />} />
          <Route path="/auth/callback" element={<Navigate to="/" replace />} />

          {/* Altre pagine */}
          <Route path="/clienti" element={<ProtectedRoute><Clienti /></ProtectedRoute>} />
          <Route path="/insoluti" element={<ProtectedRoute><Insoluti /></ProtectedRoute>} />
          <Route path="/pratiche-legali" element={<ProtectedRoute><PraticheLegali /></ProtectedRoute>} />
          <Route path="/report" element={<ProtectedRoute><Report /></ProtectedRoute>} />

          {/* Test Calendario */}
          <Route path="/calendar-test" element={<ProtectedRoute><CalendarTest /></ProtectedRoute>} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default App;
